-- Migracao SQL: endurecimento fiscal para emissao nativa
-- Adiciona o codigo IBGE do municipio do emitente no schema public.

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS codigo_municipio_ibge VARCHAR(7);

COMMENT ON COLUMN public.empresas.codigo_municipio_ibge IS
  'Codigo IBGE de 7 digitos do municipio do emitente, usado na geracao da NF-e 4.00.';
