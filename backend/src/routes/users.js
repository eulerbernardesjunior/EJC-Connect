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

function sanitizeUser(userRow) {
  return {
    id: userRow.id,
    nome: userRow.nome,
    email: userRow.email,
    permissao: userRow.permissao,
    ativo: userRow.ativo,
    last_login_at: userRow.last_login_at || null,
    permissions: userRow.permissions || {},
    effectivePermissions: buildEffectivePermissions(userRow.permissao, userRow.permissions || {})
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

router.use(requireAuth);

router.get(
  "/meta",
  requirePermission(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (_req, res) => {
    return res.status(200).json({
      roles: [...ALLOWED_ROLES],
      permissionsCatalog: allPermissionKeys()
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
    return res.status(200).json(result.rows.map(sanitizeUser));
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

      await logAudit({
        req,
        action: "CREATE",
        resourceType: "USUARIO",
        resourceId: result.rows[0].id,
        summary: `Usuário criado: ${result.rows[0].email}`,
        details: {
          nome: result.rows[0].nome,
          permissao: result.rows[0].permissao,
          ativo: result.rows[0].ativo
        }
      });

      return res.status(201).json(sanitizeUser(result.rows[0]));
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
          senhaAtualizada: req.body.senha !== undefined && String(req.body.senha || "").trim().length > 0
        }
      });

      return res.status(200).json(sanitizeUser(updated.rows[0]));
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
