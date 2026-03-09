#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://127.0.0.1}"
API="${BASE}/api"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ejc.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -z "${ADMIN_PASSWORD}" ]]; then
  echo "Defina ADMIN_PASSWORD para executar os testes autenticados." >&2
  exit 1
fi

echo "[test] health backend direto"
curl -fsS "http://127.0.0.1:3000/api/health" >/tmp/health_direct.json
cat /tmp/health_direct.json
echo

echo "[test] health via nginx"
curl -fsS "${API}/health" >/tmp/health_nginx.json
cat /tmp/health_nginx.json
echo

echo "[test] login admin"
login_json="$(curl -fsS -X POST "${API}/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"${ADMIN_EMAIL}\",\"senha\":\"${ADMIN_PASSWORD}\"}")"
echo "${login_json}"
token="$(python3 - <<'PY' "${login_json}"
import json
import sys
print(json.loads(sys.argv[1])["token"])
PY
)"
if [[ -z "${token}" ]]; then
  echo "Falha no login (token vazio)." >&2
  exit 1
fi
AUTH=(-H "Authorization: Bearer ${token}")

echo "[test] criar encontro"
enc_json="$(curl -fsS -X POST "${API}/encounters" "${AUTH[@]}" -H "Content-Type: application/json" -d '{"nome":"EJC Teste WSL","dataInicio":"2026-03-06","dataFim":"2026-03-08"}')"
echo "${enc_json}"
enc_id="$(python3 - <<'PY' "${enc_json}"
import json
import sys
print(json.loads(sys.argv[1])["id"])
PY
)"
echo "encounter_id=${enc_id}"

echo "[test] criar equipe"
team_json="$(curl -fsS -X POST "${API}/teams" "${AUTH[@]}" -H "Content-Type: application/json" -d "{\"encontroId\":${enc_id},\"nome\":\"Equipe Teste\",\"tipo\":\"TRABALHO\",\"ordem\":1}")"
echo "${team_json}"
team_id="$(python3 - <<'PY' "${team_json}"
import json
import sys
print(json.loads(sys.argv[1])["id"])
PY
)"
echo "team_id=${team_id}"

echo "[test] criar circulo"
curl -fsS -X POST "${API}/teams" "${AUTH[@]}" -H "Content-Type: application/json" -d "{\"encontroId\":${enc_id},\"nome\":\"Circulo Esperanca\",\"tipo\":\"CIRCULO\",\"ordem\":2,\"corHex\":\"#3A8EBA\",\"slogan\":\"Servir com alegria\"}" >/tmp/circle_result.json
cat /tmp/circle_result.json
echo

echo "[test] criar membro manual"
curl -fsS -X POST "${API}/members" "${AUTH[@]}" -H "Content-Type: application/json" -d "{\"encontroId\":${enc_id},\"equipeId\":${team_id},\"cargoNome\":\"Jovem Coordenador\",\"nomePrincipal\":\"Joao Teste\",\"telefonePrincipal\":\"11999998888\",\"paroquia\":\"Paroquia Sao Jose\"}" >/tmp/member_manual.json
cat /tmp/member_manual.json
echo

echo "[test] importacao csv com casal"
cat >/tmp/ejc_import.csv <<'CSV'
TIOS COORDENADORES
NOME,TELEFONE,PAROQUIA
Tio Carlos,11911112222,Santa Luzia
Tia Maria,11933334444,Santa Luzia
INTEGRANTES
NOME,TELEFONE,PAROQUIA
Ana Jovem,11955556666,Santa Rita
CSV
curl -fsS -X POST "${API}/imports" "${AUTH[@]}" -F "encounterId=${enc_id}" -F "teamId=${team_id}" -F "file=@/tmp/ejc_import.csv" >/tmp/import_result.json
cat /tmp/import_result.json
echo

echo "[test] upload de capa"
base64 -d >/tmp/capa.png <<'B64'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7n3j0AAAAASUVORK5CYII=
B64
curl -fsS -X POST "${API}/assets" "${AUTH[@]}" -F "encounterId=${enc_id}" -F "tipo=CAPA" -F "titulo=Capa Teste" -F "ordem=1" -F "file=@/tmp/capa.png" >/tmp/asset_result.json
cat /tmp/asset_result.json
echo

echo "[test] gerar pdf parcial da equipe"
curl -fsS "${AUTH[@]}" "${API}/quadrante/team/${team_id}" -o /tmp/quadrante_time.pdf
pdf_size="$(stat -c%s /tmp/quadrante_time.pdf)"
echo "pdf_size=${pdf_size}"
if [[ "${pdf_size}" -lt 1000 ]]; then
  echo "PDF muito pequeno, falha." >&2
  exit 1
fi
pdf_magic="$(head -c 5 /tmp/quadrante_time.pdf || true)"
if [[ "${pdf_magic}" != "%PDF-" ]]; then
  echo "Arquivo retornado nao eh PDF valido (magic: ${pdf_magic})." >&2
  exit 1
fi

echo "[test] dashboard encontro"
curl -fsS "${AUTH[@]}" "${API}/dashboard?encounterId=${enc_id}" >/tmp/dashboard_test.json
cat /tmp/dashboard_test.json
echo

echo "[test] frontend index"
status="$(curl -s -o /tmp/index.html -w "%{http_code}" "${BASE}/")"
echo "http_status=${status}"
head -n 2 /tmp/index.html

echo "[test] uploads via nginx"
asset_json="$(curl -fsS "${AUTH[@]}" "${API}/assets?encounterId=${enc_id}")"
asset_path="$(python3 - <<'PY' "${asset_json}"
import json
import sys
rows = json.loads(sys.argv[1])
print(rows[0]["image_url"] if rows else "")
PY
)"
if [[ -z "${asset_path}" ]]; then
  echo "Nao foi encontrado asset para validar uploads." >&2
  exit 1
fi
upload_status="$(curl -s -o /tmp/asset_served.png -w "%{http_code}" "${BASE}${asset_path}")"
upload_size="$(stat -c%s /tmp/asset_served.png)"
echo "upload_status=${upload_status} upload_size=${upload_size}"
if [[ "${upload_status}" != "200" ]]; then
  echo "Falha ao servir /uploads via nginx." >&2
  exit 1
fi
