# EJC Connect

Plataforma de gestao para encontros de jovens cristaos, com foco em:
- cadastro e organizacao de encontros, equipes e circulos
- importacao inteligente de planilhas (XLSX/CSV)
- geracao do Quadrante em PDF (A4) com layout editorial
- controle de usuarios, permissoes e auditoria
- deploy self-hosted em Docker (recomendado)

Este repositorio e somente do **EJC-Connect (Quadrante)**.

---

## 1. Visao geral do produto

O EJC Connect centraliza o fluxo completo do Quadrante:

1. cadastrar encontro
2. cadastrar equipes e circulos
3. cadastrar/importar membros por cargo
4. subir capas, separadores, cartazes e artes
5. gerar PDF final com ordem definida

Tambem oferece:
- login e controle de acesso
- permissoes por funcionalidade
- escopo por equipe (usuario pode ficar restrito a equipes especificas)
- log de auditoria

---

## 2. Stack tecnica

- Backend: Node.js + Express + PostgreSQL
- Frontend: React + Vite + TypeScript
- PDF engine: Puppeteer (render HTML/CSS em PDF)
- Infra recomendada: Docker Compose
- CI/CD: GitHub Actions com deploy remoto para aaPanel via SSH

---

## 3. Estrutura do repositorio

- `backend/` API, regras de negocio, importador, PDF engine, migrations
- `frontend/` painel web administrativo
- `deploy/` scripts de instalacao, testes e deploy remoto
- `.github/workflows/ci-cd-aapanel.yml` pipeline CI/CD
- `docker-compose.yml` stack Docker principal

---

## 4. Instalacao em 1 comando (Ubuntu/Debian)

Instalador consolidado direto do GitHub (instala Docker + Compose, baixa o repo, gera `.env` e sobe o sistema):

```bash
curl -fsSL https://raw.githubusercontent.com/eulerbernardesjunior/EJC-Connect/main/deploy/install_from_github.sh | bash
```

### 4.1 Variaveis opcionais no comando unico

Exemplo customizando porta e admin:

```bash
APP_PORT=8080 ADMIN_EMAIL=admin@ejc.com.br ADMIN_PASSWORD='SenhaForte123' \
curl -fsSL https://raw.githubusercontent.com/eulerbernardesjunior/EJC-Connect/main/deploy/install_from_github.sh | bash
```

Variaveis suportadas:
- `REPO_URL` (padrao: repositorio oficial)
- `BRANCH` (padrao: `main`)
- `APP_DIR` (padrao: `/opt/ejc-connect`)
- `APP_PORT` (padrao: `8080`)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `OVERWRITE_ENV=1` para recriar `.env`

---

## 5. Como rodar localmente (WSL + Docker)

### 5.1 Pre-requisitos

- Docker funcionando no WSL
- Porta web livre (padrao do projeto local: `8080`)

### 5.2 Subir o sistema

```bash
cd "/mnt/c/Users/euler.junior/Documents/New project"
docker compose up -d --build
```

### 5.3 Validar servicos

```bash
docker compose ps
curl http://localhost:8080/api/health
```

Esperado no health:

```json
{"status":"ok"}
```

### 5.4 Acesso no browser Windows

- App: `http://localhost:8080`

Observacao: se existir Nginx/Apache no host usando porta 80, mantenha `APP_PORT=8080` no `.env`.

---

## 6. Fluxo funcional no painel

1. **Encontros**
- criar encontro com nome, data inicio e data fim

2. **Gestao do encontro**
- acessar cards de Equipes, Circulos e Capas/Artes

3. **Equipes e Circulos**
- criar/editar/excluir
- definir ordem de impressao no PDF
- cadastrar membros manualmente ou importar planilha
- upload de imagens com crop

4. **Capas e artes**
- enviar imagens A4 (capa, separadores, cartaz, musica, convite, contracapa)

5. **PDF**
- gerar quadrante completo do encontro
- gerar quadrante parcial por equipe/circulo

---

## 7. Importacao inteligente (XLSX/CSV)

O importador identifica secoes e cargos para aplicar regra correta:

- cargos com `Tio` ou `Tios` podem ser tratados como casal (pairing mode)
- cargos sem `Tio/Tios` sao sempre individuais
- suporte a particularidades de equipes especificas (ex.: Sala, Tios Carona)

Se a importacao nao inserir registros, o sistema retorna detalhes de linhas e motivos para facilitar ajuste da planilha.

---

## 8. Regras de PDF (Quadrante)

### 7.1 Ordem editorial suportada

1. Capa  
2. Separador de Circulos  
3. Cartaz do Circulo  
4. Dados dos Circulos  
5. Separador de Equipes  
6. Dados das Equipes  
7. Letra da Musica Tema  
8. Convite Pos Encontro  
9. Contracapa

### 7.2 Template visual (configuravel)

Em `Configuracoes > Templates PDF`, e possivel ajustar:
- tamanho padrao de fotos
- formato de foto no circulo
- **formato separado para lideranca e para participantes no circulo**
- modelo de tabela das equipes
- fontes
- margens
- rodape
- marca d'agua
- estilo das caixas de lideranca

Cada conjunto pode ser salvo como template e ativado.

---

## 9. Seguranca e controle de acesso

- login obrigatorio
- JWT para autenticacao
- permissoes por funcionalidade (view/manage/import/generate etc.)
- escopo por equipe para restringir acesso de usuarios
- auditoria de acoes (create, update, delete, import, upload)

---

## 10. Deploy em producao (aaPanel)

Pipeline pronto no GitHub Actions:

- `.github/workflows/ci-cd-aapanel.yml`

Fluxo:

1. push em `main`
2. job `Validate Build`
3. job `Deploy To aaPanel`

Guia detalhado:

- `deploy/GITHUB_ACTIONS_CICD.md`

---

## 11. Versionamento e releases

Recomendacao simples:

- commits semanticos (`feat`, `fix`, `docs`, `chore`)
- tags anotadas para marcos de producao

Exemplo:

```bash
git tag -a ejc-connect-v2026.03.18 -m "release: descricao"
git push origin ejc-connect-v2026.03.18
```

---

## 12. Comandos uteis

```bash
# status
docker compose ps

# logs backend
docker compose logs -f backend

# logs web (nginx)
docker compose logs -f web

# reiniciar servico
docker compose restart web

# rebuild completo
docker compose up -d --build
```

---

## 13. Troubleshooting rapido

### `web` nao sobe / Nginx caiu

Causa comum: porta ocupada (`address already in use`).

Solucao:
- alterar `APP_PORT` no `.env` (ex.: `8080`)
- subir novamente:

```bash
docker compose up -d web
```

### `api/health` retorna 502

Backend ainda iniciando ou erro de variavel de ambiente.

Verificar:

```bash
docker compose logs --tail=200 backend
```

---

## 14. Licenca e autoria

Projeto interno EJC. Ajuste este bloco conforme politica da equipe (licenca formal, responsaveis e contatos).
