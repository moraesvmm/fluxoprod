---
marp: true
theme: default
class: lead
style: |
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
  section {
    background: oklch(0.145 0 0); /* dark background */
    color: oklch(0.985 0 0); /* dark foreground */
    font-family: "Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif;
    padding: 60px 80px;
  }
  h1 {
    color: oklch(0.985 0 0);
    font-size: 3.5em;
    margin-bottom: 0.2em;
    font-weight: 700;
  }
  h2 {
    color: oklch(0.985 0 0);
    font-size: 2.2em;
    border-bottom: 2px solid oklch(0.5 0.22 278); /* indigo-600 */
    padding-bottom: 0.3em;
    margin-bottom: 1em;
    font-weight: 600;
  }
  h3 {
    color: oklch(0.488 0.243 264.376);
    font-size: 1.5em;
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 400;
  }
  p, li {
    font-size: 1.25em;
    line-height: 1.6;
    color: oklch(0.708 0 0); /* muted text */
  }
  strong {
    color: oklch(0.488 0.243 264.376); /* primary */
    font-weight: 600;
  }
  .highlight {
    color: oklch(0.5 0.22 278); /* light mode primary for pop */
    font-weight: 600;
  }
  .card {
    background: oklch(0.205 0 0); /* card dark */
    border: 1px solid oklch(1 0 0 / 10%); /* border dark */
    border-radius: 0.5rem;
    padding: 20px;
    margin-bottom: 15px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }
---

# Fluxo ERP
### Apresentação de Vistoria: Módulos
Uma análise técnica e estratégica da utilidade de cada módulo da plataforma para um ecossistema SaaS premium.

---

## 1. Dashboard
**O coração estratégico do ERP.**

<div class="card">
<strong>O que faz:</strong> Painel central consolidando KPIs (faturamento, vendas, clientes, OS pendentes, estoque, saldo) e gráficos de visão geral.
</div>

<div class="card">
<strong>Utilidade:</strong> Permite aos gestores uma "visão de águia" imediata sobre a saúde financeira e operacional do negócio no primeiro acesso.
</div>

**Veredito:** <span class="highlight">Indispensável.</span> Previne a navegação fragmentada e entrega o status real da empresa no primeiro clique.

---

## 2. CRM (Gestão de Clientes)
**O motor de relacionamento e previsibilidade.**

<div class="card">
<strong>O que faz:</strong> Gerencia a carteira, funil de vendas (Kanban), histórico, tags e campanhas em massa (Email/WhatsApp/SMS).
</div>

<div class="card">
<strong>Utilidade:</strong> Garante que a equipe comercial não perca leads, permitindo o acompanhamento profissional de negociações longas ou complexas.
</div>

**Veredito:** <span class="highlight">Essencial.</span> Para operações B2B ou B2C de alto valor, gerenciar o relacionamento é o que assegura a receita.

---

## 3. Vendas / PDV
**A linha de frente do faturamento.**

<div class="card">
<strong>O que faz:</strong> Registra transações e opera o Ponto de Venda (PDV), vinculando-as a clientes, produtos e métodos de pagamento.
</div>

<div class="card">
<strong>Utilidade:</strong> Automatiza o ato de venda, gera recibos e alimenta de forma automática e integrada o Financeiro e o Estoque.
</div>

**Veredito:** <span class="highlight">Vital.</span> Representa a entrada primária de receita; sem ele, não há controle de fluxo financeiro justificado.

---

## 4. Catálogo / Estoque
**Proteção contra perdas invisíveis.**

<div class="card">
<strong>O que faz:</strong> Centraliza produtos/serviços, precificação, controla movimentações, quantidades e emite alertas de estoque baixo.
</div>

<div class="card">
<strong>Utilidade:</strong> Evita ruptura (falta de produtos em vendas) e acúmulo de capital parado em mercadorias de baixo giro.
</div>

**Veredito:** <span class="highlight">Vital para Varejo e Atacado.</span> Essencial para bens físicos; para serviços puros, o catálogo atua precificando as entregas.

---

## 5. Ordens de Serviço (OS)
**Organização técnica em alto nível.**

<div class="card">
<strong>O que faz:</strong> Controla manutenções, reparos e serviços prestados. Gerencia veículos, equipamentos, orçamentos, status e responsáveis.
</div>

<div class="card">
<strong>Utilidade:</strong> Garante o controle do fluxo de trabalho de assistências e oficinas, evitando esquecimentos e faturamentos incorretos.
</div>

