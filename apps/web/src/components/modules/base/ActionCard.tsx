"use client";

import { LucideIcon, ArrowRight, Lock } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";

/**
 * Props do componente ActionCard
 * @interface ActionCardProps
 */
interface ActionCardProps {
  /** Título da ação */
  title: string;
  /** Descrição da ação */
  description: string;
  /** Ícone do Lucide React para exibir no card */
  icon: LucideIcon;
  /** URL de destino quando o card é clicado */
  href: string;
  /** Texto do botão de ação (padrão: "Acessar") */
  actionText?: string;
  /** Indica se a ação está desabilitada (upsell) */
  disabled?: boolean;
  /** Mensagem exibida no tooltip quando desabilitado */
  disabledMessage?: string;
  /** Classes CSS adicionais para customização */
  className?: string;
}

/**
 * ActionCard - Componente para exibir ações rápidas
 * 
 * Exibe um cartão com título, descrição, ícone e link para uma ação.
 * Utilizado no Dashboard e outras páginas para facilitar acesso a funcionalidades.
 * 
 * @param {ActionCardProps} props - Props do componente
 * @returns {JSX.Element} Componente ActionCard
 */
export function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  actionText = "Acessar",
  className,
  disabled,
  disabledMessage,
}: ActionCardProps) {
  const content = (
    <>
      <div>
        <div className={clsx(
          "inline-flex rounded-xl p-3.5 ring-1 ring-inset mb-4 transition-all duration-300 shadow-sm",
          disabled 
            ? "bg-muted text-muted-foreground ring-border/20" 
            : "bg-primary/10 text-primary ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground"
        )}>
          {disabled ? <Lock className="h-6 w-6" aria-hidden="true" /> : <Icon className="h-6 w-6" aria-hidden="true" />}
        </div>
        <h3 className="text-lg font-bold text-foreground tracking-tight">
          {disabled ? (
            <span>{title}</span>
          ) : (
            <Link href={href} className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              {title}
            </Link>
          )}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>
      <div className={clsx(
        "mt-6 flex items-center text-sm font-semibold",
        disabled ? "text-muted-foreground/50" : "text-primary"
      )}>
        {disabled ? "Bloqueado" : actionText}
        {!disabled && <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
      </div>
    </>
  );

  return (
    <div
      title={disabled ? disabledMessage : undefined}
      className={twMerge(
        clsx(
          "group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 border transition-all duration-300 shadow-sm",
          disabled 
            ? "bg-muted/30 border-border/40 grayscale opacity-70 cursor-not-allowed" 
            : "bg-card border-border/60 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40",
          className
        )
      )}
    >
      {content}
    </div>
  );
}
