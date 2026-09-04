"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function AtualizarSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // A sessão de recuperação é estabelecida pelo link do e-mail ao carregar a página.
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setReady(!!session);
    };
    const timer = setTimeout(check, 800);
    return () => clearTimeout(timer);
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim().length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/login"), 2500);
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted relative isolate overflow-hidden h-screen">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#c084fc] via-[#818cf8] to-[#4f46e5] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-card p-10 rounded-2xl shadow-xl shadow-indigo-500/10 border border-slate-100 z-10">
        <div>
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <Image src="/logo-fluxo.png" alt="Fluxo Logo" width={80} height={80} className="object-contain drop-shadow-[0_0_15px_rgba(192,132,252,0.4)]" priority />
          </div>
          <h2 className="mt-5 text-center text-2xl font-extrabold tracking-tight text-foreground">Definir nova senha</h2>
          <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
            Escolha uma senha com pelo menos 8 caracteres.
          </p>
        </div>

        {done ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Senha atualizada! Redirecionando para o login...</span>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center">{error}</div>
            )}
            {!ready && !error && (
              <p className="text-xs text-center text-muted-foreground">
                Abra esta página pelo link enviado ao seu e-mail. Caso o link tenha expirado,{" "}
                <Link href="/recuperar-senha" className="text-violet-600 font-medium hover:text-violet-500">solicite um novo</Link>.
              </p>
            )}

            <div className="space-y-4">
              <div className="relative group/password">
                <label htmlFor="password" className="sr-only">Nova senha</label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within/password:text-violet-500 transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-border placeholder-slate-400 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm transition-all shadow-sm"
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="relative group/confirm">
                <label htmlFor="confirm" className="sr-only">Confirmar nova senha</label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within/confirm:text-violet-500 transition-colors" />
                </div>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-border placeholder-slate-400 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm transition-all shadow-sm"
                  placeholder="Confirmar nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/40 transition-all duration-300"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Atualizando...</>
              ) : (
                <>Atualizar senha <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
