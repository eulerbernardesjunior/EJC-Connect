#!/usr/bin/env bash
set -euo pipefail

APP_NAME="ejc-connect"
BACKEND_PORT="${BACKEND_PORT:-3000}"
DB_NAME="${DB_NAME:-ejc_connect}"
DB_USER="${DB_USER:-ejc_connect}"
DB_PASSWORD="${DB_PASSWORD:-ejc_connect}"
DB_PORT="${DB_PORT:-5432}"
JWT_SECRET="${JWT_SECRET:-$(head -c 48 /dev/urandom | base64 | tr -d '\n' | tr '/+' '_-' | cut -c1-64)}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-12h}"
ADMIN_NAME="${ADMIN_NAME:-Administrador EJC}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ejc.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)}"
DOMAIN="${DOMAIN:-_}"
APP_ROOT="${APP_ROOT:-/opt/ejc-connect}"
WEB_ROOT="${WEB_ROOT:-/var/www/ejc-connect}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ "$(id -u)" -eq 0 ]]; then
  IS_ROOT=1
  APP_USER="${SUDO_USER:-root}"
else
  IS_ROOT=0
  APP_USER="$(id -un)"
fi

APP_HOME="$(getent passwd "${APP_USER}" | cut -d: -f6)"

as_root() {
  if [[ "${IS_ROOT}" -eq 1 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

as_user() {
  local target_user="$1"
  shift
  if [[ "${IS_ROOT}" -eq 1 ]]; then
    runuser -u "${target_user}" -- "$@"
  else
    sudo -u "${target_user}" "$@"
  fi
}

as_user_bash() {
  local target_user="$1"
  local cmd="$2"
  as_user "${target_user}" bash -lc "${cmd}"
}

as_postgres() {
  if [[ "${IS_ROOT}" -eq 1 ]]; then
    runuser -u postgres -- "$@"
  else
    sudo -u postgres "$@"
  fi
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

shell_escape() {
  printf "%q" "$1"
}

DB_USER_SQL="$(sql_escape "${DB_USER}")"
DB_NAME_SQL="$(sql_escape "${DB_NAME}")"
DB_PASSWORD_SQL="$(sql_escape "${DB_PASSWORD}")"
ADMIN_NAME_ESC="$(shell_escape "${ADMIN_NAME}")"
ADMIN_EMAIL_ESC="$(shell_escape "${ADMIN_EMAIL}")"
ADMIN_PASSWORD_ESC="$(shell_escape "${ADMIN_PASSWORD}")"

log() {
  printf "\n[install] %s\n" "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Comando obrigatorio ausente: $1" >&2
    exit 1
  fi
}

validate_db_identifier() {
  local value="$1"
  local label="$2"
  if [[ ! "${value}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "${label} invalido: '${value}'. Use apenas letras, numeros e underscore, iniciando com letra/underscore." >&2
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

    sleep 3
  done

  echo "Timeout aguardando lock do apt/dpkg." >&2
  return 1
}

apt_safe() {
  wait_for_apt_lock
  as_root env DEBIAN_FRONTEND=noninteractive apt-get "$@"
}

configure_nodesource() {
  if [[ "${IS_ROOT}" -eq 1 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  fi
}

start_service() {
  local service_name="$1"

  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files >/dev/null 2>&1; then
    as_root systemctl enable "${service_name}" >/dev/null 2>&1 || true
    as_root systemctl restart "${service_name}" || as_root systemctl start "${service_name}"
    return
  fi

  as_root service "${service_name}" restart || as_root service "${service_name}" start || as_root /etc/init.d/"${service_name}" start
}

start_postgresql() {
  if [[ -f /etc/ssl/private/ssl-cert-snakeoil.key ]]; then
    as_root chown root:ssl-cert /etc/ssl/private/ssl-cert-snakeoil.key || true
    as_root chmod 640 /etc/ssl/private/ssl-cert-snakeoil.key || true
    as_root usermod -a -G ssl-cert postgres || true
  fi

  start_service postgresql || true

  if as_postgres psql -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
    return
  fi

  if command -v pg_lsclusters >/dev/null 2>&1; then
    while read -r pg_ver pg_cluster _; do
      if [[ -n "${pg_ver}" && -n "${pg_cluster}" ]]; then
        as_root pg_ctlcluster --skip-systemctl-redirect "${pg_ver}" "${pg_cluster}" start || as_root pg_ctlcluster "${pg_ver}" "${pg_cluster}" start || true
      fi
    done < <(pg_lsclusters --no-header)
  fi

  if ! as_postgres psql -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
    echo "Falha ao iniciar PostgreSQL local." >&2
    exit 1
  fi
}

wait_for_http_ok() {
  local url="$1"
  local attempts="${2:-30}"
  local delay="${3:-2}"

  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay}"
  done

  echo "Falha ao obter resposta HTTP 200 em ${url}" >&2
  return 1
}

validate_db_identifier "${DB_USER}" "DB_USER"
validate_db_identifier "${DB_NAME}" "DB_NAME"

log "Instalando dependencias base"
apt_safe update
apt_safe install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  nginx \
  postgresql \
  postgresql-contrib \
  rsync \
  build-essential \
  psmisc \
  util-linux

log "Instalando Node.js LTS"
if ! command -v node >/dev/null 2>&1; then
  configure_nodesource
  apt_safe install -y nodejs
else
  NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
  if [[ "${NODE_MAJOR}" -lt 20 ]]; then
    configure_nodesource
    apt_safe install -y nodejs
  fi
fi

log "Instalando Google Chrome (Puppeteer runtime)"
if ! command -v google-chrome-stable >/dev/null 2>&1; then
  curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | as_root gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | as_root tee /etc/apt/sources.list.d/google-chrome.list >/dev/null
  apt_safe update
  apt_safe install -y google-chrome-stable
fi

log "Sincronizando projeto para ${APP_ROOT}"
as_root mkdir -p "${APP_ROOT}"
as_root rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "uploads" \
  "${PROJECT_ROOT}/" "${APP_ROOT}/"
as_root chown -R "${APP_USER}:${APP_USER}" "${APP_ROOT}"

start_postgresql

log "Provisionando Postgres"
as_postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER_SQL}') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', '${DB_USER_SQL}', '${DB_PASSWORD_SQL}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${DB_USER_SQL}', '${DB_PASSWORD_SQL}');
  END IF;
END
\$\$;
SQL

DB_EXISTS="$(as_postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME_SQL}'")"
if [[ -z "${DB_EXISTS}" ]]; then
  as_postgres createdb --owner="${DB_USER}" "${DB_NAME}"
fi

log "Configurando backend (.env + dependencias + migrations)"
BACKEND_ENV="${APP_ROOT}/backend/.env"
cat > "${BACKEND_ENV}" <<EOF
PORT=${BACKEND_PORT}
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
UPLOAD_DIR=${APP_ROOT}/backend/uploads
CHROME_BIN=/usr/bin/google-chrome-stable
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
EOF

as_user_bash "${APP_USER}" "cd '${APP_ROOT}/backend' && npm install"
as_user_bash "${APP_USER}" "cd '${APP_ROOT}/backend' && npm run migrate"
as_user_bash "${APP_USER}" "cd '${APP_ROOT}/backend' && ADMIN_NAME=${ADMIN_NAME_ESC} ADMIN_EMAIL=${ADMIN_EMAIL_ESC} ADMIN_PASSWORD=${ADMIN_PASSWORD_ESC} npm run bootstrap:admin"

log "Buildando frontend"
as_user_bash "${APP_USER}" "cd '${APP_ROOT}/frontend' && npm install"
as_user_bash "${APP_USER}" "cd '${APP_ROOT}/frontend' && npm run build"

log "Publicando frontend em ${WEB_ROOT}"
as_root mkdir -p "${WEB_ROOT}"
as_root rsync -a --delete "${APP_ROOT}/frontend/dist/" "${WEB_ROOT}/"
as_root chown -R www-data:www-data "${WEB_ROOT}"

log "Configurando Nginx"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
cat > /tmp/${APP_NAME}.nginx <<EOF
server {
  listen 80;
  server_name ${DOMAIN};

  root ${WEB_ROOT};
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:${BACKEND_PORT}/uploads/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location / {
    try_files \$uri /index.html;
  }
}
EOF

as_root mv /tmp/${APP_NAME}.nginx "${NGINX_SITE}"
as_root ln -sfn "${NGINX_SITE}" "/etc/nginx/sites-enabled/${APP_NAME}"
as_root rm -f /etc/nginx/sites-enabled/default
as_root nginx -t

start_service nginx || as_root nginx -s reload || true

log "Configurando PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  as_root npm install -g pm2
fi

as_user_bash "${APP_USER}" "pm2 delete ejc-connect-backend >/dev/null 2>&1 || true && cd '${APP_ROOT}/backend' && EJC_BACKEND_CWD='${APP_ROOT}/backend' PORT='${BACKEND_PORT}' pm2 start ecosystem.config.cjs --env production"
as_user_bash "${APP_USER}" "pm2 save"

STARTUP_OUTPUT="$(as_user_bash "${APP_USER}" "pm2 startup systemd -u '${APP_USER}' --hp '${APP_HOME}'" || true)"
STARTUP_CMD="$(printf '%s\n' "${STARTUP_OUTPUT}" | grep -E 'sudo .*pm2 startup|^[[:space:]]*env PATH=.*pm2 startup' | tail -n1 || true)"
if [[ -n "${STARTUP_CMD}" ]]; then
  if [[ "${IS_ROOT}" -eq 1 ]]; then
    bash -lc "${STARTUP_CMD#sudo }"
  else
    eval "${STARTUP_CMD}"
  fi
fi

log "Verificacao final"
require_cmd node
require_cmd npm
require_cmd psql
require_cmd nginx
require_cmd pm2

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files >/dev/null 2>&1; then
  as_root systemctl is-active --quiet nginx
fi

as_user_bash "${APP_USER}" "pm2 status"

log "Smoke test de servicos"
wait_for_http_ok "http://127.0.0.1:${BACKEND_PORT}/api/health" 40 2
wait_for_http_ok "http://127.0.0.1/api/health" 40 2
if ! as_user_bash "${APP_USER}" "pm2 jlist | grep -q '\"name\":\"ejc-connect-backend\"'"; then
  echo "Processo PM2 ejc-connect-backend nao encontrado." >&2
  exit 1
fi

echo
echo "Instalacao concluida."
echo
echo "Resumo:"
echo "- App root: ${APP_ROOT}"
echo "- Frontend publicado: ${WEB_ROOT}"
echo "- API direta: http://localhost:${BACKEND_PORT}/api/health"
echo "- API via Nginx: http://localhost/api/health"
echo "- Nginx host: ${DOMAIN}"
echo "- Banco: ${DB_NAME} (owner: ${DB_USER})"
echo "- Login admin inicial: ${ADMIN_EMAIL}"
echo "- Senha admin inicial: ${ADMIN_PASSWORD}"
echo
echo "Comandos uteis:"
echo "- sudo systemctl status nginx"
echo "- sudo -u ${APP_USER} pm2 logs ejc-connect-backend"
echo "- sudo -u ${APP_USER} pm2 restart ejc-connect-backend"
echo







