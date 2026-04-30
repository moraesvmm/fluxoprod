# ROADMAP DE FUNCIONALIDADES PREMIUM - FLUXO ERP

Este documento detalha as funcionalidades de alto valor agregado e experiência "premium" para implementação no Fluxo ERP, visando competitividade com os grandes players do mercado (Conta Azul, Bling, Omie).

---

## 1. Portal de Orçamentos e OS (Link Público)
**Objetivo:** Permitir que o tenant envie um link profissional para seu cliente final, eliminando a necessidade de apenas enviar PDFs estáticos.

### Detalhes Técnicos:
- **Página Pública:** Uma rota `/p/orcamento/[id]` que não exige login.
- **Segurança:** Utilizar tokens de acesso únicos (UUID) e expiração configurável.
- **Funcionalidades:**
  - Visualização elegante do orçamento/OS com a logo do tenant.
  - Botão "Aprovar Orçamento" que dispara um Webhook interno.
  - Download de PDF gerado on-the-fly.
  - Histórico de visualização (para o tenant saber que o cliente abriu o link).

> [!TIP]
> Esta funcionalidade gera o maior efeito "WOW" imediato para o cliente do tenant.

---

## 2. Assistente de IA (Gemini Insights)
**Objetivo:** Transformar dados brutos em decisões estratégicas para o empresário.

### Detalhes Técnicos:
- **Integração:** Consumo da API Gemini via Edge Functions.
- **Prompt Engineering:** Enviar resumos agregados (sem dados sensíveis de pessoas físicas) de Vendas e Financeiro para análise.
- **Funcionalidades:**
  - Botão "Analisar meu Mês" no Dashboard.
  - Detecção de tendências (ex: "Sua margem de lucro no produto X está caindo").
  - Sugestão de "Próximos Passos" baseada no fluxo de caixa.

---

## 3. Central de Importação Inteligente (Onboarding)
**Objetivo:** Reduzir o atrito de migração de outros sistemas ou planilhas.

### Detalhes Técnicos:
- **Frontend:** Drag-and-drop de arquivos `.xlsx` e `.csv`.
- **Lógica de Mapeamento:** Interface visual para o usuário ligar a coluna "Preço" da planilha dele à coluna `preco_base` do banco.
- **Validação:** Processamento em lote (batch) com validação de dados antes da inserção final para evitar sujeira no banco.

---

## 4. Gestão de Documentos e Evidências (Storage)
**Objetivo:** Centralizar toda a documentação da empresa em um só lugar.

### Detalhes Técnicos:
- **Storage:** Utilizar Supabase Storage com buckets isolados por `empresa_id`.
- **Contextualização:**
  - Fotos de peças e veículos em **Ordens de Serviço**.
  - Comprovantes de pagamento em **Financeiro**.
  - PDFs de contratos no **Cadastro de Clientes**.
- **UI:** Componente de galeria com preview rápido e suporte a arraste e solte.

---

## 5. Automação Bancária (Modelo Software House)
**Objetivo:** Conciliação automática de Pix e Boletos (Planejado para fase de escala/CNPJ).

### Detalhes Técnicos:
- **Gateway:** Efí ou Asaas.
- **Fluxo:** Registro do Fluxo ERP como Software House parceira.
- **OAuth2:** Integração "Um Clique" onde o usuário apenas autoriza o ERP a acessar a conta dele.
- **Webhook:** Sincronização em tempo real de status de pagamento.

---

> [!IMPORTANT]
> **Ordem de Implementação Recomendada:**
> 1. Portal de Orçamentos (Valor imediato ao cliente).
> 2. Gestão de Documentos (Facilidade operacional).
> 3. Central de Importação (Escalabilidade de vendas do ERP).
> 4. Gemini Insights (Diferencial competitivo).
