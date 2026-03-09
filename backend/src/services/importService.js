import fs from "node:fs";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { pool } from "../db/pool.js";
import { isBlankRow, normalizeText } from "../utils/text.js";

function cleanPhone(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw || normalizeText(raw) === "NAN") return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

function cleanName(value) {
  if (value === undefined || value === null) return null;
  const name = String(value).trim();
  if (!name || normalizeText(name) === "NAN") return null;
  return name;
}

const CARGO_TITLE_HINTS = [
  "COORD",
  "COORDENADOR",
  "COORDENADORES",
  "TIOS",
  "TIO",
  "TIA",
  "APOIO",
  "INTEGRANTE",
  "INTEGRANTES",
  "JOVEM",
  "JOVENS",
  "DIRETOR",
  "CIRCULISTA",
  "CASAL",
  "SECRETARIA",
  "MUSICA",
  "LITURGIA",
  "CARONA"
];
const CIRCLE_COLOR_LABELS = new Set([
  "AMARELO",
  "AZUL",
  "LARANJA",
  "ROSA",
  "VERDE",
  "VERMELHO",
  "ROXO",
  "BRANCO",
  "PRETO",
  "MARROM",
  "CINZA"
]);

function looksLikeCargoTitle(value) {
  const normalized = normalizeText(value || "");
  if (!normalized) return false;
  return CARGO_TITLE_HINTS.some((hint) => normalized.includes(hint));
}

function isCargoTitle(row, indexes = { nome: 0, telefone: 1 }) {
  const name = cleanName(row[indexes.nome]);
  if (!name) return false;
  const phone = cleanPhone(row[indexes.telefone]);
  if (phone) return false;
  return looksLikeCargoTitle(name);
}

function maybeShiftColumnIndexes(row, indexes) {
  const nameAtCurrent = cleanName(row[indexes.nome]);
  const nameAtNext = cleanName(row[indexes.nome + 1]);
  if (nameAtCurrent || !nameAtNext) {
    return indexes;
  }

  const phoneAtNext = cleanPhone(row[indexes.telefone + 1]);
  if (phoneAtNext || looksLikeCargoTitle(nameAtNext)) {
    return {
      nome: indexes.nome + 1,
      telefone: indexes.telefone + 1,
      paroquia: indexes.paroquia + 1
    };
  }
  return indexes;
}

function shouldIgnoreStandaloneLabel(row) {
  const cells = (row || []).map((cell) => cleanName(cell)).filter(Boolean);
  if (cells.length !== 1) return false;
  const normalized = normalizeText(cells[0] || "").toUpperCase();
  if (!normalized) return false;
  if (normalized.startsWith("EQUIPE DE")) return true;
  if (CIRCLE_COLOR_LABELS.has(normalized)) return true;
  return false;
}

function isTableHeader(row) {
  const joined = normalizeText((row || []).join(" "));
  return joined.includes("NOME") && (joined.includes("TELEFONE") || joined.includes("CONTATO"));
}

function resolveMemberColumnIndexes(row) {
  const normalized = (row || []).map((cell) => normalizeText(cell || ""));
  const nome = Math.max(
    0,
    normalized.findIndex((cell) => cell.includes("NOME"))
  );
  const telefoneCandidate = normalized.findIndex(
    (cell) => cell.includes("TELEFONE") || cell.includes("CONTATO") || cell.includes("CELULAR")
  );
  const paroquiaCandidate = normalized.findIndex((cell) => cell.includes("PAROQUIA") || cell.includes("PARÓQUIA"));
  return {
    nome,
    telefone: telefoneCandidate >= 0 ? telefoneCandidate : 1,
    paroquia: paroquiaCandidate >= 0 ? paroquiaCandidate : 2
  };
}

function shouldPairByCargo(cargoNome, teamName = "") {
  const normalizedCargo = normalizeText(cargoNome || "").toUpperCase();
  const normalizedTeam = normalizeText(teamName || "").toUpperCase();
  if (!normalizedCargo) return false;

  const isTiosCaronaTeam = normalizedTeam.includes("TIOS CARONA");
  if (isTiosCaronaTeam) {
    const isJovemCoordenador =
      /\bJOVENS?\b/.test(normalizedCargo) && /\bCOORD/.test(normalizedCargo);
    return !isJovemCoordenador;
  }

  return /\bTIOS?\b/.test(normalizedCargo);
}

