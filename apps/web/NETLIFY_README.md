# Hospedagem no Netlify com MCP (Model Context Protocol)

## Configuração

Este projeto está configurado para hospedagem no Netlify com suporte ao MCP (Model Context Protocol) do Next.js.

## Arquivos de Configuração

- `netlify.toml` - Configuração principal do Netlify
- `netlify/functions/mcp.ts` - Função do MCP server para Netlify Functions
- `package.json` - Dependências do MCP adicionadas

## Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no Netlify:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
MASTER_EMAIL=master@fluxo.local
MASTER_PASSWORD=FluxoMaster#123
API_URL=https://your-api-url.com
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_MCP_ENABLED=true
MCP_SERVER_URL=/api/mcp
```

## Deploy no Netlify

### Opção 1: Via Git

1. Faça push do código para o repositório Git
2. Conecte o repositório no Netlify
3. Configure as variáveis de ambiente
4. Deploy automático será feito

### Opção 2: Via CLI

```bash
# Instale o Netlify CLI
npm install -g netlify-cli

# Faça login
netlify login

# Inicialize o projeto
cd apps/web
netlify init

# Deploy
netlify deploy --prod
```

## MCP Tools Disponíveis

O MCP server expõe as seguintes ferramentas:

- `get_empresa_info` - Informações da empresa/tenant atual
- `list_produtos` - Listar produtos do estoque
- `list_vendas` - Listar transações de vendas
- `get_estoque_status` - Status atual do inventário

## Teste Local

Para testar o MCP localmente:

```bash
cd apps/web
npm run dev
```

Acesse: `http://localhost:3000/api/mcp`

## Notas

- O MCP server usa Node.js 20.x
- A função está configurada com 1024MB de memória
- CORS está habilitado para `/api/mcp/*`
- O plugin `@netlify/plugin-nextjs` é usado para otimização do Next.js
