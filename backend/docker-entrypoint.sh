#!/usr/bin/env sh
set -eu

if command -v pg_isready >/dev/null 2>&1; then
  echo "[backend] aguardando PostgreSQL..."
  if [ -n "${DATABASE_URL:-}" ]; then
    until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
      sleep 1
    done
  else
    DB_HOST="${DB_HOST:-db}"
    DB_PORT="${DB_PORT:-5432}"
    DB_USER="${DB_USER:-postgres}"
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
      sleep 1
    done
  fi
fi

echo "[backend] executando migrations..."
npm run migrate

if [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "[backend] garantindo usuario admin..."
  npm run bootstrap:admin
else
  echo "[backend] ADMIN_PASSWORD vazio, bootstrap admin ignorado."
fi

echo "[backend] iniciando API..."
exec node src/server.js