const TEAM_IMPORT_PROFILE = {
  PADRAO: "PADRAO",
  GERAL: "GERAL",
  SALA: "SALA",
  TIOS_CARONA: "TIOS_CARONA"
};

function detectTeamImportProfile(teamName = "") {
  const normalizedTeam = normalizeText(teamName).toUpperCase();
  if (normalizedTeam.includes("TIOS CARONA")) return TEAM_IMPORT_PROFILE.TIOS_CARONA;
  if (normalizedTeam.includes("SALA")) return TEAM_IMPORT_PROFILE.SALA;
  if (normalizedTeam.includes("GERAL")) return TEAM_IMPORT_PROFILE.GERAL;
  return TEAM_IMPORT_PROFILE.PADRAO;
}

function getProfileLabel(profileCode) {
  switch (profileCode) {
    case TEAM_IMPORT_PROFILE.TIOS_CARONA:
      return "Tios Carona";
    case TEAM_IMPORT_PROFILE.SALA:
      return "Sala";
    case TEAM_IMPORT_PROFILE.GERAL:
      return "Geral";
    default:
      return "Padrão";
  }
}

function getProfileRules(profileCode) {
  const baseRules = [
    "Títulos de cargo devem aparecer em linhas próprias (sem telefone).",
    "Linhas sem cargo ativo são sinalizadas como inconsistência.",
    "Cargos com Tio/Tios geram pareamento de casal; demais cargos geram registros individuais."
  ];

  if (profileCode === TEAM_IMPORT_PROFILE.TIOS_CARONA) {
    return [
      "A equipe foi identificada como Tios Carona.",
      "Apenas cargos de Jovens Coordenadores permanecem individuais.",
      "Todos os demais cargos são tratados como casal (duas linhas por registro)."
    ];
  }

  if (profileCode === TEAM_IMPORT_PROFILE.SALA) {
    return [
      ...baseRules,
      "Marcadores de seção (ex: AMARELO, AZUL, EQUIPE DE SALA) são ignorados e não viram membro."
    ];
  }

  if (profileCode === TEAM_IMPORT_PROFILE.GERAL) {
    return [
      ...baseRules,
      "Recomendado manter pelo menos um cargo de coordenação explícito."
    ];
  }

  return baseRules;
}

function normalizeCargoKey(value = "") {
  return normalizeText(value)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isJovemCoordenadorCargo(cargoNome = "") {
  const normalized = normalizeCargoKey(cargoNome);
  return /\bJOVENS?\b/.test(normalized) && /\bCOORD/.test(normalized);
}

function buildDifference(severity, code, message, details = null) {
  return {
    severity,
    code,
    message,
    details: details || {}
  };
}

const MAX_IMPORT_FILE_BYTES = 15 * 1024 * 1024;
const MAX_IMPORT_ROWS = 20000;
const PARSE_TIMEOUT_MS = 15000;
const WORKER_SCRIPT_URL = new URL("./spreadsheetWorker.js", import.meta.url);

function parseSpreadsheetRows(filePath) {
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    const error = new Error("Arquivo de importacao invalido.");
    error.status = 400;
    throw error;
  }

  if (stats.size > MAX_IMPORT_FILE_BYTES) {
    const error = new Error("Arquivo excede o tamanho maximo permitido para importacao.");
    error.status = 400;
    throw error;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(WORKER_SCRIPT_URL, { workerData: { filePath } });

    const timeout = setTimeout(async () => {
      if (settled) return;
      settled = true;
      await worker.terminate().catch(() => {});
      const error = new Error("Tempo limite excedido ao processar planilha.");
      error.status = 400;
      reject(error);
    }, PARSE_TIMEOUT_MS);

    worker.on("message", async (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (!payload?.ok) {
        const error = new Error(payload?.error || "Falha ao processar planilha.");
        error.status = 400;
        await worker.terminate().catch(() => {});
        reject(error);
        return;
      }

      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      if (rows.length > MAX_IMPORT_ROWS) {
        const error = new Error(`Arquivo excede o limite de ${MAX_IMPORT_ROWS} linhas.`);
        error.status = 400;
        await worker.terminate().catch(() => {});
        reject(error);
        return;
      }

      resolve(rows);
    });

    worker.on("error", (workerError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const error = new Error(workerError?.message || "Falha ao processar planilha.");
      error.status = 400;
      reject(error);
    });

    worker.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve([]);
        return;
      }
      const error = new Error("Falha ao processar planilha.");
      error.status = 400;
      reject(error);
    });
  });
}

