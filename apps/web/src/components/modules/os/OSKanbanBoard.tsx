"use client";

import { OrdemServico } from "@/lib/api";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import { Wrench, Clock, CheckCircle, XCircle, MoreVertical, Edit } from "lucide-react";
import { motion } from "framer-motion";

interface OSKanbanBoardProps {
  ordens: OrdemServico[];
  onEdit: (os: OrdemServico) => void;
  onStatusChange: (id: string, status: string) => void;
}

const COLUMNS = [
  { id: 'aberta', title: 'Aberta', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'em_execucao', title: 'Em Execução', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'concluida', title: 'Concluída', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'cancelada', title: 'Cancelada', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
];

export function OSKanbanBoard({ ordens, onEdit, onStatusChange }: OSKanbanBoardProps) {
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    const id = e.dataTransfer.getData("osId");
    onStatusChange(id, status);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("osId", id);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px]">
      {COLUMNS.map((col) => {
        const colOrdens = ordens.filter(o => o.status === col.id);
        const Icon = col.icon;

        return (
          <div 
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-xl border border-slate-200 ${col.bg}/30 p-4 transition-colors`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${col.bg} ${col.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-700">{col.title}</h3>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                {colOrdens.length}
              </span>
            </div>

            <div className="flex-1 space-y-4">
              {colOrdens.map((os) => (
                <motion.div
                  key={os.id}
                  layoutId={os.id}
                  draggable
                  onDragStartCapture={(e) => handleDragStart(e as unknown as React.DragEvent, os.id)}
                  className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all cursor-grab active:cursor-grabbing"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">#{os.numero}</span>
                    <button 
                      onClick={() => onEdit(os)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-violet-600 transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <h4 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">{os.veiculo_equipamento}</h4>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{os.cliente?.nome || "Cliente não informado"}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <span className="text-xs font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.valor_orcamento)}
                      </span>
                    </div>
                    {os.tempo_total_minutos && os.tempo_total_minutos > 0 && (
                      <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {Math.floor(os.tempo_total_minutos / 60)}h {os.tempo_total_minutos % 60}m
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {colOrdens.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-300">Arraste aqui</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
