"use client";

import { useMemo, useState } from "react";
import { Calculator, DollarSign, Percent, Plus, Wallet } from "lucide-react";

import { KPICard } from "@/components/modules/base/KPICard";
import { Toast, useToast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useComissoes,
  useCreateRegraComissao,
  useDeleteRegraComissao,
  useRegrasComissao,
  useUpdateComissao,
} from "@/lib/hooks/use-comissoes";
import { useFuncionarios } from "@/lib/hooks/use-funcionarios";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarData(data?: string) {
  return data ? new Date(data).toLocaleDateString("pt-BR") : "—";
}

export default function ComissoesPage() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"regras" | "historico">("regras");
  const [deleteRegraId, setDeleteRegraId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    colaborador_id: "",
    tipo_calculo: "percentual",
    valor: "",
  });

  const { data: funcionarios = [] } = useFuncionarios();
  const { data: regras = [], isLoading: loadingRegras } = useRegrasComissao();
  const { data: comissoes = [], isLoading: loadingComissoes } = useComissoes();
  const createRegra = useCreateRegraComissao();
  const deleteRegra = useDeleteRegraComissao();
  const updateComissao = useUpdateComissao();
  const { toasts, removeToast, success, error: toastError } = useToast();

  const funcionarioPorId = useMemo(
    () => new Map(funcionarios.map((funcionario) => [funcionario.id, funcionario.nome])),
    [funcionarios]
  );

  const totalAPagar = comissoes
    .filter((item) => item.status_pagamento === "pendente")
    .reduce((sum, item) => sum + (item.valor_comissao || 0), 0);
  const pagoNoMes = comissoes
    .filter((item) => item.status_pagamento === "pago")
    .reduce((sum, item) => sum + (item.valor_comissao || 0), 0);
  const colaboradoresComComissao = new Set(comissoes.map((item) => item.colaborador_id)).size;
  const mediaPorColaborador =
    colaboradoresComComissao > 0
      ? comissoes.reduce((sum, item) => sum + (item.valor_comissao || 0), 0) /
        colaboradoresComComissao
      : 0;

  const criarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.colaborador_id || !formData.valor) return;

    try {
      await createRegra.mutateAsync({
        colaborador_id: formData.colaborador_id,
        tipo_calculo: formData.tipo_calculo,
        valor: Number(formData.valor),
        ativo: true,
      });
      setFormData({ colaborador_id: "", tipo_calculo: "percentual", valor: "" });
      setShowModal(false);
      success("Regra de comissão criada com sucesso!");
    } catch (err: any) {
      toastError("Erro ao criar regra: " + (err.message || "Tente novamente."));
    }
  };

  const confirmarExclusaoRegra = async () => {
    if (!deleteRegraId) return;

    try {
      await deleteRegra.mutateAsync(deleteRegraId);
      success("Regra excluída com sucesso!");
    } catch (err: any) {
      toastError("Erro ao excluir regra: " + (err.message || "Tente novamente."));
    } finally {
      setDeleteRegraId(null);
    }
  };

  const marcarComoPago = async (comissaoId: string) => {
    try {
      await updateComissao.mutateAsync({
        id: comissaoId,
        comissao: {
          status_pagamento: "pago",
          data_pagamento: new Date().toISOString(),
        },
      });
      success("Comissão marcada como paga!");
    } catch (err: any) {
      toastError("Erro ao atualizar comissão: " + (err.message || "Tente novamente."));
    }
  };

  return (
    <div className="space-y-8">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <ConfirmModal
        isOpen={!!deleteRegraId}
        onConfirm={confirmarExclusaoRegra}
        onCancel={() => setDeleteRegraId(null)}
        title="Excluir regra"
        message="Tem certeza que deseja excluir esta regra de comissão?"
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comissões</h2>
          <p className="text-muted-foreground">
            Regras de comissão e histórico de pagamentos via camada RPC.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Total a Pagar" value={formatarMoeda(totalAPagar)} icon={Wallet} />
        <KPICard title="Pago no Mês" value={formatarMoeda(pagoNoMes)} icon={DollarSign} />
        <KPICard
          title="Média por Colaborador"
          value={formatarMoeda(mediaPorColaborador)}
          icon={Calculator}
        />
        <KPICard
          title="Colaboradores Ativos"
          value={String(colaboradoresComComissao)}
          icon={Percent}
        />
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("regras")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "regras"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Regras de Comissão ({regras.length})
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "historico"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Histórico de Pagamentos ({comissoes.length})
          </button>
        </nav>
      </div>

      {activeTab === "regras" && (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo de Cálculo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRegras ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    Carregando regras...
                  </TableCell>
                </TableRow>
              ) : regras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    Nenhuma regra cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                regras.map((regra) => (
                  <TableRow key={regra.id}>
                    <TableCell>{funcionarioPorId.get(regra.colaborador_id) || "Desconhecido"}</TableCell>
                    <TableCell>
                      {regra.tipo_calculo === "percentual" ? "Percentual" : "Valor Fixo"}
                    </TableCell>
                    <TableCell>
                      {regra.tipo_calculo === "percentual"
                        ? `${regra.valor}%`
                        : formatarMoeda(regra.valor)}
                    </TableCell>
                    <TableCell>{regra.ativo ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setDeleteRegraId(regra.id)}
                        className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
                      >
                        Excluir
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "historico" && (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Valor Venda</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingComissoes ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    Carregando comissões...
                  </TableCell>
                </TableRow>
              ) : comissoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    Nenhuma comissão encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                comissoes.map((comissao) => (
                  <TableRow key={comissao.id}>
                    <TableCell>
                      {funcionarioPorId.get(comissao.colaborador_id) || comissao.colaborador_id}
                    </TableCell>
                    <TableCell>
                      {comissao.venda_id ? `${comissao.venda_id.slice(0, 8)}...` : "—"}
                    </TableCell>
                    <TableCell>{formatarMoeda(comissao.valor_venda || 0)}</TableCell>
                    <TableCell>{formatarMoeda(comissao.valor_comissao || 0)}</TableCell>
                    <TableCell>{comissao.status_pagamento || "—"}</TableCell>
                    <TableCell>{formatarData(comissao.data_pagamento || comissao.criado_em)}</TableCell>
                    <TableCell className="text-right">
                      {comissao.status_pagamento !== "pago" && (
                        <button
                          onClick={() => marcarComoPago(comissao.id)}
                          className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
                        >
                          Marcar como pago
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Regra de Comissão">
        <form onSubmit={criarRegra} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Colaborador</label>
            <select
              value={formData.colaborador_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, colaborador_id: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            >
              <option value="">Selecione</option>
              {funcionarios.map((funcionario) => (
                <option key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de Cálculo</label>
            <select
              value={formData.tipo_calculo}
              onChange={(e) => setFormData((prev) => ({ ...prev, tipo_calculo: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="percentual">Percentual</option>
              <option value="valor_fixo">Valor Fixo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Valor</label>
            <input
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData((prev) => ({ ...prev, valor: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createRegra.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {createRegra.isPending ? "Criando..." : "Criar Regra"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
