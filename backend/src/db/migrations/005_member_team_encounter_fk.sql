DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipes_encontro_id_id_unique'
      AND conrelid = 'equipes'::regclass
  ) THEN
    ALTER TABLE equipes
    ADD CONSTRAINT equipes_encontro_id_id_unique UNIQUE (encontro_id, id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'membros_encontro_equipe_fk'
      AND conrelid = 'membros'::regclass
  ) THEN
    ALTER TABLE membros
    ADD CONSTRAINT membros_encontro_equipe_fk
      FOREIGN KEY (encontro_id, equipe_id)
      REFERENCES equipes(encontro_id, id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

