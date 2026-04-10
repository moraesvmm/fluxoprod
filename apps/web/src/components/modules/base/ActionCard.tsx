"use client";

import { LucideIcon, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  actionText?: string;
  className?: string;
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  actionText = "Acessar",
  className,
}: ActionCardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-6 border border-border/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40",
          className
        )
      )}
    >
      <div>
        <div className="inline-flex rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-3.5 text-primary ring-1 ring-inset ring-indigo-500/10 mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-foreground tracking-tight">
          <Link href={href} className="focus:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {title}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="mt-6 flex items-center text-sm font-semibold text-primary">
        {actionText}
        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  );
}
