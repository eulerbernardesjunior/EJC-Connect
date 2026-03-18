import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logAudit } from "../services/auditService.js";
import { deleteUploadedByUrl, deleteUploadedFile, fontUploadFilter } from "../utils/upload.js";

const router = Router();
router.use(requireAuth);

const PDF_TITLE_SETTINGS_KEY = "pdf_team_title";
const PDF_VISUAL_TEMPLATES_KEY = "pdf_visual_templates";
const DEFAULT_TEMPLATE_ID = "default";
const PDF_TITLE_MODES = new Set(["SYSTEM_FONT", "CUSTOM_FONT", "TEAM_ART"]);
const PHOTO_SHAPES = new Set(["SQUARE", "ROUNDED", "CIRCLE", "PASSPORT_3X4"]);
const TABLE_MODELS = new Set(["COMPACT", "STANDARD", "COMFORTABLE"]);
const LEADERSHIP_STYLES = new Set(["SOFT", "BORDERED", "MINIMAL"]);
const MAX_TEMPLATES = 20;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_PDF_VISUAL_CONFIG = Object.freeze({
  foto_equipe_largura_mm: 150,
  foto_equipe_altura_mm: 100,
  foto_lider_largura_mm: 18,
  foto_lider_altura_mm: 18,
  foto_participante_largura_px: 30,
  foto_participante_altura_px: 30,
  formato_foto_circulo: "ROUNDED",
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

const fontStorage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      const dir = path.join(env.uploadDir, "fonts");
      await fs.mkdir(dir, { recursive: true });
      callback(null, dir);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname || "").toLowerCase();
    callback(null, `pdf_title_font_${timestamp}${ext}`);
  }
});

const uploadFont = multer({
  storage: fontStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fontUploadFilter
});

function normalizeMode(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return PDF_TITLE_MODES.has(normalized) ? normalized : null;
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

function sanitizeText(raw, fallback = "", maxLength = 80) {
  const value = String(raw ?? "").trim();
  if (!value) return fallback;
  return value.slice(0, maxLength);
}

function normalizeFontFamily(raw, fallback) {
  const value = String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9\s,'"_\-\.]/g, "");
  if (!value) return fallback;
  return value.slice(0, 120);
}

function normalizePhotoShape(raw) {
  const value = String(raw || "").trim().toUpperCase();
  return PHOTO_SHAPES.has(value) ? value : DEFAULT_PDF_VISUAL_CONFIG.formato_foto_circulo;
}

function normalizeTableModel(raw) {
  const value = String(raw || "").trim().toUpperCase();
  return TABLE_MODELS.has(value) ? value : DEFAULT_PDF_VISUAL_CONFIG.modelo_tabela_equipe;
}

function normalizeLeadershipStyle(raw) {
  const value = String(raw || "").trim().toUpperCase();
  return LEADERSHIP_STYLES.has(value) ? value : DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_estilo;
}

function normalizePdfVisualConfig(rawConfig = {}) {
  const raw = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
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
    formato_foto_circulo: normalizePhotoShape(raw.formato_foto_circulo),
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

function normalizeTemplateId(raw, fallbackIndex = 0) {
  const fromRaw = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (fromRaw) return fromRaw.slice(0, 40);
  return `template-${fallbackIndex + 1}`;
}

function normalizeTemplateName(raw, fallbackName) {
  const cleaned = String(raw || "").trim().slice(0, 60);
  return cleaned || fallbackName;
}

function normalizePdfVisualTemplates(rawValue) {
  const raw = rawValue && typeof rawValue === "object" ? rawValue : {};
  let rawTemplates = Array.isArray(raw.templates) ? raw.templates : [];

  const looksLikeLegacySingleConfig =
    rawTemplates.length === 0 &&
    (raw.formato_foto_circulo ||
      raw.modelo_tabela_equipe ||
      raw.margem_topo_mm !== undefined ||
      raw.rodape_ativo !== undefined);
  if (looksLikeLegacySingleConfig) {
    rawTemplates = [{ id: DEFAULT_TEMPLATE_ID, nome: "Padrão do sistema", config: raw }];
  }

  if (rawTemplates.length === 0) {
    rawTemplates = [
      {
        id: DEFAULT_TEMPLATE_ID,
        nome: "Padrão do sistema",
        config: { ...DEFAULT_PDF_VISUAL_CONFIG }
      }
    ];
  }

  const unique = new Set();
  const templates = rawTemplates
    .slice(0, MAX_TEMPLATES)
    .map((item, index) => {
      const entry = item && typeof item === "object" ? item : {};
      const baseId = normalizeTemplateId(entry.id, index);
      let id = baseId;
      let suffix = 2;
      while (unique.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      unique.add(id);

      return {
        id,
        nome: normalizeTemplateName(entry.nome, `Template ${index + 1}`),
        config: normalizePdfVisualConfig(entry.config)
      };
    });

  if (templates.length === 0) {
    templates.push({
      id: DEFAULT_TEMPLATE_ID,
      nome: "Padrão do sistema",
      config: { ...DEFAULT_PDF_VISUAL_CONFIG }
    });
  }

  const preferredActive = String(raw.active_template_id || "").trim();
  const active_template_id = templates.some((template) => template.id === preferredActive)
    ? preferredActive
    : templates[0].id;

  return { active_template_id, templates };
}

async function loadPdfTitleSettings() {
  const result = await pool.query("SELECT valor FROM app_settings WHERE chave = $1 LIMIT 1", [
    PDF_TITLE_SETTINGS_KEY
  ]);
  const raw = result.rowCount > 0 ? result.rows[0].valor || {} : {};
  return {
    mode: normalizeMode(raw.mode) || "SYSTEM_FONT",
    font_url: raw.font_url ? String(raw.font_url) : null
  };
}

async function savePdfTitleSettings(settings) {
  await pool.query(
    `
      INSERT INTO app_settings (chave, valor)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (chave)
      DO UPDATE SET valor = EXCLUDED.valor
    `,
    [PDF_TITLE_SETTINGS_KEY, JSON.stringify(settings)]
  );
}

async function loadPdfVisualTemplatesSettings() {
  const result = await pool.query("SELECT valor FROM app_settings WHERE chave = $1 LIMIT 1", [
    PDF_VISUAL_TEMPLATES_KEY
  ]);
  const raw = result.rowCount > 0 ? result.rows[0].valor || {} : {};
  return normalizePdfVisualTemplates(raw);
}

async function savePdfVisualTemplatesSettings(settings) {
  const normalized = normalizePdfVisualTemplates(settings);
  await pool.query(
    `
      INSERT INTO app_settings (chave, valor)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (chave)
      DO UPDATE SET valor = EXCLUDED.valor
    `,
    [PDF_VISUAL_TEMPLATES_KEY, JSON.stringify(normalized)]
  );
  return normalized;
}

router.get(
  "/pdf-title",
  requirePermission(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    const settings = await loadPdfTitleSettings();
    return res.json(settings);
  })
);

router.put(
  "/pdf-title",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const current = await loadPdfTitleSettings();
    const requestedMode = normalizeMode(req.body?.mode);
    if (!requestedMode) {
      return res.status(400).json({ error: "Modo invalido para titulo de equipe." });
    }

    const next = {
      ...current,
      mode: requestedMode
    };
    await savePdfTitleSettings(next);

    await logAudit({
      req,
      action: "UPDATE",
      resourceType: "SETTINGS_PDF_TITLE",
      summary: `Modo do titulo das equipes alterado para ${requestedMode}`,
      details: {
        before: current,
        after: next
      }
    });

    return res.json(next);
  })
);

