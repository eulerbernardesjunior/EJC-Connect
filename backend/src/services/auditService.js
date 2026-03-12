import { pool } from "../db/pool.js";

function firstForwardedIp(value) {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : String(value);
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

function toNullableString(value, max = 1000) {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function toJsonObject(value) {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    return { value };
  }
  return value;
}

export async function logAudit({
  req,
  userId,
  encounterId = null,
  action,
  resourceType,
  resourceId = null,
  summary,
  details = {}
}) {
  try {
    const actorUserId = Number(userId ?? req?.user?.id ?? 0) || null;
    const ipAddress =
      firstForwardedIp(req?.headers?.["x-forwarded-for"]) ||
      toNullableString(req?.ip, 120) ||
      toNullableString(req?.socket?.remoteAddress, 120);
    const userAgent = toNullableString(req?.headers?.["user-agent"], 600);
    const normalizedEncounterId = Number(encounterId || 0) || null;

    await pool.query(
      `
        INSERT INTO audit_logs (
          user_id,
          encontro_id,
          action,
          resource_type,
          resource_id,
          summary,
          details,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      `,
      [
        actorUserId,
        normalizedEncounterId,
        String(action || "").trim().toUpperCase() || "UNSPECIFIED",
        String(resourceType || "").trim().toUpperCase() || "UNSPECIFIED",
        resourceId !== null && resourceId !== undefined ? String(resourceId) : null,
        toNullableString(summary, 500) || "Sem resumo",
        JSON.stringify(toJsonObject(details)),
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}
