DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_type') THEN
    CREATE TYPE team_type AS ENUM ('CIRCULO', 'TRABALHO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS encontros (
  id BIGSERIAL PRIMARY KEY,
  tema TEXT NOT NULL,
  data_encontro DATE NOT NULL,
  capa_url TEXT,
  contracapa_url TEXT,
  letra_musica_tema TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipes (
  id BIGSERIAL PRIMARY KEY,
  encontro_id BIGINT NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo team_type NOT NULL,
  cor_hex CHAR(7),
  slogan TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT equipes_cor_hex_check CHECK (cor_hex IS NULL OR cor_hex ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT equipes_circulo_color_required CHECK (tipo <> 'CIRCULO' OR cor_hex IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS membros (
  id BIGSERIAL PRIMARY KEY,
  encontro_id BIGINT NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  equipe_id BIGINT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  cargo_nome TEXT,
  nome_principal TEXT NOT NULL,
  nome_secundario TEXT,
  telefone_principal TEXT,
  telefone_secundario TEXT,
  paroquia TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipes_encontro_id ON equipes(encontro_id);
CREATE INDEX IF NOT EXISTS idx_membros_encontro_id ON membros(encontro_id);
CREATE INDEX IF NOT EXISTS idx_membros_equipe_id ON membros(equipe_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS encontros_set_updated_at ON encontros;
CREATE TRIGGER encontros_set_updated_at
BEFORE UPDATE ON encontros
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS equipes_set_updated_at ON equipes;
CREATE TRIGGER equipes_set_updated_at
BEFORE UPDATE ON equipes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS membros_set_updated_at ON membros;
CREATE TRIGGER membros_set_updated_at
BEFORE UPDATE ON membros
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
