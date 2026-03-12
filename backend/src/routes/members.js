import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { canManageTeam, canViewTeam, hasTeamScopeAssignments, requireAuth, requirePermission } from "../middleware/auth.js";
import { logAudit } from "../services/auditService.js";
import { deleteUploadedByUrl, deleteUploadedFile, imageUploadFilter } from "../utils/upload.js";
import { parsePositiveInt } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      const dir = path.join(env.uploadDir, "members");
      await fs.mkdir(dir, { recursive: true });
      callback(null, dir);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    callback(null, `member_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageUploadFilter
});

router.get(
  "/",
  requirePermission(PERMISSIONS.MEMBERS_VIEW),
  asyncHandler(async (req, res) => {
    const { encounterId, teamId } = req.query;
    const encounterIdNumber = parsePositiveInt(encounterId);
    if (!encounterIdNumber) {
      return res.status(400).json({ error: "encounterId e obrigatorio." });
    }

    const values = [encounterIdNumber];
    let query = "SELECT * FROM membros WHERE encontro_id = $1";

    if (teamId) {
      const teamIdNumber = parsePositiveInt(teamId);
      if (!teamIdNumber) {
        return res.status(400).json({ error: "teamId invalido." });
      }
      if (!canViewTeam(req.user, teamIdNumber)) {
        return res.status(403).json({ error: "Sem permissao para acessar esta equipe." });
      }
      values.push(teamIdNumber);
      query += " AND equipe_id = $2";
    } else if (hasTeamScopeAssignments(req.user)) {
      values.push(req.user.id);
      query += ` AND EXISTS (
        SELECT 1
        FROM app_user_team_scopes scopes
        WHERE scopes.user_id = $${values.length}
          AND scopes.team_id = membros.equipe_id
          AND (scopes.can_view = TRUE OR scopes.can_manage = TRUE)
      )`;
    }

    query += " ORDER BY cargo_nome ASC NULLS LAST, nome_principal ASC";

    const result = await pool.query(query, values);
    return res.json(result.rows);
  })
);

router.post(
  "/",
  requirePermission(PERMISSIONS.MEMBERS_MANAGE),
  asyncHandler(async (req, res) => {
    const {
      encontroId,
      equipeId,
      cargoNome,
      nomePrincipal,
      nomeSecundario,
      telefonePrincipal,
      telefoneSecundario,
      paroquia,
      fotoUrl
    } = req.body;

    if (!encontroId || !equipeId || !nomePrincipal) {
      return res.status(400).json({ error: "Campos obrigatorios: encontroId, equipeId, nomePrincipal." });
    }

    const encounterIdNumber = parsePositiveInt(encontroId);
    const teamIdNumber = parsePositiveInt(equipeId);
    if (!encounterIdNumber || !teamIdNumber) {
      return res.status(400).json({ error: "encontroId e equipeId devem ser inteiros positivos." });
    }
    if (!canManageTeam(req.user, teamIdNumber)) {
      return res.status(403).json({ error: "Sem permissao para editar esta equipe." });
    }

    const cleanMainName = String(nomePrincipal || "").trim();
    if (!cleanMainName) {
      return res.status(400).json({ error: "nomePrincipal e obrigatorio." });
    }

    const teamResult = await pool.query(
      "SELECT id FROM equipes WHERE id = $1 AND encontro_id = $2 LIMIT 1",
      [teamIdNumber, encounterIdNumber]
    );
    if (teamResult.rowCount === 0) {
      return res.status(400).json({ error: "equipeId nao pertence ao encontro informado." });
    }

    const result = await pool.query(
      `
        INSERT INTO membros (
          encontro_id,
          equipe_id,
          cargo_nome,
          nome_principal,
          nome_secundario,
          telefone_principal,
          telefone_secundario,
          paroquia,
          foto_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        encounterIdNumber,
        teamIdNumber,
        cargoNome || null,
        cleanMainName,
        String(nomeSecundario || "").trim() || null,
        telefonePrincipal || null,
        telefoneSecundario || null,
        String(paroquia || "").trim() || null,
        String(fotoUrl || "").trim() || null
      ]
    );

    await logAudit({
      req,
      action: "CREATE",
      resourceType: "MEMBRO",
      resourceId: result.rows[0].id,
      encounterId: encounterIdNumber,
      summary: `Membro criado: ${result.rows[0].nome_principal}`,
      details: {
        equipe_id: teamIdNumber,
        cargo_nome: result.rows[0].cargo_nome
      }
    });

    return res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.MEMBERS_MANAGE),
  asyncHandler(async (req, res) => {
    const memberId = parsePositiveInt(req.params.id);
    if (!memberId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const existingResult = await pool.query("SELECT * FROM membros WHERE id = $1 LIMIT 1", [memberId]);
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Membro nao encontrado." });
    }
    const existing = existingResult.rows[0];
    if (!canManageTeam(req.user, existing.equipe_id)) {
      return res.status(403).json({ error: "Sem permissao para editar este membro." });
    }

    const {
      cargoNome,
      nomePrincipal,
      nomeSecundario,
      telefonePrincipal,
      telefoneSecundario,
      paroquia
    } = req.body;

    const mergedName = nomePrincipal !== undefined ? String(nomePrincipal).trim() : String(existing.nome_principal || "").trim();
    if (!mergedName) {
      return res.status(400).json({ error: "Campo obrigatorio: nomePrincipal." });
    }

    const result = await pool.query(
      `
        UPDATE membros
        SET cargo_nome = $1,
            nome_principal = $2,
            nome_secundario = $3,
            telefone_principal = $4,
            telefone_secundario = $5,
            paroquia = $6
        WHERE id = $7
        RETURNING *
      `,
      [
        cargoNome ?? existing.cargo_nome ?? null,
        mergedName,
        nomeSecundario !== undefined ? String(nomeSecundario || "").trim() || null : existing.nome_secundario,
        telefonePrincipal !== undefined ? String(telefonePrincipal || "").trim() || null : existing.telefone_principal,
        telefoneSecundario !== undefined ? String(telefoneSecundario || "").trim() || null : existing.telefone_secundario,
        paroquia !== undefined ? String(paroquia || "").trim() || null : existing.paroquia,
        memberId
      ]
    );

    await logAudit({
      req,
      action: "UPDATE",
      resourceType: "MEMBRO",
      resourceId: memberId,
      encounterId: existing.encontro_id,
      summary: `Membro atualizado: ${result.rows[0].nome_principal}`,
      details: {
        before: {
          cargo_nome: existing.cargo_nome,
          nome_principal: existing.nome_principal,
          nome_secundario: existing.nome_secundario
        },
        after: {
          cargo_nome: result.rows[0].cargo_nome,
          nome_principal: result.rows[0].nome_principal,
          nome_secundario: result.rows[0].nome_secundario
        }
      }
    });

    return res.json(result.rows[0]);
  })
);

