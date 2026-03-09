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
    effectivePermissions: buildEffectivePermissions(userRow.permissao, userRow.permissions || {})
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
