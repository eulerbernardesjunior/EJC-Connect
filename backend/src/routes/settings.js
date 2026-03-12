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
const PDF_TITLE_MODES = new Set(["SYSTEM_FONT", "CUSTOM_FONT", "TEAM_ART"]);

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
      summary: `Modo do título das equipes alterado para ${requestedMode}`,
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
      summary: "Fonte personalizada para título das equipes atualizada",
      details: {
        previous_font_url: current.font_url,
        current_font_url: fontUrl
      }
    });

    return res.json(next);
  })
);

export { router as settingsRoutes };
