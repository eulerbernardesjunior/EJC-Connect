import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { parsePositiveInt } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  asyncHandler(async (req, res) => {
    const hasEncounterParam = req.query.encounterId !== undefined;
    const encounterId = hasEncounterParam ? parsePositiveInt(req.query.encounterId) : null;
    if (hasEncounterParam && !encounterId) {
      return res.status(400).json({ error: "encounterId invalido." });
    }

    const baseFilter = encounterId ? "WHERE encontro_id = $1" : "";
    const params = encounterId ? [encounterId] : [];

    const [teams, circles, members, assets, encontros] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM equipes ${baseFilter} ${encounterId ? "AND" : "WHERE"} tipo = 'TRABALHO'`, params),
      pool.query(`SELECT COUNT(*)::int AS total FROM equipes ${baseFilter} ${encounterId ? "AND" : "WHERE"} tipo = 'CIRCULO'`, params),
      pool.query(`SELECT COUNT(*)::int AS total FROM membros ${baseFilter}`, params),
      pool.query(`SELECT COUNT(*)::int AS total FROM encontro_assets ${baseFilter}`, params),
      pool.query("SELECT COUNT(*)::int AS total FROM encontros")
    ]);

    return res.json({
      encontros: encontros.rows[0].total,
      equipes: teams.rows[0].total,
      circulos: circles.rows[0].total,
      capasCartazes: assets.rows[0].total,
      membros: members.rows[0].total
    });
  })
);

export { router as dashboardRoutes };
