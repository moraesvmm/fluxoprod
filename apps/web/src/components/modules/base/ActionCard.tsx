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
          "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-sidebar-primary/30",
          className
        )
      )}
    >
      <div>
        <div className="inline-flex rounded-lg bg-indigo-50 p-3 text-primary ring-1 ring-inset ring-indigo-500/10 mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground tracking-tight">
          <Link href={href} className="focus:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            {title}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
      <div className="mt-6 flex items-center text-sm font-medium text-primary">
        {actionText}
        <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  );
}
