# 🚀 MELHORIAS FUTURAS E ROADMAP - FLUXO ERP

Este documento é destinado exclusivamente para o planejamento de novas funcionalidades, melhorias de UX/UI e expansão dos módulos do sistema.

---

## 💎 FUNCIONALIDADES PREMIUM (ROADMAP 2026)

### 1. Portal de Orçamentos e OS (Link Público)
**Objetivo:** Link profissional para o cliente final aprovar orçamentos sem PDFs estáticos.
- **Técnico:** Rota `/p/orcamento/[uuid]`, botão de aprovação real e histórico de visualização.

### 2. Integração Marketplaces (Hub Mercado Livre / Shopee)
**Objetivo:** Sincronização automática de estoque, preços e pedidos.
- **Técnico:** Fluxo OAuth2 (Um clique), Webhooks globais e sincronização bidirecional.
- **Status:** Planejamento detalhado disponível.

### 3. Assistente de IA (Gemini Insights)
**Objetivo:** Transformar dados financeiros e de vendas em decisões estratégicas.
- **Técnico:** Integração com Gemini API via Edge Functions para análise de tendências e saúde do caixa.

### 4. Central de Importação Inteligente (Onboarding)
**Objetivo:** Drag-and-drop de planilhas `.xlsx` com mapeamento visual de colunas para migração rápida.

---

## 🎨 UX/UI E DESIGN SYSTEM

### 1. Dark Mode Premium (Hardening)
- Padronização de tokens OKLCH em todos os módulos menores.
- Refinamento de contraste em componentes de formulário.

### 2. Micro-interações e Feedback
- Adição de animações Framer Motion em transições de página e modais.
- Toasts de sucesso/erro padronizados em todos os fluxos.

---

## 📈 EXPANSÃO DE MÓDULOS

### 1. Motor Fiscal: Impostos e Tributação Dinâmica (Refatoração Crítica)
**Objetivo:** Substituir a tributação chumbada (Hardcoded: CSOSN 102, ICMS/PIS/COFINS zerados) por um motor de regras fiscais inteligente baseado no Regime Tributário do Emitente e na NCM/CFOP do Produto.
- **Técnico:**
  - Criar interface de `Configurações Fiscais do Produto` (Regras de ICMS, PIS, COFINS, IPI).
  - Atualizar o `nfe-xml-builder.ts` para aplicar regras de cálculo percentual e de base de cálculo (CST/CSOSN dinâmico) ao construir as tags `<imposto>`.
  - Suporte a Lucro Presumido e Lucro Real (CST 00, 20, 40) além do Simples Nacional.
- **Impacto:** Permite que empresas de diferentes regimes emitam NFe sem risco de autuação fiscal por erro tributário.

### 2. Automação Bancária (Software House)
- Integração via API com Efí/Asaas para baixa automática de boletos e Pix sem intervenção manual.

### 3. Gestão de Documentos (Storage)
- Galeria de evidências em OS e comprovantes no Financeiro via Supabase Storage.

---

> [!TIP]
> Priorize implementações que gerem valor imediato ao cliente final (ex: Portal de Orçamentos).
