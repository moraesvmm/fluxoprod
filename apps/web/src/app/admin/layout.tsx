import Link from "next/link";
import { ReactNode } from "react";
import { requireMaster } from "@/utils/auth/requireMaster";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireMaster();

  return (
    <div className="min-h-screen bg-muted">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="font-bold tracking-tight hover:text-indigo-600 transition-colors">
            FLUXO • Painel Central
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4 text-sm">
              <Link className="text-foreground hover:text-foreground" href="/admin">
                Visão geral
              </Link>
              <Link className="text-foreground hover:text-foreground" href="/admin/empresas">
                Empresas
              </Link>
              <Link className="text-foreground hover:text-foreground" href="/admin/modulos">
                Módulos
              </Link>
              <Link className="text-foreground hover:text-foreground" href="/admin/cupons">
                Cupons
              </Link>
              <Link className="text-foreground hover:text-foreground" href="/admin/usuarios">
                Usuários
              </Link>
              <Link className="text-foreground hover:text-foreground font-semibold" href="/mestre">
                Setup Master
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

