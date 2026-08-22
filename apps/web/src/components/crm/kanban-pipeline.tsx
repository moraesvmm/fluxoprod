"use client";

import { useState } from "react";
import { usePipeline } from "@/lib/hooks/use-pipeline";
import { type Cliente } from "@/lib/api";
import { Mail, Phone, MoreHorizontal, GripVertical } from "lucide-react";

interface KanbanPipelineProps {
  onClienteClick?: (cliente: Cliente) => void;
}

export default function KanbanPipeline({ onClienteClick }: KanbanPipelineProps) {
  const { colunas, loading, moverCliente, isMoving } = usePipeline();
  const [draggedCliente, setDraggedCliente] = useState<Cliente | null>(null);
  const [dragOverFase, setDragOverFase] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, cliente: Cliente) => {
    setDraggedCliente(cliente);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cliente.id);
  };

  const handleDragEnd = () => {
    setDraggedCliente(null);
    setDragOverFase(null);
  };

  const handleDragOver = (e: React.DragEvent, fase: string) => {
    e.preventDefault();
    setDragOverFase(fase);
  };

  const handleDrop = async (e: React.DragEvent, fase: string) => {
    e.preventDefault();
    const clienteId = e.dataTransfer.getData("text/plain");
    
    if (clienteId) {
      await moverCliente(clienteId, fase);
    } else if (draggedCliente && draggedCliente.funil_fase !== fase) {
      await moverCliente(draggedCliente.id, fase);
    }
    
    setDragOverFase(null);
  };

  const handleDragLeave = () => {
    setDragOverFase(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pipeline de Vendas</h3>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-violet-600 hover:text-violet-700"
        >
          Recarregar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {colunas.map((coluna) => {
            const isDragOver = dragOverFase === coluna.fase;
            const isHighlighted = isDragOver && draggedCliente?.funil_fase !== coluna.fase;

            return (
              <div
                key={coluna.fase}
                onDragOver={(e) => handleDragOver(e, coluna.fase)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, coluna.fase)}
                className={`
                  flex-shrink-0 w-72 rounded-xl border-2 transition-all duration-200
                  ${isHighlighted ? 'border-violet-500 bg-violet-50' : 'border-border bg-card'}
                `}
              >
                {/* Header da coluna */}
                <div className={`p-3 border-b ${isHighlighted ? 'border-violet-300' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${coluna.cor}`}>
                      {coluna.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {coluna.clientes.length}
                    </span>
                  </div>
                  {isHighlighted && (
                    <div className="text-xs text-violet-600">
                      Solte para mover aqui
                    </div>
                  )}
                </div>

                {/* Cards de clientes */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {coluna.clientes.map((cliente) => (
                    <div
                      key={cliente.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cliente)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onClienteClick?.(cliente)}
                      className={`
                        bg-card rounded-lg border p-3 cursor-move hover:shadow-md
                        transition-shadow duration-200
                        ${isMoving && draggedCliente?.id === cliente.id ? 'opacity-50' : ''}
                        border-border
                      `}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {cliente.nome}
                          </h4>
                          {cliente.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{cliente.email}</span>
                            </div>
                          )}
                          {cliente.telefone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Phone className="w-3 h-3" />
                              <span>{cliente.telefone}</span>
                            </div>
                          )}
                        </div>
                        <button className="p-1 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      {cliente.status && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground mt-2">
                          {cliente.status}
                        </span>
                      )}
                    </div>
                  ))}

                  {coluna.clientes.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Nenhum cliente nesta fase
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
