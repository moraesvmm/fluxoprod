"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [supabase] = useState(() => createClient());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/atualizar-senha`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError("Não foi possível enviar o e-mail de recuperação. Tente novamente.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
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
          <h2 className="mt-5 text-center text-2xl font-extrabold tracking-tight text-foreground">Recuperar acesso</h2>
          <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>Se houver uma conta associada a <strong>{email}</strong>, você receberá um e-mail com as instruções de redefinição. Verifique também a caixa de spam.</span>
            </div>
            <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-500 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar para o login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center">{error}</div>
            )}
            <div className="relative group/email">
              <label htmlFor="email-address" className="sr-only">Endereço de Email</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <Mail className="h-5 w-5 text-slate-400 group-focus-within/email:text-violet-500 transition-colors" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-border placeholder-slate-400 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 sm:text-sm transition-all shadow-sm focus:shadow-md focus:shadow-violet-500/20"
                placeholder="Seu email corporativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/40 transition-all duration-300"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
              ) : (
                <>Enviar link de recuperação <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>

            <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-500 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
