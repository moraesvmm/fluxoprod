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
import { DollarSign, Plus, Search, Percent, Calculator, Calendar, Wallet, Trash2, Edit, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast, Toast } from "@/components/ui/toast";

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
}

interface RegraComissao {
  id: string;
  funcionario_id: string;
  funcionario_nome?: string;
  tipo_calculo: string; // 'percentual' | 'valor_fixo'
  valor: number;
  ativo: boolean;
  criado_em: string;
}

interface Comissao {
  id: string;
  funcionario_id: string;
  funcionario_nome?: string;
  venda_id: string;
  valor_venda: number;
  valor_comissao: number;
  status: string; // 'pendente' | 'pago' | 'cancelado'
  periodo?: string;
  criado_em: string;
}

export default function ComissoesPage() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"regras" | "historico">("regras");
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [regras, setRegras] = useState<RegraComissao[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteRegraId, setDeleteRegraId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    funcionario_id: "",
    tipo_calculo: "percentual",
    valor: "",
  });
  const { toasts, removeToast, success, error: toastError } = useToast();
  const supabase = createClient();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar funcionários
      const { data: funcs } = await supabase
        .from("funcionarios")
        .select("id, nome, cargo")
        .order("nome");
      setFuncionarios(funcs || []);

      // Carregar regras de comissão
      const { data: regrasData } = await supabase
        .from("comissoes_regras")
        .select("*")
        .order("criado_em", { ascending: false });

      // Enriquecer com nomes de funcionários
      const regrasEnriquecidas = (regrasData || []).map(r => ({
        ...r,
        funcionario_nome: (funcs || []).find(f => f.id === r.funcionario_id)?.nome || "Desconhecido",
      }));
      setRegras(regrasEnriquecidas);

      // Carregar histórico de comissões
      const { data: comissoesData } = await supabase
        .from("comissoes")
        .select("*")
        .order("criado_em", { ascending: false });

      const comissoesEnriquecidas = (comissoesData || []).map(c => ({
        ...c,
        funcionario_nome: (funcs || []).find(f => f.id === c.funcionario_id)?.nome || "Desconhecido",
      }));
      setComissoes(comissoesEnriquecidas);
    } catch {
      // Tabelas podem não existir ainda — graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const criarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.funcionario_id || !formData.valor) return;

    try {
      const { error } = await supabase.from("comissoes_regras").insert({
        funcionario_id: formData.funcionario_id,
        tipo_calculo: formData.tipo_calculo,
        valor: parseFloat(formData.valor),
        ativo: true,
      });

      if (error) throw error;

      setFormData({ funcionario_id: "", tipo_calculo: "percentual", valor: "" });
      setShowModal(false);
      await carregarDados();
      success("Regra de comissão criada com sucesso!");
    } catch (err: any) {
      toastError("Erro ao criar regra: " + (err.message || "Tente novamente."));
    }
  };

  const excluirRegra = async () => {
    if (!deleteRegraId) return;
    try {
      const { error } = await supabase.from("comissoes_regras").delete().eq("id", deleteRegraId);
      if (error) throw error;
      setRegras(regras.filter(r => r.id !== deleteRegraId));
      success("Regra excluída com sucesso!");
    } catch (err: any) {
      toastError("Erro ao excluir regra: " + (err.message || "Tente novamente."));
    } finally {
      setDeleteRegraId(null);
    }
  };

  const marcarComoPago = async (comissaoId: string) => {
    try {
      const { error } = await supabase
        .from("comissoes")
        .update({ status: "pago" })
        .eq("id", comissaoId);
      if (error) throw error;
      setComissoes(comissoes.map(c => c.id === comissaoId ? { ...c, status: "pago" } : c));
      success("Comissão marcada como paga!");
    } catch (err: any) {
      toastError("Erro ao atualizar comissão: " + (err.message || "Tente novamente."));
    }
  };

  const formatarMoeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const formatarData = (d: string) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  // KPIs
  const totalAPagar = comissoes.filter(c => c.status === "pendente").reduce((s, c) => s + (c.valor_comissao || 0), 0);
  const pagoNoMes = comissoes.filter(c => c.status === "pago").reduce((s, c) => s + (c.valor_comissao || 0), 0);
  const funcComComissao = new Set(comissoes.map(c => c.funcionario_id)).size;
  const mediaPorColaborador = funcComComissao > 0
    ? comissoes.reduce((s, c) => s + (c.valor_comissao || 0), 0) / funcComComissao
    : 0;

  return (
    <div className="space-y-8">
      {/* Toasts */}
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteRegraId}
        onConfirm={excluirRegra}
        onCancel={() => setDeleteRegraId(null)}
        title="Excluir regra"
        message="Tem certeza que deseja excluir esta regra de comissão?"
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comissões</h2>
          <p className="text-muted-foreground">Regras de comissão e cálculo automático por colaborador.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard title="Total a Pagar" value={formatarMoeda(totalAPagar)} icon={Wallet} className="border-amber-200 bg-amber-50/10" />
        <KPICard title="Pago no Mês" value={formatarMoeda(pagoNoMes)} icon={DollarSign} className="border-emerald-200 bg-emerald-50/10" />
        <KPICard title="Média por Colaborador" value={formatarMoeda(mediaPorColaborador)} icon={Calculator} />
        <KPICard title="Colaboradores Ativos" value={String(funcComComissao)} icon={Percent} />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab("regras")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "regras" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Regras de Comissão ({regras.length})
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "historico" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Histórico de Pagamentos ({comissoes.length})
          </button>
        </nav>
      </div>

      {/* Tab: Regras */}
      {activeTab === "regras" && (
        <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-slate-500">Carregando regras...</div>
                  </TableCell>
                </TableRow>
              ) : regras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Percent className="h-10 w-10 text-slate-200" />
                      <p className="text-slate-500 text-sm">Nenhuma regra de comissão cadastrada</p>
                      <p className="text-slate-400 text-xs">Clique em &quot;Nova Regra&quot; para configurar comissões.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                regras.map((regra) => (
                  <TableRow key={regra.id}>
                    <TableCell className="font-medium">{regra.funcionario_nome}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        {regra.tipo_calculo === "percentual" ? "Percentual" : "Valor Fixo"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {regra.tipo_calculo === "percentual" ? `${regra.valor}%` : formatarMoeda(regra.valor)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={regra.ativo ? "success" : "warning"} label={regra.ativo ? "Ativo" : "Inativo"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setDeleteRegraId(regra.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === "historico" && (
        <div className="flex-1 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Valor da Venda</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-slate-500">Carregando comissões...</div>
                  </TableCell>
                </TableRow>
              ) : comissoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="h-10 w-10 text-slate-200" />
                      <p className="text-slate-500 text-sm">Nenhuma comissão registrada</p>
                      <p className="text-slate-400 text-xs">As comissões serão calculadas automaticamente ao concluir vendas com vendedor.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                comissoes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.funcionario_nome}</TableCell>
                    <TableCell className="text-sm font-mono text-slate-500">{c.venda_id.substring(0, 8)}...</TableCell>
                    <TableCell>{formatarMoeda(c.valor_venda)}</TableCell>
                    <TableCell className="font-medium text-emerald-700">{formatarMoeda(c.valor_comissao)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatarData(c.criado_em)}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status as any} />
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "pendente" && (
                        <button
                          onClick={() => marcarComoPago(c.id)}
                          className="text-slate-400 hover:text-emerald-600 p-1 transition-colors"
                          title="Marcar como Pago"
                        >
                          <Check className="h-4 w-4" />
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

      {/* Modal de Nova Regra */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Regra de Comissão"
      >
        <form onSubmit={criarRegra} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador *</label>
            <select
              value={formData.funcionario_id}
              onChange={(e) => setFormData({ ...formData, funcionario_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Selecione um colaborador...</option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>
              ))}
            </select>
            {funcionarios.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Cadastre colaboradores no módulo RH primeiro.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cálculo</label>
            <select
              value={formData.tipo_calculo}
              onChange={(e) => setFormData({ ...formData, tipo_calculo: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="percentual">Percentual (%)</option>
              <option value="valor_fixo">Valor Fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {formData.tipo_calculo === "percentual" ? "Percentual (%)" : "Valor Fixo (R$)"} *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={formData.tipo_calculo === "percentual" ? "Ex: 10" : "Ex: 50.00"}
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Criar Regra
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
