import fs from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import "dayjs/locale/pt-br.js";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function clampNumber(raw, min, max, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeBoolean(raw, fallback) {
  if (raw === true || raw === false) return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

function normalizeHexColor(raw, fallback) {
  const value = String(raw || "").trim();
  return HEX_COLOR_REGEX.test(value) ? value.toUpperCase() : fallback;
}

function normalizeFontFamily(raw, fallback) {
  const value = String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9\s,'"_\-\.]/g, "");
  if (!value) return fallback;
  return value.slice(0, 120);
}

function sanitizeText(raw, fallback = "", maxLength = 80) {
  const value = String(raw ?? "").trim();
  if (!value) return fallback;
  return value.slice(0, maxLength);
}

function normalizePhotoShape(raw, fallback = DEFAULT_PDF_VISUAL_CONFIG.formato_foto_circulo) {
  const value = normalize(raw);
  return PHOTO_SHAPES.has(value) ? value : fallback;
}

function normalizeTableModel(raw) {
  const value = normalize(raw);
  return TABLE_MODELS.has(value) ? value : DEFAULT_PDF_VISUAL_CONFIG.modelo_tabela_equipe;
}

function normalizeLeadershipStyle(raw) {
  const value = normalize(raw);
  return LEADERSHIP_STYLES.has(value) ? value : DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_estilo;
}

function normalizePdfVisualConfig(rawConfig = {}) {
  const raw = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
  const legacyCircleShape = normalizePhotoShape(
    raw.formato_foto_circulo,
    DEFAULT_PDF_VISUAL_CONFIG.formato_foto_circulo
  );
  const leadershipCircleShape = normalizePhotoShape(raw.formato_foto_lideranca_circulo, legacyCircleShape);
  const participantCircleShape = normalizePhotoShape(raw.formato_foto_participante_circulo, legacyCircleShape);
  return {
    foto_equipe_largura_mm: clampNumber(
      raw.foto_equipe_largura_mm,
      80,
      190,
      DEFAULT_PDF_VISUAL_CONFIG.foto_equipe_largura_mm
    ),
    foto_equipe_altura_mm: clampNumber(
      raw.foto_equipe_altura_mm,
      50,
      250,
      DEFAULT_PDF_VISUAL_CONFIG.foto_equipe_altura_mm
    ),
    foto_lider_largura_mm: clampNumber(
      raw.foto_lider_largura_mm,
      10,
      40,
      DEFAULT_PDF_VISUAL_CONFIG.foto_lider_largura_mm
    ),
    foto_lider_altura_mm: clampNumber(
      raw.foto_lider_altura_mm,
      10,
      50,
      DEFAULT_PDF_VISUAL_CONFIG.foto_lider_altura_mm
    ),
    foto_participante_largura_px: clampNumber(
      raw.foto_participante_largura_px,
      18,
      80,
      DEFAULT_PDF_VISUAL_CONFIG.foto_participante_largura_px
    ),
    foto_participante_altura_px: clampNumber(
      raw.foto_participante_altura_px,
      18,
      100,
      DEFAULT_PDF_VISUAL_CONFIG.foto_participante_altura_px
    ),
    // `formato_foto_circulo` mantido por compatibilidade com versões anteriores.
    formato_foto_circulo: participantCircleShape,
    formato_foto_lideranca_circulo: leadershipCircleShape,
    formato_foto_participante_circulo: participantCircleShape,
    modelo_tabela_equipe: normalizeTableModel(raw.modelo_tabela_equipe),
    fonte_base: normalizeFontFamily(raw.fonte_base, DEFAULT_PDF_VISUAL_CONFIG.fonte_base),
    fonte_slogan: normalizeFontFamily(raw.fonte_slogan, DEFAULT_PDF_VISUAL_CONFIG.fonte_slogan),
    margem_topo_mm: clampNumber(raw.margem_topo_mm, 0, 25, DEFAULT_PDF_VISUAL_CONFIG.margem_topo_mm),
    margem_direita_mm: clampNumber(raw.margem_direita_mm, 0, 25, DEFAULT_PDF_VISUAL_CONFIG.margem_direita_mm),
    margem_inferior_mm: clampNumber(
      raw.margem_inferior_mm,
      8,
      45,
      DEFAULT_PDF_VISUAL_CONFIG.margem_inferior_mm
    ),
    margem_esquerda_mm: clampNumber(raw.margem_esquerda_mm, 0, 25, DEFAULT_PDF_VISUAL_CONFIG.margem_esquerda_mm),
    rodape_ativo: normalizeBoolean(raw.rodape_ativo, DEFAULT_PDF_VISUAL_CONFIG.rodape_ativo),
    rodape_altura_mm: clampNumber(raw.rodape_altura_mm, 8, 22, DEFAULT_PDF_VISUAL_CONFIG.rodape_altura_mm),
    rodape_cor_fundo: normalizeHexColor(raw.rodape_cor_fundo, DEFAULT_PDF_VISUAL_CONFIG.rodape_cor_fundo),
    rodape_cor_texto: normalizeHexColor(raw.rodape_cor_texto, DEFAULT_PDF_VISUAL_CONFIG.rodape_cor_texto),
    rodape_maiusculo: normalizeBoolean(raw.rodape_maiusculo, DEFAULT_PDF_VISUAL_CONFIG.rodape_maiusculo),
    marca_dagua_ativa: normalizeBoolean(raw.marca_dagua_ativa, DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_ativa),
    marca_dagua_texto: sanitizeText(raw.marca_dagua_texto, DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_texto, 80),
    marca_dagua_opacidade: clampNumber(
      raw.marca_dagua_opacidade,
      0.02,
      0.35,
      DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_opacidade
    ),
    marca_dagua_tamanho_pt: clampNumber(
      raw.marca_dagua_tamanho_pt,
      18,
      120,
      DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_tamanho_pt
    ),
    marca_dagua_cor: normalizeHexColor(raw.marca_dagua_cor, DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_cor),
    caixa_lideranca_estilo: normalizeLeadershipStyle(raw.caixa_lideranca_estilo),
    caixa_lideranca_cor_fundo: normalizeHexColor(
      raw.caixa_lideranca_cor_fundo,
      DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_cor_fundo
    ),
    caixa_lideranca_cor_borda: normalizeHexColor(
      raw.caixa_lideranca_cor_borda,
      DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_cor_borda
    ),
    caixa_lideranca_raio_px: clampNumber(
      raw.caixa_lideranca_raio_px,
      0,
      40,
      DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_raio_px
    )
  };
}

function normalizePdfVisualTemplates(rawValue) {
  const raw = rawValue && typeof rawValue === "object" ? rawValue : {};
  let templates = Array.isArray(raw.templates) ? raw.templates : [];

  const looksLikeLegacySingleConfig =
    templates.length === 0 &&
    (raw.formato_foto_circulo ||
      raw.formato_foto_lideranca_circulo ||
      raw.formato_foto_participante_circulo ||
      raw.modelo_tabela_equipe ||
      raw.margem_topo_mm !== undefined ||
      raw.rodape_ativo !== undefined);

  if (looksLikeLegacySingleConfig) {
    templates = [{ id: DEFAULT_TEMPLATE_ID, nome: "Padrão do sistema", config: raw }];
  }

  if (templates.length === 0) {
    templates = [{ id: DEFAULT_TEMPLATE_ID, nome: "Padrão do sistema", config: DEFAULT_PDF_VISUAL_CONFIG }];
  }

  const normalizedTemplates = templates.map((item, index) => {
    const id = String(item?.id || "").trim() || (index === 0 ? DEFAULT_TEMPLATE_ID : `template-${index + 1}`);
    const nome = String(item?.nome || "").trim() || `Template ${index + 1}`;
    return {
      id,
      nome,
      config: normalizePdfVisualConfig(item?.config)
    };
  });

  const activeTemplateIdRaw = String(raw.active_template_id || "").trim();
  const activeTemplate =
    normalizedTemplates.find((item) => item.id === activeTemplateIdRaw) || normalizedTemplates[0];
  const publishedTemplateIdRaw = String(raw.published_template_id || "").trim();
  const publishedTemplate =
    normalizedTemplates.find((item) => item.id === publishedTemplateIdRaw) || activeTemplate || normalizedTemplates[0];
  const history = Array.isArray(raw.history) ? raw.history : [];

  return {
    active_template_id: activeTemplate?.id || DEFAULT_TEMPLATE_ID,
    published_template_id: publishedTemplate?.id || activeTemplate?.id || DEFAULT_TEMPLATE_ID,
    templates: normalizedTemplates,
    history
  };
}

const MEDIA_CACHE = new Map();
const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};
const MEDIA_CACHE_MAX_ENTRIES = 500;
const PDF_TITLE_SETTINGS_KEY = "pdf_team_title";
const PDF_VISUAL_TEMPLATES_KEY = "pdf_visual_templates";
const DEFAULT_TEMPLATE_ID = "default";
const PHOTO_SHAPES = new Set(["SQUARE", "ROUNDED", "CIRCLE", "PASSPORT_3X4"]);
const TABLE_MODELS = new Set(["COMPACT", "STANDARD", "COMFORTABLE"]);
const LEADERSHIP_STYLES = new Set(["SOFT", "BORDERED", "MINIMAL"]);
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_PDF_VISUAL_CONFIG = Object.freeze({
  foto_equipe_largura_mm: 150,
  foto_equipe_altura_mm: 100,
  foto_lider_largura_mm: 18,
  foto_lider_altura_mm: 18,
  foto_participante_largura_px: 30,
  foto_participante_altura_px: 30,
  formato_foto_circulo: "ROUNDED",
  formato_foto_lideranca_circulo: "ROUNDED",
  formato_foto_participante_circulo: "ROUNDED",
  modelo_tabela_equipe: "STANDARD",
  fonte_base: "Montserrat, Arial, sans-serif",
  fonte_slogan: "Caveat, cursive",
  margem_topo_mm: 8,
  margem_direita_mm: 8,
  margem_inferior_mm: 35,
  margem_esquerda_mm: 8,
  rodape_ativo: true,
  rodape_altura_mm: 12,
  rodape_cor_fundo: "#333333",
  rodape_cor_texto: "#FFFFFF",
  rodape_maiusculo: true,
  marca_dagua_ativa: false,
  marca_dagua_texto: "",
  marca_dagua_opacidade: 0.08,
  marca_dagua_tamanho_pt: 44,
  marca_dagua_cor: "#7A1F3D",
  caixa_lideranca_estilo: "SOFT",
  caixa_lideranca_cor_fundo: "#F9F9F9",
  caixa_lideranca_cor_borda: "#DDDDDD",
  caixa_lideranca_raio_px: 8
});

function getCachedMedia(key) {
  if (!MEDIA_CACHE.has(key)) {
    return null;
  }
  const value = MEDIA_CACHE.get(key);
  MEDIA_CACHE.delete(key);
  MEDIA_CACHE.set(key, value);
  return value;
}

function setCachedMedia(key, value) {
  if (MEDIA_CACHE.has(key)) {
    MEDIA_CACHE.delete(key);
  }
  MEDIA_CACHE.set(key, value);
  if (MEDIA_CACHE.size <= MEDIA_CACHE_MAX_ENTRIES) {
    return;
  }
  const firstKey = MEDIA_CACHE.keys().next().value;
  if (firstKey !== undefined) {
    MEDIA_CACHE.delete(firstKey);
  }
}

function sanitizeUploadRelativePath(rawPath) {
  const cleaned = String(rawPath || "")
    .trim()
    .replace(/\\/g, "/")
    .split("?")[0]
    .split("#")[0];
  if (!cleaned) return null;

  const marker = "/uploads/";
  const markerIndex = cleaned.toLowerCase().indexOf(marker);
  if (markerIndex >= 0) {
    return cleaned.slice(markerIndex + marker.length).replace(/^\/+/, "");
  }

  const withoutLeadingSlash = cleaned.replace(/^\/+/, "");
  if (withoutLeadingSlash.toLowerCase().startsWith("uploads/")) {
    return withoutLeadingSlash.slice("uploads/".length);
  }
  return withoutLeadingSlash;
}

function toUploadAbsolutePath(mediaPath) {
  if (!mediaPath) return null;
  let candidatePath = String(mediaPath);
  if (candidatePath.startsWith("http://") || candidatePath.startsWith("https://")) {
    try {
      candidatePath = new URL(candidatePath).pathname;
    } catch {
      candidatePath = String(mediaPath);
    }
  }

  const relativePath = sanitizeUploadRelativePath(candidatePath);
  if (!relativePath) return null;
  const absolutePath = path.resolve(env.uploadDir, relativePath);
  const normalizedRoot = `${path.resolve(env.uploadDir)}${path.sep}`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    return null;
  }
  return absolutePath;
}

