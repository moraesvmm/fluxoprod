"use client";

/**
 * KPISkeleton - Componente de skeleton para KPI Cards
 * 
 * Exibe placeholders animados para indicar carregamento de KPIs.
 * Utilizado em dashboards e páginas com métricas.
 * 
 * @param {number} count - Número de skeletons a exibir (padrão: 4)
 * @returns {JSX.Element} Componente KPISkeleton
 * 
 * @example
 * ```tsx
 * <KPISkeleton count={4} />
 * ```
 */
export function KPISkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm animate-pulse">
          <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
          <div className="h-8 w-32 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
