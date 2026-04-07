## Fluxo (SaaS B2B Nível 2)

Premissas:
- **Um único Supabase**
- **Isolamento por empresa via schemas** (provisionados) **+ RLS** (governança central e feature flags)
- **Usuário-master global** (governança central)
- **Módulos por empresa** (feature flags; nenhum ativo por padrão)

### Setup (dev)

- **Variáveis de ambiente**: copie `.env.example` para `.env.local` e preencha:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (somente server-side)

### Banco (Supabase)

Rode o SQL de infraestrutura no Supabase SQL Editor:
- `apps/api/supabase_rpc.sql`

Ele cria:
- `public.empresas`
- `public.modulos_catalogo`
- `public.empresa_modulos` (feature flags)
- `public.user_profiles` (papéis: `master`, `tenant_admin`, `tenant_user`)
- RLS e políticas necessárias

### Usuário-master (dev)

Crie o usuário-master global via script (usa Service Role):

```bash
cd apps/web
node scripts/seed-master.mjs
```

Credenciais padrão (ajuste via env):
- `MASTER_EMAIL` (default `master@fluxo.local`)
- `MASTER_PASSWORD` (default `FluxoMaster#123`)

### Web

```bash
cd apps/web
npm run dev
```

Rotas:
- `/login`
- `/admin` (somente master)
- `/mestre` (onboarding; somente master)
- `/tenant/*` (somente usuários de empresa; bloqueado por módulos ativos)

