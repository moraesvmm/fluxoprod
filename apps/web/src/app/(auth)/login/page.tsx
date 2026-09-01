"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  const queryClient = useQueryClient();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    if (hash.includes("access_token") && hash.includes("type=signup")) {
      const checkSession = async () => {
        setSuccess("Sua conta foi ativada com sucesso! Autenticando...");
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();
            
          router.push(profile?.role === "master" ? "/admin" : "/tenant/dashboard");
          router.refresh();
        } else {
          setSuccess("E-mail verificado! Faça login abaixo.");
          setLoading(false);
        }
      };
      
      // O Supabase parseia o hash de forma assíncrona logo no mount
      setTimeout(checkSession, 1200);
    } else if (search.includes("confirmed=true")) {
      setTimeout(() => setSuccess("E-mail verificado! Faça login com sua senha."), 0);
    }
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData?.user) {
      let msg = signInError?.message || "Erro na autenticação.";
      if (msg.includes("Email not confirmed")) {
        msg = "Seu e-mail ainda não foi verificado. Por favor, verifique sua caixa de entrada (e spam) para o link de confirmação.";
      }
      setError(msg);
      setLoading(false);
      return;
    }

    queryClient.removeQueries({ queryKey: ["sidebar-data"] });

    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", signInData.user.id)
      .maybeSingle();

    if (profileErr || !profile?.role) {
      setError("Usuário sem perfil. Contate o administrador do sistema.");
      setLoading(false);
      return;
    }

    router.push(profile.role === "master" ? "/admin" : "/tenant/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted relative isolate overflow-hidden h-screen">
      <style>{`
        @keyframes flow {
          0% { background-position: 0% 50%; opacity: 0.15; transform: scale(1); }
          50% { background-position: 100% 50%; opacity: 0.3; transform: scale(1.05); }
          100% { background-position: 0% 50%; opacity: 0.15; transform: scale(1); }
        }
        .animate-flow {
          background-size: 200% 200%;
          animation: flow 15s ease-in-out infinite;
        }
      `}</style>
      
      <div 
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" 
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#c084fc] via-[#818cf8] to-[#4f46e5] opacity-20 animate-flow sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 bg-card p-10 rounded-2xl shadow-xl shadow-indigo-500/10 border border-slate-100 z-10 transition-all">
        <div>
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <Image
              src="/logo-fluxo.png"
              alt="Fluxo Logo"
              width={80}
              height={80}
              className="object-contain drop-shadow-[0_0_15px_rgba(192,132,252,0.4)]"
              priority
            />
          </div>
          <h2 className="mt-5 text-center text-3xl font-extrabold tracking-tight">
            <span 
              className="bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 bg-clip-text text-transparent"
              style={{ fontFamily: "var(--font-meow), cursive", fontSize: "2.7rem" }}
            >
              Fluxo
            </span>
          </h2>
          <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
            Entre para gerenciar seu negócio
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {success && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full pl-10 pr-3 py-3 border border-border placeholder-slate-400 text-foreground rounded-t-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:z-10 sm:text-sm transition-all shadow-sm focus:shadow-md focus:shadow-violet-500/20"
                placeholder="Seu email corporativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative group/password mt-px z-0">
              <label htmlFor="password" className="sr-only">Senha</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <Lock className="h-5 w-5 text-slate-400 group-focus-within/password:text-violet-500 transition-colors" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full pl-10 pr-3 py-3 border border-border placeholder-slate-400 text-foreground rounded-b-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:z-10 sm:text-sm transition-all shadow-sm focus:shadow-md focus:shadow-violet-500/20"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/40 transition-all duration-300 transform hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar na Plataforma
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
            <div className="flex justify-end w-full">
              <a href="#" className="text-xs font-medium text-violet-600 hover:text-violet-500 transition-colors">
                Esqueceu sua senha?
              </a>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Ainda não tem conta?{" "}
                <a href="/checkout" className="text-xs font-medium text-violet-600 hover:text-violet-500 transition-colors">
                  Assine agora
                </a>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
