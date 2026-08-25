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
          "relative overflow-hidden rounded-md p-5 border transition-colors",
          disabled 
            ? "bg-muted/20 border-border/40 opacity-60 cursor-not-allowed" 
            : "bg-card border-border",
          className
        )
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </p>
        <span className={clsx("text-muted-foreground/50", disabled && "text-muted-foreground/30")}>
          {disabled ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-x-2">
        <h3 
          className="text-2xl font-semibold tracking-tight text-foreground tnum break-words" 
          title={disabled ? undefined : String(value)}
        >
          {disabled ? "—" : value}
        </h3>
      </div>
      
      {!disabled && trend && (
        <div className="mt-3 flex items-baseline gap-x-2 text-xs tnum">
          <span className={trend.isPositive ? "text-positive font-semibold" : "text-negative font-semibold"}>
            {trend.isPositive ? "+" : "\u2212"}{Math.abs(trend.value)}%
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