router.post(
  "/pdf-title/font",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  uploadFont.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo obrigatorio (campo: file)." });
    }

    const current = await loadPdfTitleSettings();
    const fontUrl = `/uploads/fonts/${req.file.filename}`;
    const next = {
      mode: "CUSTOM_FONT",
      font_url: fontUrl
    };

    try {
      await savePdfTitleSettings(next);
    } catch (error) {
      await deleteUploadedFile(req.file.path);
      throw error;
    }

    if (current.font_url && current.font_url !== fontUrl) {
      await deleteUploadedByUrl(current.font_url);
    }

    await logAudit({
      req,
      action: "UPLOAD",
      resourceType: "SETTINGS_PDF_TITLE_FONT",
      summary: "Fonte personalizada para titulo das equipes atualizada",
      details: {
        previous_font_url: current.font_url,
        current_font_url: fontUrl
      }
    });

    return res.json(next);
  })
);

router.get(
  "/pdf-templates",
  requirePermission(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    const settings = await loadPdfVisualTemplatesSettings();
    return res.json(settings);
  })
);

router.put(
  "/pdf-templates",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const current = await loadPdfVisualTemplatesSettings();
    const incoming = req.body || {};
    const requestedTemplates = Array.isArray(incoming.templates) ? incoming.templates : [];

    if (requestedTemplates.length > MAX_TEMPLATES) {
      return res.status(400).json({ error: `Limite de ${MAX_TEMPLATES} templates.` });
    }

    const next = await savePdfVisualTemplatesSettings({
      active_template_id: incoming.active_template_id,
      templates: requestedTemplates
    });

    await logAudit({
      req,
      action: "UPDATE",
      resourceType: "SETTINGS_PDF_TEMPLATE",
      summary: `Templates visuais do PDF atualizados (${next.templates.length} template(s))`,
      details: {
        before: {
          active_template_id: current.active_template_id,
          templates: current.templates.map((item) => ({ id: item.id, nome: item.nome }))
        },
        after: {
          active_template_id: next.active_template_id,
          templates: next.templates.map((item) => ({ id: item.id, nome: item.nome }))
        }
      }
    });

    return res.json(next);
  })
);

export { router as settingsRoutes };
