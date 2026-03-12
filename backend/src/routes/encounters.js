import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { logAudit } from "../services/auditService.js";
import { deleteUploadedByUrl } from "../utils/upload.js";
import { parsePositiveInt } from "../utils/validation.js";

const router = Router();
router.use(requireAuth);

function toDateOnlyString(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
}

router.get(
  "/",
  requirePermission(PERMISSIONS.ENCOUNTERS_VIEW),
  asyncHandler(async (_req, res) => {
    const result = await pool.query("SELECT * FROM encontros ORDER BY data_inicio DESC NULLS LAST, id DESC");
    res.json(result.rows);
  })
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.ENCOUNTERS_VIEW),
  asyncHandler(async (req, res) => {
    const encounterId = parsePositiveInt(req.params.id);
    if (!encounterId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const result = await pool.query("SELECT * FROM encontros WHERE id = $1", [encounterId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Encontro nao encontrado." });
    }
    return res.json(result.rows[0]);
  })
);

router.post(
  "/",
  requirePermission(PERMISSIONS.ENCOUNTERS_MANAGE),
  asyncHandler(async (req, res) => {
    const nome = req.body.nome || req.body.tema;
    const dataInicio = toDateOnlyString(req.body.dataInicio || req.body.dataEncontro);
    const dataFim = toDateOnlyString(req.body.dataFim || req.body.dataEncontro);
    const { capaUrl, contracapaUrl, letraMusicaTema } = req.body;

    if (!nome || !dataInicio || !dataFim) {
      return res
        .status(400)
        .json({ error: "Campos obrigatorios: nome, dataInicio e dataFim." });
    }

    const result = await pool.query(
      `
        INSERT INTO encontros (
          nome,
          tema,
          data_inicio,
          data_fim,
          data_encontro,
          capa_url,
          contracapa_url,
          letra_musica_tema
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [nome, nome, dataInicio, dataFim, dataInicio, capaUrl || null, contracapaUrl || null, letraMusicaTema || null]
    );

    await logAudit({
      req,
      action: "CREATE",
      resourceType: "ENCONTRO",
      resourceId: result.rows[0].id,
      encounterId: result.rows[0].id,
      summary: `Encontro criado: ${result.rows[0].nome || result.rows[0].tema || result.rows[0].id}`,
      details: {
        nome: result.rows[0].nome,
        data_inicio: result.rows[0].data_inicio,
        data_fim: result.rows[0].data_fim
      }
    });

    return res.status(201).json(result.rows[0]);
  })
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.ENCOUNTERS_MANAGE),
  asyncHandler(async (req, res) => {
    const encounterId = parsePositiveInt(req.params.id);
    if (!encounterId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const existingResult = await pool.query("SELECT * FROM encontros WHERE id = $1 LIMIT 1", [encounterId]);
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: "Encontro nao encontrado." });
    }
    const existing = existingResult.rows[0];

    const nome = String(
      req.body.nome ?? req.body.tema ?? existing.nome ?? existing.tema ?? ""
    ).trim();
    const dataInicio = toDateOnlyString(
      req.body.dataInicio ?? req.body.dataEncontro ?? existing.data_inicio ?? existing.data_encontro ?? ""
    );
    const dataFim = toDateOnlyString(
      req.body.dataFim ?? req.body.dataEncontro ?? existing.data_fim ?? existing.data_encontro ?? ""
    );
    const capaUrl =
      req.body.capaUrl !== undefined ? req.body.capaUrl : existing.capa_url;
    const contracapaUrl =
      req.body.contracapaUrl !== undefined ? req.body.contracapaUrl : existing.contracapa_url;
    const letraMusicaTema =
      req.body.letraMusicaTema !== undefined ? req.body.letraMusicaTema : existing.letra_musica_tema;

    if (!nome || !dataInicio || !dataFim) {
      return res.status(400).json({ error: "Campos obrigatorios: nome, dataInicio e dataFim." });
    }

    const result = await pool.query(
      `
        UPDATE encontros
        SET nome = $1,
            tema = $2,
            data_inicio = $3,
            data_fim = $4,
            data_encontro = $5,
            capa_url = $6,
            contracapa_url = $7,
            letra_musica_tema = $8
        WHERE id = $9
        RETURNING *
      `,
      [
        nome,
        nome,
        dataInicio,
        dataFim,
        dataInicio,
        capaUrl || null,
        contracapaUrl || null,
        letraMusicaTema || null,
        encounterId
      ]
    );

    await logAudit({
      req,
      action: "UPDATE",
      resourceType: "ENCONTRO",
      resourceId: encounterId,
      encounterId,
      summary: `Encontro atualizado: ${result.rows[0].nome || result.rows[0].tema || encounterId}`,
      details: {
        before: {
          nome: existing.nome,
          data_inicio: existing.data_inicio,
          data_fim: existing.data_fim
        },
        after: {
          nome: result.rows[0].nome,
          data_inicio: result.rows[0].data_inicio,
          data_fim: result.rows[0].data_fim
        }
      }
    });

    return res.json(result.rows[0]);
  })
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ENCOUNTERS_MANAGE),
  asyncHandler(async (req, res) => {
    const encounterId = parsePositiveInt(req.params.id);
    if (!encounterId) {
      return res.status(400).json({ error: "id invalido." });
    }

    const encounterResult = await pool.query("SELECT id, nome, tema FROM encontros WHERE id = $1 LIMIT 1", [encounterId]);
    if (encounterResult.rowCount === 0) {
      return res.status(404).json({ error: "Encontro nao encontrado." });
    }

    const mediaResult = await pool.query(
      `
        SELECT image_url
        FROM encontro_assets
        WHERE encontro_id = $1
        UNION ALL
        SELECT foto_url AS image_url
        FROM equipes
        WHERE encontro_id = $1 AND foto_url IS NOT NULL
        UNION ALL
        SELECT foto_url AS image_url
        FROM membros
        WHERE encontro_id = $1 AND foto_url IS NOT NULL
      `,
      [encounterId]
    );

    const result = await pool.query("DELETE FROM encontros WHERE id = $1 RETURNING id", [encounterId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Encontro nao encontrado." });
    }

    await logAudit({
      req,
      action: "DELETE",
      resourceType: "ENCONTRO",
      resourceId: encounterId,
      encounterId,
      summary: `Encontro removido: ${encounterResult.rows[0].nome || encounterResult.rows[0].tema || encounterId}`,
      details: {
        nome: encounterResult.rows[0].nome,
        deletedMediaCount: mediaResult.rows.length
      }
    });

    for (const row of mediaResult.rows) {
      await deleteUploadedByUrl(row.image_url);
    }
    return res.status(204).send();
  })
);

export { router as encounterRoutes };
