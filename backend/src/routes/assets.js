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
import { deleteUploadedByUrl, deleteUploadedFile, imageUploadFilter } from "../utils/upload.js";
import { normalizeEnum, parsePositiveInt } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      const dir = path.join(env.uploadDir, "assets");
      await fs.mkdir(dir, { recursive: true });
      callback(null, dir);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    callback(null, `asset_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageUploadFilter
});

const ASSET_TYPES = new Set([
  "CAPA",
  "CONTRACAPA",
  "SEPARADOR_CIRCULOS",
  "CARTAZ_CIRCULO",
  "SEPARADOR_EQUIPES",
  "SEPARADOR_ENCONTREIROS",
  "SEPARADOR_ENCONTRISTAS",
  "MUSICA_TEMA",
  "CARTAZ",
  "CONVITE_POS_ENCONTRO"
]);

router.get(
  "/",
  requirePermission(PERMISSIONS.ASSETS_VIEW),
  asyncHandler(async (req, res) => {
    const encounterId = parsePositiveInt(req.query.encounterId);
    if (!encounterId) {
      return res.status(400).json({ error: "encounterId e obrigatorio." });
    }

    const result = await pool.query(
      `
        SELECT *
        FROM encontro_assets
        WHERE encontro_id = $1
        ORDER BY ordem ASC, created_at ASC
      `,
      [encounterId]
    );

    return res.json(result.rows);
  })
);

router.post(
  "/",
  requirePermission(PERMISSIONS.ASSETS_MANAGE),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { encounterId, tipo, titulo, ordem } = req.body;
    if (!encounterId || !tipo || !req.file) {
      await deleteUploadedFile(req.file?.path);
      return res.status(400).json({ error: "Campos obrigatorios: encounterId, tipo e file." });
    }

    const encounterIdNumber = parsePositiveInt(encounterId);
    if (!encounterIdNumber) {
      await deleteUploadedFile(req.file.path);
      return res.status(400).json({ error: "encounterId invalido." });
    }

    const normalizedType = normalizeEnum(tipo);
    if (!ASSET_TYPES.has(normalizedType)) {
      await deleteUploadedFile(req.file.path);
      return res.status(400).json({ error: "Tipo de asset invalido." });
    }

    const sortOrder = Number(ordem ?? 0);
    if (!Number.isFinite(sortOrder)) {
      await deleteUploadedFile(req.file.path);
      return res.status(400).json({ error: "ordem invalida." });
    }

    const encounterResult = await pool.query("SELECT id FROM encontros WHERE id = $1 LIMIT 1", [encounterIdNumber]);
    if (encounterResult.rowCount === 0) {
      await deleteUploadedFile(req.file.path);
      return res.status(404).json({ error: "Encontro nao encontrado." });
    }

    const imageUrl = `/uploads/assets/${req.file.filename}`;

    let result;
    try {
      result = await pool.query(
        `
          INSERT INTO encontro_assets (encontro_id, tipo, titulo, image_url, ordem)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `,
        [encounterIdNumber, normalizedType, titulo || null, imageUrl, sortOrder]
      );
    } catch (error) {
      await deleteUploadedFile(req.file.path);
      throw error;
    }

    await logAudit({
      req,
      action: "CREATE",
      resourceType: "ASSET",
      resourceId: result.rows[0].id,
      encounterId: encounterIdNumber,
      summary: `Arte criada: ${result.rows[0].tipo}`,
      details: {
        tipo: result.rows[0].tipo,
        titulo: result.rows[0].titulo,
        ordem: result.rows[0].ordem
      }
    });

    return res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.ASSETS_MANAGE),
  asyncHandler(async (req, res) => {
    const assetId = parsePositiveInt(req.params.id);
    if (!assetId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const { tipo, titulo, ordem } = req.body;
    const existingResult = await pool.query("SELECT * FROM encontro_assets WHERE id = $1 LIMIT 1", [assetId]);
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Asset nao encontrado." });
    }
    const existing = existingResult.rows[0];

    const normalizedType = normalizeEnum(tipo ?? existing.tipo);

    if (!ASSET_TYPES.has(normalizedType)) {
      return res.status(400).json({ error: "Tipo de asset invalido." });
    }

    const sortOrder = ordem === undefined ? Number(existing.ordem || 0) : Number(ordem);
    if (!Number.isFinite(sortOrder)) {
      return res.status(400).json({ error: "ordem invalida." });
    }

    const result = await pool.query(
      `
        UPDATE encontro_assets
        SET tipo = $1,
            titulo = $2,
            ordem = $3
        WHERE id = $4
        RETURNING *
      `,
      [normalizedType, titulo ?? existing.titulo ?? null, sortOrder, assetId]
    );

    await logAudit({
      req,
      action: "UPDATE",
      resourceType: "ASSET",
      resourceId: assetId,
      encounterId: existing.encontro_id,
      summary: `Arte atualizada: ${result.rows[0].tipo}`,
      details: {
        before: {
          tipo: existing.tipo,
          titulo: existing.titulo,
          ordem: existing.ordem
        },
        after: {
          tipo: result.rows[0].tipo,
          titulo: result.rows[0].titulo,
          ordem: result.rows[0].ordem
        }
      }
    });

    return res.json(result.rows[0]);
  })
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ASSETS_MANAGE),
  asyncHandler(async (req, res) => {
    const assetId = parsePositiveInt(req.params.id);
    if (!assetId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const existingResult = await pool.query(
      "SELECT id, encontro_id, tipo, titulo, image_url FROM encontro_assets WHERE id = $1 LIMIT 1",
      [assetId]
    );
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Asset nao encontrado." });
    }
    const existing = existingResult.rows[0];

    const result = await pool.query("DELETE FROM encontro_assets WHERE id = $1 RETURNING id, image_url", [assetId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Asset nao encontrado." });
    }

    await logAudit({
      req,
      action: "DELETE",
      resourceType: "ASSET",
      resourceId: assetId,
      encounterId: existing.encontro_id,
      summary: `Arte removida: ${existing.tipo}`,
      details: {
        tipo: existing.tipo,
        titulo: existing.titulo
      }
    });

    await deleteUploadedByUrl(result.rows[0].image_url);
    return res.status(204).send();
  })
);

export { router as assetRoutes };
