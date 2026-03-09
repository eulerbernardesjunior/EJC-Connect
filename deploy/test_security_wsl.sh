#!/usr/bin/env bash
set -euo pipefail

API="${API:-http://127.0.0.1:3100/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin.test@ejc.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin12345}"
VIEWER_EMAIL="${VIEWER_EMAIL:-viewer.test@ejc.local}"
VIEWER_PASSWORD="${VIEWER_PASSWORD:-Viewer12345}"

login_admin_json="$(curl -fsS -X POST "${API}/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"${ADMIN_EMAIL}\",\"senha\":\"${ADMIN_PASSWORD}\"}")"
admin_token="$(python3 - <<'PY' "${login_admin_json}"
import json
import sys
print(json.loads(sys.argv[1])["token"])
PY
)"

authless_status="$(curl -s -o /tmp/ejc_noauth.json -w "%{http_code}" "${API}/users")"
echo "users_without_token_status=${authless_status}"

viewer_json="$(curl -fsS -X POST "${API}/users" -H "Authorization: Bearer ${admin_token}" -H "Content-Type: application/json" -d "{\"nome\":\"Viewer\",\"email\":\"${VIEWER_EMAIL}\",\"senha\":\"${VIEWER_PASSWORD}\",\"permissao\":\"VISUALIZADOR\",\"ativo\":true}")"
echo "${viewer_json}" >/tmp/ejc_viewer_create.json

login_viewer_json="$(curl -fsS -X POST "${API}/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"${VIEWER_EMAIL}\",\"senha\":\"${VIEWER_PASSWORD}\"}")"
viewer_token="$(python3 - <<'PY' "${login_viewer_json}"
import json
import sys
print(json.loads(sys.argv[1])["token"])
PY
)"

viewer_create_status="$(curl -s -o /tmp/ejc_viewer_forbidden.json -w "%{http_code}" -X POST "${API}/encounters" -H "Authorization: Bearer ${viewer_token}" -H "Content-Type: application/json" -d "{\"nome\":\"Bloqueado\",\"dataInicio\":\"2026-03-07\",\"dataFim\":\"2026-03-08\"}")"
echo "viewer_create_encounter_status=${viewer_create_status}"

enc_json="$(curl -fsS -X POST "${API}/encounters" -H "Authorization: Bearer ${admin_token}" -H "Content-Type: application/json" -d "{\"nome\":\"EJC Security Test\",\"dataInicio\":\"2026-03-07\",\"dataFim\":\"2026-03-08\"}")"
enc_id="$(python3 - <<'PY' "${enc_json}"
import json
import sys
print(json.loads(sys.argv[1])["id"])
PY
)"

equipe_json="$(curl -fsS -X POST "${API}/teams" -H "Authorization: Bearer ${admin_token}" -H "Content-Type: application/json" -d "{\"encontroId\":${enc_id},\"nome\":\"Equipe Segurança\",\"tipo\":\"TRABALHO\",\"ordem\":1}")"
team_id="$(python3 - <<'PY' "${equipe_json}"
import json
import sys
print(json.loads(sys.argv[1])["id"])
PY
)"

cat >/tmp/ejc_import_individual.csv <<'CSV'
COORDENADORES
NOME,TELEFONE,PAROQUIA
Carlos,11911111111,Paroquia A
Maria,11922222222,Paroquia A
CSV

import_ind_json="$(curl -fsS -X POST "${API}/imports" -H "Authorization: Bearer ${admin_token}" -F "encounterId=${enc_id}" -F "teamId=${team_id}" -F "file=@/tmp/ejc_import_individual.csv")"
individuais="$(python3 - <<'PY' "${import_ind_json}"
import json
import sys
print(json.loads(sys.argv[1])["estatisticas"]["individuais"])
PY
)"
casais="$(python3 - <<'PY' "${import_ind_json}"
import json
import sys
print(json.loads(sys.argv[1])["estatisticas"]["casais"])
PY
)"
echo "import_sem_tio_individuais=${individuais} casais=${casais}"

cat >/tmp/ejc_import_casal.csv <<'CSV'
TIOS COORDENADORES
NOME,TELEFONE,PAROQUIA
Tio Joao,11933333333,Paroquia B
Tia Ana,11944444444,Paroquia B
CSV

import_casal_json="$(curl -fsS -X POST "${API}/imports" -H "Authorization: Bearer ${admin_token}" -F "encounterId=${enc_id}" -F "teamId=${team_id}" -F "file=@/tmp/ejc_import_casal.csv")"
casais2="$(python3 - <<'PY' "${import_casal_json}"
import json
import sys
print(json.loads(sys.argv[1])["estatisticas"]["casais"])
PY
)"
echo "import_com_tios_casais=${casais2}"

pdf_status="$(curl -s -o /tmp/ejc_team_3100.pdf -w "%{http_code}" -H "Authorization: Bearer ${admin_token}" "${API}/quadrante/team/${team_id}")"
pdf_magic="$(head -c 5 /tmp/ejc_team_3100.pdf || true)"
pdf_size="$(stat -c%s /tmp/ejc_team_3100.pdf || true)"
echo "pdf_status=${pdf_status} pdf_magic=${pdf_magic} pdf_size=${pdf_size}"

