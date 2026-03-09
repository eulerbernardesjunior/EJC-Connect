import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function runMigrations() {
  await ensureMigrationsTable();
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const exists = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (exists.rowCount > 0) {
      continue;
    }

    const sqlPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(sqlPath, "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

runMigrations()
  .then(async () => {
    console.log("[migrate] done");
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[migrate] failed", error);
    await pool.end();
    process.exit(1);
  });