async function ensureEncounterAndTeam(encounterId, teamId) {
  const encounter = await pool.query("SELECT id FROM encontros WHERE id = $1", [encounterId]);
  if (encounter.rowCount === 0) {
    const error = new Error("Encontro nao encontrado.");
    error.status = 404;
    throw error;
  }

  const team = await pool.query(
    "SELECT id, nome, tipo FROM equipes WHERE id = $1 AND encontro_id = $2",
    [teamId, encounterId]
  );

  if (team.rowCount === 0) {
    const error = new Error("Equipe/Circulo nao encontrado para o encontro informado.");
    error.status = 404;
    throw error;
  }

  return team.rows[0];
}

function parseMembersRows({ encounterId, teamId, team, rows }) {
  let columnIndexes = { nome: 0, telefone: 1, paroquia: 2 };
  let cargoAtual = null;
  let bufferCasal = null;
  let pairingMode = false;

  const profileCode = detectTeamImportProfile(team.nome);
  const rules = getProfileRules(profileCode);
  const differences = [];
  const errors = [];
  const warnings = [];
  const records = [];

  const ignoredLabels = [];
  const colorLabelsDetected = new Set();
  let tableHeadersDetected = 0;
  let memberRowsDetected = 0;
  let rowsWithoutCargo = 0;

  const cargoStatsByKey = new Map();

  const ensureCargoStats = (cargoNome, pairMode) => {
    const key = normalizeCargoKey(cargoNome || "");
    if (!cargoStatsByKey.has(key)) {
      cargoStatsByKey.set(key, {
        key,
        cargo: cargoNome || "Sem Cargo",
        pairMode: Boolean(pairMode),
        memberRows: 0,
        registrosPrevistos: 0,
        casaisPrevistos: 0,
        individuaisPrevistos: 0,
        sobrasCasal: 0
      });
      return cargoStatsByKey.get(key);
    }

    const stats = cargoStatsByKey.get(key);
    if (stats.pairMode !== Boolean(pairMode)) {
      differences.push(
        buildDifference(
          "warning",
          "CARGO_MODE_CONFLICT",
          `Cargo '${stats.cargo}' detectado com modos de pareamento diferentes no arquivo.`,
          { cargo: stats.cargo }
        )
      );
    }
    return stats;
  };

  const registerRecord = (record, isCasal) => {
    records.push(record);
    const stats = ensureCargoStats(record.cargoNome, shouldPairByCargo(record.cargoNome, team.nome));
    stats.registrosPrevistos += 1;
    if (isCasal) {
      stats.casaisPrevistos += 1;
    } else {
      stats.individuaisPrevistos += 1;
    }
  };

  const flushBufferAsIndividual = (lineHint = null, becauseExpectedCouple = false) => {
    if (!bufferCasal || !cargoAtual) return;

    registerRecord(
      {
        encontroId: encounterId,
        equipeId: teamId,
        cargoNome: cargoAtual,
        nomePrincipal: bufferCasal.nome,
        nomeSecundario: null,
        telefonePrincipal: bufferCasal.telefone,
        telefoneSecundario: null,
        paroquia: bufferCasal.paroquia
      },
      false
    );

    if (becauseExpectedCouple) {
      const stats = ensureCargoStats(cargoAtual, true);
      stats.sobrasCasal += 1;
      const warningMessage = `Linha ${lineHint || bufferCasal.line}: casal incompleto no cargo '${cargoAtual}'. O último nome foi importado como individual.`;
      warnings.push(warningMessage);
      differences.push(
        buildDifference("warning", "INCOMPLETE_COUPLE_PAIR", warningMessage, {
          cargo: cargoAtual,
          line: lineHint || bufferCasal.line
        })
      );
    }

    bufferCasal = null;
  };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];

    if (isBlankRow(row)) continue;

    columnIndexes = maybeShiftColumnIndexes(row, columnIndexes);

    if (shouldIgnoreStandaloneLabel(row)) {
      const label = cleanName(row[columnIndexes.nome]) || cleanName(row[0]) || "";
      const normalizedLabel = normalizeText(label || "").toUpperCase();
      if (CIRCLE_COLOR_LABELS.has(normalizedLabel)) {
        colorLabelsDetected.add(normalizedLabel);
      }
      if (label) ignoredLabels.push(label);
      continue;
    }

    if (isTableHeader(row)) {
      tableHeadersDetected += 1;
      columnIndexes = resolveMemberColumnIndexes(row);
      continue;
    }

    if (isCargoTitle(row, columnIndexes)) {
      flushBufferAsIndividual(i + 1, pairingMode);
      cargoAtual = cleanName(row[columnIndexes.nome]);
      pairingMode = shouldPairByCargo(cargoAtual, team.nome);
      ensureCargoStats(cargoAtual, pairingMode);
      continue;
    }

    const nomeBruto = cleanName(row[columnIndexes.nome]);
    const telefone = cleanPhone(row[columnIndexes.telefone]);
    const paroquia = cleanName(row[columnIndexes.paroquia]);

    if (!nomeBruto) continue;

    memberRowsDetected += 1;
    if (!cargoAtual) {
      rowsWithoutCargo += 1;
      errors.push(`Linha ${i + 1}: Membro '${nomeBruto}' sem cargo definido.`);
      continue;
    }

    const currentCargoStats = ensureCargoStats(cargoAtual, pairingMode);
    currentCargoStats.memberRows += 1;

    if (pairingMode) {
      if (!bufferCasal) {
        bufferCasal = {
          nome: nomeBruto,
          telefone,
          paroquia,
          line: i + 1
        };
      } else {
        registerRecord(
          {
            encontroId: encounterId,
            equipeId: teamId,
            cargoNome: cargoAtual,
            nomePrincipal: bufferCasal.nome,
            nomeSecundario: nomeBruto,
            telefonePrincipal: bufferCasal.telefone,
            telefoneSecundario: telefone,
            paroquia: bufferCasal.paroquia || paroquia
          },
          true
        );
        bufferCasal = null;
      }
    } else {
      flushBufferAsIndividual(i + 1, false);
      registerRecord(
        {
          encontroId: encounterId,
          equipeId: teamId,
          cargoNome: cargoAtual,
          nomePrincipal: nomeBruto,
          nomeSecundario: null,
          telefonePrincipal: telefone,
          telefoneSecundario: null,
          paroquia
        },
        false
      );
    }
  }

  flushBufferAsIndividual(rows.length, pairingMode);

  const cargos = [...cargoStatsByKey.values()]
    .sort((a, b) => a.cargo.localeCompare(b.cargo, "pt-BR"))
    .map((item) => ({
      cargo: item.cargo,
      mode: item.pairMode ? "CASAL" : "INDIVIDUAL",
      memberRows: item.memberRows,
      registrosPrevistos: item.registrosPrevistos,
      casaisPrevistos: item.casaisPrevistos,
      individuaisPrevistos: item.individuaisPrevistos,
      sobrasCasal: item.sobrasCasal
    }));

  if (rowsWithoutCargo > 0) {
    differences.push(
      buildDifference(
        "error",
        "ROWS_WITHOUT_CARGO",
        `${rowsWithoutCargo} linha(s) de membro sem cargo válido foram detectadas.`,
        { rowsWithoutCargo }
      )
    );
  }

  if (profileCode === TEAM_IMPORT_PROFILE.TIOS_CARONA) {
    const jovensCoordenadores = cargos.filter((item) => isJovemCoordenadorCargo(item.cargo));
    if (jovensCoordenadores.length === 0) {
      differences.push(
        buildDifference(
          "info",
          "NO_JOVEM_COORDENADOR",
          "Nenhum cargo de Jovens Coordenadores foi detectado neste arquivo."
        )
      );
    }

    const individuaisForaRegra = cargos.filter(
      (item) => item.mode === "INDIVIDUAL" && !isJovemCoordenadorCargo(item.cargo)
    );
    for (const diffCargo of individuaisForaRegra) {
      differences.push(
        buildDifference(
          "warning",
          "TIOS_CARONA_INDIVIDUAL_OUTSIDE_RULE",
          `Cargo '${diffCargo.cargo}' foi lido como individual, mas o perfil Tios Carona costuma exigir casal.`,
          { cargo: diffCargo.cargo }
        )
      );
    }
  }

  if (profileCode === TEAM_IMPORT_PROFILE.SALA) {
    if (colorLabelsDetected.size > 0) {
      differences.push(
        buildDifference(
          "info",
          "SALA_SECTION_MARKERS",
          `Marcadores de seção detectados e ignorados: ${[...colorLabelsDetected].join(", ")}.`
        )
      );
    } else {
      differences.push(
        buildDifference(
          "info",
          "SALA_NO_SECTION_MARKERS",
          "Nenhum marcador de seção (AMARELO, AZUL etc.) foi detectado no arquivo de Sala."
        )
      );
    }
  }

  if (profileCode === TEAM_IMPORT_PROFILE.GERAL) {
    const hasCoord = cargos.some((item) => normalizeCargoKey(item.cargo).includes("COORD"));
    if (!hasCoord) {
      differences.push(
        buildDifference(
          "warning",
          "GERAL_WITHOUT_COORDENACAO",
          "Nenhum cargo de coordenação foi identificado no arquivo da equipe Geral."
        )
      );
    }
  }

  if (records.length === 0) {
    differences.push(
      buildDifference(
        "error",
        "NO_RECORDS_DETECTED",
        "Nenhum membro válido foi detectado para importação com as regras atuais."
      )
    );
  }

  const casaisPrevistos = records.filter((record) => Boolean(record.nomeSecundario)).length;
  const individuaisPrevistos = records.length - casaisPrevistos;

  return {
    records,
    diagnostics: {
      team: {
        id: team.id,
        nome: team.nome,
        tipo: team.tipo,
        profileCode,
        profileLabel: getProfileLabel(profileCode),
        rules
      },
      summary: {
        linhasLidas: rows.length,
        cabecalhosDetectados: tableHeadersDetected,
        labelsIgnorados: ignoredLabels.length,
        linhasComMembros: memberRowsDetected,
        linhasSemCargo: rowsWithoutCargo,
        cargosDetectados: cargos.length,
        registrosPrevistos: records.length,
        casaisPrevistos,
        individuaisPrevistos
      },
      cargos,
      differences,
      errors,
      warnings
    }
  };
}

