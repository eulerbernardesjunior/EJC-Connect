#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/eulerbernardesjunior/EJC-Connect.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/www/wwwroot/ejc-connect}"
PROJECT_NAME="${PROJECT_NAME:-ejc-connect}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/health}"
STATE_DIR="${STATE_DIR:-/var/lib/ejc-connect-autodeploy}"
STATE_FILE="$STATE_DIR/last_deployed_sha"
ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/ejc-connect-deploy.tgz}"
LOCK_FILE="${LOCK_FILE:-/tmp/ejc-connect-autodeploy.lock}"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Outra execucao de auto deploy ja esta em andamento."
  exit 0
fi

mkdir -p "$STATE_DIR"

LATEST_SHA="$(git ls-remote --heads "$REPO_URL" "$BRANCH" | awk '{print $1}')"
if [ -z "$LATEST_SHA" ]; then
  echo "Nao foi possivel obter o commit mais recente de $REPO_URL ($BRANCH)."
  exit 1
fi

CURRENT_SHA="$(cat "$STATE_FILE" 2>/dev/null || true)"
if [ "$LATEST_SHA" = "$CURRENT_SHA" ]; then
  echo "Sem alteracoes no GitHub. SHA atual: $LATEST_SHA"
  exit 0
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP_DIR/repo"

tar -czf "$ARCHIVE_PATH" \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='**/node_modules' \
  --exclude='**/dist' \
  --exclude='tmp' \
  --exclude='skills' \
  --exclude='*.log' \
  -C "$TMP_DIR/repo" \
  backend frontend deploy docker-compose.yml

chmod +x "$TMP_DIR/repo/deploy/remote_deploy.sh"
APP_DIR="$APP_DIR" \
HEALTH_URL="$HEALTH_URL" \
PROJECT_NAME="$PROJECT_NAME" \
ARCHIVE_PATH="$ARCHIVE_PATH" \
bash "$TMP_DIR/repo/deploy/remote_deploy.sh"

echo "$LATEST_SHA" >"$STATE_FILE"
echo "Auto deploy concluido para commit: $LATEST_SHA"
