import fs from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
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

function renderCircleContent(encounter, team, members) {
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
  const footer = `${escapeHtml(encounter.nome || encounter.tema || "")} • ${dayjs(encounter.data_inicio || encounter.data_encontro).format("DD/MM/YYYY")}`;

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

function renderTeamContent(encounter, team, members, pdfTitleSettings) {
  const grouped = groupMembersByCargo(members);
  const footer = `${escapeHtml(encounter.nome || encounter.tema || "")} • ${dayjs(encounter.data_inicio || encounter.data_encontro).format("DD/MM/YYYY")}`;
  const teamPhoto = mediaForPdf(team.foto_url);
  const titleArt = mediaForPdf(team.titulo_arte_url);
  const titleMode = normalizePdfTitleMode(pdfTitleSettings?.mode);
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
        <section class="page page-break team-page ${pageLayoutClass} team-page-continued">
          <div class="footer-bar">${footer}</div>
          <div class="team-page-body team-page-body-continued">
            ${renderTables(pageChunks)}
          </div>
        </section>
      `
    )
    .join("");

  return `
    <section class="page page-break team-page ${pageLayoutClass}">
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

  const [teamsResult, membersResult, assetsResult, pdfTitleSettings] = await Promise.all([
    pool.query("SELECT * FROM equipes WHERE encontro_id = $1 ORDER BY tipo ASC, ordem ASC, nome ASC", [encounterId]),
    pool.query("SELECT * FROM membros WHERE encontro_id = $1 ORDER BY equipe_id ASC, cargo_nome ASC, nome_principal ASC", [encounterId]),
    pool.query("SELECT * FROM encontro_assets WHERE encontro_id = $1 ORDER BY ordem ASC, id ASC", [encounterId]),
    loadPdfTitleSettings()
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
    pdfTitleSettings
  };
}

async function loadTeamBundle(teamId) {
  const teamResult = await pool.query(
    "SELECT e.*, en.nome AS encontro_nome, en.tema AS encontro_tema, en.data_inicio, en.data_encontro FROM equipes e JOIN encontros en ON en.id = e.encontro_id WHERE e.id = $1",
    [teamId]
  );
  if (teamResult.rowCount === 0) {
    const error = new Error("Equipe/Circulo nao encontrado.");
    error.status = 404;
    throw error;
  }

  const [membersResult, pdfTitleSettings] = await Promise.all([
    pool.query("SELECT * FROM membros WHERE equipe_id = $1 ORDER BY cargo_nome ASC, nome_principal ASC", [teamId]),
    loadPdfTitleSettings()
  ]);

  return { team: teamResult.rows[0], members: membersResult.rows, pdfTitleSettings };
}

function encounterHtml(bundle) {
  const { encounter, teams, membersByTeam, assets, pdfTitleSettings } = bundle;
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
    sections.push(renderCircleContent(encounter, circle, membersByTeam.get(circle.id) || []));
  }

  appendAssets("SEPARADOR_EQUIPES", "SEPARADOR_ENCONTREIROS");
  for (const team of teams.filter((item) => normalize(item.tipo) === "TRABALHO")) {
    sections.push(renderTeamContent(encounter, team, membersByTeam.get(team.id) || [], pdfTitleSettings));
  }

  appendAssets("MUSICA_TEMA");
  appendAssets("CONVITE_POS_ENCONTRO");
  appendAssets("CONTRACAPA");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head><meta charset="utf-8" /><title>Quadrante</title><style>${pdfCss(pdfTitleSettings)}</style></head>
      <body>${sections.join("\n")}</body>
    </html>
  `;
}

function teamHtml(bundle) {
  const fakeEncounter = {
    nome: bundle.team.encontro_nome,
    tema: bundle.team.encontro_tema,
    data_inicio: bundle.team.data_inicio,
    data_encontro: bundle.team.data_encontro
  };
  const content = (() => {
    if (normalize(bundle.team.tipo) !== "CIRCULO") {
      return renderTeamContent(fakeEncounter, bundle.team, bundle.members, bundle.pdfTitleSettings).replace("page-break", "");
    }

    const sections = [];
    const circlePoster = mediaForPdf(bundle.team.foto_url);
    if (circlePoster) {
      sections.push(fullPageImage(circlePoster));
    }
    sections.push(renderCircleContent(fakeEncounter, bundle.team, bundle.members).replace("page-break", ""));
    return sections.join("");
  })();

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>Quadrante</title><style>${pdfCss(bundle.pdfTitleSettings)}</style></head><body>${content}</body></html>`;
}

function pdfCss(pdfTitleSettings = { mode: "SYSTEM_FONT", fontUrl: null }) {
  const enableCustomFont = normalizePdfTitleMode(pdfTitleSettings.mode) === "CUSTOM_FONT" && pdfTitleSettings.fontUrl;
  const customFontFormat = enableCustomFont ? fontCssFormatByPath(pdfTitleSettings.fontUrl) : "truetype";
  const customFontFace = enableCustomFont
    ? `@font-face { font-family: "EquipeTituloCustom"; src: url("${escapeHtml(mediaForPdf(pdfTitleSettings.fontUrl))}") format("${customFontFormat}"); font-display: swap; }`
    : "";
  return `
    ${customFontFace}
    @page { size: A4; margin: 0; }
    body { margin: 0; font-family: "Montserrat", Arial, sans-serif; color: #333; }
    .page { width: 210mm; min-height: 297mm; padding: 8mm 8mm 35mm; box-sizing: border-box; position: relative; }
    .page-break { page-break-after: always; }
    .footer-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 12mm; background: #333; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; }
    .full-page { padding: 0; overflow: hidden; }
    .full-page-image { width: 210mm; height: 297mm; object-fit: cover; display: block; }
    .circulo-header { text-align: center; border-bottom: 1px solid #eee; margin-bottom: 5px; }
    .circulo-header h1 { margin: 0; font-size: 20pt; text-transform: uppercase; line-height: 1; }
    .circulo-header p { margin: 2px 0 5px; font-size: 10pt; text-transform: uppercase; color: #666; }
    .leadership-box { display: flex; gap: 10px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; padding: 6px; margin-bottom: 6px; }
    .leader-column { width: 50%; }
    .leader-column h3 { margin: 0 0 4px; font-size: 8pt; text-transform: uppercase; color: #666; }
    .leader-card { display: flex; gap: 6px; margin-bottom: 4px; align-items: center; min-height: 20mm; }
    .leader-photo { width: 18mm; height: 18mm; border-radius: 5px; object-fit: cover; background: #e5e5e5; flex-shrink: 0; }
    .leader-name { font-size: 10pt; font-weight: 700; }
    .leader-meta { font-size: 8pt; color: #666; }
    .participants-grid { display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; }
    .participant-card { width: 49%; height: 42px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 4px; align-items: center; overflow: hidden; }
    .participant-photo { width: 30px; height: 30px; border-radius: 6px; object-fit: cover; background: #eee; flex-shrink: 0; }
    .participant-data { min-width: 0; }
    .participant-name { font-size: 8pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .participant-meta { font-size: 7pt; color: #666; }
    .equipe-header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 5px; }
    .equipe-label { font-size: 12pt; color: #444; font-weight: 700; }
    .equipe-header h1 { margin: 2px 0 0; font-size: 18pt; text-transform: uppercase; }
    .team-title-custom-font { font-family: "EquipeTituloCustom", "Montserrat", Arial, sans-serif; }
    .team-title-art-frame { width: 100%; min-height: 16mm; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
    .team-title-art { max-width: 90%; max-height: 24mm; object-fit: contain; }
    .team-page { padding: 8mm 8mm 16mm; }
    .team-page-body { padding-bottom: 2mm; }
    .team-page-body-continued { padding-top: 3mm; }
    .team-photo-frame { width: 150mm; height: 100mm; margin: 0 auto 12px; border: 3px solid #444; border-radius: 12px; overflow: hidden; background: #eee; }
    .team-photo { width: 100%; height: 100%; object-fit: cover; }
    .team-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9pt; }
    .team-table { page-break-inside: avoid; break-inside: avoid; }
    .team-table th { background: #666; color: #fff; padding: 5px; text-transform: uppercase; }
    .team-table td { border-bottom: 1px solid #ccc; padding: 3px 5px; }
    .col-name { width: 40%; font-weight: 700; }
    .col-phone { width: 10%; text-align: right; font-size: 8pt; white-space: nowrap; }
    .team-page-no-photo .equipe-header { margin-bottom: 5px; }
    .team-page-no-photo .team-table { margin-bottom: 6px; font-size: 8.8pt; }
    .team-page-no-photo .team-table th { padding: 4px 5px; }
    .team-page-no-photo .team-table td { padding: 2px 5px; }
    .team-page-no-photo .col-phone { font-size: 7.6pt; }
    .team-page-compact .team-photo-frame { width: 145mm; height: 76mm; margin-bottom: 8px; }
    .team-page-compact .team-table { margin-bottom: 6px; font-size: 8.4pt; }
    .team-page-compact .team-table th { padding: 4px 5px; }
    .team-page-compact .team-table td { padding: 2px 4px; }
    .team-page-compact .col-phone { font-size: 7.4pt; }
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




