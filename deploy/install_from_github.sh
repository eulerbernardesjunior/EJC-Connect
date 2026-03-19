#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/eulerbernardesjunior/EJC-Connect.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/ejc-connect}"
APP_PORT="${APP_PORT:-8080}"
PROJECT_NAME="${PROJECT_NAME:-ejc-connect}"

POSTGRES_DB="${POSTGRES_DB:-ejc_connect}"
POSTGRES_USER="${POSTGRES_USER:-ejc_connect}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-ejc_connect}"

JWT_SECRET="${JWT_SECRET:-$(head -c 48 /dev/urandom | base64 | tr -d '\n' | tr '/+' '_-' | cut -c1-64)}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-12h}"
ADMIN_NAME="${ADMIN_NAME:-Administrador EJC}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ejc.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)}"

OVERWRITE_ENV="${OVERWRITE_ENV:-0}"
COMPOSE_PROJECT="$(printf "%s" "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_-' '-')"
PROJECT_SAFE_NAME="$(printf "%s" "$PROJECT_NAME" | tr -c 'a-zA-Z0-9_.@-' '-')"
DOCKER_BIN="$(command -v docker || echo /usr/bin/docker)"

if [[ "$(id -u)" -eq 0 ]]; then
  IS_ROOT=1
  APP_USER="${SUDO_USER:-root}"
else
  IS_ROOT=0
  APP_USER="$(id -un)"
fi

log() {
  printf "\n[ejc-install] %s\n" "$1"
}

as_root() {
  if [[ "${IS_ROOT}" -eq 1 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Comando obrigatorio ausente: $1" >&2
    exit 1
  fi
}

wait_for_apt_lock() {
  local locks=(
    "/var/lib/apt/lists/lock"
    "/var/cache/apt/archives/lock"
    "/var/lib/dpkg/lock"
    "/var/lib/dpkg/lock-frontend"
  )

  for _ in $(seq 1 120); do
    local busy=0
    for lock_file in "${locks[@]}"; do
      if as_root fuser "${lock_file}" >/dev/null 2>&1; then
        busy=1
        break
      fi
    done
    if [[ "${busy}" -eq 0 ]]; then
      return 0
    fi
    sleep 2
  done

  echo "Timeout aguardando locks do apt/dpkg." >&2
  return 1
}

apt_safe() {
  wait_for_apt_lock
  as_root env DEBIAN_FRONTEND=noninteractive apt-get "$@"
}

wait_for_http_ok() {
  local url="$1"
  local attempts="${2:-60}"
  local delay="${3:-2}"

  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay}"
  done

  echo "Falha no health check: ${url}" >&2
  return 1
}

compose_up() {
  if as_root docker compose version >/dev/null 2>&1; then
    as_root bash -lc "cd '${APP_DIR}' && docker compose -p '${COMPOSE_PROJECT}' up -d --build"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    as_root bash -lc "cd '${APP_DIR}' && docker-compose -p '${COMPOSE_PROJECT}' up -d --build"
    return
  fi

  echo "Docker Compose nao encontrado (plugin ou docker-compose)." >&2
  exit 1
}

setup_systemd_autorestart() {
  local health_url="http://127.0.0.1:${APP_PORT}/api/health"
  local stack_unit="${PROJECT_SAFE_NAME}.service"
  local heal_service="${PROJECT_SAFE_NAME}-healthcheck.service"
  local heal_timer="${PROJECT_SAFE_NAME}-healthcheck.timer"
  local heal_script="/usr/local/bin/${PROJECT_SAFE_NAME}-healthcheck.sh"

  if ! command -v systemctl >/dev/null 2>&1 || ! systemctl list-unit-files >/dev/null 2>&1; then
    log "systemd nao detectado. Pulando auto-start/auto-heal."
    return 0
  fi

  as_root tee "/etc/systemd/system/${stack_unit}" >/dev/null <<EOF
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

  as_root tee "${heal_script}" >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
if curl -fsS --max-time 8 '${health_url}' >/dev/null 2>&1; then
  exit 0
fi
${DOCKER_BIN} compose -p '${COMPOSE_PROJECT}' -f '${APP_DIR}/docker-compose.yml' up -d --remove-orphans
sleep 3
curl -fsS --max-time 12 '${health_url}' >/dev/null
EOF
  as_root chmod 755 "${heal_script}"

  as_root tee "/etc/systemd/system/${heal_service}" >/dev/null <<EOF
[Unit]
Description=EJC Connect health self-heal (${PROJECT_NAME})
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=${heal_script}
EOF

  as_root tee "/etc/systemd/system/${heal_timer}" >/dev/null <<EOF
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

  as_root systemctl daemon-reload
  as_root systemctl enable docker.service >/dev/null 2>&1 || true
  as_root systemctl enable --now "${stack_unit}" >/dev/null
  as_root systemctl enable --now "${heal_timer}" >/dev/null
}

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
else
  echo "/etc/os-release nao encontrado. Sistema nao suportado." >&2
  exit 1
fi

DIST_ID="${ID:-}"
DIST_CODENAME="${VERSION_CODENAME:-}"
if [[ -z "${DIST_CODENAME}" ]] && command -v lsb_release >/dev/null 2>&1; then
  DIST_CODENAME="$(lsb_release -cs || true)"
fi

if [[ "${DIST_ID}" != "ubuntu" && "${DIST_ID}" != "debian" ]]; then
  echo "Distribuicao nao suportada por este instalador: ${DIST_ID}" >&2
  echo "Suportadas: Ubuntu e Debian." >&2
  exit 1
fi

if [[ -z "${DIST_CODENAME}" ]]; then
  echo "Nao foi possivel identificar VERSION_CODENAME." >&2
  exit 1
fi

if [[ "${IS_ROOT}" -ne 1 ]]; then
  require_cmd sudo
fi

log "Instalando dependencias base"
apt_safe update
apt_safe install -y ca-certificates curl git gnupg lsb-release apt-transport-https psmisc

log "Instalando Docker Engine + Docker Compose plugin"
if ! as_root docker info >/dev/null 2>&1; then
  as_root install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${DIST_ID}/gpg" | as_root gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  as_root chmod a+r /etc/apt/keyrings/docker.gpg

  ARCH="$(dpkg --print-architecture)"
  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DIST_ID} ${DIST_CODENAME} stable" \
    | as_root tee /etc/apt/sources.list.d/docker.list >/dev/null

  apt_safe update
  apt_safe install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files >/dev/null 2>&1; then
  as_root systemctl enable --now docker || true
