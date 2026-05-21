"use client";

import { useState, useEffect, useRef } from "react";
import { useSegmentacao } from "@/lib/hooks/use-segmentacao";
import { X, Plus, Search } from "lucide-react";

interface GerenciarTagsProps {
  clienteId: string;
  tagsAtuais: string[];
  onChange: (tags: string[]) => void;
  onRefresh?: () => void;
}

export default function GerenciarTags({ clienteId, tagsAtuais, onChange, onRefresh }: GerenciarTagsProps) {
  const { adicionarTag, removerTag, catalogTags, buscarCatalog, isAdding, isRemoving } = useSegmentacao(clienteId);
  const [inputValue, setInputValue] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChange(tagsAtuais);
  }, [tagsAtuais, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const buscarSugestoes = async (termo: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    if (termo.length < 2) {
      setSugestoes([]);
      return;
    }

    const timer = setTimeout(async () => {
      const catalog = await buscarCatalog(termo);
      const tags = catalog.map(t => t.nome);
      setSugestoes(tags.filter(t => !tagsAtuais.includes(t)));
    }, 300);
    
    setDebounceTimer(timer);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    buscarSugestoes(value);
    setShowDropdown(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      adicionarNovaTag(inputValue.trim());
    }
  };

  const adicionarNovaTag = async (tag: string) => {
    if (tagsAtuais.length >= 10) {
      alert("Máximo de 10 tags por cliente");
      return;
    }
    
    if (tagsAtuais.includes(tag)) return;
    
    try {
      await adicionarTag(clienteId, tag);
      onChange([...tagsAtuais, tag]);
      setInputValue("");
      setSugestoes([]);
      setShowDropdown(false);
      onRefresh?.();
    } catch (error) {
      console.error("Erro ao adicionar tag:", error);
    }
  };

  const handleRemoverTag = async (tag: string) => {
    try {
      await removerTag(clienteId, tag);
      onChange(tagsAtuais.filter(t => t !== tag));
      onRefresh?.();
    } catch (error) {
      console.error("Erro ao remover tag:", error);
    }
  };

  const getTagColor = (tag: string) => {
    const catalogTag = catalogTags.find(t => t.nome === tag);
    return catalogTag?.cor || "#6366f1";
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">Tags</label>
      
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDropdown(true)}
              placeholder="Adicionar tag..."
              className="w-full px-3 py-2 pr-10 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={() => inputValue.trim() && adicionarNovaTag(inputValue.trim())}
            disabled={isAdding}
            className="px-3 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showDropdown && sugestoes.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-auto"
          >
            {sugestoes.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => adicionarNovaTag(tag)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getTagColor(tag) }}
                />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tagsAtuais.map((tag) => (
          <div
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: getTagColor(tag) }}
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoverTag(tag)}
              disabled={isRemoving}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      
      {tagsAtuais.length === 0 && (
        <p className="text-xs text-slate-400">Nenhuma tag adicionada</p>
      )}
      
      <p className="text-xs text-slate-400">{tagsAtuais.length}/10 tags</p>
    </div>
  );
}
