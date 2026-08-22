"use client";

/**
 * TableSkeleton - Componente de skeleton para tabelas
 * 
 * Exibe placeholders animados para indicar carregamento de tabelas.
 * Utilizado em listagens e tabelas de dados.
 * 
 * @param {number} rows - Número de linhas do skeleton (padrão: 5)
 * @param {number} columns - Número de colunas do skeleton (padrão: 4)
 * @returns {JSX.Element} Componente TableSkeleton
 * 
 * @example
 * ```tsx
 * <TableSkeleton rows={5} columns={4} />
 * ```
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 items-center p-4 border border-border rounded-lg bg-card animate-pulse">
          {[...Array(columns)].map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-muted rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
