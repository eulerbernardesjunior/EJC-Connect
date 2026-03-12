import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { canManageTeam, hasTeamScopeAssignments, requireAuth, requirePermission } from "../middleware/auth.js";
import { logAudit } from "../services/auditService.js";
import { deleteUploadedByUrl, deleteUploadedFile, imageUploadFilter } from "../utils/upload.js";
import { isValidHexColor, normalizeEnum, parsePositiveInt } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      const dir = path.join(env.uploadDir, "teams");
      await fs.mkdir(dir, { recursive: true });
      callback(null, dir);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    callback(null, `team_${timestamp}${ext}`);
  }
});

const TEAM_TYPES = new Set(["CIRCULO", "TRABALHO"]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageUploadFilter
});

router.get(
  "/",
  requirePermission(PERMISSIONS.TEAMS_VIEW),
  asyncHandler(async (req, res) => {
    const { encounterId, tipo } = req.query;
    const encounterIdNumber = parsePositiveInt(encounterId);
    if (!encounterIdNumber) {
      return res.status(400).json({ error: "encounterId e obrigatorio." });
    }

    const values = [encounterIdNumber];
    let sql = `
      SELECT *
      FROM equipes
      WHERE encontro_id = $1
    `;

    if (hasTeamScopeAssignments(req.user)) {
      values.push(req.user.id);
      sql += ` AND EXISTS (
        SELECT 1
        FROM app_user_team_scopes scopes
        WHERE scopes.user_id = $${values.length}
          AND scopes.team_id = equipes.id
          AND (scopes.can_view = TRUE OR scopes.can_manage = TRUE)
      )`;
    }

    if (tipo) {
      const normalizedType = normalizeEnum(tipo);
      if (!TEAM_TYPES.has(normalizedType)) {
        return res.status(400).json({ error: "tipo invalido. Use CIRCULO ou TRABALHO." });
      }
      values.push(normalizedType);
      sql += ` AND tipo = $${values.length}`;
    }

    sql += " ORDER BY ordem ASC, nome ASC";

    const result = await pool.query(sql, values);
    return res.json(result.rows);
  })
);

