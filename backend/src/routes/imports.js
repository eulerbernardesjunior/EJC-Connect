import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { canManageTeam, hasTeamScopeAssignments, requireAuth, requirePermission } from "../middleware/auth.js";
import { logAudit } from "../services/auditService.js";
import { importCirclesFromFile, importMembersFromFile } from "../services/importService.js";
import { spreadsheetUploadFilter } from "../utils/upload.js";
import { parsePositiveInt } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await fs.mkdir(env.uploadDir, { recursive: true });
      callback(null, env.uploadDir);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${timestamp}_${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: spreadsheetUploadFilter
});

router.post(
  "/",
  requirePermission(PERMISSIONS.IMPORTS_RUN),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Arquivo obrigatorio (campo: file)." });
    }

    const { encounterId, teamId } = req.body;
    if (!encounterId || !teamId) {
      await fs.unlink(req.file.path).catch(() => {});
      return res
        .status(400)
        .json({ success: false, message: "encounterId e teamId sao obrigatorios." });
    }

    const encounterIdNumber = parsePositiveInt(encounterId);
    const teamIdNumber = parsePositiveInt(teamId);
    if (!encounterIdNumber || !teamIdNumber) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: "encounterId e teamId devem ser inteiros positivos."
      });
    }
    if (!canManageTeam(req.user, teamIdNumber)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({
        success: false,
        message: "Sem permissao para importar nesta equipe."
      });
    }

    try {
      const estatisticas = await importMembersFromFile({
        encounterId: encounterIdNumber,
        teamId: teamIdNumber,
        filePath: path.resolve(req.file.path)
      });

      await logAudit({
        req,
        action: "IMPORT",
        resourceType: "MEMBROS",
        resourceId: teamIdNumber,
        encounterId: encounterIdNumber,
        summary: `Importação de membros executada para equipe ${teamIdNumber}`,
        details: {
          total: estatisticas.total,
          individuais: estatisticas.individuais,
          casais: estatisticas.casais,
          linhasArquivo: estatisticas.totalLinhasArquivo,
          erros: estatisticas.erros
        }
      });

      return res.status(200).json({
        success: true,
        message: "Importacao concluida com sucesso.",
        estatisticas
      });
    } catch (error) {
      return res.status(error.status || 400).json({
        success: false,
        message: `Erro na importacao: ${error.message}`
      });
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  })
);

router.post(
  "/circles",
  requirePermission(PERMISSIONS.CIRCLES_IMPORT),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (hasTeamScopeAssignments(req.user)) {
      await fs.unlink(req.file?.path || "").catch(() => {});
      return res.status(403).json({
        success: false,
        message: "Importacao geral de circulos exige acesso global de equipes."
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Arquivo obrigatorio (campo: file)." });
    }

    const { encounterId } = req.body;
    if (!encounterId) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: "encounterId e obrigatorio." });
    }

    const encounterIdNumber = parsePositiveInt(encounterId);
    if (!encounterIdNumber) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: "encounterId deve ser inteiro positivo."
      });
    }

    try {
      const estatisticas = await importCirclesFromFile({
        encounterId: encounterIdNumber,
        filePath: path.resolve(req.file.path)
      });

      await logAudit({
        req,
        action: "IMPORT",
        resourceType: "CIRCULOS",
        encounterId: encounterIdNumber,
        summary: `Importação geral de círculos executada no encontro ${encounterIdNumber}`,
        details: {
          circulosCriados: estatisticas.circulosCriados,
          membrosCriados: estatisticas.membrosCriados,
          linhasLidas: estatisticas.linhasLidas,
          erros: estatisticas.erros
        }
      });

      return res.status(200).json({
        success: true,
        message: "Importacao geral de circulos concluida.",
        estatisticas
      });
    } catch (error) {
      return res.status(error.status || 400).json({
        success: false,
        message: `Erro na importacao de circulos: ${error.message}`
      });
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  })
);

export { router as importRoutes };
