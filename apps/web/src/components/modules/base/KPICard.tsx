"use client";

import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  className?: string;
}

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