function mediaForPdf(mediaPath) {
  if (!mediaPath) return null;
  if (String(mediaPath).startsWith("data:")) return mediaPath;

  const cached = getCachedMedia(mediaPath);
  if (cached) {
    return cached;
  }

  try {
    const absolute = toUploadAbsolutePath(mediaPath);
    if (!absolute) {
      throw new Error("Caminho de upload invalido.");
    }

    const bytes = fs.readFileSync(absolute);
    const ext = path.extname(absolute).toLowerCase();
    const mime = MIME_BY_EXT[ext] || "application/octet-stream";
    const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
    setCachedMedia(mediaPath, dataUri);
    return dataUri;
  } catch {
    if (String(mediaPath).startsWith("http://") || String(mediaPath).startsWith("https://")) {
      return mediaPath;
    }
    const formatted = String(mediaPath).startsWith("/") ? String(mediaPath) : `/${String(mediaPath)}`;
    return `http://127.0.0.1:${env.port}${formatted}`;
  }
}

function safeFileName(value, prefix = "quadrante") {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized ? `${prefix}_${normalized}.pdf` : `${prefix}.pdf`;
}

function fullPageImage(url) {
  if (!url) return "";
  return `<section class="full-page page-break"><img src="${escapeHtml(url)}" class="full-page-image" /></section>`;
}

