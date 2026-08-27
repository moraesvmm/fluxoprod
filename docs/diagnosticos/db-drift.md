# Divergencias entre banco e codigo

## Funcoes publicas com mais de uma assinatura (0)

Nenhuma.

## RPCs chamadas no codigo e ausentes no banco (19)

- `tenant_alocar_recurso_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_atualizar_custo_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_atualizar_etapa_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_atualizar_recurso_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_cancelar_venda` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_criar_custo_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_criar_etapa_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_devolver_item` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_excluir_custo_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_excluir_documento_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_excluir_etapa_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_excluir_recurso_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_listar_custos_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_listar_documentos_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_listar_etapas_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_listar_recursos_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_obras_progresso` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_obras_resumo_financeiro` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak
- `tenant_upload_documento_obra` — apps/web/src/lib/api.ts, apps/web/src/lib/api.ts.bak

## Colunas divergentes entre tenants (5)

- `tenant_62a495e1.obras_ordens_servico` sem: <tabela ausente>
- `tenant_blackpink_f4f2cb.obras_ordens_servico` sem: deleted_at
- `tenant_suplementos_257cc9.obras_ordens_servico` sem: deleted_at
- `tenant_vitormoraes_5fdcf8.obras_ordens_servico` sem: deleted_at
- `tenant_vitormoraes_a3cbc1.obras_ordens_servico` sem: deleted_at

## Funcoes SECURITY DEFINER expostas a anon (3)

- `listar_modulos_avulsos_checkout()`
- `listar_planos_checkout()`
- `validar_cupom(text)`

## Hooks de provisionamento ativos (10)

- `catalogo_produtos` (ordem 10) — `provisionar_hook_catalogo_produtos(text)`
- `paridade_tenants` (ordem 15) — `provisionar_hook_paridade_tenants(text)`
- `estoque_movimentacoes` (ordem 20) — `provisionar_estoque_movimentacoes(text)`
- `dashboard_executivo` (ordem 30) — `provisionar_hook_dashboard_executivo(text)`
- `locais_estoque` (ordem 40) — `provisionar_hook_locais_estoque(text)`
- `nurturing_interacoes` (ordem 50) — `provisionar_hook_nurturing_interacoes(text)`
- `vendas_canais` (ordem 55) — `provisionar_hook_vendas_canais(text)`
- `processar_venda` (ordem 60) — `provisionar_hook_processar_venda(text)`
- `rh_funcionarios` (ordem 65) — `provisionar_hook_rh_funcionarios(text)`
- `mrp_producao` (ordem 70) — `provisionar_hook_mrp_producao(text)`
