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
    <div className={twMerge(clsx("relative overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-border transition-all duration-200 hover:shadow-md", className))}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground truncate">
          {title}
        </p>
        <div className="rounded-lg bg-indigo-50 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-x-2">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </h3>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span
            className={twMerge(
              clsx(
                "inline-flex font-medium",
                trend.isPositive ? "text-emerald-600" : "text-destructive"
              )
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
          <span className="ml-2 text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
