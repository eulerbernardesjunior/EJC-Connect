import { Router } from "express";
import { encounterRoutes } from "./encounters.js";
import { teamRoutes } from "./teams.js";
import { memberRoutes } from "./members.js";
import { importRoutes } from "./imports.js";
import { quadranteRoutes } from "./quadrante.js";
import { userRoutes } from "./users.js";
import { dashboardRoutes } from "./dashboard.js";
import { assetRoutes } from "./assets.js";
import { authRoutes } from "./auth.js";
import { settingsRoutes } from "./settings.js";
import { auditRoutes } from "./audit.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/encounters", encounterRoutes);
router.use("/teams", teamRoutes);
router.use("/members", memberRoutes);
router.use("/imports", importRoutes);
router.use("/quadrante", quadranteRoutes);
router.use("/users", userRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/assets", assetRoutes);
router.use("/settings", settingsRoutes);
router.use("/audit", auditRoutes);

export { router as apiRoutes };