fi

as_root usermod -aG docker "${APP_USER}" >/dev/null 2>&1 || true

log "Baixando codigo do GitHub (${BRANCH}) em ${APP_DIR}"
as_root mkdir -p "${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  as_root git -C "${APP_DIR}" fetch --depth 1 origin "${BRANCH}"
  as_root git -C "${APP_DIR}" checkout -B "${BRANCH}" "origin/${BRANCH}"
  as_root git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"
else
  if [[ -n "$(as_root ls -A "${APP_DIR}" 2>/dev/null || true)" ]]; then
    echo "Diretorio ${APP_DIR} nao esta vazio e nao e um repositorio git." >&2
    echo "Use APP_DIR diferente ou limpe o diretorio antes de instalar." >&2
    exit 1
  fi
  as_root git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

as_root chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}" || true

ENV_FILE="${APP_DIR}/.env"
ENV_CREATED=0
if [[ ! -f "${ENV_FILE}" || "${OVERWRITE_ENV}" = "1" ]]; then
  log "Gerando arquivo .env do deploy"
  TMP_ENV="$(mktemp)"
  cat >"${TMP_ENV}" <<EOF
APP_PORT=${APP_PORT}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
ADMIN_NAME=${ADMIN_NAME}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
  as_root mv "${TMP_ENV}" "${ENV_FILE}"
  as_root chmod 600 "${ENV_FILE}"
  ENV_CREATED=1
else
  log "Mantendo .env existente em ${ENV_FILE}"
fi

log "Subindo stack Docker do EJC-Connect"
compose_up
setup_systemd_autorestart

log "Aguardando servico responder"
wait_for_http_ok "http://127.0.0.1:${APP_PORT}/api/health" 80 2

echo
echo "Instalacao concluida com sucesso."
echo
echo "Resumo:"
echo "- Repositorio: ${REPO_URL} (${BRANCH})"
echo "- Diretorio: ${APP_DIR}"
echo "- URL local: http://127.0.0.1:${APP_PORT}"
echo "- Health: http://127.0.0.1:${APP_PORT}/api/health"
if [[ "${ENV_CREATED}" -eq 1 ]]; then
  echo "- Admin inicial: ${ADMIN_EMAIL}"
  echo "- Senha admin inicial: ${ADMIN_PASSWORD}"
else
  echo "- Credenciais admin: mantidas no .env existente (${ENV_FILE})"
fi
echo
echo "Comandos uteis:"
echo "- cd ${APP_DIR} && docker compose ps"
echo "- cd ${APP_DIR} && docker compose logs -f backend"
echo "- cd ${APP_DIR} && docker compose restart web backend"
echo
echo "Observacao:"
echo "- Se o usuario atual nao conseguir rodar docker sem sudo, reabra o terminal (grupo docker)."
