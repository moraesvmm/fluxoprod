"use client";

import Link from "next/link";

export default function SemModulosPage() {
  return (
    <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold tracking-tight">Acesso indisponível</h2>
      <p className="mt-2 text-muted-foreground">
        Nenhum módulo está ativo para esta empresa (ou você tentou acessar um módulo desativado).
        Solicite ativação ao administrador do sistema.
      </p>
      <div className="mt-6">
        <Link
          href="/tenant/dashboard"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}

