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

---

## 🩺 FLUXO HEALTH — VERTICAL DE SAÚDE (ESCOPO DEFINIDO EM 27/08/2026)

ERP para clínicas, entregue como **vertical do mesmo produto**: mesmo código, mesmo banco, mesmo provisionamento. Não haverá sistema nem base separada.

### Modelo de produto (três eixos independentes)

| Eixo | Valores | Decide |
|---|---|---|
| **Vertical** | `geral`, `health` | Landing, marca e catálogo de módulos |
| **Setor** | `nutricao`, `odontologia`, `estetica`, `fisioterapia`, `psicologia`, `multi` | Pacote de módulos e formulários |
| **Nível** | Starter, Business, Pro | Limites de uso |

Exige `vertical` e `setor` em `public.empresas` e em `public.planos`. Landing separada por domínio (a definir), resolvida pelo `Host` no proxy.

### Primeiro setor: NUTRIÇÃO

Escolhido por ter a menor superfície clínica e nenhuma dependência de convênio.

Módulos específicos do setor:

- **`antropometria`** — série temporal de peso, altura, IMC, circunferências e dobras, com gráficos de evolução.
- **`plano_alimentar`** — refeições, porções, substituições e cálculo de macros.
- **`recordatorio`** — recordatório alimentar de 24h e diário do paciente.

### Módulos da vertical (comuns a todos os setores)

| Chave | Função | Fase |
|---|---|---|
| `pacientes` | Cadastro clínico | 1 |
| `agenda` | Agendamentos por profissional e sala | 1 |
| `prontuario` | Evolução dos atendimentos | 1 |
| `anamnese` | Formulários configuráveis por setor | 2 |
| `convenios` | Cadastro de convênio e carteirinha (**sem TISS**) | 2 |
| `documentos_clinicos` | Receituário e atestados | 2 |
| `portal_paciente` | Confirmação de consulta e acesso a documentos | 3 |

### Reaproveitamento sem reescrita

Financeiro, estoque, RH (profissionais), comissões, dashboard, relatórios e configurações. O componente `Calendar` (já usado em OS e Obras) atende a agenda, e procedimentos usam `produtos` com `tipo = 'servico'`, que já existe.

### Decisões técnicas

- `pacientes` é tabela própria com vínculo opcional a `clientes`, preservando financeiro e vendas sem alteração.
- `prontuario_evolucoes` é **append-only**, com autor e data. Prontuário não é sobrescrito.
- Anamnese em `formularios_modelo` + `formularios_respostas` (JSONB), variando por setor.
- Dado de saúde é dado sensível na LGPD: exige auditoria de acesso ao prontuário (via `audit_log`) e restrição por profissional.
- Todo módulo novo nasce com hook de provisionamento, conforme [AGENTS.md](../AGENTS.md).

### Fora do MVP

- **TISS**: apenas cadastro de convênio no MVP; guias e lotes ANS ficam para a fase 3.
- **NFS-e**: fase 2. A integração FocusNFe já provisiona `habilita_nfse`, mas não há tela de emissão de serviço.
- **Portal do paciente**: fase 3. Introduz usuário sem vínculo com empresa, quebrando a premissa atual de `user_profiles` + `empresas`.

