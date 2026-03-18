#!/usr/bin/env bash
set -euo pipefail

SCRIPT_SOURCE_PATH="${SCRIPT_SOURCE_PATH:-/tmp/ejc-connect-cicd/deploy/server_autodeploy_from_github.sh}"
SCRIPT_TARGET_PATH="${SCRIPT_TARGET_PATH:-/usr/local/bin/ejc-connect-autodeploy.sh}"
SERVICE_PATH="${SERVICE_PATH:-/etc/systemd/system/ejc-connect-autodeploy.service}"
TIMER_PATH="${TIMER_PATH:-/etc/systemd/system/ejc-connect-autodeploy.timer}"
TIMER_FREQUENCY="${TIMER_FREQUENCY:-2min}"

if [ ! -f "$SCRIPT_SOURCE_PATH" ]; then
  echo "Script fonte nao encontrado: $SCRIPT_SOURCE_PATH"
  exit 1
fi

install -m 0755 "$SCRIPT_SOURCE_PATH" "$SCRIPT_TARGET_PATH"

cat >"$SERVICE_PATH" <<'EOF'
[Unit]
Description=EJC Connect Auto Deploy From GitHub
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/ejc-connect-autodeploy.sh
User=root
Group=root
EOF

cat >"$TIMER_PATH" <<EOF
[Unit]
Description=Executa auto deploy do EJC Connect periodicamente

[Timer]
OnBootSec=1min
OnUnitActiveSec=$TIMER_FREQUENCY
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now ejc-connect-autodeploy.timer
systemctl start ejc-connect-autodeploy.service
systemctl --no-pager --full status ejc-connect-autodeploy.timer || true
