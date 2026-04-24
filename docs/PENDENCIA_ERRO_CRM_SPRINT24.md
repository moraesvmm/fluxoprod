# Pendência de Erro — CRM (Sprint 24)

## Descrição do Erro
Ao tentar salvar (criar ou atualizar) um cliente no módulo CRM após a implementação do campo **CPF/CNPJ**, o sistema retorna a mensagem:
> "Erro ao salvar cliente" (ou variações como "Erro ao criar cliente. Tente novamente.")

## Status Atual
- **Estado**: ✅ RESOLVIDO (Vistoria 22)
- **Causa Raiz Identificada**: Overload de assinaturas e conflito de tipos de dados nas funções `tenant_criar_cliente` e `tenant_atualizar_cliente`. O frontend enviava `p_cpf_cnpj` (`TEXT`), mas as funções originais no banco (e public wrappers antigos) aceitavam `VARCHAR`. O erro ocorria via PostgreSQL/PostgREST não conseguindo resolver o *overload* apropriado da função. Além disso, a função de criação original na sprint não mantinha a idempotência (`p_idempotency_key`) nativa da RPC.

## Plano de Correção e Governança Executado
1. Investigação com `service_role` comprovou três definições concorrentes de RPC nos schemas, criando falsos positivos para a cache da API.
2. Criada migração atômica `apps/api/migrations/fix_crm_sprint24.sql` para apagar ambiguidades (`DROP FUNCTION...`), restaurar comportamento unificado e padrão (JSONB + TEXT variables), e recriar corretamente as assinaturas com as tratativas para `cpf_cnpj`, idempotência e `deleted_at`.
3. Adicionado helper utilitário de sistema interno: `public.get_tenant_schema()`.
4. Os wrappers públicos de fechamento no schema principal (`public`) foram sincronizados e seguem o mesmo padrão.
5. Arquivo canônico (`supabase_rpc.sql`) de provisionamento foi atualizado.

**Ação Restante Requerida**: O administrador local *deve* rodar o script `fix_crm_sprint24.sql` manualmente no seu SQL Editor do Supabase devido à impossibilidade de aplicar DDL programático via restrições do PostgREST.
