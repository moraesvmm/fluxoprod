-- Migração SQL: Expansão Fiscal para NFe
-- Adiciona campos obrigatórios para emissão de nota fiscal eletrônica

DO $$
DECLARE
  schema_record RECORD;
  v_sql text;
BEGIN
  -- 1. Expansão da tabela public.empresas (Dados do Emitente)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'empresas' AND column_name = 'inscricao_estadual') THEN
    ALTER TABLE public.empresas ADD COLUMN inscricao_estadual TEXT;
    ALTER TABLE public.empresas ADD COLUMN inscricao_municipal TEXT;
    ALTER TABLE public.empresas ADD COLUMN logradouro TEXT;
    ALTER TABLE public.empresas ADD COLUMN numero TEXT;
    ALTER TABLE public.empresas ADD COLUMN complemento TEXT;
    ALTER TABLE public.empresas ADD COLUMN bairro TEXT;
    ALTER TABLE public.empresas ADD COLUMN cidade TEXT;
    ALTER TABLE public.empresas ADD COLUMN uf VARCHAR(2);
    ALTER TABLE public.empresas ADD COLUMN cep VARCHAR(8);
    ALTER TABLE public.empresas ADD COLUMN regime_tributario INTEGER DEFAULT 1; -- 1: Simples, 3: Normal
  END IF;

  -- 2. Expansão nos schemas tenant
  FOR schema_record IN 
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'tenant_%'
  LOOP
    RAISE NOTICE 'Expandindo campos fiscais no schema %', schema_record.schema_name;

    -- Tabela produtos (NCM, CFOP, Origem)
    v_sql := format('
      DO $inner$
      BEGIN
        -- Verificar se a tabela existe antes de alterar
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %1$L AND table_name = ''produtos'') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = %1$L AND table_name = ''produtos'' AND column_name = ''ncm'') THEN
            ALTER TABLE %1$I.produtos ADD COLUMN ncm VARCHAR(8);
            ALTER TABLE %1$I.produtos ADD COLUMN cfop_padrao VARCHAR(4);
            ALTER TABLE %1$I.produtos ADD COLUMN origem INTEGER DEFAULT 0;
            ALTER TABLE %1$I.produtos ADD COLUMN nf_entrada VARCHAR(60);
          END IF;
        END IF;
      END $inner$;
    ', schema_record.schema_name);
    EXECUTE v_sql;

    -- Tabela vendas (Rastreabilidade NFe)
    v_sql := format('
      DO $inner$
      BEGIN
        -- Verificar se a tabela existe antes de alterar
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %1$L AND table_name = ''vendas'') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = %1$L AND table_name = ''vendas'' AND column_name = ''nfe_chave'') THEN
            ALTER TABLE %1$I.vendas ADD COLUMN nfe_chave VARCHAR(44);
            ALTER TABLE %1$I.vendas ADD COLUMN nfe_xml_url TEXT;
            ALTER TABLE %1$I.vendas ADD COLUMN nfe_pdf_url TEXT;
            ALTER TABLE %1$I.vendas ADD COLUMN nfe_protocolo TEXT;
          END IF;
        END IF;
      END $inner$;
    ', schema_record.schema_name);
    EXECUTE v_sql;

  END LOOP;
END $$;
