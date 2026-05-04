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

### 1. Automação Bancária (Software House)
- Integração via API com Efí/Asaas para baixa automática de boletos e Pix sem intervenção manual.

### 2. Gestão de Documentos (Storage)
- Galeria de evidências em OS e comprovantes no Financeiro via Supabase Storage.

---

> [!TIP]
> Priorize implementações que gerem valor imediato ao cliente final (ex: Portal de Orçamentos).
