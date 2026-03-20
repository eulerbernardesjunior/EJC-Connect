import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { generateSystemManualPdf } from "../services/manualService.js";

const router = Router();
router.use(requireAuth);

function setPdfHeaders(res, fileName, pdfBuffer) {
  const safeName = String(fileName || "manual_ejc_connect.pdf");
  const encoded = encodeURIComponent(safeName);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`);
  if (pdfBuffer?.length) {
    res.setHeader("Content-Length", String(pdfBuffer.length));
  }
}

router.get(
  "/system",
  asyncHandler(async (_req, res) => {
    const { pdf, fileName } = await generateSystemManualPdf();
    setPdfHeaders(res, fileName, pdf);
    return res.send(pdf);
  })
);

export { router as manualRoutes };
