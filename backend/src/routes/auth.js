import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { buildEffectivePermissions, PERMISSIONS, allPermissionKeys } from "../auth/permissions.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Campos obrigatorios: email e senha." });
    }

    const result = await pool.query(
      "SELECT * FROM app_users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Credenciais invalidas." });
    }

    const user = result.rows[0];
    if (!user.ativo) {
      return res.status(403).json({ error: "Usuario inativo." });
    }

    if (!user.password_hash) {
      return res
        .status(403)
        .json({ error: "Usuario sem senha configurada. Atualize a senha no cadastro." });
    }

    const valid = await bcrypt.compare(String(senha), String(user.password_hash));
    if (!valid) {
      return res.status(401).json({ error: "Credenciais invalidas." });
    }

    const token = jwt.sign({ sub: user.id, role: user.permissao }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn
    });

    await pool.query("UPDATE app_users SET last_login_at = now() WHERE id = $1", [user.id]);

    return res.status(200).json({
      token,
      user: sanitizeUser(user),
      permissionsCatalog: allPermissionKeys(),
      permissionsMap: PERMISSIONS
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.status(200).json({
      user: req.user,
      permissionsCatalog: allPermissionKeys(),
      permissionsMap: PERMISSIONS
    });
  })
);

export { router as authRoutes };
