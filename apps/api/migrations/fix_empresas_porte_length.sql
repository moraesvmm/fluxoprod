-- Alinha o schema legado de producao ao provisionamento atual (VARCHAR(50)).
ALTER TABLE public.empresas
  ALTER COLUMN porte TYPE VARCHAR(50);
