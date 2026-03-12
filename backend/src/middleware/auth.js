import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { buildEffectivePermissions, hasPermission } from "../auth/permissions.js";

function extractTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token.trim();
}

function sanitizeUser(userRow) {
  return {
    id: userRow.id,
    nome: userRow.nome,
    email: userRow.email,
    permissao: userRow.permissao,
    ativo: userRow.ativo,
    permissions: userRow.permissions || {},
    effectivePermissions: buildEffectivePermissions(userRow.permissao, userRow.permissions || {}),
    teamScopes: []
  };
}

function normalizeTeamId(rawTeamId) {
  const parsed = Number(rawTeamId);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

function sanitizeTeamScopeRow(row) {
  return {
    team_id: Number(row.team_id),
    encounter_id: Number(row.encounter_id),
    can_view: Boolean(row.can_view),
    can_manage: Boolean(row.can_manage)
  };
}

function teamScopesEnabledForUser(user) {
  return Array.isArray(user?.teamScopes) && user.teamScopes.length > 0;
}

async function loadUserTeamScopes(userId) {
  try {
    const result = await pool.query(
      `
        SELECT team_id, encounter_id, can_view, can_manage
        FROM app_user_team_scopes
        WHERE user_id = $1
        ORDER BY encounter_id, team_id
      `,
      [userId]
    );
    return result.rows.map(sanitizeTeamScopeRow);
  } catch (error) {
    if (error?.code === "42P01") {
      // Tabela ainda não criada (migrations pendentes). Mantém compatibilidade.
      return [];
    }
    throw error;
  }
}

export function hasTeamScopeAssignments(user) {
  return teamScopesEnabledForUser(user);
}

export function canViewTeam(user, teamIdRaw) {
  const teamId = normalizeTeamId(teamIdRaw);
  if (!teamId) return false;
  if (!teamScopesEnabledForUser(user)) return true;
  return user.teamScopes.some(
    (scope) => scope.team_id === teamId && (scope.can_view || scope.can_manage)
  );
}

export function canManageTeam(user, teamIdRaw) {
  const teamId = normalizeTeamId(teamIdRaw);
  if (!teamId) return false;
  if (!teamScopesEnabledForUser(user)) return true;
  return user.teamScopes.some((scope) => scope.team_id === teamId && scope.can_manage);
}

export function requireTeamView(paramName = "teamId") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario nao autenticado." });
    }
    const raw =
      req.params?.[paramName] ??
      req.query?.[paramName] ??
      req.body?.[paramName];
    const teamId = normalizeTeamId(raw);
    if (!teamId) {
      return res.status(400).json({ error: `${paramName} invalido.` });
    }
    if (!canViewTeam(req.user, teamId)) {
      return res.status(403).json({ error: "Sem permissao para acessar esta equipe." });
    }
    return next();
  };
}

export function requireTeamManage(paramName = "teamId") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario nao autenticado." });
    }
    const raw =
      req.params?.[paramName] ??
      req.query?.[paramName] ??
      req.body?.[paramName];
    const teamId = normalizeTeamId(raw);
    if (!teamId) {
      return res.status(400).json({ error: `${paramName} invalido.` });
    }
    if (!canManageTeam(req.user, teamId)) {
      return res.status(403).json({ error: "Sem permissao para editar esta equipe." });
    }
    return next();
  };
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: "Token ausente." });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const userResult = await pool.query(
      "SELECT * FROM app_users WHERE id = $1 LIMIT 1",
      [payload.sub]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: "Usuario nao encontrado." });
    }

    const user = userResult.rows[0];
    if (!user.ativo) {
      return res.status(403).json({ error: "Usuario inativo." });
    }

    req.user = sanitizeUser(user);
    req.user.teamScopes = await loadUserTeamScopes(req.user.id);
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Token invalido ou expirado." });
  }
}

export function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario nao autenticado." });
    }
    if (!hasPermission(req.user, permissionKey)) {
      return res.status(403).json({ error: `Sem permissao: ${permissionKey}` });
    }
    return next();
  };
}