function normalizePdfTitleMode(value) {
  const mode = normalize(value);
  if (mode === "CUSTOM_FONT") return "CUSTOM_FONT";
  if (mode === "TEAM_ART") return "TEAM_ART";
  return "SYSTEM_FONT";
}

function fontCssFormatByPath(mediaPath) {
  const ext = path.extname(String(mediaPath || "")).toLowerCase();
  if (ext === ".woff2") return "woff2";
  if (ext === ".woff") return "woff";
  if (ext === ".otf") return "opentype";
  return "truetype";
}

async function loadPdfTitleSettings() {
  const result = await pool.query("SELECT valor FROM app_settings WHERE chave = $1 LIMIT 1", [PDF_TITLE_SETTINGS_KEY]);
  const raw = result.rowCount > 0 ? result.rows[0].valor || {} : {};
  return {
    mode: normalizePdfTitleMode(raw.mode),
    fontUrl: raw.font_url ? String(raw.font_url) : null
  };
}

async function loadPdfVisualTemplatesSettings() {
  const result = await pool.query("SELECT valor FROM app_settings WHERE chave = $1 LIMIT 1", [PDF_VISUAL_TEMPLATES_KEY]);
  const raw = result.rowCount > 0 ? result.rows[0].valor || {} : {};
  return normalizePdfVisualTemplates(raw);
}

function resolvePdfVisualConfig(pdfVisualTemplates) {
  const normalized = normalizePdfVisualTemplates(pdfVisualTemplates || {});
  const published = normalized.templates.find((template) => template.id === normalized.published_template_id);
  const active = normalized.templates.find((template) => template.id === normalized.active_template_id);
  return normalizePdfVisualConfig(
    published?.config || active?.config || normalized.templates[0]?.config || DEFAULT_PDF_VISUAL_CONFIG
  );
}

function escapeCssContent(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
}

function groupMembersByCargo(members) {
  const map = new Map();
  for (const member of members) {
    const cargo = (member.cargo_nome || "SEM CARGO").trim() || "SEM CARGO";
    if (!map.has(cargo)) map.set(cargo, []);
    map.get(cargo).push(member);
  }

  const cargoRank = (cargoNome) => {
    const cargo = normalize(cargoNome || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!cargo) return 9;
    if (cargo.includes("DIRETOR ESPIRITUAL")) return 0;
    if (/\bJOVENS?\b/.test(cargo) && cargo.includes("COORD")) return 1;
    if (/\bTIOS?\b/.test(cargo) && cargo.includes("COORD")) return 2;
    if (/\bTIOS?\b/.test(cargo) && cargo.includes("APOIO")) return 3;
    return 9;
  };

  return [...map.entries()]
    .sort((a, b) => {
      const rankDiff = cargoRank(a[0]) - cargoRank(b[0]);
      if (rankDiff !== 0) return rankDiff;
      return a[0].localeCompare(b[0], "pt-BR");
    })
    .map(([cargo, list]) => ({
      cargo,
      membros: list.sort((a, b) => a.nome_principal.localeCompare(b.nome_principal, "pt-BR"))
    }));
}

