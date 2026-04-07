-- ==========================================
-- SCRIPT DE PROVISIONAMENTO DE TENANTS (FLUXO)
-- ==========================================
-- IMPORTANTE: Rode este script no Editor SQL do seu Supabase.

CREATE OR REPLACE FUNCTION provisionar_empresa(novo_schema text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    schema_exists boolean;
BEGIN
    -- 1. Verifica se o schema já existe para evitar erros
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = novo_schema
    ) INTO schema_exists;

    IF schema_exists THEN
        RETURN json_build_object('status', 'error', 'message', 'O schema da empresa já existe.');
    END IF;

    -- 2. Cria o schema isolado para o cliente
    EXECUTE format('CREATE SCHEMA %I;', novo_schema);

    -- 3. Cria a tabela de Clientes (CRM) isolada no schema
    EXECUTE format('
        CREATE TABLE %I.clientes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            telefone VARCHAR(50),
            status VARCHAR(50) DEFAULT ''ativo'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    -- 4. Cria a tabela de Vendas isolada no schema
    EXECUTE format('
        CREATE TABLE %I.vendas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cliente_id UUID REFERENCES %I.clientes(id),
            valor NUMERIC(10, 2) NOT NULL,
            metodo_pagamento VARCHAR(50),
            status VARCHAR(50) DEFAULT ''concluido'',
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema, novo_schema);

    -- 5. Cria a tabela de Estoque isolada no schema
    EXECUTE format('
        CREATE TABLE %I.estoque (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sku VARCHAR(100) UNIQUE NOT NULL,
            nome VARCHAR(255) NOT NULL,
            quantidade INTEGER DEFAULT 0,
            quantidade_minima INTEGER DEFAULT 10,
            preco NUMERIC(10, 2) NOT NULL,
            criado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);

    RETURN json_build_object(
        'status', 'success', 
        'message', 'Ambiente Multi-Tenant provisionado com sucesso!',
        'schema_name', novo_schema
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$;
