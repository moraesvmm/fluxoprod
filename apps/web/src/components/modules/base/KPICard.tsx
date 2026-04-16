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
    <div className={twMerge(clsx("relative overflow-hidden rounded-xl bg-white p-6 border border-border/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5", className))}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground/80 truncate">
          {title}
        </p>
        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-2.5 text-primary shadow-sm">
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
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                trend.isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
          <span className="ml-2 text-muted-foreground/80">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
