import bcrypt from "bcryptjs";
import { Router } from "express";
import {
  PERMISSIONS,
  allPermissionKeys,
  buildEffectivePermissions,
  sanitizePermissions
} from "../auth/permissions.js";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logAudit } from "../services/auditService.js";

const router = Router();
const ALLOWED_ROLES = new Set(["ADMIN", "EDITOR", "VISUALIZADOR"]);

function sanitizeUser(userRow, teamScopes = []) {
  return {
    id: userRow.id,
    nome: userRow.nome,
    email: userRow.email,
    permissao: userRow.permissao,
    ativo: userRow.ativo,
    last_login_at: userRow.last_login_at || null,
    permissions: userRow.permissions || {},
    effectivePermissions: buildEffectivePermissions(userRow.permissao, userRow.permissions || {}),
    teamScopes
  };
}

function normalizeEmail(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

function normalizeRole(raw) {
  const role = String(raw || "EDITOR").trim().toUpperCase();
  return ALLOWED_ROLES.has(role) ? role : "EDITOR";
}

function validatePassword(rawPassword, required = false) {
  const value = String(rawPassword || "").trim();
  if (!value && !required) return null;
  if (!value && required) {
    const error = new Error("Senha obrigatoria.");
    error.status = 400;
    throw error;
  }
  if (value.length < 8) {
    const error = new Error("A senha deve ter no minimo 8 caracteres.");
    error.status = 400;
    throw error;
  }
  return value;
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function createBadRequestError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parsePositiveId(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

function sanitizeTeamScopesInput(rawValue) {
  if (rawValue === undefined) return null;
  if (!Array.isArray(rawValue)) {
    throw createBadRequestError("teamScopes deve ser uma lista.");
  }

  const dedup = new Map();

  for (const scope of rawValue) {
    if (!scope || typeof scope !== "object") continue;
    const teamId = parsePositiveId(scope.teamId ?? scope.team_id);
    if (!teamId) {
      throw createBadRequestError("teamScopes possui teamId inválido.");
    }

    const canManage = Boolean(scope.canManage ?? scope.can_manage);
    const canView = Boolean(scope.canView ?? scope.can_view) || canManage;

    if (!canView && !canManage) continue;

    const existing = dedup.get(teamId) || { teamId, canView: false, canManage: false };
    existing.canView = existing.canView || canView;
    existing.canManage = existing.canManage || canManage;
    if (existing.canManage) existing.canView = true;
    dedup.set(teamId, existing);
  }

  return [...dedup.values()];
}

async function resolveTeamScopes(scopeInput) {
  if (!Array.isArray(scopeInput) || scopeInput.length === 0) return [];
  const teamIds = scopeInput.map((item) => item.teamId);

  const result = await pool.query(
    `
      SELECT
        e.id AS team_id,
        e.encontro_id,
        e.nome AS team_nome,
        e.tipo AS team_tipo,
        COALESCE(en.nome, en.tema, ('Encontro #' || en.id::text)) AS encounter_nome
      FROM equipes e
      JOIN encontros en ON en.id = e.encontro_id
      WHERE e.id = ANY($1::bigint[])
    `,
    [teamIds]
  );

  const dbMap = new Map(result.rows.map((row) => [Number(row.team_id), row]));
  const missing = teamIds.filter((id) => !dbMap.has(id));
  if (missing.length > 0) {
    throw createBadRequestError(`Equipes inválidas em teamScopes: ${missing.join(", ")}`);
  }

  return scopeInput.map((scope) => {
    const team = dbMap.get(scope.teamId);
    return {
      team_id: Number(team.team_id),
      encounter_id: Number(team.encontro_id),
      team_nome: String(team.team_nome || ""),
      team_tipo: String(team.team_tipo || ""),
      encounter_nome: String(team.encounter_nome || ""),
      can_view: Boolean(scope.canView || scope.canManage),
      can_manage: Boolean(scope.canManage)
    };
  });
}

async function saveUserTeamScopes(userId, resolvedScopes) {
  try {
    await pool.query("DELETE FROM app_user_team_scopes WHERE user_id = $1", [userId]);

    if (!resolvedScopes || resolvedScopes.length === 0) return;

    for (const scope of resolvedScopes) {
      await pool.query(
        `
          INSERT INTO app_user_team_scopes (user_id, encounter_id, team_id, can_view, can_manage)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [userId, scope.encounter_id, scope.team_id, scope.can_view, scope.can_manage]
      );
    }
  } catch (error) {
    if (error?.code === "42P01") {
      throw createBadRequestError("Escopo por equipe indisponível. Execute as migrations.");
    }
    throw error;
  }
}

async function getTeamScopeCatalog() {
  try {
    const result = await pool.query(
      `
        SELECT
          e.id AS team_id,
          e.encontro_id,
          e.nome AS team_nome,
          e.tipo AS team_tipo,
          COALESCE(en.nome, en.tema, ('Encontro #' || en.id::text)) AS encounter_nome
        FROM equipes e
        JOIN encontros en ON en.id = e.encontro_id
        ORDER BY en.data_inicio DESC NULLS LAST, en.id DESC, e.ordem ASC, e.nome ASC
      `
    );

    return result.rows.map((row) => ({
      team_id: Number(row.team_id),
      encounter_id: Number(row.encontro_id),
      team_nome: row.team_nome,
      team_tipo: row.team_tipo,
      encounter_nome: row.encounter_nome
    }));
  } catch (error) {
    if (error?.code === "42P01") {
      return [];
    }
    throw error;
  }
}

async function getUsersTeamScopes(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return new Map();
  }

  let result;
  try {
    result = await pool.query(
      `
        SELECT
          s.user_id,
          s.team_id,
          s.encounter_id,
          s.can_view,
          s.can_manage,
          e.nome AS team_nome,
          e.tipo AS team_tipo,
          COALESCE(en.nome, en.tema, ('Encontro #' || en.id::text)) AS encounter_nome
        FROM app_user_team_scopes s
        JOIN equipes e ON e.id = s.team_id
        JOIN encontros en ON en.id = s.encounter_id
        WHERE s.user_id = ANY($1::bigint[])
        ORDER BY s.user_id, s.encounter_id, e.ordem ASC, e.nome ASC
      `,
      [userIds]
    );
  } catch (error) {
    if (error?.code === "42P01") {
      return new Map();
    }
    throw error;
  }

  const scopesMap = new Map();
  for (const row of result.rows) {
    const userId = Number(row.user_id);
    if (!scopesMap.has(userId)) scopesMap.set(userId, []);
    scopesMap.get(userId).push({
      team_id: Number(row.team_id),
      encounter_id: Number(row.encounter_id),
      team_nome: row.team_nome,
      team_tipo: row.team_tipo,
      encounter_nome: row.encounter_nome,
      can_view: Boolean(row.can_view),
      can_manage: Boolean(row.can_manage)
    });
  }
  return scopesMap;
}

router.use(requireAuth);

router.get(
  "/meta",
  requirePermission(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    const teamScopeCatalog = await getTeamScopeCatalog();
    return res.status(200).json({
      roles: [...ALLOWED_ROLES],
      permissionsCatalog: allPermissionKeys(),
      teamScopeCatalog
    });
  })
);

router.get(
  "/",
  requirePermission(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      `
        SELECT id, nome, email, permissao, ativo, permissions, last_login_at, created_at
        FROM app_users
        ORDER BY created_at DESC, id DESC
      `
    );
    const userIds = result.rows.map((row) => Number(row.id));
    const scopesMap = await getUsersTeamScopes(userIds);
    return res
      .status(200)
      .json(result.rows.map((row) => sanitizeUser(row, scopesMap.get(Number(row.id)) || [])));
  })
);

router.post(
  "/",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const nome = String(req.body.nome || "").trim();
    const email = normalizeEmail(req.body.email);
    const permissao = normalizeRole(req.body.permissao);
    const ativo = req.body.ativo !== false;
    const permissions = sanitizePermissions(req.body.permissions || {});
    const teamScopesInput = sanitizeTeamScopesInput(req.body.teamScopes);
    const resolvedTeamScopes = await resolveTeamScopes(teamScopesInput || []);
    const plainPassword = validatePassword(req.body.senha, true);

    if (!nome || !email) {
      return res.status(400).json({ error: "Campos obrigatorios: nome, email e senha." });
    }

    const passwordHash = await hashPassword(plainPassword);

    try {
      const result = await pool.query(
        `
          INSERT INTO app_users (nome, email, permissao, ativo, permissions, password_hash)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6)
          RETURNING id, nome, email, permissao, ativo, permissions, last_login_at
        `,
        [nome, email, permissao, ativo, JSON.stringify(permissions), passwordHash]
      );
      const createdUser = result.rows[0];
      await saveUserTeamScopes(createdUser.id, resolvedTeamScopes);

      await logAudit({
        req,
        action: "CREATE",
        resourceType: "USUARIO",
        resourceId: createdUser.id,
        summary: `Usuário criado: ${createdUser.email}`,
        details: {
          nome: createdUser.nome,
          permissao: createdUser.permissao,
          ativo: createdUser.ativo,
          teamScopes: resolvedTeamScopes.map((scope) => ({
            team_id: scope.team_id,
            team_nome: scope.team_nome,
            encounter_nome: scope.encounter_nome,
            can_view: scope.can_view,
            can_manage: scope.can_manage
          }))
        }
      });

      return res.status(201).json(sanitizeUser(createdUser, resolvedTeamScopes));
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "Email ja cadastrado." });
      }
      throw error;
    }
  })
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID invalido." });
    }

    const existingResult = await pool.query("SELECT * FROM app_users WHERE id = $1 LIMIT 1", [id]);
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario nao encontrado." });
    }

    const existing = existingResult.rows[0];
    const nome = req.body.nome !== undefined ? String(req.body.nome || "").trim() : existing.nome;
    const email = req.body.email !== undefined ? normalizeEmail(req.body.email) : existing.email;
    const permissao = req.body.permissao !== undefined ? normalizeRole(req.body.permissao) : existing.permissao;
    const ativo = req.body.ativo !== undefined ? Boolean(req.body.ativo) : existing.ativo;
    const permissions =
      req.body.permissions !== undefined
        ? sanitizePermissions(req.body.permissions || {})
        : sanitizePermissions(existing.permissions || {});
    const teamScopesInput =
      req.body.teamScopes !== undefined ? sanitizeTeamScopesInput(req.body.teamScopes) : null;
    const resolvedTeamScopes = teamScopesInput !== null ? await resolveTeamScopes(teamScopesInput) : null;

    if (!nome || !email) {
      return res.status(400).json({ error: "Campos obrigatorios: nome e email." });
    }

    let passwordHash = existing.password_hash;
    if (req.body.senha !== undefined) {
      const plainPassword = validatePassword(req.body.senha, false);
      if (plainPassword) {
        passwordHash = await hashPassword(plainPassword);
      }
    }

    try {
      const updated = await pool.query(
        `
          UPDATE app_users
          SET nome = $1,
              email = $2,
              permissao = $3,
              ativo = $4,
              permissions = $5::jsonb,
              password_hash = $6
          WHERE id = $7
          RETURNING id, nome, email, permissao, ativo, permissions, last_login_at
        `,
        [nome, email, permissao, ativo, JSON.stringify(permissions), passwordHash, id]
      );
      if (resolvedTeamScopes !== null) {
        await saveUserTeamScopes(id, resolvedTeamScopes);
      }
      const updatedScopes =
        resolvedTeamScopes !== null
          ? resolvedTeamScopes
          : (await getUsersTeamScopes([id])).get(id) || [];

      await logAudit({
        req,
        action: "UPDATE",
        resourceType: "USUARIO",
        resourceId: id,
        summary: `Usuário atualizado: ${updated.rows[0].email}`,
        details: {
          before: {
            nome: existing.nome,
            email: existing.email,
            permissao: existing.permissao,
            ativo: existing.ativo
          },
          after: {
            nome: updated.rows[0].nome,
            email: updated.rows[0].email,
            permissao: updated.rows[0].permissao,
            ativo: updated.rows[0].ativo
          },
          senhaAtualizada: req.body.senha !== undefined && String(req.body.senha || "").trim().length > 0,
          teamScopes: updatedScopes.map((scope) => ({
            team_id: scope.team_id,
            team_nome: scope.team_nome,
            encounter_nome: scope.encounter_nome,
            can_view: scope.can_view,
            can_manage: scope.can_manage
          }))
        }
      });

      return res.status(200).json(sanitizeUser(updated.rows[0], updatedScopes));
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "Email ja cadastrado." });
      }
      throw error;
    }
  })
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.USERS_MANAGE),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID invalido." });
    }

    if (id === req.user.id) {
      return res.status(400).json({ error: "Nao e permitido excluir o proprio usuario." });
    }

    const adminCountResult = await pool.query(
      "SELECT COUNT(*)::int AS total FROM app_users WHERE permissao = 'ADMIN' AND ativo = TRUE"
    );
    const targetResult = await pool.query("SELECT id, permissao, ativo FROM app_users WHERE id = $1 LIMIT 1", [id]);
    if (targetResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario nao encontrado." });
    }

    const target = targetResult.rows[0];
    const activeAdmins = Number(adminCountResult.rows[0].total || 0);
    if (target.permissao === "ADMIN" && target.ativo && activeAdmins <= 1) {
      return res.status(400).json({ error: "Nao e permitido remover o ultimo administrador ativo." });
    }

    await pool.query("DELETE FROM app_users WHERE id = $1", [id]);

    await logAudit({
      req,
      action: "DELETE",
      resourceType: "USUARIO",
      resourceId: id,
      summary: `Usuário removido: ${id}`,
      details: {
        permissao: target.permissao,
        ativo: target.ativo
      }
    });

    return res.status(204).send();
  })
);

export { router as userRoutes };
