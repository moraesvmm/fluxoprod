import Link from "next/link";
import { ReactNode } from "react";
import { requireMaster } from "@/utils/auth/requireMaster";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireMaster();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="font-bold tracking-tight">FLUXO • Admin Global</div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4 text-sm">
              <Link className="text-slate-700 hover:text-slate-900" href="/admin">
                Visão geral
              </Link>
              <Link className="text-slate-700 hover:text-slate-900" href="/admin/empresas">
                Empresas
              </Link>
              <Link className="text-slate-700 hover:text-slate-900" href="/admin/modulos">
                Módulos
              </Link>
              <Link className="text-slate-700 hover:text-slate-900" href="/admin/usuarios">
                Usuários
              </Link>
              <Link className="text-slate-700 hover:text-slate-900" href="/mestre">
                Onboarding
              </Link>
            </nav>
            <LogoutButton />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}

