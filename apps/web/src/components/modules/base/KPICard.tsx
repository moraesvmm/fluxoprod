"use client";

import { LucideIcon, Lock } from "lucide-react";
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
  /** Indica se o card está desabilitado (upsell) */
  disabled?: boolean;
  /** Mensagem exibida no tooltip quando desabilitado */
  disabledMessage?: string;
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
 */
export function KPICard({ title, value, icon: Icon, trend, className, disabled, disabledMessage }: KPICardProps) {
  return (
    <div 
      title={disabled ? disabledMessage : undefined}
      className={twMerge(
        clsx(
          "relative overflow-hidden rounded-xl p-6 border transition-all duration-300 shadow-sm",
          disabled 
            ? "bg-muted/30 border-border/40 grayscale opacity-70 cursor-not-allowed" 
            : "bg-card border-border/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
          className
        )
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
          {title}
        </p>
        <div className={clsx(
          "rounded-xl p-2.5 shadow-inner ring-1",
          disabled ? "bg-muted text-muted-foreground ring-border/20" : "bg-primary/10 text-primary ring-primary/20"
        )}>
          {disabled ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-x-2">
        <h3 className="text-3xl font-bold tracking-tight text-foreground">
          {disabled ? "—" : value}
        </h3>
      </div>
      
      {!disabled && trend && (
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
