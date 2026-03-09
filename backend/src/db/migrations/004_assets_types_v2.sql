ALTER TABLE encontro_assets
DROP CONSTRAINT IF EXISTS encontro_assets_tipo_check;

ALTER TABLE encontro_assets
ADD CONSTRAINT encontro_assets_tipo_check CHECK (
  tipo IN (
    'CAPA',
    'CONTRACAPA',
    'SEPARADOR_CIRCULOS',
    'CARTAZ_CIRCULO',
    'SEPARADOR_EQUIPES',
    'MUSICA_TEMA',
    'CONVITE_POS_ENCONTRO',
    'SEPARADOR_ENCONTREIROS',
    'SEPARADOR_ENCONTRISTAS',
    'CARTAZ'
  )
);