function formatMemberName(member) {
  if (member.nome_secundario && String(member.nome_secundario).trim()) {
    return `${member.nome_principal} & ${member.nome_secundario}`;
  }
  return member.nome_principal;
}

function formatPhones(member) {
  const phones = [member.telefone_principal, member.telefone_secundario].filter(Boolean);
  return phones.length > 0 ? phones.join(" / ") : "-";
}

function capitalizeFirst(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseEncounterDate(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function formatDatePtBrLong(dateValue) {
  const parsed = parseEncounterDate(dateValue);
  if (!parsed) return "";
  return `${parsed.format("DD")} de ${capitalizeFirst(parsed.locale("pt-br").format("MMMM"))} de ${parsed.format("YYYY")}`;
}

function formatEncounterPeriodPtBr(encounter) {
  const start = parseEncounterDate(encounter?.data_inicio || encounter?.data_encontro);
  const end = parseEncounterDate(encounter?.data_fim || encounter?.data_encontro || encounter?.data_inicio);

  if (!start && !end) return "";
  if (!start || !end) {
    return formatDatePtBrLong(start || end);
  }

  return `${start.format("DD")} de ${capitalizeFirst(start.locale("pt-br").format("MMMM"))} a ${end.format("DD")} de ${capitalizeFirst(end.locale("pt-br").format("MMMM"))} de ${end.format("YYYY")}`;
}

function formatFooter(encounter) {
  const encounterLabel = escapeHtml(encounter.nome || encounter.tema || "");
  const periodLabel = escapeHtml(formatEncounterPeriodPtBr(encounter));

  if (encounterLabel && periodLabel) {
    return `${encounterLabel} • ${periodLabel}`;
  }
  return encounterLabel || periodLabel || "-";
}

function resolveCirclePhotoGeometry(pdfVisualConfig) {
  const legacyShape = normalizePhotoShape(
    pdfVisualConfig.formato_foto_circulo,
    DEFAULT_PDF_VISUAL_CONFIG.formato_foto_circulo
  );
  const leaderShape = normalizePhotoShape(pdfVisualConfig.formato_foto_lideranca_circulo, legacyShape);
  const participantShape = normalizePhotoShape(pdfVisualConfig.formato_foto_participante_circulo, legacyShape);

  const resolveShape = (shape, rawWidth, rawHeight, minWidthForPassport) => {
    let width = Number(rawWidth);
    let height = Number(rawHeight);

    if (shape === "SQUARE" || shape === "ROUNDED" || shape === "CIRCLE") {
      const side = Math.min(width, height);
      width = side;
      height = side;
    } else if (shape === "PASSPORT_3X4") {
      width = Math.max(minWidthForPassport, Math.round((height * 3) / 4));
    }

    const borderRadius = (() => {
      if (shape === "CIRCLE") return "999px";
      if (shape === "ROUNDED") return "6px";
      if (shape === "PASSPORT_3X4") return "4px";
      return "0px";
    })();

    return { width, height, borderRadius };
  };

  const leader = resolveShape(
    leaderShape,
    pdfVisualConfig.foto_lider_largura_mm,
    pdfVisualConfig.foto_lider_altura_mm,
    8
  );
  const participant = resolveShape(
    participantShape,
    pdfVisualConfig.foto_participante_largura_px,
    pdfVisualConfig.foto_participante_altura_px,
    14
  );

  return {
    leaderShape,
    participantShape,
    leaderWidth: leader.width,
    leaderHeight: leader.height,
    leaderBorderRadius: leader.borderRadius,
    participantWidth: participant.width,
    participantHeight: participant.height,
    participantBorderRadius: participant.borderRadius
  };
}

function renderCircleContent(encounter, team, members, pdfVisualConfig) {
  const leadersTios = [];
  const leadersJovens = [];
  const participantes = [];

  for (const member of members) {
    const cargo = normalize(member.cargo_nome)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const item = {
      nome: formatMemberName(member),
      tel: formatPhones(member),
      paroquia: member.paroquia || "",
      foto: mediaForPdf(member.foto_url)
    };

    const isTioCirculista = /\bTIOS?\b/.test(cargo) || cargo.includes("CASAL");
    const isJovemCirculista = cargo.includes("JOVEM") && cargo.includes("CIRCULIST");

    if (isTioCirculista) {
      leadersTios.push(item);
    } else if (isJovemCirculista) {
      leadersJovens.push(item);
    } else {
      participantes.push(item);
    }
  }

  participantes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const footer = formatFooter(encounter);

  const renderLeader = (leader) => `
    <div class="leader-card">
      ${leader.foto ? `<img src="${escapeHtml(leader.foto)}" class="leader-photo" />` : `<div class="leader-photo"></div>`}
      <div>
        <div class="leader-name">${escapeHtml(leader.nome)}</div>
        <div class="leader-meta">${escapeHtml(leader.tel)}</div>
        <div class="leader-meta">${escapeHtml(leader.paroquia)}</div>
      </div>
    </div>
  `;

  const renderParticipant = (person) => `
    <div class="participant-card">
      ${person.foto ? `<img src="${escapeHtml(person.foto)}" class="participant-photo" />` : `<div class="participant-photo"></div>`}
      <div class="participant-data">
        <div class="participant-name">${escapeHtml(person.nome)}</div>
        <div class="participant-meta">${escapeHtml(person.tel)}</div>
        <div class="participant-meta">${escapeHtml(person.paroquia)}</div>
      </div>
    </div>
  `;

  return `
    <section class="page page-break">
      <div class="footer-bar">${footer}</div>
      <header class="circulo-header">
        <h1 style="color:${escapeHtml(team.cor_hex || "#333")}">${escapeHtml(team.nome)}</h1>
        <p>${escapeHtml(team.slogan || "")}</p>
      </header>
      <section class="leadership-box">
        <div class="leader-column">
          <h3>Tios Circulistas</h3>
          ${leadersTios.map(renderLeader).join("")}
        </div>
        <div class="leader-column">
          <h3>Jovem Circulista</h3>
          ${leadersJovens.map(renderLeader).join("")}
        </div>
      </section>
      <section class="participants-grid">
        ${participantes.map(renderParticipant).join("")}
      </section>
    </section>
  `;
}

function renderTeamContent(encounter, team, members, pdfTitleSettings, pdfVisualConfig) {
  const grouped = groupMembersByCargo(members);
  const footer = formatFooter(encounter);
  const teamPhoto = mediaForPdf(team.foto_url);
  const titleArt = mediaForPdf(team.titulo_arte_url);
  const titleMode = normalizePdfTitleMode(pdfTitleSettings?.mode);
  const tableMode = normalizeTableModel(pdfVisualConfig?.modelo_tabela_equipe);
  const tableModeClass = `team-table-model-${tableMode.toLowerCase()}`;
  const canUseTitleArt = titleMode === "TEAM_ART" && Boolean(titleArt);
  const titleClass = titleMode === "CUSTOM_FONT" ? "team-title team-title-custom-font" : "team-title";
  const hasTeamPhoto = Boolean(teamPhoto);
  const totalUnits = grouped.reduce((sum, group) => sum + 1 + Math.ceil(group.membros.length / 2), 0);

  const renderRows = (list) => {
    let html = "";
    for (let i = 0; i < list.length; i += 2) {
      const left = list[i];
      const right = list[i + 1];
      html += `
        <tr>
          <td class="col-name">${escapeHtml(formatMemberName(left))}</td>
          <td class="col-phone">${escapeHtml(formatPhones(left))}</td>
          <td class="col-name">${right ? escapeHtml(formatMemberName(right)) : ""}</td>
          <td class="col-phone">${right ? escapeHtml(formatPhones(right)) : ""}</td>
        </tr>
      `;
    }
    return html;
  };

  const pageLayoutClass = (() => {
    if (!hasTeamPhoto) return "team-page-no-photo";
    if (totalUnits <= 21) return "team-page-compact";
    return "team-page-regular";
  })();

  const singlePageLimit = (() => {
    if (!hasTeamPhoto) return 28;
    if (pageLayoutClass === "team-page-compact") return 21;
    return 17;
  })();

  const firstPageCapacity = (() => {
    if (!hasTeamPhoto) return 28;
    if (pageLayoutClass === "team-page-compact") return 21;
    return 17;
  })();

  const continuedPageCapacity = hasTeamPhoto ? 31 : 33;
  const pages = [];

  if (totalUnits <= singlePageLimit) {
    pages.push(
      grouped.map((group) => ({
        cargo: group.cargo,
        membros: [...group.membros]
      }))
    );
  } else {
    pages.push([]);
    let currentCapacity = firstPageCapacity;
    let usedUnits = 0;

    const openNewPage = () => {
      pages.push([]);
      currentCapacity = continuedPageCapacity;
      usedUnits = 0;
    };

    for (const group of grouped) {
      let index = 0;
      while (index < group.membros.length) {
        let availableUnits = currentCapacity - usedUnits;
        if (availableUnits < 2) {
          openNewPage();
          availableUnits = currentCapacity - usedUnits;
        }

        const remainingMembers = group.membros.length - index;
        const remainingPairs = Math.ceil(remainingMembers / 2);
        const maxPairsForCurrentPage = Math.max(1, availableUnits - 1);
        const pairsToTake = Math.min(remainingPairs, maxPairsForCurrentPage);
        const membersToTake = Math.min(remainingMembers, pairsToTake * 2);
        const slice = group.membros.slice(index, index + membersToTake);

        pages[pages.length - 1].push({
          cargo: group.cargo,
          membros: slice
        });

        usedUnits += 1 + Math.ceil(slice.length / 2);
        index += membersToTake;

        if (index < group.membros.length) {
          openNewPage();
        }
      }
    }
  }

  const renderTables = (chunks) =>
    chunks
      .map(
        (group) => `
          <table class="team-table">
            <thead>
              <tr><th colspan="4">${escapeHtml(group.cargo)}</th></tr>
            </thead>
            <tbody>${renderRows(group.membros)}</tbody>
          </table>
        `
      )
      .join("");

  const firstPageTables = renderTables(pages[0] || []);
  const continuedPages = pages
    .slice(1)
    .map(
      (pageChunks) => `
        <section class="page page-break team-page ${pageLayoutClass} ${tableModeClass} team-page-continued">
          <div class="footer-bar">${footer}</div>
          <div class="team-page-body team-page-body-continued">
            ${renderTables(pageChunks)}
          </div>
        </section>
      `
    )
    .join("");

  return `
    <section class="page page-break team-page ${pageLayoutClass} ${tableModeClass}">
      <div class="footer-bar">${footer}</div>
      <div class="team-page-body">
        <header class="equipe-header">
          <div class="equipe-label">EQUIPE DE</div>
          ${
            canUseTitleArt
              ? `<div class="team-title-art-frame"><img src="${escapeHtml(titleArt)}" class="team-title-art" /></div>`
              : `<h1 class="${titleClass}">${escapeHtml(team.nome)}</h1>`
          }
        </header>
        ${teamPhoto ? `<div class="team-photo-frame"><img src="${escapeHtml(teamPhoto)}" class="team-photo" /></div>` : ""}
        ${firstPageTables}
      </div>
    </section>
    ${continuedPages}
  `;
}

async function loadEncounterBundle(encounterId) {
  const encounterResult = await pool.query("SELECT * FROM encontros WHERE id = $1", [encounterId]);
  if (encounterResult.rowCount === 0) {
    const error = new Error("Encontro nao encontrado.");
    error.status = 404;
    throw error;
  }

  const [teamsResult, membersResult, assetsResult, pdfTitleSettings, pdfVisualTemplates] = await Promise.all([
    pool.query("SELECT * FROM equipes WHERE encontro_id = $1 ORDER BY tipo ASC, ordem ASC, nome ASC", [encounterId]),
    pool.query("SELECT * FROM membros WHERE encontro_id = $1 ORDER BY equipe_id ASC, cargo_nome ASC, nome_principal ASC", [encounterId]),
    pool.query("SELECT * FROM encontro_assets WHERE encontro_id = $1 ORDER BY ordem ASC, id ASC", [encounterId]),
    loadPdfTitleSettings(),
    loadPdfVisualTemplatesSettings()
  ]);

  const membersByTeam = new Map();
  for (const member of membersResult.rows) {
    if (!membersByTeam.has(member.equipe_id)) membersByTeam.set(member.equipe_id, []);
    membersByTeam.get(member.equipe_id).push(member);
  }

  return {
    encounter: encounterResult.rows[0],
    teams: teamsResult.rows,
    membersByTeam,
    assets: assetsResult.rows,
    pdfTitleSettings,
    pdfVisualTemplates
  };
}

async function loadTeamBundle(teamId) {
  const teamResult = await pool.query(
    "SELECT e.*, en.nome AS encontro_nome, en.tema AS encontro_tema, en.data_inicio, en.data_fim, en.data_encontro FROM equipes e JOIN encontros en ON en.id = e.encontro_id WHERE e.id = $1",
    [teamId]
  );
  if (teamResult.rowCount === 0) {
    const error = new Error("Equipe/Circulo nao encontrado.");
    error.status = 404;
    throw error;
  }

  const [membersResult, pdfTitleSettings, pdfVisualTemplates] = await Promise.all([
    pool.query("SELECT * FROM membros WHERE equipe_id = $1 ORDER BY cargo_nome ASC, nome_principal ASC", [teamId]),
    loadPdfTitleSettings(),
    loadPdfVisualTemplatesSettings()
  ]);

  return { team: teamResult.rows[0], members: membersResult.rows, pdfTitleSettings, pdfVisualTemplates };
}

function encounterHtml(bundle) {
  const { encounter, teams, membersByTeam, assets, pdfTitleSettings, pdfVisualTemplates } = bundle;
  const pdfVisualConfig = resolvePdfVisualConfig(pdfVisualTemplates);
  const assetsByType = new Map();
  for (const asset of assets) {
    const key = normalize(asset.tipo);
    if (!assetsByType.has(key)) assetsByType.set(key, []);
    assetsByType.get(key).push(asset);
  }

  const sections = [];
  const appendAssets = (...types) => {
    for (const type of types) {
      const list = assetsByType.get(normalize(type)) || [];
      sections.push(...list.map((item) => fullPageImage(mediaForPdf(item.image_url))));
    }
  };

  // Ordem fixa solicitada:
  // Capa > Separador de Círculos > Cartaz do Círculo > Dados dos Círculos
  // > Separador de Equipes > Dados das Equipes > Música Tema
  // > Convite Pós Encontro > Contracapa.
  appendAssets("CAPA");
  appendAssets("SEPARADOR_CIRCULOS", "SEPARADOR_ENCONTRISTAS");

  const circles = teams.filter((team) => normalize(team.tipo) === "CIRCULO");
  const hasPerCirclePosters = circles.some((circle) => Boolean(mediaForPdf(circle.foto_url)));
  if (!hasPerCirclePosters) {
    appendAssets("CARTAZ_CIRCULO", "CARTAZ");
  }

  for (const circle of circles) {
    const circlePoster = mediaForPdf(circle.foto_url);
    if (circlePoster) {
      sections.push(fullPageImage(circlePoster));
    }
    sections.push(renderCircleContent(encounter, circle, membersByTeam.get(circle.id) || [], pdfVisualConfig));
  }

  appendAssets("SEPARADOR_EQUIPES", "SEPARADOR_ENCONTREIROS");
  for (const team of teams.filter((item) => normalize(item.tipo) === "TRABALHO")) {
    sections.push(
      renderTeamContent(encounter, team, membersByTeam.get(team.id) || [], pdfTitleSettings, pdfVisualConfig)
    );
  }

  appendAssets("MUSICA_TEMA");
  appendAssets("CONVITE_POS_ENCONTRO");
  appendAssets("CONTRACAPA");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head><meta charset="utf-8" /><title>Quadrante</title><style>${pdfCss(pdfTitleSettings, pdfVisualConfig)}</style></head>
      <body>${sections.join("\n")}</body>
    </html>
  `;
}

function teamHtml(bundle) {
  const pdfVisualConfig = resolvePdfVisualConfig(bundle.pdfVisualTemplates);
  const fakeEncounter = {
    nome: bundle.team.encontro_nome,
    tema: bundle.team.encontro_tema,
    data_inicio: bundle.team.data_inicio,
    data_fim: bundle.team.data_fim,
    data_encontro: bundle.team.data_encontro
  };
  const content = (() => {
    if (normalize(bundle.team.tipo) !== "CIRCULO") {
      return renderTeamContent(
        fakeEncounter,
        bundle.team,
        bundle.members,
        bundle.pdfTitleSettings,
        pdfVisualConfig
      ).replace("page-break", "");
    }

    const sections = [];
    const circlePoster = mediaForPdf(bundle.team.foto_url);
    if (circlePoster) {
      sections.push(fullPageImage(circlePoster));
    }
    sections.push(
      renderCircleContent(fakeEncounter, bundle.team, bundle.members, pdfVisualConfig).replace("page-break", "")
    );
    return sections.join("");
  })();

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Quadrante</title><style>${pdfCss(bundle.pdfTitleSettings, pdfVisualConfig)}</style></head><body>${content}</body></html>`;
}

function pdfCss(
  pdfTitleSettings = { mode: "SYSTEM_FONT", fontUrl: null },
  rawPdfVisualConfig = DEFAULT_PDF_VISUAL_CONFIG
) {
  const visualConfig = normalizePdfVisualConfig(rawPdfVisualConfig);
  const circlePhotoGeometry = resolveCirclePhotoGeometry(visualConfig);
  const baseFontFamily = normalizeFontFamily(visualConfig.fonte_base, DEFAULT_PDF_VISUAL_CONFIG.fonte_base);
  const sloganFontFamily = normalizeFontFamily(visualConfig.fonte_slogan, DEFAULT_PDF_VISUAL_CONFIG.fonte_slogan);
  const footerEnabled = Boolean(visualConfig.rodape_ativo);
  const footerHeightMm = Number(visualConfig.rodape_altura_mm);
  const pageBottomMm = footerEnabled
    ? Math.max(Number(visualConfig.margem_inferior_mm), footerHeightMm + 4)
    : Number(visualConfig.margem_inferior_mm);
  const teamBottomMm = footerEnabled ? Math.max(pageBottomMm, footerHeightMm + 4) : pageBottomMm;
  const watermarkText = String(visualConfig.marca_dagua_texto || "").trim();
  const watermarkEnabled = Boolean(visualConfig.marca_dagua_ativa && watermarkText);

  const leadershipStyle = normalizeLeadershipStyle(visualConfig.caixa_lideranca_estilo);
  const leadershipBorderWidthPx = leadershipStyle === "BORDERED" ? 2 : leadershipStyle === "MINIMAL" ? 0 : 1;
  const leadershipBackground =
    leadershipStyle === "MINIMAL" ? "transparent" : visualConfig.caixa_lideranca_cor_fundo;
  const leadershipBorderColor = visualConfig.caixa_lideranca_cor_borda;
  const leadershipShadow = leadershipStyle === "SOFT" ? "inset 0 0 0 1px rgba(255,255,255,0.5)" : "none";

  const participantCardHeightPx = Math.max(42, Math.round(circlePhotoGeometry.participantHeight + 12));
  const enableCustomFont = normalizePdfTitleMode(pdfTitleSettings.mode) === "CUSTOM_FONT" && pdfTitleSettings.fontUrl;
  const customFontFormat = enableCustomFont ? fontCssFormatByPath(pdfTitleSettings.fontUrl) : "truetype";
  const customFontFace = enableCustomFont
    ? `@font-face { font-family: "EquipeTituloCustom"; src: url("${escapeHtml(mediaForPdf(pdfTitleSettings.fontUrl))}") format("${customFontFormat}"); font-display: swap; }`
    : "";
  const watermarkCss = watermarkEnabled
    ? `
    .page::after,
    .full-page::after {
      content: "${escapeCssContent(watermarkText)}";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(-28deg);
      color: ${visualConfig.marca_dagua_cor};
      opacity: ${visualConfig.marca_dagua_opacidade};
      font-size: ${visualConfig.marca_dagua_tamanho_pt}pt;
      letter-spacing: 2px;
      z-index: 2;
      pointer-events: none;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-transform: uppercase;
    }
    .page > *,
    .full-page > * {
      position: relative;
      z-index: 1;
    }`
    : "";

  return `
    ${customFontFace}
    @page { size: A4; margin: 0; }
    body { margin: 0; font-family: ${baseFontFamily}; color: #333; }
    .page,
    .full-page { width: 210mm; min-height: 297mm; box-sizing: border-box; position: relative; overflow: hidden; }
    .page { padding: ${visualConfig.margem_topo_mm}mm ${visualConfig.margem_direita_mm}mm ${pageBottomMm}mm ${visualConfig.margem_esquerda_mm}mm; }
    .page-break { page-break-after: always; }
    .footer-bar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: ${footerHeightMm}mm;
      background: ${visualConfig.rodape_cor_fundo};
      color: ${visualConfig.rodape_cor_texto};
      display: ${footerEnabled ? "flex" : "none"};
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      text-transform: ${visualConfig.rodape_maiusculo ? "uppercase" : "none"};
      letter-spacing: 1px;
      line-height: 1.2;
      padding: 0 8mm;
      text-align: center;
    }
    .full-page { padding: 0; }
    .full-page-image { width: 210mm; height: 297mm; object-fit: cover; display: block; }
    .circulo-header { text-align: center; border-bottom: 1px solid #eee; margin-bottom: 5px; }
    .circulo-header h1 { margin: 0; font-size: 20pt; text-transform: uppercase; line-height: 1; }
    .circulo-header p {
      margin: 2px 0 5px;
      font-size: 10pt;
      text-transform: uppercase;
      color: #666;
      font-family: ${sloganFontFamily};
      letter-spacing: 0.3px;
    }
    .leadership-box {
      display: flex;
      gap: 10px;
      border: ${leadershipBorderWidthPx}px solid ${leadershipBorderColor};
      border-radius: ${visualConfig.caixa_lideranca_raio_px}px;
      background: ${leadershipBackground};
      box-shadow: ${leadershipShadow};
      padding: 6px;
      margin-bottom: 6px;
    }
    .leader-column { width: 50%; }
    .leader-column h3 { margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; color: #666; }
    .leader-card { display: flex; gap: 6px; margin-bottom: 4px; align-items: center; min-height: 20mm; }
    .leader-photo {
      width: ${circlePhotoGeometry.leaderWidth}mm;
      height: ${circlePhotoGeometry.leaderHeight}mm;
      border-radius: ${circlePhotoGeometry.leaderBorderRadius};
      object-fit: cover;
      background: #e5e5e5;
      flex-shrink: 0;
      border: 1px solid #d8d8d8;
    }
    .leader-name { font-size: 10pt; font-weight: 700; }
    .leader-meta { font-size: 8pt; color: #666; }
    .participants-grid { display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; }
    .participant-card {
      width: 49%;
      height: ${participantCardHeightPx}px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      gap: 4px;
      align-items: center;
      overflow: hidden;
    }
    .participant-photo {
      width: ${circlePhotoGeometry.participantWidth}px;
      height: ${circlePhotoGeometry.participantHeight}px;
      border-radius: ${circlePhotoGeometry.participantBorderRadius};
      object-fit: cover;
      background: #eee;
      flex-shrink: 0;
      border: 1px solid #d8d8d8;
    }
    .participant-data { min-width: 0; }
    .participant-name { font-size: 8pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .participant-meta { font-size: 7pt; color: #666; }
    .equipe-header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 5px; }
    .equipe-label { font-size: 12pt; color: #444; font-weight: 700; }
    .equipe-header h1 { margin: 2px 0 0; font-size: 18pt; text-transform: uppercase; }
    .team-title { font-family: ${baseFontFamily}; }
    .team-title-custom-font { font-family: "EquipeTituloCustom", ${baseFontFamily}; }
    .team-title-art-frame { width: 100%; min-height: 16mm; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
    .team-title-art { max-width: 90%; max-height: 24mm; object-fit: contain; }
    .team-page {
      padding: ${visualConfig.margem_topo_mm}mm ${visualConfig.margem_direita_mm}mm ${teamBottomMm}mm ${visualConfig.margem_esquerda_mm}mm;
    }
    .team-page-body { padding-bottom: 2mm; }
    .team-page-body-continued { padding-top: 3mm; }
    .team-photo-frame {
      width: ${visualConfig.foto_equipe_largura_mm}mm;
      height: ${visualConfig.foto_equipe_altura_mm}mm;
      margin: 0 auto 12px;
      border: 3px solid #444;
      border-radius: 12px;
      overflow: hidden;
      background: #eee;
    }
    .team-photo { width: 100%; height: 100%; object-fit: cover; }
    .team-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9pt; page-break-inside: avoid; break-inside: avoid; }
    .team-table th { background: #666; color: #fff; padding: 5px; text-transform: uppercase; }
    .team-table td { border-bottom: 1px solid #ccc; padding: 3px 5px; }
    .col-name { width: 40%; font-weight: 700; }
    .col-phone { width: 10%; text-align: right; font-size: 8pt; white-space: nowrap; }
    .team-table-model-compact .team-table { margin-bottom: 6px; font-size: 8.2pt; }
    .team-table-model-compact .team-table th { padding: 4px 5px; }
    .team-table-model-compact .team-table td { padding: 2px 4px; }
    .team-table-model-compact .col-phone { font-size: 7.3pt; }
    .team-table-model-comfortable .team-table { margin-bottom: 9px; font-size: 9.4pt; }
    .team-table-model-comfortable .team-table th { padding: 6px 6px; }
    .team-table-model-comfortable .team-table td { padding: 4px 6px; }
    .team-table-model-comfortable .col-phone { font-size: 8.2pt; }
    .team-page-no-photo .equipe-header { margin-bottom: 5px; }
    .team-page-no-photo .team-table { margin-bottom: 6px; font-size: 8.8pt; }
    .team-page-no-photo .team-table th { padding: 4px 5px; }
    .team-page-no-photo .team-table td { padding: 2px 5px; }
    .team-page-no-photo .col-phone { font-size: 7.6pt; }
    .team-page-compact .team-photo-frame {
      width: ${Math.max(120, Math.round(visualConfig.foto_equipe_largura_mm - 5))}mm;
      height: ${Math.max(65, Math.round(visualConfig.foto_equipe_altura_mm * 0.76))}mm;
      margin-bottom: 8px;
    }
    .team-page-compact .team-table { margin-bottom: 6px; font-size: 8.4pt; }
    .team-page-compact .team-table th { padding: 4px 5px; }
    .team-page-compact .team-table td { padding: 2px 4px; }
    .team-page-compact .col-phone { font-size: 7.4pt; }
    ${watermarkCss}
  `;
}

async function renderPdfFromHtml(html) {
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: env.chromeBin,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
    });
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateTeamQuadrantePdf(teamId) {
  const data = await loadTeamBundle(teamId);
  const pdf = await renderPdfFromHtml(teamHtml(data));
  return {
    pdf,
    fileName: safeFileName(data.team.nome, "quadrante")
  };
}

export async function generateQuadrantePdf(encounterId) {
  const data = await loadEncounterBundle(encounterId);
  const pdf = await renderPdfFromHtml(encounterHtml(data));
  return {
    pdf,
    fileName: safeFileName(`completo_${encounterId}`, "quadrante")
  };
}