router.post(
  "/",
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  asyncHandler(async (req, res) => {
    if (hasTeamScopeAssignments(req.user)) {
      return res
        .status(403)
        .json({ error: "Usuario com escopo por equipe nao pode criar novas equipes." });
    }

    const { encontroId, nome, tipo, corHex, slogan, ordem } = req.body;
    if (!encontroId || !nome || !tipo) {
      return res.status(400).json({ error: "Campos obrigatorios: encontroId, nome, tipo." });
    }

    const encounterIdNumber = parsePositiveInt(encontroId);
    if (!encounterIdNumber) {
      return res.status(400).json({ error: "encontroId invalido." });
    }

    const normalizedType = normalizeEnum(tipo);
    if (!TEAM_TYPES.has(normalizedType)) {
      return res.status(400).json({ error: "Tipo invalido. Use CIRCULO ou TRABALHO." });
    }

    const cleanName = String(nome).trim();
    if (!cleanName) {
      return res.status(400).json({ error: "Nome da equipe/circulo e obrigatorio." });
    }

    const sortOrder = Number(ordem ?? 0);
    if (!Number.isFinite(sortOrder)) {
      return res.status(400).json({ error: "ordem invalida." });
    }

    const normalizedColor = corHex ? String(corHex).trim() : null;
    if (normalizedType === "CIRCULO" && !isValidHexColor(normalizedColor)) {
      return res.status(400).json({ error: "Circulos exigem corHex valida no formato #RRGGBB." });
    }
    if (normalizedColor && !isValidHexColor(normalizedColor)) {
      return res.status(400).json({ error: "corHex invalida. Use formato #RRGGBB." });
    }

    const encounterResult = await pool.query("SELECT id FROM encontros WHERE id = $1 LIMIT 1", [encounterIdNumber]);
    if (encounterResult.rowCount === 0) {
      return res.status(404).json({ error: "Encontro nao encontrado." });
    }

    const result = await pool.query(
      `
        INSERT INTO equipes (encontro_id, nome, tipo, cor_hex, slogan, ordem)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [encounterIdNumber, cleanName, normalizedType, normalizedColor, slogan || null, sortOrder]
    );

    await logAudit({
      req,
      action: "CREATE",
      resourceType: normalizedType === "CIRCULO" ? "CIRCULO" : "EQUIPE",
      resourceId: result.rows[0].id,
      encounterId: encounterIdNumber,
      summary: `${normalizedType === "CIRCULO" ? "Círculo" : "Equipe"} criado(a): ${cleanName}`,
      details: {
        nome: cleanName,
        tipo: normalizedType,
        ordem: sortOrder
      }
    });

    return res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  asyncHandler(async (req, res) => {
    const teamId = parsePositiveInt(req.params.id);
    if (!teamId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const existingResult = await pool.query("SELECT * FROM equipes WHERE id = $1 LIMIT 1", [teamId]);
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Equipe/Circulo nao encontrado." });
    }
    const existing = existingResult.rows[0];
    if (!canManageTeam(req.user, teamId)) {
      return res.status(403).json({ error: "Sem permissao para editar esta equipe." });
    }

    const { nome, tipo, corHex, slogan, ordem } = req.body;
    const mergedName = nome !== undefined ? String(nome).trim() : String(existing.nome || "").trim();
    if (!mergedName) {
      return res.status(400).json({ error: "Nome da equipe/circulo e obrigatorio." });
    }

    const normalizedType = normalizeEnum(tipo ?? existing.tipo);
    if (!TEAM_TYPES.has(normalizedType)) {
      return res.status(400).json({ error: "Tipo invalido. Use CIRCULO ou TRABALHO." });
    }

    const sortOrder = ordem === undefined ? Number(existing.ordem || 0) : Number(ordem);
    if (!Number.isFinite(sortOrder)) {
      return res.status(400).json({ error: "ordem invalida." });
    }

    const mergedColor = corHex !== undefined ? String(corHex || "").trim() : existing.cor_hex;
    const normalizedColor = mergedColor || null;
    if (normalizedType === "CIRCULO" && !isValidHexColor(normalizedColor)) {
      return res.status(400).json({ error: "Circulos exigem corHex valida no formato #RRGGBB." });
    }
    if (normalizedColor && !isValidHexColor(normalizedColor)) {
      return res.status(400).json({ error: "corHex invalida. Use formato #RRGGBB." });
    }

    const result = await pool.query(
      `
        UPDATE equipes
        SET nome = $1,
            tipo = $2,
            cor_hex = $3,
            slogan = $4,
            ordem = $5
        WHERE id = $6
        RETURNING *
      `,
      [mergedName, normalizedType, normalizedColor, slogan ?? existing.slogan ?? null, sortOrder, teamId]
    );

    await logAudit({
      req,
      action: "UPDATE",
      resourceType: normalizedType === "CIRCULO" ? "CIRCULO" : "EQUIPE",
      resourceId: teamId,
      encounterId: existing.encontro_id,
      summary: `${normalizedType === "CIRCULO" ? "Círculo" : "Equipe"} atualizado(a): ${mergedName}`,
      details: {
        before: {
          nome: existing.nome,
          tipo: existing.tipo,
          ordem: existing.ordem
        },
        after: {
          nome: result.rows[0].nome,
          tipo: result.rows[0].tipo,
          ordem: result.rows[0].ordem
        }
      }
    });

    return res.json(result.rows[0]);
  })
);

router.post(
  "/:id/photo",
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const teamId = parsePositiveInt(req.params.id);
    if (!teamId) {
      await deleteUploadedFile(req.file?.path);
      return res.status(400).json({ error: "id invalido." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Arquivo obrigatorio (campo: file)." });
    }

    const photoUrl = `/uploads/teams/${req.file.filename}`;
    const existingResult = await pool.query("SELECT id, foto_url FROM equipes WHERE id = $1 LIMIT 1", [teamId]);
    if (existingResult.rowCount === 0) {
      await deleteUploadedFile(req.file.path);
      return res.status(404).json({ error: "Equipe/Circulo nao encontrado." });
    }
    if (!canManageTeam(req.user, teamId)) {
      await deleteUploadedFile(req.file.path);
      return res.status(403).json({ error: "Sem permissao para editar esta equipe." });
    }
    const previousPhoto = existingResult.rows[0].foto_url;

    let result;
    try {
      result = await pool.query(
        `
          UPDATE equipes
          SET foto_url = $1
          WHERE id = $2
          RETURNING *
        `,
        [photoUrl, teamId]
      );
    } catch (error) {
      await deleteUploadedFile(req.file.path);
      throw error;
    }

    if (previousPhoto && previousPhoto !== photoUrl) {
      await deleteUploadedByUrl(previousPhoto);
    }

    await logAudit({
      req,
      action: "UPLOAD",
      resourceType: "EQUIPE",
      resourceId: teamId,
      encounterId: result.rows[0].encontro_id,
      summary: `Foto/cartaz atualizado para ${result.rows[0].nome}`,
      details: {
        foto_url: photoUrl
      }
    });

    return res.json(result.rows[0]);
  })
);

router.post(
  "/:id/title-art",
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const teamId = parsePositiveInt(req.params.id);
    if (!teamId) {
      await deleteUploadedFile(req.file?.path);
      return res.status(400).json({ error: "id invalido." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Arquivo obrigatorio (campo: file)." });
    }

    const titleArtUrl = `/uploads/teams/${req.file.filename}`;
    const existingResult = await pool.query("SELECT id, titulo_arte_url FROM equipes WHERE id = $1 LIMIT 1", [teamId]);
    if (existingResult.rowCount === 0) {
      await deleteUploadedFile(req.file.path);
      return res.status(404).json({ error: "Equipe/Circulo nao encontrado." });
    }
    if (!canManageTeam(req.user, teamId)) {
      await deleteUploadedFile(req.file.path);
      return res.status(403).json({ error: "Sem permissao para editar esta equipe." });
    }
    const previousTitleArt = existingResult.rows[0].titulo_arte_url;

    let result;
    try {
      result = await pool.query(
        `
          UPDATE equipes
          SET titulo_arte_url = $1
          WHERE id = $2
          RETURNING *
        `,
        [titleArtUrl, teamId]
      );
    } catch (error) {
      await deleteUploadedFile(req.file.path);
      throw error;
    }

    if (previousTitleArt && previousTitleArt !== titleArtUrl) {
      await deleteUploadedByUrl(previousTitleArt);
    }

    await logAudit({
      req,
      action: "UPLOAD",
      resourceType: "EQUIPE_TITULO_ARTE",
      resourceId: teamId,
      encounterId: result.rows[0].encontro_id,
      summary: `Arte de título atualizada para ${result.rows[0].nome}`,
      details: {
        titulo_arte_url: titleArtUrl
      }
    });

    return res.json(result.rows[0]);
  })
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.TEAMS_MANAGE),
  asyncHandler(async (req, res) => {
    const teamId = parsePositiveInt(req.params.id);
    if (!teamId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const existingResult = await pool.query("SELECT id, encontro_id, nome, tipo, foto_url, titulo_arte_url FROM equipes WHERE id = $1", [teamId]);
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Equipe/Circulo nao encontrado." });
    }
    if (!canManageTeam(req.user, teamId)) {
      return res.status(403).json({ error: "Sem permissao para editar esta equipe." });
    }
    const existing = existingResult.rows[0];

    const result = await pool.query("DELETE FROM equipes WHERE id = $1 RETURNING id, foto_url, titulo_arte_url", [teamId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Equipe/Circulo nao encontrado." });
    }

    await logAudit({
      req,
      action: "DELETE",
      resourceType: existing.tipo === "CIRCULO" ? "CIRCULO" : "EQUIPE",
      resourceId: teamId,
      encounterId: existing.encontro_id,
      summary: `${existing.tipo === "CIRCULO" ? "Círculo" : "Equipe"} removido(a): ${existing.nome}`,
      details: {
        nome: existing.nome,
        tipo: existing.tipo
      }
    });

    await deleteUploadedByUrl(result.rows[0].foto_url);
    await deleteUploadedByUrl(result.rows[0].titulo_arte_url);
    return res.status(204).send();
  })
);

export { router as teamRoutes };
