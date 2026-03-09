import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { parsePositiveInt } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

function parseNonNegativeInt(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }
  return Math.floor(number);
}

router.get(
  "/",
  requirePermission(PERMISSIONS.USERS_VIEW),
  asyncHandler(async (req, res) => {
    const encounterId = req.query.encounterId ? parsePositiveInt(req.query.encounterId) : null;
    const userId = req.query.userId ? parsePositiveInt(req.query.userId) : null;
    const action = String(req.query.action || "").trim().toUpperCase();
    const resourceType = String(req.query.resourceType || "").trim().toUpperCase();
    const limit = Math.min(parseNonNegativeInt(req.query.limit, 100) || 100, 500);
    const offset = parseNonNegativeInt(req.query.offset, 0);

    if (req.query.encounterId && !encounterId) {
      return res.status(400).json({ error: "encounterId invalido." });
    }
    if (req.query.userId && !userId) {
      return res.status(400).json({ error: "userId invalido." });
    }

    const where = [];
    const values = [];

    if (encounterId) {
      values.push(encounterId);
      where.push(`a.encontro_id = $${values.length}`);
    }
    if (userId) {
      values.push(userId);
      where.push(`a.user_id = $${values.length}`);
    }
    if (action) {
      values.push(action);
      where.push(`a.action = $${values.length}`);
    }
    if (resourceType) {
      values.push(resourceType);
      where.push(`a.resource_type = $${values.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const queryValues = [...values, limit, offset];
    const rowsResult = await pool.query(
      `
        SELECT
          a.*,
          u.nome AS user_nome,
          u.email AS user_email,
          e.nome AS encontro_nome
        FROM audit_logs a
        LEFT JOIN app_users u ON u.id = a.user_id
        LEFT JOIN encontros e ON e.id = a.encontro_id
        ${whereSql}
        ORDER BY a.id DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      queryValues
    );

    const totalResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM audit_logs a
        ${whereSql}
      `,
      values
    );

    return res.json({
      items: rowsResult.rows,
      total: totalResult.rows[0]?.total || 0,
      limit,
      offset
    });
  })
);

export { router as auditRoutes };
