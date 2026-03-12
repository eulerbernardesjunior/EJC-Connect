ALTER TABLE encontros ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE encontros ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE encontros ADD COLUMN IF NOT EXISTS data_fim DATE;

UPDATE encontros
SET
  nome = COALESCE(nome, tema),
  data_inicio = COALESCE(data_inicio, data_encontro),
  data_fim = COALESCE(data_fim, data_encontro)
WHERE nome IS NULL OR data_inicio IS NULL OR data_fim IS NULL;

ALTER TABLE equipes ADD COLUMN IF NOT EXISTS foto_url TEXT;

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  permissao TEXT NOT NULL DEFAULT 'EDITOR',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS encontro_assets (
  id BIGSERIAL PRIMARY KEY,
  encontro_id BIGINT NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT,
  image_url TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT encontro_assets_tipo_check CHECK (tipo IN (
    'CAPA',
    'CONTRACAPA',
    'SEPARADOR_ENCONTREIROS',
    'SEPARADOR_ENCONTRISTAS',
    'MUSICA_TEMA',
    'CARTAZ'
  ))
);

CREATE INDEX IF NOT EXISTS idx_encontro_assets_encontro_id ON encontro_assets(encontro_id);

DROP TRIGGER IF EXISTS app_users_set_updated_at ON app_users;
CREATE TRIGGER app_users_set_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS encontro_assets_set_updated_at ON encontro_assets;
CREATE TRIGGER encontro_assets_set_updated_at
BEFORE UPDATE ON encontro_assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