**Veredito:** <span class="highlight">Indispensável para Prestadores.</span> Altamente nichado, prova o valor comercial do modelo modular do ERP.

---

## 6. Obras (Projetos)
**Controle macro contra estouros e atrasos.**

<div class="card">
<strong>O que faz:</strong> Gerencia projetos longos (timeline), controlando custos previstos x realizados, recursos e armazenamento de documentos.
</div>

<div class="card">
<strong>Utilidade:</strong> Evita o descontrole de custos e garante a previsibilidade de cronograma em empreitadas complexas.
</div>

**Veredito:** <span class="highlight">Crucial para Construção e Engenharia.</span> Um módulo especialista que destaca o Fluxo ERP na indústria civil.

---

## 7. Financeiro
**O pulmão financeiro da empresa.**

<div class="card">
<strong>O que faz:</strong> Controla contas a pagar e receber, conciliação bancária, fluxo de caixa, agrupamento por categorias e inadimplência.
</div>

<div class="card">
<strong>Utilidade:</strong> Assegura que a empresa honre seus compromissos (evitando juros) e cobre devidamente seus clientes (evitando calotes).
</div>

**Veredito:** <span class="highlight">Universal e Indispensável.</span> O pilar de sustentação gerencial de qualquer empresa, de qualquer tamanho ou setor.

---

## 8. RH (Recursos Humanos)
**Visão clara do custo de equipe.**

<div class="card">
<strong>O que faz:</strong> Gerencia o cadastro de funcionários, cargos, papéis (roles), salários-base e permite gerar projeções de folha de pagamento.
</div>

<div class="card">
<strong>Utilidade:</strong> Proporciona uma visão gerencial direta do custo fixo e centraliza a documentação operacional da equipe.
</div>

**Veredito:** <span class="highlight">Útil e Administrativo.</span> Perfeito para a visão executiva de empresas que já contam com times formados.

---

## 9. Comissões
**Meritocracia com zero atrito operacional.**

<div class="card">
<strong>O que faz:</strong> Automatiza o cálculo de recebimentos de comissões baseado em regras pré-configuradas (percentual/fixo) de vendas ou serviços.
</div>

<div class="card">
<strong>Utilidade:</strong> Elimina planilhas suscetíveis a erros humanos, evita desgastes com a equipe comercial e agiliza o fechamento financeiro do mês.
</div>

**Veredito:** <span class="highlight">Altíssima Utilidade.</span> Essencial para modelos de performance (concessionárias, agências, corretoras, clínicas).

---

## 10. Relatórios
**Inteligência de dados para tomada de decisão.**

<div class="card">
<strong>O que faz:</strong> Cruza informações de múltiplos módulos, gerando visões analíticas completas que podem ser exportadas (CSV, PDF).
</div>

<div class="card">
<strong>Utilidade:</strong> Permite extrair inteligência mercadológica, auxiliar em fechamentos contábeis e facilitar envios de dados para auditorias.
</div>

**Veredito:** <span class="highlight">Indispensável.</span> Transforma os dados armazenados em arquivos manipuláveis para contadores e gestão avançada.

---

## 11. Configurações
**Autonomia e governança operacional.**

<div class="card">
<strong>O que faz:</strong> Permite ajustes de dados do Tenant, gerenciamento de permissões (RBAC) e ativação/desativação dinâmica de módulos no catálogo.
</div>

<div class="card">
<strong>Utilidade:</strong> Centraliza a governança corporativa, a segurança dos dados e viabiliza a orquestração do modelo de negócios SaaS do Fluxo.
</div>

**Veredito:** <span class="highlight">Estrutural.</span> É o módulo base que permite ao sistema ser multi-tenant e verdadeiramente modular.

---

## Conclusão: Arquitetura Sólida e Inteligente

A divisão de módulos do **Fluxo ERP** não possui elementos obsoletos ou "códigos mortos". A arquitetura se baseia de forma inteligente em:

- **Módulos Core (Uso Universal):** Dashboard, Financeiro, Vendas, Clientes, Configurações, Relatórios.
- **Módulos Satélites (Ativados sob demanda):** Obras, OS, Estoque, RH, Comissões.

**O Resultado:** Uma plataforma SaaS leve, limpa visualmente e perfeitamente customizável para atender diversos nichos sem gerar complexidade desnecessária ao usuário final.
