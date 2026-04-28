"use client";

import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Props do componente KPICard
 * @interface KPICardProps
 */
interface KPICardProps {
  /** Título do KPI */
  title: string;
  /** Valor do KPI (pode ser string ou número) */
  value: string | number;
  /** Ícone do Lucide React para exibir no card */
  icon: LucideIcon;
  /** Tendência opcional do KPI (variação percentual) */
  trend?: {
    /** Valor da tendência em percentual */
    value: number;
    /** Label da tendência (ex: "vs mês anterior") */
    label: string;
    /** Indica se a tendência é positiva ou negativa */
    isPositive: boolean;
  };
  /** Classes CSS adicionais para customização */
  className?: string;
}

/**
 * KPICard - Componente para exibir KPIs (Key Performance Indicators)
 * 
 * Exibe um cartão com título, valor e ícone, com suporte opcional a tendência.
 * Utilizado no Dashboard e outras páginas para mostrar métricas importantes.
 * 
 * @param {KPICardProps} props - Props do componente
 * @returns {JSX.Element} Componente KPICard
 * 
 * @example
 * ```tsx
 * <KPICard 
 *   title="Faturamento" 
 *   value="R$ 10.000" 
 *   icon={Banknote} 
 *   trend={{ value: 15, label: "vs mês anterior", isPositive: true }}
 * />
 * ```
 */
export function KPICard({ title, value, icon: Icon, trend, className }: KPICardProps) {
  return (
    <div className={twMerge(clsx("relative overflow-hidden rounded-xl bg-card p-6 border border-border/60 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1", className))}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
          {title}
        </p>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary shadow-inner ring-1 ring-primary/20">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-x-2">
        <h3 className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </h3>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span
            className={twMerge(
              clsx(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold text-[11px] uppercase tracking-wider shadow-sm ring-1 ring-inset",
                trend.isPositive 
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-400 ring-rose-500/20"
              )
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
          <span className="ml-2 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wide">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