export async function validateMembersImportFile({ encounterId, teamId, filePath }) {
  const team = await ensureEncounterAndTeam(encounterId, teamId);
  const rows = await parseSpreadsheetRows(filePath);
  const { diagnostics } = parseMembersRows({ encounterId, teamId, team, rows });
  return diagnostics;
}

export async function importMembersFromFile({ encounterId, teamId, filePath }) {
  const team = await ensureEncounterAndTeam(encounterId, teamId);
  const rows = await parseSpreadsheetRows(filePath);
  const { records, diagnostics } = parseMembersRows({ encounterId, teamId, team, rows });

  const client = await pool.connect();
  const membrosCriados = [];

  try {
    await client.query("BEGIN");

    for (const record of records) {
      const result = await client.query(
        `
          INSERT INTO membros (
            encontro_id,
            equipe_id,
            cargo_nome,
            nome_principal,
            nome_secundario,
            telefone_principal,
            telefone_secundario,
            paroquia
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, nome_secundario
        `,
        [
          record.encontroId,
          record.equipeId,
          record.cargoNome,
          record.nomePrincipal,
          record.nomeSecundario,
          record.telefonePrincipal,
          record.telefoneSecundario,
          record.paroquia
        ]
      );
      membrosCriados.push(result.rows[0]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const total = membrosCriados.length;
  const casais = membrosCriados.filter((membro) => Boolean(membro.nome_secundario)).length;
  const individuais = total - casais;

  return {
    total,
    individuais,
    casais,
    erros: diagnostics.errors || [],
    totalLinhasArquivo: rows.length,
    diagnostico: diagnostics
  };
}

const CIRCLE_COLOR_MAP = {
  VERMELHO: "#F44336",
  AMARELO: "#FFEB3B",
  VERDE: "#4CAF50",
  AZUL: "#2196F3",
  LARANJA: "#FF9800",
  ROXO: "#9C27B0",
  ROSA: "#E91E63",
  MARROM: "#795548",
  CINZA: "#9E9E9E",
  BRANCO: "#FFFFFF",
  PRETO: "#000000"
};

function findHeaderIndex(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = (rows[i] || []).map((cell) => normalizeText(cell || ""));
    if (row.some((cell) => cell.includes("NOME")) && row.some((cell) => cell.includes("CIRCULO") || cell === "COR")) {
      return i;
    }
  }
  return -1;
}

function resolveColumnIndexes(headerRow) {
  const normalized = headerRow.map((cell) => normalizeText(cell || ""));
  const nomeIndex = normalized.findIndex((cell) => cell.includes("NOME"));
  const circuloIndex = normalized.findIndex((cell) => cell.includes("CIRCULO") || cell === "COR");
  const telefoneIndex = normalized.findIndex((cell) => cell.includes("TELEFONE") || cell.includes("CELULAR"));
  const paroquiaIndex = normalized.findIndex((cell) => cell.includes("PAROQUIA") || cell.includes("PARÓQUIA"));
  return { nomeIndex, circuloIndex, telefoneIndex, paroquiaIndex };
}

function deriveCircleMeta(rawName) {
  const base = cleanName(rawName);
  if (!base) return null;
  const normalized = normalizeText(base).toUpperCase();
  const hasPrefix = normalized.startsWith("CIRCULO");
  const displayName = hasPrefix ? base : `Círculo ${base}`;
  const colorHex = CIRCLE_COLOR_MAP[normalized.replace("CIRCULO", "").trim()] || CIRCLE_COLOR_MAP[normalized] || "#CCCCCC";
  return { displayName, colorHex };
}

async function getOrCreateCircleTeam(client, encounterId, displayName, colorHex) {
  const existing = await client.query(
    "SELECT * FROM equipes WHERE encontro_id = $1 AND UPPER(nome) = UPPER($2) AND tipo = 'CIRCULO' LIMIT 1",
    [encounterId, displayName]
  );

  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    if (!row.cor_hex || row.cor_hex !== colorHex) {
      const updated = await client.query(
        "UPDATE equipes SET cor_hex = $1 WHERE id = $2 RETURNING *",
        [colorHex, row.id]
      );
      return { team: updated.rows[0], created: false };
    }
    return { team: row, created: false };
  }

  const created = await client.query(
    "INSERT INTO equipes (encontro_id, nome, tipo, cor_hex, ordem) VALUES ($1, $2, 'CIRCULO', $3, 50) RETURNING *",
    [encounterId, displayName, colorHex]
  );
  return { team: created.rows[0], created: true };
}

export async function importCirclesFromFile({ encounterId, filePath }) {
  const encounter = await pool.query("SELECT id FROM encontros WHERE id = $1", [encounterId]);
  if (encounter.rowCount === 0) {
    const error = new Error("Encontro nao encontrado.");
    error.status = 404;
    throw error;
  }

  const rows = await parseSpreadsheetRows(filePath);
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) {
    const error = new Error("Arquivo invalido. Informe colunas com NOME e CIRCULO/COR.");
    error.status = 400;
    throw error;
  }

  const indexes = resolveColumnIndexes(rows[headerIndex] || []);
  if (indexes.nomeIndex < 0 || indexes.circuloIndex < 0) {
    const error = new Error("Colunas obrigatorias nao encontradas: NOME e CIRCULO/COR.");
    error.status = 400;
    throw error;
  }

  const stats = {
    circulosCriados: 0,
    membrosCriados: 0,
    linhasLidas: rows.length,
    erros: []
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = headerIndex + 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      const nome = cleanName(row[indexes.nomeIndex]);
      const circuloRaw = cleanName(row[indexes.circuloIndex]);
      if (!nome || !circuloRaw) continue;

      const circleMeta = deriveCircleMeta(circuloRaw);
      if (!circleMeta) continue;

      const { team, created } = await getOrCreateCircleTeam(
        client,
        encounterId,
        circleMeta.displayName,
        circleMeta.colorHex
      );
      if (created) stats.circulosCriados += 1;

      const cargoNome = "Jovens";
      const telefone = indexes.telefoneIndex >= 0 ? cleanPhone(row[indexes.telefoneIndex]) : null;
      const paroquia = indexes.paroquiaIndex >= 0 ? cleanName(row[indexes.paroquiaIndex]) : null;

      const exists = await client.query(
        "SELECT id FROM membros WHERE encontro_id = $1 AND equipe_id = $2 AND UPPER(nome_principal) = UPPER($3) LIMIT 1",
        [encounterId, team.id, nome]
      );
      if (exists.rowCount > 0) continue;

      await client.query(
        `
          INSERT INTO membros (
            encontro_id, equipe_id, cargo_nome, nome_principal, telefone_principal, paroquia
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [encounterId, team.id, cargoNome, nome, telefone, paroquia]
      );
      stats.membrosCriados += 1;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return stats;
}

