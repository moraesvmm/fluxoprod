# Pendência de Erro — CRM (Sprint 24)

## Descrição do Erro
Ao tentar salvar (criar ou atualizar) um cliente no módulo CRM após a implementação do campo **CPF/CNPJ**, o sistema retorna a mensagem:
> "Erro ao salvar cliente" (ou variações como "Erro ao criar cliente. Tente novamente.")

## Status Atual
- **Impacto**: Bloqueio total de cadastro/edição de novos clientes.
- **Tentativas de Correção**:
  - Atualização das RPCs `public.tenant_criar_cliente` e `public.tenant_atualizar_cliente` para incluir o parâmetro `p_cpf_cnpj`.
  - Correção do nome da tabela de perfis de `perfis` para `user_profiles` nas RPCs.
  - Recarregamento do cache do PostgREST via `NOTIFY pgrst, 'reload schema'`.
- **Hipóteses**:
  - Inconsistência de tipos entre `TEXT` (RPC) e `VARCHAR` (Tabela).
  - Problema na função `public.registrar_audit` ao receber o novo payload JSONB.
  - Possível cache persistente no Supabase que ignora as mudanças na assinatura da RPC.

## Plano de Ação para Próxima Vistoria
1. Investigar logs detalhados do Supabase/PostgREST.
2. Validar a função de auditoria separadamente.
3. Tentar simplificar a RPC removendo o campo `p_cpf_cnpj` temporariamente para isolar se o erro é no campo novo ou na estrutura da função.
