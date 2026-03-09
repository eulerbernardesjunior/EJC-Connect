# EJC Connect

Plataforma full stack para gestao de encontros de jovens cristaos com:
- Backend Node.js + Express + PostgreSQL
- Frontend React + Vite + TypeScript
- Importacao XLSX/CSV com Pairing Mode para casais/tios
- Geracao do Quadrante em PDF A4 (Puppeteer)
- Deploy self-hosted via Nginx + PM2 (modo legado)
- Deploy containerizado via Docker Compose (recomendado)

## Estrutura

- `backend/` API, migrations, importador e gerador de PDF
- `frontend/` painel web
- `deploy/install.sh` instalacao completa em Ubuntu 24.04 (sem Docker)
- `docker-compose.yml` stack completa Docker (db + backend + web)

## Docker (recomendado para producao)

1. Copie o arquivo de variaveis:

```bash
cp .env.docker.example .env
```

2. Edite o `.env` e ajuste pelo menos:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ADMIN_PASSWORD`

3. Suba o stack:

```bash
docker compose up -d --build
```

4. Acesse:
- App: `http://localhost:${APP_PORT}` (padrao `80`)
- Health API: `http://localhost/api/health`

Comandos uteis:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f web
docker compose down
```

Persistencia no Docker:
- Banco: volume `postgres_data`
- Uploads/imagens: volume `uploads_data`

Observacoes:
- O backend executa `npm run migrate` automaticamente ao iniciar.
- Se `ADMIN_PASSWORD` estiver definido, o container garante o usuario admin via `bootstrap:admin`.

## Instalacao automatica (Ubuntu 24.04, sem Docker)

No servidor Ubuntu:

```bash
chmod +x deploy/install.sh
sudo DOMAIN=seu-dominio.com DB_PASSWORD='senha-forte' ./deploy/install.sh
```

Variaveis opcionais:
- `BACKEND_PORT` (padrao: `3000`)
- `DB_PORT` (padrao: `5432`)
- `DB_NAME` (padrao: `ejc_connect`)
- `DB_USER` (padrao: `ejc_connect`)
- `DB_PASSWORD` (padrao: `ejc_connect`)
- `JWT_SECRET` (padrao: gerado automaticamente no install)
- `JWT_EXPIRES_IN` (padrao: `12h`)
- `ADMIN_NAME` (padrao: `Administrador EJC`)
- `ADMIN_EMAIL` (padrao: `admin@ejc.local`)
- `ADMIN_PASSWORD` (padrao: senha aleatoria gerada no install)
- `DOMAIN` (padrao: `_`)
- `APP_ROOT` (padrao: `/opt/ejc-connect`)
- `WEB_ROOT` (padrao: `/var/www/ejc-connect`)

## Desenvolvimento local

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

API local: `http://localhost:3000/api/health`

## Verificacao automatica no instalador

O `deploy/install.sh` falha automaticamente se:
- API backend nao responder em `http://127.0.0.1:<BACKEND_PORT>/api/health`
- API via Nginx nao responder em `http://127.0.0.1/api/health`
- processo PM2 `ejc-connect-backend` nao for encontrado

Ao final da instalacao, o script imprime o e-mail e senha do usuario administrador inicial.

## Teste de runtime autenticado

Depois da instalacao, execute:

```bash
ADMIN_PASSWORD='<senha-mostrada-no-install>' ./deploy/test_install_runtime.sh
```

## CI/CD GitHub -> aaPanel

Pipeline pronto no repositório:

- `.github/workflows/ci-cd-aapanel.yml`

Guia completo de configuracao:

- `deploy/GITHUB_ACTIONS_CICD.md`

Resumo:

1. Configure os secrets do GitHub Actions.
2. Faça push na branch `main`.
3. O workflow valida build e faz deploy automatico via SSH no aaPanel.
