"use client";
import { Tags, Plus } from "lucide-react";

export default function CatalogoPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Catálogo de Produtos</h2>
          <p className="text-muted-foreground">Gerencie produtos, variações e preços de venda.</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Produto
        </button>
      </div>
      
      <div className="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground shadow-sm flex flex-col items-center">
         <Tags className="h-12 w-12 mb-4 text-slate-300" />
         <p>Selecione um produto para visualizar ou crie um novo.</p>
      </div>
    </div>
  );
}
