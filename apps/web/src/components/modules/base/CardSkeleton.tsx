"use client";

/**
 * CardSkeleton - Componente de skeleton para cards genéricos
 * 
 * Exibe placeholders animados para indicar carregamento de cards.
 * Utilizado em ActionCards e outros componentes de card.
 * 
 * @param {number} count - Número de skeletons a exibir (padrão: 3)
 * @returns {JSX.Element} Componente CardSkeleton
 * 
 * @example
 * ```tsx
 * <CardSkeleton count={3} />
 * ```
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-pulse">
          <div className="h-12 w-12 bg-slate-200 rounded-xl mb-4" />
          <div className="h-6 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-full bg-muted rounded mb-4" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}
