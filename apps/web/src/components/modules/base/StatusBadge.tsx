"use client";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type StatusType =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "default"
  | "pendente"
  | "concluido"
  | "baixo"
  | "critico"
  | "normal";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string; defaultLabel: string }> = {
  success: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", defaultLabel: "Sucesso" },
  concluido: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", defaultLabel: "Concluído" },
  normal: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", defaultLabel: "Normal" },
  
  warning: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", defaultLabel: "Atenção" },
  pendente: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", defaultLabel: "Pendente" },
  baixo: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", defaultLabel: "Baixo" },
  
  error: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", defaultLabel: "Erro" },
  critico: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", defaultLabel: "Crítico" },
  
  info: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", defaultLabel: "Info" },
  default: { bg: "bg-muted", text: "text-foreground", dot: "bg-slate-400", defaultLabel: "Status" },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.default;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border border-black/5 shadow-sm",
          config.bg,
          config.text,
          className
        )
      )}
    >
      <svg
        className={clsx("h-1.5 w-1.5", config.text.replace('text', 'fill'))}
        viewBox="0 0 6 6"
        aria-hidden="true"
      >
        <circle cx={3} cy={3} r={3} />
      </svg>
      {displayLabel}
    </span>
  );
}
