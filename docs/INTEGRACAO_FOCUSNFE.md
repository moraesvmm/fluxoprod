# Integração futura com a FocusNFe

Atualizado em 2026-08-26.

## Objetivo

Deixar o Fluxo preparado para usar a FocusNFe como provedor fiscal, mantendo a emissão nativa atual como alternativa até a homologação. A Fluxo deve enviar documentos sempre em nome da empresa cliente; o CNPJ, certificado e dados fiscais pertencem ao cliente.

## O que foi feito

- Criado `apps/web/src/lib/server/focus-nfe-client.ts`.
- O cliente usa HTTP Basic conforme a documentação FocusNFe: token como usuário e senha vazia (`token:`).
- URLs separadas para homologação e produção.
- Métodos preparados para:
  - cadastrar/atualizar o emitente via `/empresas`;
  - emitir NF-e via `POST /nfe?ref=...`;
  - consultar uma NF-e por referência;
  - cadastrar webhooks via `/hooks`.
- A referência da nota é codificada com `encodeURIComponent`, evitando colisão ou caracteres inválidos.
- Respostas não-2xx geram erro com a mensagem retornada pela FocusNFe.
- `cache: no-store` impede cache de respostas fiscais.
- Criado `apps/web/.env.example` com as variáveis necessárias.
- Criado o provisionamento administrativo em `/api/admin/fiscal/focus/provision`.
- O provisionamento cria a empresa na Focus usando o token server-side, salva os tokens retornados e evita duplicidade pelo vínculo salvo.
- A emissão em `/api/fiscal/nfe/emitir` usa FocusNFe somente quando `empresas.fiscal_provedor = 'focusnfe'`; o padrão `nativo` não mudou.
- Criado o webhook `/api/webhooks/focusnfe`, protegido por cabeçalho configurável e com atualização idempotente da emissão/venda.
- Criado o registro `public.fiscal_emissoes` para rastrear referência, status, chave, XML, DANFE e resposta do provedor.
- O provisionamento pode ser automático após salvar dados fiscais ou enviar o certificado, controlado por `FOCUSNFE_AUTO_PROVISION=true`.
- A automação é idempotente, não ativa a Focus e não bloqueia o cadastro se o provedor estiver indisponível.
- O template de ambiente foi liberado no `apps/web/.gitignore`; `.env.local` continua ignorado.
- O banco já possui `focusnfe_token_homologacao` e `focusnfe_token_producao` na tabela `public.empresas`, conforme `apps/api/migrations/empresas_fiscal_config.sql`.

## Como ativar depois

1. Criar a conta FocusNFe e contratar um plano compatível com SaaS/múltiplos CNPJs.
2. Confirmar com a Focus se o contrato permite revenda, white-label e vários emitentes na mesma conta.
3. Obter os tokens de homologação e produção.
4. Cadastrar cada empresa cliente na FocusNFe usando a API `/empresas` ou o painel.
5. Enviar o certificado A1/PFX do cliente somente por backend. A documentação permite `arquivo_certificado_base64` e `senha_certificado` no cadastro/atualização da empresa.
6. Salvar o identificador retornado pela Focus em cada empresa cliente.
7. Criar os gatilhos `/hooks` para `nfe`, `nfce` e `nfse`, usando uma URL HTTPS pública do Fluxo.
8. Executar emissões somente em homologação até validar rejeições, cancelamento, XML, DANFE e regras fiscais com o contador do cliente.
9. Trocar para produção por empresa, após habilitação fiscal e validação do certificado.

## Variáveis de ambiente

Configurar no ambiente server-side:

```text
FOCUSNFE_TOKEN_HOMOLOGACAO=
FOCUSNFE_TOKEN_PRODUCAO=
FOCUSNFE_HOMOLOGACAO_URL=https://homologacao.focusnfe.com.br/v2
FOCUSNFE_PRODUCAO_URL=https://api.focusnfe.com.br/v2
FOCUSNFE_WEBHOOK_URL=https://SEU_DOMINIO/api/webhooks/focusnfe
FOCUSNFE_WEBHOOK_SECRET=
FOCUSNFE_AUTO_PROVISION=false
```

Os tokens não podem usar o prefixo `NEXT_PUBLIC_` e não devem ser enviados ao frontend.

## O que ainda falta

### Implementação

- Completar o mapeamento fiscal para cada tipo de documento e regime tributário; o adaptador atual cobre o fluxo básico de NF-e de produtos.
- Implementar consulta, cancelamento, carta de correção e inutilização.
- Definir fila/retry para indisponibilidade temporária sem duplicar uma emissão.
- Adicionar medição de consumo mensal por empresa para cobrança do módulo fiscal.
- Integrar a ativação/suspensão do módulo ao webhook de pagamento do Asaas.
- Criar testes com respostas de sucesso, processamento assíncrono, rejeição, duplicidade e webhook repetido.

### Operação e contrato

- Confirmar plano, preços, limites e SLA diretamente com a FocusNFe.
- Confirmar se o plano escolhido permite vários CNPJs de clientes e operação white-label.
- Definir quem compra, armazena e renova cada certificado A1.
- Definir política de retenção dos XMLs e rotina de backup.
- Validar regras fiscais e parametrização com o contador de cada empresa.
- Rotacionar imediatamente credenciais que tenham sido expostas fora de um cofre seguro; não reutilizar segredos publicados em arquivos locais.

## Primeiro uso após criar a conta

1. Preencher `FOCUSNFE_TOKEN_PRODUCAO`, `FOCUSNFE_TOKEN_HOMOLOGACAO`, `FOCUSNFE_WEBHOOK_URL` e `FOCUSNFE_WEBHOOK_SECRET` no ambiente server-side.
2. Definir `FOCUSNFE_AUTO_PROVISION=true` para provisionar automaticamente após a configuração fiscal e o upload do certificado.
3. O cadastro retorna os tokens dos ambientes; eles são salvos no servidor.
4. Só ativar depois da validação usando o endpoint administrativo com `{ "ativar": true }`.

O endpoint administrativo continua disponível para reprocessar uma empresa que falhou ou para executar o provisionamento manualmente.

O provisionamento já cadastra o webhook de NF-e quando `FOCUSNFE_WEBHOOK_URL` estiver preenchida. A Focus informa que a API de Empresas opera em produção; por isso o cadastro é feito no endpoint de produção e os tokens de ambiente retornados são armazenados no backend.

## Decisão técnica atual

O serviço novo é apenas um adaptador de transporte e autenticação. Ele não tenta inventar regras fiscais nem substituir o `NfeService` nativo. A emissão FocusNFe deve ser acoplada a uma camada de orquestração depois que o payload for validado e que o armazenamento de emissões estiver pronto.

A documentação consultada foi:

- [Autenticação](https://doc.focusnfe.com.br/reference/autenticacao.md)
- [Empresas](https://doc.focusnfe.com.br/reference/empresas.md)
- [Criar empresa](https://doc.focusnfe.com.br/reference/criar_empresa.md)
- [Emitir NF-e](https://doc.focusnfe.com.br/reference/emitir_nfe.md)
- [Criar webhook](https://doc.focusnfe.com.br/reference/criar_webhook.md)
- [Webhooks](https://doc.focusnfe.com.br/reference/webhooks.md)
