import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { generateQuadrantePdf, generateTeamQuadrantePdf } from "../services/quadranteService.js";

const router = Router();
router.use(requireAuth, requirePermission(PERMISSIONS.PDF_GENERATE));

function setPdfHeaders(res, fileName, pdfBuffer) {
  const safeName = String(fileName || "quadrante.pdf");
  const encoded = encodeURIComponent(safeName);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`);
  if (pdfBuffer?.length) {
    res.setHeader("Content-Length", String(pdfBuffer.length));
  }
}

router.get(
  "/team/:teamId",
  asyncHandler(async (req, res) => {
    const teamId = Number(req.params.teamId);
    if (Number.isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({ error: "teamId invalido." });
    }

    const { pdf, fileName } = await generateTeamQuadrantePdf(teamId);
    setPdfHeaders(res, fileName, pdf);
    return res.send(pdf);
  })
);

router.get(
  "/encounter/:encounterId",
  asyncHandler(async (req, res) => {
    const encounterId = Number(req.params.encounterId);
    if (Number.isNaN(encounterId) || encounterId <= 0) {
      return res.status(400).json({ error: "encounterId invalido." });
    }

    const { pdf, fileName } = await generateQuadrantePdf(encounterId);
    setPdfHeaders(res, fileName, pdf);
    return res.send(pdf);
  })
);

router.get(
  "/:encounterId",
  asyncHandler(async (req, res) => {
    const encounterId = Number(req.params.encounterId);
    if (Number.isNaN(encounterId) || encounterId <= 0) {
      return res.status(400).json({ error: "encounterId invalido." });
    }

    const { pdf, fileName } = await generateQuadrantePdf(encounterId);
    setPdfHeaders(res, fileName, pdf);
    return res.send(pdf);
  })
);

export { router as quadranteRoutes };
