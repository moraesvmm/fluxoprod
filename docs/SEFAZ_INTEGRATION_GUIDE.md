# Guia de Integração SEFAZ (NFe) - Fluxo ERP

Este documento serve como guia para a futura integração do Fluxo ERP com a SEFAZ para emissão de Nota Fiscal Eletrônica.

## Estrutura Atual (Prontidão)

A tabela `vendas` já possui os campos necessários para rastrear o status da nota:
- `nfe_status`: Enum (`nao_emitida`, `pendente`, `emitida`, `erro`, `cancelada`).
- `nfe_chave`: Chave de acesso de 44 dígitos.
- `nfe_recibo`: Protocolo de recebimento.
- `nfe_xml`: Conteúdo completo do XML autorizado.
- `nfe_erro`: Detalhes de rejeição ou falha de comunicação.

## Fluxo Sugerido

### 1. Gatilho de Emissão
Quando uma venda é processada no PDV com `p_emitir_nfe = TRUE`, a coluna `nfe_status` é definida como `pendente`.

### 2. Agente de Integração (Worker)
Um processo em background (ex: Edge Function ou Worker externo) deve:
1. Consultar vendas com `nfe_status = 'pendente'`.
2. Coletar dados do cliente (`clientes.cpf_cnpj`, endereço) e itens (`vendas_itens`).
3. Formatar o JSON para o provedor de NFe escolhido (ex: FocusNFe, PlugNotas).
4. Enviar para o gateway.

### 3. Webhook de Retorno
O sistema deve expor um endpoint (ex: `/api/webhook/nfe`) para receber a atualização do gateway:
- Se autorizado: Atualizar `nfe_status = 'emitida'`, salvar `nfe_chave`, `nfe_recibo` e `nfe_xml`.
- Se rejeitado: Atualizar `nfe_status = 'erro'` e salvar a mensagem em `nfe_erro`.

## Provedores Recomendados
1. **FocusNFe**: API simples e bem documentada.
2. **Tecnospeed (PlugNotas)**: Excelente suporte para diversos tipos de notas (NFe, NFSe, NFCe).

## Mapeamento de Dados Reais
- **Emitente**: Dados da tabela `public.empresas`.
- **Destinatário**: Dados da tabela `tenant_*.clientes` (Campo `cpf_cnpj` obrigatório).
- **Itens**: Dados da tabela `tenant_*.vendas_itens` vinculada a `tenant_*.produtos`.

---
*Documento criado em 28/04/2026 para orientação de desenvolvimento futuro.*