router.post(
  "/:id/photo",
  requirePermission(PERMISSIONS.MEMBERS_MANAGE),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const memberId = parsePositiveInt(req.params.id);
    if (!memberId) {
      await deleteUploadedFile(req.file?.path);
      return res.status(400).json({ error: "id invalido." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Arquivo obrigatorio (campo: file)." });
    }

    const photoUrl = `/uploads/members/${req.file.filename}`;
    const existingResult = await pool.query("SELECT id, equipe_id, foto_url FROM membros WHERE id = $1 LIMIT 1", [memberId]);
    if (existingResult.rowCount === 0) {
      await deleteUploadedFile(req.file.path);
      return res.status(404).json({ error: "Membro nao encontrado." });
    }
    const memberTeamId = existingResult.rows[0].equipe_id;
    if (!canManageTeam(req.user, memberTeamId)) {
      await deleteUploadedFile(req.file.path);
      return res.status(403).json({ error: "Sem permissao para editar este membro." });
    }
    const previousPhoto = existingResult.rows[0].foto_url;

    let result;
    try {
      result = await pool.query(
        `
          UPDATE membros
          SET foto_url = $1
          WHERE id = $2
          RETURNING *
        `,
        [photoUrl, memberId]
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
      resourceType: "MEMBRO_FOTO",
      resourceId: memberId,
      encounterId: result.rows[0].encontro_id,
      summary: `Foto atualizada para membro: ${result.rows[0].nome_principal}`,
      details: {
        foto_url: photoUrl
      }
    });

    return res.json(result.rows[0]);
  })
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.MEMBERS_MANAGE),
  asyncHandler(async (req, res) => {
    const memberId = parsePositiveInt(req.params.id);
    if (!memberId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const existingResult = await pool.query(
      "SELECT id, encontro_id, equipe_id, nome_principal, cargo_nome, foto_url FROM membros WHERE id = $1 LIMIT 1",
      [memberId]
    );
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Membro nao encontrado." });
    }
    const existing = existingResult.rows[0];
    if (!canManageTeam(req.user, existing.equipe_id)) {
      return res.status(403).json({ error: "Sem permissao para editar este membro." });
    }

    const result = await pool.query("DELETE FROM membros WHERE id = $1 RETURNING id, foto_url", [memberId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Membro nao encontrado." });
    }

    await logAudit({
      req,
      action: "DELETE",
      resourceType: "MEMBRO",
      resourceId: memberId,
      encounterId: existing.encontro_id,
      summary: `Membro removido: ${existing.nome_principal}`,
      details: {
        equipe_id: existing.equipe_id,
        cargo_nome: existing.cargo_nome
      }
    });

    await deleteUploadedByUrl(result.rows[0].foto_url);
    return res.status(204).send();
  })
);

export { router as memberRoutes };
