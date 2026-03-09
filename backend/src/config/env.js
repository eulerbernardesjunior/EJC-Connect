import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();

function required(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return value;
}

function loadDatabaseConfig() {
  const url = process.env.DATABASE_URL;
  if (url && url.trim()) {
    return { connectionString: url.trim() };
  }

  return {
    host: required("DB_HOST", "127.0.0.1"),
    port: optionalNumber("DB_PORT", 5432),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME")
  };
}

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  database: loadDatabaseConfig(),
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || "./uploads"),
  chromeBin: process.env.CHROME_BIN || "/usr/bin/google-chrome-stable",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h"
};
