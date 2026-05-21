"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export default function ProducaoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "Painel de OP", href: "/tenant/producao/painel-op" },
    { name: "Fichas Técnicas", href: "/tenant/producao/fichas-tecnicas" },
  ];

  // Se estiver na raiz /producao, não renderiza as tabs soltas antes do redirecionamento
  if (pathname === "/tenant/producao") {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={clsx(
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors"
                )}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div>{children}</div>
    </div>
  );
}
