# Regras do repositório — Fluxo ERP

## Regra central: SQL só existe se estiver no provisionamento

O banco é multi-tenant com **um schema por empresa**. Toda alteração estrutural precisa valer para:

1. os tenants que já existem, **e**
2. todo tenant que for criado no futuro.

Alteração aplicada só nos tenants atuais **é considerada incompleta**. Foi exatamente esse padrão que gerou os erros de catálogo, canais de venda e RH: a coluna existia nos tenants antigos e faltava em cada empresa nova.

---

## 1. Toda alteração de SQL vira arquivo versionado

- Nunca aplique SQL apenas pelo Editor do Supabase.
- Todo SQL fica em `apps/api/migrations/<nome_descritivo>.sql` e é commitado.
- Nunca execute `apps/api/supabase_rpc.sql` inteiro em produção: ele é a definição base de provisionamento, não uma migração.

## 2. Mudança em schema tenant exige hook registrado

Se a alteração cria ou altera **tabela, coluna, índice ou constraint dentro de um schema `tenant_*`**, ela precisa de um hook.

O arquivo de migração deve conter as três partes, nesta ordem:

```sql
-- 1. Função idempotente
CREATE OR REPLACE FUNCTION public.provisionar_hook_<area>(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.validar_schema_tenant_provisionamento(p_schema);
    EXECUTE format('ALTER TABLE %I.tabela ADD COLUMN IF NOT EXISTS coluna TIPO', p_schema);
END;
$$;

-- 2. Registro no provisionamento (vale para tenants futuros)
INSERT INTO public.provisionamento_hooks (hook_key, ordem, hook_function)
VALUES ('<area>', <ordem>, 'public.provisionar_hook_<area>(text)'::REGPROCEDURE)
ON CONFLICT (hook_key) DO UPDATE
SET ordem = EXCLUDED.ordem,
    hook_function = EXCLUDED.hook_function,
    ativo = TRUE;

-- 3. Aplicação nos tenants existentes
DO $$
DECLARE v_schema TEXT;
BEGIN
    FOR v_schema IN
        SELECT e.schema_name FROM public.empresas e
        WHERE e.schema_name LIKE 'tenant\_%'
          AND to_regnamespace(e.schema_name) IS NOT NULL
        ORDER BY e.schema_name
    LOOP
        PERFORM public.provisionar_hook_<area>(v_schema);
    END LOOP;
END;
$$;
```

**Proibido**: migração que só percorre os tenants existentes, sem registrar o hook.

Hooks devem ser idempotentes — sempre `CREATE TABLE IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS` — porque rodam em toda criação de empresa.

## 3. Uma assinatura por função pública

O PostgREST escolhe a função pelos **nomes dos parâmetros** enviados. Duas versões publicadas tornam a chamada ambígua assim que um campo opcional deixa de ser enviado.

- Ao acrescentar um parâmetro, use `DEFAULT` e **remova a versão antiga** com `DROP FUNCTION IF EXISTS` explicitando os tipos.
- Nunca deixe duas assinaturas do mesmo nome em `public`.

## 4. Contrato de retorno das RPCs

- Nunca leia `RETURNING id` para uma variável `JSONB`. Leia para `UUID` e monte o JSON depois com `jsonb_build_object`.
- Retorne sempre um objeto previsível e trate exceções com `EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM)`.
- No frontend, valide o corpo da resposta: essas RPCs devolvem erro com **HTTP 200**.

## 5. Permissões

- `SECURITY DEFINER` sempre com `SET search_path = public, pg_temp`.
- Ao final da migração: `REVOKE ALL ... FROM PUBLIC, anon` e `GRANT EXECUTE ... TO authenticated` (ou `service_role`).
- Função que recebe o schema/tenant por parâmetro é cross-tenant: libere **somente** para `service_role`.
- Só o funil de checkout pode ficar acessível a `anon`.

## 6. Validação obrigatória antes de aplicar

Rode a migração dentro de uma transação com `ROLLBACK` ao final, e verifique:

1. o SQL compila;
2. o fluxo real funciona (criar, listar, editar);
3. um tenant novo provisionado do zero fica idêntico aos existentes.

Depois execute `apps/api/testes_provisionamento_hooks.sql`, que termina em `ROLLBACK`.

## 7. Auditoria de divergências

Após aplicar, rode:

```powershell
$env:DATABASE_URL = "postgresql://usuario:senha@host:5432/postgres"
python scripts/export_db_map.py
```

Gera `docs/diagnosticos/db-map.json` e `docs/diagnosticos/db-drift.md`.

Nenhum indicador pode piorar: assinaturas duplicadas, RPCs ausentes, colunas divergentes entre tenants e funções expostas a `anon`.

## 8. Tipos e commit

Toda alteração de schema, view ou RPC exige regenerar os tipos e commitar junto:

```powershell
$env:SUPABASE_ACCESS_TOKEN="SEU_TOKEN_DO_SUPABASE"
.\supabase.exe gen types typescript --project-id wkxtlvxotvutycbupfuh > apps/web/src/types/database.types.ts
```

Mensagens de commit seguem Conventional Commits.

---

## Checklist de conclusão

Uma alteração de SQL só está pronta quando:

- [ ] Existe arquivo em `apps/api/migrations/`.
- [ ] Mudança em schema tenant tem hook registrado em `provisionamento_hooks`.
- [ ] A migração aplica também aos tenants existentes.
- [ ] Não criou assinatura duplicada.
- [ ] Permissões revogadas de `PUBLIC`/`anon`.
- [ ] Validada em transação com `ROLLBACK`, incluindo tenant novo.
- [ ] `export_db_map.py` não acusou piora.
- [ ] `database.types.ts` regenerado e commitado.
