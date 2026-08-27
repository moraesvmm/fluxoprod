# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Alterações de banco

O mobile consome as mesmas RPCs do Supabase que o web. Qualquer alteração de SQL segue as regras de [AGENTS.md](../../AGENTS.md): arquivo versionado em `apps/api/migrations/`, hook registrado em `provisionamento_hooks` para mudanças em schema tenant e uma única assinatura por função pública.
