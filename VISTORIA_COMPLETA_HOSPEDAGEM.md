# Vistoria Completa do Sistema FLUXO e Recomendação de Hospedagem

**Data:** 10/04/2026  
**Objetivo:** Vistoria completa do sistema e recomendação de hospedagem

---

## 📊 Estrutura do Projeto

### Arquitetura Monorepo

**Estrutura de diretórios:**
```
fluxoprod/
├── apps/
│   ├── web/ (Frontend Next.js)
│   └── api/ (Backend FastAPI)
├── .venv/ (Python virtual environment)
├── .git/
├── .gitignore
├── .env.example
├── .env.local
├── netlify.toml
├── start-local.ps1
├── DOCUMENTACAO_TECNICA_FLUXO.md
└── README.md
```

---

## 🎨 Frontend (Next.js)

### Tecnologia

**Framework:** Next.js 16.2.2  
**Language:** TypeScript  
**UI:** React 19.2.4 + TailwindCSS 4  
**State Management:** TanStack Query 5.96.2  
**Database Client:** Supabase JS 2.101.1  
**UI Components:** shadcn/ui, Base UI, Lucide React  
**Animations:** Framer Motion 12.38.0  
**Charts:** Recharts 3.8.1

### Dependências Principais

```json
{
  "next": "16.2.2",
  "react": "19.2.4",
  "@supabase/supabase-js": "^2.101.1",
  "@tanstack/react-query": "^5.96.2",
  "@netlify/functions": "^2.8.2",
  "@netlify/plugin-nextjs": "^5"
}
```

### Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

### Funcionalidades

**Páginas principais:**
- `/mestre` - Onboarding/wizard de provisionamento
- `/tenant/dashboard` - Dashboard analytics
- `/tenant/crm` - CRM e gestão de clientes
- `/tenant/vendas` - Vendas e PDV
- `/tenant/financeiro` - Gestão financeira
- `/tenant/estoque` - Controle de estoque
- `/tenant/obras` - Gestão de obras

**Integração com Supabase:**
- Cliente Supabase direto (browser/server/admin)
- RPC para provisionamento
- Hooks TanStack Query para data fetching
- RLS (Row Level Security) para isolamento de tenants

---

## 🐍 Backend (FastAPI)

### Tecnologia

**Framework:** FastAPI 0.109.2  
**Language:** Python  
**Server:** Uvicorn 0.27.0  
**Database:** Supabase (PostgreSQL)  
**ORM:** Supabase Python SDK  
**Validation:** Pydantic 2.6.1

### Dependências Principais

```
fastapi>=0.109.2
uvicorn>=0.27.0.post1
pydantic>=2.6.1
pydantic-settings>=2.1.0
supabase>=2.3.4
asyncpg>=0.29.0
python-multipart>=0.0.9
python-dotenv>=1.0.0
weasyprint>=61.0
```

### Funcionalidades

**Routers:**
- `/api/v1/provisioning` - Provisionamento de empresas
- `/api/v1/vendas` - Gestão de vendas
- `/api/v1/crm` - Gestão de clientes
- `/api/v1/financeiro` - Gestão financeira
- `/api/v1/estoque` - Gestão de estoque
- `/api/v1/empresas` - Gestão de empresas
- `/api/v1/funcionarios` - Gestão de funcionários
- `/api/v1/comissoes` - Gestão de comissões
- `/api/v1/relatorios` - Relatórios

**Integração com Supabase:**
- Supabase REST API via service_role_key
- RPC functions para operações complexas
- Helper functions para abstração de chamadas HTTP

---

## 🗄️ Banco de Dados (Supabase)

### Tecnologia

**Provider:** Supabase  
**Database:** PostgreSQL  
**Authentication:** Supabase Auth  
**Realtime:** Supabase Realtime  
**Storage:** Supabase Storage

### Estrutura

**Schemas:**
- `auth` - 23 tabelas (autenticação)
- `public` - 18 tabelas (tabelas do projeto)
- `realtime` - 3 tabelas (realtime)
- `storage` - 7 tabelas (storage)
- `supabase_migrations` - 1 tabela (migrations)
- `vault` - 2 tabelas (secrets)

**Tenants criados:**
- `tenant_techsolutionsltda_cd722c` - 6 tabelas
- `tenant_test_ff974f` - 6 tabelas
- `tenant_vidanovaimobiliria_c19798` - 7 tabelas

**Tabelas principais:**
- `empresas` - tabela de empresas
- `clientes` - tabela de clientes
- `vendas` - tabela de vendas
- `vendas_itens` - itens de vendas
- `produtos` - tabela de produtos
- `funcionarios` - tabela de funcionários
- `transacoes_financeiras` - tabela de transações financeiras
- `comissoes` - tabela de comissões
- `empresa_modulos` - tabela de módulos por empresa
- `modulos_catalogo` - catálogo de módulos
- `user_profiles` - perfis de usuários
- `user_roles` - papéis de usuários
- `tenants` - tenants
- `obras` - obras e projetos
- `ordens_servico` - ordens de serviço

---

## 🔧 Configuração Atual

### Netlify (Frontend)

**Status:** ✅ Configurado  
**Build:** Next.js  
**Publish:** `.next`  
**Plugin:** @netlify/plugin-nextjs  
**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Configurado
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Configurado
- `SUPABASE_SERVICE_ROLE_KEY` - Configurado
- `NEXT_PUBLIC_API_URL` - Configurado (mas não mais necessário)

### Backend

