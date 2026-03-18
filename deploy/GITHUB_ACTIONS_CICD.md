# CI/CD Automatica (WSL -> GitHub -> aaPanel)

Este projeto ja esta preparado com workflow em:

- `.github/workflows/ci-cd-aapanel.yml`

## 1. Pré-requisitos

- Repositorio no GitHub com branch `main`.
- Servidor aaPanel com Docker funcionando.
- Aplicacao no servidor em: `/www/wwwroot/ejc-connect` (ou ajuste via secret).
- Arquivo `.env` ja existente no servidor.

## 2. Criar e instalar chave SSH para o GitHub Actions

No seu WSL:

```bash
chmod +x deploy/setup_cicd_ssh_key.sh
AAPANEL_HOST=177.185.240.238 \
AAPANEL_PORT=22 \
AAPANEL_USER=ubuntu \
AAPANEL_PASSWORD='SUA_SENHA' \
bash deploy/setup_cicd_ssh_key.sh
```

O script:

- gera chave local (`~/.ssh/ejc_connect_github_actions_ed25519`);
- adiciona chave publica no `~/.ssh/authorized_keys` do servidor.

## 3. Cadastrar os secrets no GitHub

No repositório: `Settings > Secrets and variables > Actions > New repository secret`

Crie:

- `AAPANEL_HOST` = `177.185.240.238` (opcional; atualmente o workflow usa este host fixo)
- `AAPANEL_PORT` = `22` (opcional; atualmente o workflow usa esta porta fixa)
- `AAPANEL_USER` = `ubuntu` (opcional; atualmente o workflow usa este usuario fixo)
- `AAPANEL_SSH_PRIVATE_KEY` = conteudo do arquivo `~/.ssh/ejc_connect_github_actions_ed25519` (recomendado)
- `AAPANEL_SSH_PASSWORD` = senha SSH do servidor (opcional, fallback se nao usar chave)
- `AAPANEL_APP_DIR` = `/www/wwwroot/ejc-connect` (opcional, recomendado)
- `AAPANEL_HEALTH_URL` = `http://127.0.0.1:8080/api/health` (opcional, recomendado)
- `AAPANEL_PROJECT_NAME` = `ejc-connect` (opcional, recomendado)

## 4. Fluxo de deploy

1. Edite no VS Code (WSL).
2. Faça `git add`, `git commit` e `git push origin main`.
3. O GitHub Actions executa:
   - validacao backend/frontend;
   - build do frontend;
   - deploy no aaPanel via SSH;
   - health check final.

Deploy manual:

- Aba `Actions` -> workflow `EJC Connect CI/CD (aaPanel)` -> `Run workflow`.

## 5. O que o deploy remoto faz

Script remoto: `deploy/remote_deploy.sh`

- backup de codigo atual (backend/frontend/deploy/docker-compose.yml);
- atualizacao dos arquivos do projeto;
- `docker compose up -d --build --remove-orphans`;
- validacao de health.

## 6. Recomendações de produção

- Habilite branch protection na `main` (PR + checks obrigatorios).
- Use dominio com HTTPS no aaPanel.
- Troque periodicamente a chave SSH de deploy.
