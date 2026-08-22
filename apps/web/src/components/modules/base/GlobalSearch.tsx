"use client";

import { useState, useEffect } from "react";
import { Search, X, User, Briefcase, ShoppingCart, FileText, Building2, Wrench, DollarSign, type LucideIcon } from "lucide-react";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'cliente' | 'funcionario' | 'produto' | 'venda' | 'obra' | 'os' | 'transacao';
  title: string;
  subtitle: string;
  icon: LucideIcon;
  url: string;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Simular busca global (em produção, isso seria uma RPC real)
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'cliente',
        title: 'Cliente Exemplo',
        subtitle: 'cliente@email.com',
        icon: User,
        url: '/tenant/crm'
      },
      {
        id: '2',
        type: 'funcionario',
        title: 'Funcionário Exemplo',
        subtitle: 'Vendedor',
        icon: Briefcase,
        url: '/tenant/rh'
      },
      {
        id: '3',
        type: 'produto',
        title: 'Produto Exemplo',
        subtitle: 'R$ 100,00',
        icon: ShoppingCart,
        url: '/tenant/catalogo'
      },
      {
        id: '4',
        type: 'venda',
        title: 'Venda #1234',
        subtitle: 'R$ 1.500,00',
        icon: DollarSign,
        url: '/tenant/vendas'
      },
      {
        id: '5',
        type: 'obra',
        title: 'Obra Residencial',
        subtitle: 'Em andamento',
        icon: Building2,
        url: '/tenant/obras'
      },
      {
        id: '6',
        type: 'os',
        title: 'OS #5678',
        subtitle: 'Aberta',
        icon: Wrench,
        url: '/tenant/os'
      },
      {
        id: '7',
        type: 'transacao',
        title: 'Transação Exemplo',
        subtitle: 'R$ 500,00',
        icon: FileText,
        url: '/tenant/financeiro'
      },
    ];

    const filtered = mockResults.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    );

    setResults(filtered);
  }, [query]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'cliente': return User;
      case 'funcionario': return Briefcase;
      case 'produto': return ShoppingCart;
      case 'venda': return DollarSign;
      case 'obra': return Building2;
      case 'os': return Wrench;
      case 'transacao': return FileText;
      default: return Search;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cliente': return 'Cliente';
      case 'funcionario': return 'Funcionário';
      case 'produto': return 'Produto';
      case 'venda': return 'Venda';
      case 'obra': return 'Obra';
      case 'os': return 'OS';
      case 'transacao': return 'Transação';
      default: return 'Outro';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em todo o sistema..."
            className="flex-1 bg-transparent outline-none text-sm"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Digite pelo menos 2 caracteres para buscar
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum resultado encontrado para "{query}"
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((result) => {
                const Icon = result.icon;
                return (
                  <a
                    key={result.id}
                    href={result.url}
                    onClick={onClose}
                    className="flex items-center gap-3 p-4 hover:bg-muted transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{result.title}</div>
                      <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {getTypeLabel(result.type)}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Pressione <kbd className="px-1.5 py-0.5 bg-card border border-border rounded">ESC</kbd> para fechar</span>
            <span>Use setas para navegar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
