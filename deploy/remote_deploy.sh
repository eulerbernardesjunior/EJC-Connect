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

COMPOSE_PROJECT="$(printf "%s" "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_-' '-')"
PROJECT_SAFE_NAME="$(printf "%s" "$PROJECT_NAME" | tr -c 'a-zA-Z0-9_.@-' '-')"
DOCKER_BIN="$(command -v docker || echo /usr/bin/docker)"

setup_systemd_autorestart() {
  local health_url="$1"
  local stack_unit="${PROJECT_SAFE_NAME}.service"
  local heal_service="${PROJECT_SAFE_NAME}-healthcheck.service"
  local heal_timer="${PROJECT_SAFE_NAME}-healthcheck.timer"
  local heal_script="/usr/local/bin/${PROJECT_SAFE_NAME}-healthcheck.sh"

  if ! command -v systemctl >/dev/null 2>&1 || ! systemctl list-unit-files >/dev/null 2>&1; then
    echo "systemd nao detectado. Pulando configuracao de auto-start/auto-heal."
    return 0
  fi

  sudo tee "/etc/systemd/system/${stack_unit}" >/dev/null <<EOF
[Unit]
Description=EJC Connect stack (${PROJECT_NAME})
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${APP_DIR}
ExecStart=${DOCKER_BIN} compose -p ${COMPOSE_PROJECT} -f ${APP_DIR}/docker-compose.yml up -d --remove-orphans
ExecStop=${DOCKER_BIN} compose -p ${COMPOSE_PROJECT} -f ${APP_DIR}/docker-compose.yml stop
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

  sudo tee "${heal_script}" >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
if curl -fsS --max-time 8 '${health_url}' >/dev/null 2>&1; then
  exit 0
fi
${DOCKER_BIN} compose -p '${COMPOSE_PROJECT}' -f '${APP_DIR}/docker-compose.yml' up -d --remove-orphans
sleep 3
curl -fsS --max-time 12 '${health_url}' >/dev/null
EOF
  sudo chmod 755 "${heal_script}"

  sudo tee "/etc/systemd/system/${heal_service}" >/dev/null <<EOF
[Unit]
Description=EJC Connect health self-heal (${PROJECT_NAME})
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=${heal_script}
EOF

  sudo tee "/etc/systemd/system/${heal_timer}" >/dev/null <<EOF
[Unit]
Description=EJC Connect health timer (${PROJECT_NAME})

[Timer]
OnBootSec=90s
OnUnitActiveSec=2min
AccuracySec=20s
Persistent=true
Unit=${heal_service}

[Install]
WantedBy=timers.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable docker.service >/dev/null 2>&1 || true
  sudo systemctl enable --now "${stack_unit}" >/dev/null
  sudo systemctl enable --now "${heal_timer}" >/dev/null
}

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

$DOCKER_CMD compose -p "$COMPOSE_PROJECT" -f "$APP_DIR/docker-compose.yml" up -d --build --remove-orphans

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

PRIMARY_HEALTH_URL="${HEALTH_CANDIDATES[0]}"
setup_systemd_autorestart "${PRIMARY_HEALTH_URL}"

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
    $DOCKER_CMD compose -p "$COMPOSE_PROJECT" -f "$APP_DIR/docker-compose.yml" ps || true
    $DOCKER_CMD compose -p "$COMPOSE_PROJECT" -f "$APP_DIR/docker-compose.yml" logs --tail=150 backend web || true
    exit 1
  fi
  echo "Aguardando health check ($ATTEMPT/$HEALTH_ATTEMPTS): ${HEALTH_CANDIDATES[*]}"
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$HEALTH_SLEEP_SECONDS"
done

echo "Deploy concluido com sucesso."
echo "Health check: $HEALTH_URL"
$DOCKER_CMD compose -p "$COMPOSE_PROJECT" -f "$APP_DIR/docker-compose.yml" ps
