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
import { Banknote, ShoppingBag, BarChart, CreditCard, Plus, Search, FileText, Edit, Trash2, RotateCcw, Ban, Printer } from "lucide-react";
import { FloatingCalculator } from "@/components/modules/base/Calculator";
import Link from "next/link";
import { useVendas, useDeleteVenda, useCancelVenda } from "@/lib/hooks/use-vendas";
import { useToast, Toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FiscalGuide } from "@/components/modules/fiscal/FiscalGuide";
import { TutorialHelpButton } from "@/components/onboarding/TutorialHelpButton";
import { type Venda } from "@/lib/api";

export default function VendasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: vendas = [], isLoading: loading, error: queryError } = useVendas(searchTerm);
  const deleteMutation = useDeleteVenda();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const { toasts, removeToast, success, error: toastError } = useToast();
  const cancelMutation = useCancelVenda();
  const [cancelId, setCancelId] = useState<string | null>(null);

  const imprimirRecibo = (venda: Venda) => {
    const conteudo = `
      FLUXO ERP - RECIBO DE VENDA
      ---------------------------
      ID: ${venda.id}
      Data: ${formatarData(venda.criado_em)}
      Cliente: ${venda.cliente}
      Valor: ${formatarValor(venda.valor)}
      Método: ${venda.metodo}
      ---------------------------
      Obrigado pela preferência!
    `;
    const win = window.open('', 'PRINT', 'height=600,width=400');
    if (win) {
      win.document.write(`
        <html>
          <head><title>Recibo - ${venda.id.substring(0,8)}</title></head>
          <body style="font-family: monospace; padding: 20px;">
            <pre style="white-space: pre-wrap;">${conteudo}</pre>
            <script>window.print(); setTimeout(() => window.close(), 500);</script>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    try {
      await cancelMutation.mutateAsync(cancelId);
      success("Venda cancelada com sucesso!");
    } catch {
      toastError("Erro ao cancelar venda. Tente novamente.");
    } finally {
      setCancelId(null);
    }
  };

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
        isOpen={!!cancelId}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
        title="Cancelar venda"
        message="Tem certeza que deseja cancelar esta venda? O estoque será devolvido automaticamente."
        confirmText="Confirmar Cancelamento"
        cancelText="Voltar"
        variant="danger"
      />

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
            data-tour="vendas-novo"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda (PDV)
          </Link>
          <TutorialHelpButton moduleKey="vendas" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Vendas (Total)" value={formatarValor(totalVendas)} icon={Banknote} />
        <KPICard title="Transações" value={String(totalTransacoes)} icon={ShoppingBag} />
        <KPICard title="Ticket Médio" value={formatarValor(ticketMedio)} icon={BarChart} />
        <KPICard title="Método Favorito" value="-" icon={CreditCard} />
      </div>

      <div data-tour="vendas-historico" className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar recibo ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="text-sm font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-md bg-card">
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
              <TableHead data-tour="vendas-nfe">NFe</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
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
                  <div className="text-muted-foreground">Nenhuma venda encontrada</div>
                </TableCell>
              </TableRow>
            ) : (
              vendas.map((item) => (
                <TableRow key={item.id} className={item.status === 'cancelado' ? 'opacity-50 grayscale' : ''}>
                  <TableCell className="font-medium">{item.id.substring(0, 8)}...</TableCell>
                  <TableCell className={item.status === 'cancelado' ? 'line-through' : ''}>{item.cliente}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatarData(item.criado_em)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.metodo}</TableCell>
                  <TableCell className={`font-medium ${item.status === 'cancelado' ? 'text-slate-400 line-through' : 'text-foreground'}`}>
                    {formatarValor(item.valor)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status === 'concluido' ? 'success' : item.status === 'cancelado' ? 'error' : 'warning'} label={item.status} className="capitalize" />
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      item.nfe_status === 'emitida' ? 'bg-green-100 text-green-700' :
                      item.nfe_status === 'erro' ? 'bg-red-100 text-red-700' :
                      item.nfe_status === 'pendente' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {item.nfe_status?.replace('_', ' ') || 'Não Emitida'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Ações de NFe */}
                      {item.nfe_status === 'emitida' ? (
                        <>
                          <button 
                            className="text-green-600 hover:text-green-800 transition-colors p-1" 
                            title="Download XML NFe"
                            onClick={() => {
                              window.open(`/api/fiscal/nfe/${item.id}/xml`, '_blank');
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <Link 
                            href={`/tenant/vendas/nfe/${item.id}/danfe`}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1" 
                            title="Visualizar DANFE"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </>
                      ) : item.status !== 'cancelado' && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/fiscal/nfe/emitir', {
                                method: 'POST',
                                body: JSON.stringify({ vendaId: item.id }),
                                headers: { 'Content-Type': 'application/json' }
                              });
                              const data = await res.json();
                              if (data.success) {
                                success("NFe emitida com sucesso!");
                                // Recarregar dados
                                window.location.reload();
                              } else {
                                toastError("Erro na emissão: " + data.error);
                              }
                            } catch (err) {
                              toastError("Falha ao comunicar com o servidor.");
                            }
                          }}
                          className="text-amber-500 hover:text-amber-700 transition-colors p-1" 
                          title="Emitir NFe Manual"
                        >
                          <Banknote className="h-4 w-4" />
                        </button>
                      )}

                      {item.status !== 'cancelado' && (
                        <button 
                          onClick={() => setCancelId(item.id)}
                          className="text-slate-400 hover:text-amber-600 transition-colors p-1" 
                          title="Cancelar venda"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Visualizar Detalhes">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Excluir transação"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button 
                        className="text-slate-400 hover:text-primary transition-colors p-1" 
                        title="Gerar Recibo PDF"
                        onClick={() => imprimirRecibo(item)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Calculadora Flutuante */}
      <FloatingCalculator isOpen={showCalculator} onToggle={() => setShowCalculator(!showCalculator)} />
      <FiscalGuide />
    </div>
  );
}
