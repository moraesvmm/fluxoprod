import os

with open('/Users/macbook/fluxoprod/tabelas.sql', 'r') as f:
    sql = f.read()

old_block = """    -- fechamentos_mensais: 1(tabela) = 1 %I
    EXECUTE format('
        CREATE TABLE %I.fechamentos_mensais (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            mes_referencia VARCHAR(7) NOT NULL UNIQUE,
            status VARCHAR(50) DEFAULT ''aberto'' CHECK (status IN (''aberto'',''fechado'')),
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
    ', novo_schema);"""

new_block = """    -- fechamentos_mensais: 1(tabela) + 1(index) = 2 %I
    EXECUTE format('
        CREATE TABLE %I.fechamentos_mensais (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            mes VARCHAR(7) NOT NULL UNIQUE,
            status VARCHAR(50) DEFAULT ''aberto'' CHECK (status IN (''aberto'',''fechado'')),
            faturamento NUMERIC(12, 2) DEFAULT 0,
            total_vendas INT DEFAULT 0,
            ticket_medio NUMERIC(10, 2) DEFAULT 0,
            visto BOOLEAN DEFAULT FALSE,
            visto_em TIMESTAMPTZ,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX ON %I.fechamentos_mensais(mes);
    ', novo_schema, novo_schema);"""

new_sql = sql.replace(old_block, new_block)

if old_block in sql:
    print("Block replaced successfully")
else:
    print("Block not found!")

with open('/Users/macbook/fluxoprod/tabelas.sql', 'w') as f:
    f.write(new_sql)
