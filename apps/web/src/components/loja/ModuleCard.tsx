"use client";

import { motion } from "framer-motion";
import { Check, Plus, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ModuleCardProps {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  icon: LucideIcon;
  isActive: boolean;
  onAdd: (id: string) => void;
  color: string;
}

export function ModuleCard({
  id,
  name,
  description,
  features,
  price,
  icon: Icon,
  isActive,
  onAdd,
  color,
} : ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="group relative h-full flex flex-col overflow-hidden rounded-2xl border border-border dark:border-white/5 bg-white/70 dark:bg-[#121216]/50 backdrop-blur-xl transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 shadow-sm"
    >
      {/* Background Gradient */}
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10 blur-3xl transition-opacity group-hover:opacity-20`} style={{ backgroundColor: color }} />

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-muted dark:bg-white/5 border border-border dark:border-white/10 group-hover:border-primary/20 transition-colors">
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          {isActive ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-2 py-1 gap-1">
              <Check className="w-3 h-3" /> Ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-primary/10 text-primary dark:text-indigo-400 border-primary/20 px-2 py-1">
              Disponível
            </Badge>
          )}
        </div>

        <h3 className="text-xl font-bold text-foreground dark:text-white mb-2">{name}</h3>
        <p className="text-sm text-muted-foreground dark:text-gray-400 mb-6 line-clamp-3 leading-relaxed">
          {description}
        </p>

        <div className="space-y-3 mb-8">
          {features.slice(0, 3).map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground dark:text-gray-300">
              <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/30" />
              {feature}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-muted-foreground font-bold">Investimento</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground dark:text-white">R$ {price.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 dark:text-muted-foreground">/mês</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onAdd(id)}
            disabled={isActive}
            className={`rounded-xl transition-all ${
              isActive 
                ? "bg-muted dark:bg-white/5 text-slate-400 dark:text-muted-foreground cursor-default" 
                : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            }`}
          >
            {isActive ? "Integrado" : (
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Adquirir
              </span>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
