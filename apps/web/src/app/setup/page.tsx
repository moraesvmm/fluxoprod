"use client";

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Configuração necessária</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O servidor web está rodando, mas faltam variáveis de ambiente do Supabase.
        </p>

        <div className="mt-6 rounded-xl bg-slate-900 text-slate-50 p-4 text-sm font-mono whitespace-pre-wrap">
          NEXT_PUBLIC_SUPABASE_URL=...
          {"\n"}
          NEXT_PUBLIC_SUPABASE_ANON_KEY=...
          {"\n"}
          SUPABASE_SERVICE_ROLE_KEY=... (somente server-side; necessário para seed/usuários)
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Crie um arquivo <span className="font-mono">.env.local</span> na raiz do repositório (ele já está no
          <span className="font-mono"> .gitignore</span>) e reinicie o Next.
        </p>
      </div>
    </div>
  );
}

