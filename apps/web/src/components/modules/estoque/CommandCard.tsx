import React from 'react';
import { LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface CommandCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  kpi?: string | number;
  kpiLabel?: string;
  alert?: boolean;
  onClick: () => void;
  className?: string;
  tourId?: string;
}

export function CommandCard({
  title,
  description,
  icon: Icon,
  kpi,
  kpiLabel,
  alert,
  onClick,
  className,
  tourId
}: CommandCardProps) {
  return (
    <button
      onClick={onClick}
      data-tour={tourId}
      className={twMerge(
        "relative flex flex-col items-start p-6 rounded-2xl border text-left transition-all duration-300",
        "bg-card hover:shadow-lg hover:border-primary/50 group w-full h-full min-h-[220px]",
        alert ? "border-red-200 dark:border-red-900/50" : "border-border",
        className
      )}
    >
      {/* Decorative gradient background on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start w-full mb-4 z-10">
        <div className={twMerge(
          "p-3 rounded-xl",
          alert ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-primary/10 text-primary"
        )}>
          <Icon className="w-6 h-6" />
        </div>

        {kpi !== undefined && (
          <div className="text-right">
            <span className={twMerge(
              "text-2xl font-bold block",
              alert ? "text-red-600 dark:text-red-400" : "text-foreground"
            )}>
              {kpi}
            </span>
            {kpiLabel && (
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {kpiLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="z-10 mt-auto">
        <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
      
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 z-10">
        <div className="bg-primary/10 text-primary p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </div>
    </button>
  );
}
