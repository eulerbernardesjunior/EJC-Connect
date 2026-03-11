#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/ejc-connect}"
ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/ejc-connect-deploy.tgz}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/health}"
PROJECT_NAME="${PROJECT_NAME:-ejc-connect}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-40}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-3}"
HEALTH_CURL_RETRY="${HEALTH_CURL_RETRY:-3}"
HEALTH_CURL_RETRY_DELAY="${HEALTH_CURL_RETRY_DELAY:-1}"
HEALTH_CURL_MAX_TIME="${HEALTH_CURL_MAX_TIME:-10}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/.deploy-backups}"

if [ ! -f "$ARCHIVE_PATH" ]; then
  echo "Arquivo de deploy nao encontrado: $ARCHIVE_PATH"
  exit 1
fi

if ! sudo -n true >/dev/null 2>&1; then
  echo "Usuario precisa ter sudo sem prompt para deploy automatizado."
  exit 1
fi

if docker info >/dev/null 2>&1; then
  DOCKER_CMD="docker"
else
  DOCKER_CMD="sudo docker"
fi

PROJECT_HASH="$(printf "%s" "$PROJECT_NAME" | md5sum | awk '{print $1}')"

sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

if [ -d "$APP_DIR/backend" ] || [ -d "$APP_DIR/frontend" ] || [ -f "$APP_DIR/docker-compose.yml" ]; then
  mkdir -p "$BACKUP_DIR"
  STAMP="$(date +%Y%m%d_%H%M%S)"
  tar -czf "$BACKUP_DIR/code-$STAMP.tar.gz" \
    -C "$APP_DIR" \
    backend frontend docker-compose.yml deploy 2>/dev/null || true
fi

cd "$APP_DIR"
rm -rf backend frontend deploy
rm -f docker-compose.yml

tar -xzf "$ARCHIVE_PATH" -C "$APP_DIR"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Arquivo .env nao encontrado em $APP_DIR. O deploy foi interrompido."
  exit 1
fi

# Limpa containers legados e atuais para evitar conflito de porta/nome
# quando a composicao muda entre `service-1` e `container_name` fixo.
for CONTAINER_NAME in \
  ejc-connect-db ejc-connect-backend ejc-connect-web \
  ejc-connect-db-1 ejc-connect-backend-1 ejc-connect-web-1; do
  if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    $DOCKER_CMD rm -f "$CONTAINER_NAME" >/dev/null
  fi
done

$DOCKER_CMD compose -p "$PROJECT_HASH" -f "$APP_DIR/docker-compose.yml" up -d --build --remove-orphans

add_health_candidate() {
  local candidate="$1"
  [ -n "$candidate" ] || return 0
  for existing in "${HEALTH_CANDIDATES[@]:-}"; do
    [ "$existing" = "$candidate" ] && return 0
  done
  HEALTH_CANDIDATES+=("$candidate")
}

HEALTH_CANDIDATES=()
add_health_candidate "$HEALTH_URL"

APP_PORT_VALUE=""
if [ -f "$APP_DIR/.env" ]; then
  APP_PORT_VALUE="$(grep -E '^APP_PORT=' "$APP_DIR/.env" | tail -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d '\r' | xargs || true)"
fi

if [ -n "$APP_PORT_VALUE" ]; then
  add_health_candidate "http://127.0.0.1:${APP_PORT_VALUE}/api/health"
fi

add_health_candidate "http://127.0.0.1:8080/api/health"

check_health_any() {
  local candidate
  for candidate in "${HEALTH_CANDIDATES[@]}"; do
    if curl -fsS \
      --retry "$HEALTH_CURL_RETRY" \
      --retry-delay "$HEALTH_CURL_RETRY_DELAY" \
      --retry-connrefused \
      --max-time "$HEALTH_CURL_MAX_TIME" \
      "$candidate" >/dev/null 2>&1; then
      HEALTH_URL="$candidate"
      return 0
    fi
  done
  return 1
}

ATTEMPT=1
sleep 2
until check_health_any; do
  if [ "$ATTEMPT" -ge "$HEALTH_ATTEMPTS" ]; then
    echo "Health check falhou apos $HEALTH_ATTEMPTS tentativas. Candidatos testados: ${HEALTH_CANDIDATES[*]}"
    $DOCKER_CMD compose -p "$PROJECT_HASH" -f "$APP_DIR/docker-compose.yml" ps || true
    $DOCKER_CMD compose -p "$PROJECT_HASH" -f "$APP_DIR/docker-compose.yml" logs --tail=150 backend web || true
    exit 1
  fi
  echo "Aguardando health check ($ATTEMPT/$HEALTH_ATTEMPTS): ${HEALTH_CANDIDATES[*]}"
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$HEALTH_SLEEP_SECONDS"
done

echo "Deploy concluido com sucesso."
echo "Health check: $HEALTH_URL"
$DOCKER_CMD compose -p "$PROJECT_HASH" -f "$APP_DIR/docker-compose.yml" ps
