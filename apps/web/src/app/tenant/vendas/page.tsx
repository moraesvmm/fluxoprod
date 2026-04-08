"use client";

import { useState, useEffect } from "react";
import { KPICard } from "@/components/modules/base/KPICard";
import { StatusBadge } from "@/components/modules/base/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Banknote, ShoppingBag, BarChart, CreditCard, Plus, Search, FileText, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { apiClient, Venda } from "@/lib/api";

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarVendas();
  }, []);

  const carregarVendas = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getVendas();
      setVendas(data);
    } catch (err) {
      console.error("Erro ao carregar vendas:", err);
      setError("Erro ao carregar vendas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    // TODO: Implementar modal de edição
    console.log("Editar transação:", id);
    // Por enquanto, apenas log - implementar modal depois
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta transação?")) {
      try {
        await apiClient.deleteVenda(id);
        // Atualizar lista removendo o item deletado
        setVendas(vendas.filter(v => v.id !== id));
      } catch (err) {
        console.error("Erro ao excluir venda:", err);
        alert("Erro ao excluir venda. Tente novamente.");
      }
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico de Vendas</h2>
          <p className="text-muted-foreground">Listagem de todas as transações e emissão de notas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tenant/vendas/pdv"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda (PDV)
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Vendas (Hoje)" value="R$ 5.750,00" icon={Banknote} trend={{ value: 8, label: "vs ont", isPositive: true }} />
        <KPICard title="Transações" value="12" icon={ShoppingBag} trend={{ value: 2, label: "vs ont", isPositive: false }} />
        <KPICard title="Ticket Médio" value="R$ 479,16" icon={BarChart} trend={{ value: 5, label: "vs ont", isPositive: true }} />
        <KPICard title="Método Favorito" value="PIX (65%)" icon={CreditCard} />
      </div>

      <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar recibo, cliente ou data..."
              className="w-full bg-white border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-md bg-white">
            Filtrar
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transação</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="text-slate-500">Carregando vendas...</div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="text-red-500">{error}</div>
                  <button 
                    onClick={carregarVendas}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Tentar novamente
                  </button>
                </TableCell>
              </TableRow>
            ) : vendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="text-slate-500">Nenhuma venda encontrada</div>
                </TableCell>
              </TableRow>
            ) : (
              vendas.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id.substring(0, 8)}...</TableCell>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatarData(item.criado_em)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.metodo}</TableCell>
                  <TableCell className="font-medium text-slate-900">{formatarValor(item.valor)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status as any} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1" 
                        title="Editar transação"
                        onClick={() => handleEdit(item.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        className="text-slate-400 hover:text-red-600 transition-colors p-1" 
                        title="Excluir transação"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="text-slate-400 hover:text-primary transition-colors p-1" title="Gerar Recibo PDF">
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
