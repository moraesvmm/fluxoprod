"use client";

import { useState } from "react";
import { useSegmentacao } from "@/lib/hooks/use-segmentacao";
import { X, Filter, Check } from "lucide-react";

interface FiltroTagsProps {
  onFiltroChange: (tags: string[], operador: 'all' | 'any') => void;
}

export default function FiltroTags({ onFiltroChange }: FiltroTagsProps) {
  const { catalogTags, filtrarPorTags, limparFiltroTags } = useSegmentacao();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [operador, setOperador] = useState<'all' | 'any'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleTag = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
    onFiltroChange(newSelectedTags, operador);
  };

  const handleLimpar = () => {
    setSelectedTags([]);
    limparFiltroTags();
    onFiltroChange([], 'all');
  };

  const handleApply = () => {
    filtrarPorTags(selectedTags, operador);
    setIsOpen(false);
  };

  const getTagColor = (tag: string) => {
    const catalogTag = catalogTags.find(t => t.nome === tag);
    return catalogTag?.cor || "#6366f1";
  };

  const selectedCount = selectedTags.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors"
      >
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-foreground">Filtrar por Tags</span>
        {selectedCount > 0 && (
          <span className="bg-violet-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {selectedCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground">Filtrar por Tags</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-foreground mb-2">Operador</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOperador('all')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  operador === 'all'
                    ? 'bg-violet-600 text-white'
                    : 'bg-muted text-foreground hover:bg-slate-200'
                }`}
              >
                Tem todas
              </button>
              <button
                onClick={() => setOperador('any')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  operador === 'any'
                    ? 'bg-violet-600 text-white'
                    : 'bg-muted text-foreground hover:bg-slate-200'
                }`}
              >
                Tem qualquer
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
            <div className="max-h-48 overflow-auto space-y-1">
              {catalogTags.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma tag disponível</p>
              ) : (
                catalogTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.nome)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedTags.includes(tag.nome)
                          ? 'bg-violet-600 border-violet-600'
                          : 'border-border'
                      }`}
                    >
                      {selectedTags.includes(tag.nome) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.cor }}
                    />
                    <span className="flex-1 text-left text-foreground">{tag.nome}</span>
                    <span className="text-xs text-slate-400">{tag.uso_count}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <button
              onClick={handleLimpar}
              className="flex-1 px-3 py-1.5 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-1.5 text-sm bg-violet-600 text-white hover:bg-violet-700 rounded-md transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
