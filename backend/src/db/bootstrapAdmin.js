import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

const name = String(process.env.ADMIN_NAME || "Administrador EJC").trim();
const email = String(process.env.ADMIN_EMAIL || "admin@ejc.local")
  .trim()
  .toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "").trim();

function fail(message) {
  console.error(`[bootstrap-admin] ${message}`);
  process.exit(1);
}

if (!email) fail("ADMIN_EMAIL obrigatorio.");
if (!password || password.length < 8) {
  fail("ADMIN_PASSWORD obrigatorio com no minimo 8 caracteres.");
}

const passwordHash = await bcrypt.hash(password, 12);

try {
  const existing = await pool.query("SELECT id FROM app_users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
  if (existing.rowCount > 0) {
    await pool.query(
      `
        UPDATE app_users
        SET nome = $1,
            permissao = 'ADMIN',
            ativo = TRUE,
            password_hash = $2
        WHERE id = $3
      `,
      [name || "Administrador EJC", passwordHash, existing.rows[0].id]
    );
    console.log(`[bootstrap-admin] usuario admin atualizado: ${email}`);
  } else {
    await pool.query(
      `
        INSERT INTO app_users (nome, email, permissao, ativo, permissions, password_hash)
        VALUES ($1, $2, 'ADMIN', TRUE, '{}'::jsonb, $3)
      `,
      [name || "Administrador EJC", email, passwordHash]
    );
    console.log(`[bootstrap-admin] usuario admin criado: ${email}`);
  }
} catch (error) {
  console.error("[bootstrap-admin] falha", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
