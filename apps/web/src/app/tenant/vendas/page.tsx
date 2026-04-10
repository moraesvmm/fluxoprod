"use client";

import { useState } from "react";
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
import { useVendas, useDeleteVenda } from "@/lib/hooks/use-vendas";
import { useToast, Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function VendasPage() {
  const { data: vendas = [], isLoading: loading, error: queryError } = useVendas();
  const deleteMutation = useDeleteVenda();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toasts, removeToast, success, error: toastError } = useToast();

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      success("Venda excluída com sucesso!");
    } catch {
      toastError("Erro ao excluir venda. Tente novamente.");
    } finally {
      setDeleteId(null);
    }
  };

  const formatarValor = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const formatarData = (dataString: string) =>
    new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const totalVendas = vendas.reduce((sum, v) => sum + v.valor, 0);
  const totalTransacoes = vendas.length;
  const ticketMedio = totalTransacoes > 0 ? totalVendas / totalTransacoes : 0;

  const error = queryError ? "Erro ao carregar vendas. Tente novamente." : null;

  return (
    <div className="space-y-8">
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      <ConfirmModal
        isOpen={!!deleteId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        title="Excluir venda"
        message="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

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
        <KPICard title="Vendas (Total)" value={formatarValor(totalVendas)} icon={Banknote} />
        <KPICard title="Transações" value={String(totalTransacoes)} icon={ShoppingBag} />
        <KPICard title="Ticket Médio" value={formatarValor(ticketMedio)} icon={BarChart} />
        <KPICard title="Método Favorito" value="-" icon={CreditCard} />
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
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
                    Carregando vendas...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="text-red-500">{error}</div>
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
                      <button className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Editar transação">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Excluir transação"
                        onClick={() => setDeleteId(item.id)}
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
