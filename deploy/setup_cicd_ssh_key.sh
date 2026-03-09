#!/usr/bin/env bash
set -euo pipefail

if ! command -v sshpass >/dev/null 2>&1; then
  echo "sshpass nao encontrado. Instale com: sudo apt-get install -y sshpass"
  exit 1
fi

if [ -z "${AAPANEL_HOST:-}" ] || [ -z "${AAPANEL_USER:-}" ] || [ -z "${AAPANEL_PASSWORD:-}" ]; then
  echo "Defina as variaveis: AAPANEL_HOST, AAPANEL_USER, AAPANEL_PASSWORD"
  exit 1
fi

AAPANEL_PORT="${AAPANEL_PORT:-22}"
KEY_PATH="${KEY_PATH:-$HOME/.ssh/ejc_connect_github_actions_ed25519}"
KEY_COMMENT="${KEY_COMMENT:-ejc-connect-github-actions}"

if [ ! -f "$KEY_PATH" ]; then
  ssh-keygen -t ed25519 -a 100 -N "" -f "$KEY_PATH" -C "$KEY_COMMENT"
fi

PUB_KEY="$(cat "$KEY_PATH.pub")"

sshpass -p "$AAPANEL_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$AAPANEL_PORT" "$AAPANEL_USER@$AAPANEL_HOST" \
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

sshpass -p "$AAPANEL_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$AAPANEL_PORT" "$AAPANEL_USER@$AAPANEL_HOST" \
  "grep -qxF '$PUB_KEY' ~/.ssh/authorized_keys || echo '$PUB_KEY' >> ~/.ssh/authorized_keys"

echo
echo "Chave configurada no servidor com sucesso."
echo "Use este arquivo como secret AAPANEL_SSH_PRIVATE_KEY no GitHub:"
echo "  $KEY_PATH"
echo
echo "Comandos uteis:"
echo "  cat $KEY_PATH"
echo "  cat $KEY_PATH.pub"
