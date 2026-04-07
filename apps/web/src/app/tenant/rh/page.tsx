"use client";
import { Briefcase, UserPlus } from "lucide-react";

export default function RHPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recursos Humanos (RH)</h2>
          <p className="text-muted-foreground">Controle de equipe, permissões e escalas (RBAC).</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar Colaborador
        </button>
      </div>
      
      <div className="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground shadow-sm flex flex-col items-center">
         <Briefcase className="h-12 w-12 mb-4 text-slate-300" />
         <p>Gerencie seus funcionários e permissões de acesso ao Fluxo.</p>
      </div>
    </div>
  );
}