**Status:** ⚠️ Não hospedado em produção  
**Local:** Roda localmente via `start-local.ps1`  
**Porta:** 8000  
**Environment Variables:**
- `SUPABASE_URL` - Configurado localmente
- `SUPABASE_SERVICE_ROLE_KEY` - Configurado localmente

### Supabase

**Status:** ✅ Configurado  
**URL:** https://wkxtlvxotvutycbupfuh.supabase.co  
**Anon Key:** Configurado  
**Service Role Key:** Configurado

---

## 🚀 Recomendação de Hospedagem

### 🎯 Opção 1: Netlify (Frontend) + Supabase (Backend/Banco) - **RECOMENDADA**

**Frontend:**
- **Serviço:** Netlify
- **Custo:** Gratuito (Hobby)
- **Build:** Next.js
- **Deploy:** Automático via Git
- **Limites:** 100GB bandwidth, 6GB build

**Backend:**
- **Serviço:** Supabase Edge Functions (TypeScript/Deno)
- **Custo:** Gratuito (incluído no plano Supabase)
- **Deploy:** Automático via Supabase CLI
- **Limites:** 500MB bandwidth/mês (gratuito)

**Banco de Dados:**
- **Serviço:** Supabase (PostgreSQL)
- **Custo:** Gratuito (500MB database)
- **Deploy:** Já configurado
- **Limites:** 500MB database, 1GB file storage

**Vantagens:**
- ✅ Custo R$0
- ✅ Deploy automático
- ✅ Sem necessidade de hospedar backend separado
- ✅ Infraestrutura unificada (Supabase)
- ✅ Menos latência
- ✅ Mais simples

**Desvantagens:**
- ⚠️ Precisa converter backend Python/FastAPI para TypeScript/Deno
- ⚠️ Limites de bandwidth do plano gratuito

---

### 🎯 Opção 2: Netlify (Frontend) + Render (Backend) + Supabase (Banco)

**Frontend:**
- **Serviço:** Netlify
- **Custo:** Gratuito (Hobby)
- **Build:** Next.js
- **Deploy:** Automático via Git

**Backend:**
- **Serviço:** Render
- **Custo:** Gratuito (Web Services)
- **Deploy:** Automático via Git
- **Limites:** 512MB RAM, 0.1 vCPU, spin-down após inatividade

**Banco de Dados:**
- **Serviço:** Supabase (PostgreSQL)
- **Custo:** Gratuito (500MB database)
- **Deploy:** Já configurado

**Vantagens:**
- ✅ Custo R$0
- ✅ Deploy automático
- ✅ Suporta Python/FastAPI nativamente
- ✅ Não precisa converter código

**Desvantagens:**
- ⚠️ Spin-down após inatividade (plano gratuito)
- ⚠️ Mais complexo (3 serviços diferentes)
- ⚠️ Mais latência

---

### 🎯 Opção 3: Netlify (Frontend) + Railway (Backend) + Supabase (Banco)

**Frontend:**
- **Serviço:** Netlify
- **Custo:** Gratuito (Hobby)
- **Build:** Next.js
- **Deploy:** Automático via Git

**Backend:**
- **Serviço:** Railway
- **Custo:** Gratuito (US$5/mês de crédito)
- **Deploy:** Automático via Git
- **Limites:** 512MB RAM, 0.5 vCPU

**Banco de Dados:**
- **Serviço:** Supabase (PostgreSQL)
- **Custo:** Gratuito (500MB database)
- **Deploy:** Já configurado

**Vantagens:**
- ✅ Custo R$0 (US$5/mês de crédito)
- ✅ Deploy automático
- ✅ Suporta Python/FastAPI nativamente
- ✅ Não precisa converter código
- ✅ Sem spin-down (melhor que Render)

**Desvantagens:**
- ⚠️ Mais complexo (3 serviços diferentes)
- ⚠️ Mais latência
- ⚠️ Crédito limitado a US$5/mês

---

## 🏆 Recomendação Final

### **Opção 1: Netlify (Frontend) + Supabase (Backend/Banco)**

**Por que:**
- ✅ **Custo R$0** - Totalmente gratuito
- ✅ **Simplicidade** - Infraestrutura unificada
- ✅ **Menos latência** - Tudo no Supabase
- ✅ **Deploy automático** - Git push → deploy
- ✅ **Escalabilidade** - Supabase escala automaticamente

**Próximos passos:**
1. Converter backend Python/FastAPI para TypeScript/Deno
2. Mover lógica para Supabase Edge Functions
3. Atualizar frontend para chamar Edge Functions
4. Deploy automático via Git
5. Testar fluxo completo

**Estimativa de esforço:** 4-6 horas

---

## 📋 Resumo Executivo

**Sistema atual:**
- Frontend: Next.js (Netlify) ✅
- Backend: FastAPI (não hospedado) ❌
- Banco: Supabase ✅

**Recomendação:**
- Frontend: Manter no Netlify
- Backend: Mover para Supabase Edge Functions
- Banco: Manter no Supabase

**Custo total:** R$0  
**Complexidade:** Média (conversão Python → TypeScript)  
**Benefícios:** Simplicidade, custo zero, menos latência

---

## ✅ Status Atual das Chamadas Supabase

**Frontend ↔ Supabase:** ✅ **TODAS EM DIA**  
**Backend ↔ Supabase:** ✅ **TODAS EM DIA** (exceto provisionamento substituído por RPC direto)

**Onboarding atualizado:**
- ✅ Usa RPC direto do Supabase
- ✅ Elimina dependência do backend
- ✅ Deploy automático via Git
