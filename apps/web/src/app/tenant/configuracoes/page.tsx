"use client";
import { Settings, Save } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Ajuste os parâmetros da sua empresa e integrações.</p>
      </div>
      
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" /> Dados da Empresa
        </h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Razão Social</label>
            <input type="text" className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" defaultValue="Empresa Demo Ltda" />
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-700">CNPJ</label>
            <input type="text" className="mt-1 block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm" defaultValue="12.345.678/0001-90" disabled />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
             <Save className="mr-2 h-4 w-4" /> Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
