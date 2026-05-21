"use client";

import { useState, useEffect } from "react";
import { listarCuponsAdmin, criarCupomAdmin, excluirCupomAdmin, type Cupom } from "@/lib/api";
import { Plus, Trash2, Ticket, Percent, DollarSign, Calendar, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AdminCuponsPage() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    tipo: "percentual" as "percentual" | "fixo",
    valor: "",
    limite_usos: "",
    data_expiracao: ""
  });

  const carregarCupons = async () => {
    setIsLoading(true);
    try {
      const data = await listarCuponsAdmin();
      setCupons(data);
    } catch (err) {
      console.error("Erro ao carregar cupons:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarCupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await criarCupomAdmin({
        codigo: formData.codigo,
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        limite_usos: formData.limite_usos ? parseInt(formData.limite_usos) : undefined,
        data_expiracao: formData.data_expiracao || undefined
      });
      setShowModal(false);
      setFormData({ codigo: "", tipo: "percentual", valor: "", limite_usos: "", data_expiracao: "" });
      carregarCupons();
    } catch (err) {
      alert("Erro ao criar cupom. Verifique os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Deseja desativar este cupom?")) return;
    try {
      await excluirCupomAdmin(id);
      carregarCupons();
    } catch (err) {
      alert("Erro ao desativar cupom.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Cupons</h1>
          <p className="text-sm text-muted-foreground">
            Crie códigos promocionais para novos assinantes do Fluxo ERP.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo Cupom
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold text-foreground">Código</th>
                <th className="px-6 py-3 font-semibold text-foreground">Tipo</th>
                <th className="px-6 py-3 font-semibold text-foreground">Valor</th>
                <th className="px-6 py-3 font-semibold text-foreground">Usos</th>
                <th className="px-6 py-3 font-semibold text-foreground">Expiração</th>
                <th className="px-6 py-3 font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 font-semibold text-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum cupom cadastrado.
                  </td>
                </tr>
              ) : (
                cupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600">{c.codigo}</td>
                    <td className="px-6 py-4">
                      {c.tipo === "percentual" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                          <Percent className="h-3 w-3" /> Percentual
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                          <DollarSign className="h-3 w-3" /> Fixo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {c.tipo === "percentual" ? `${c.valor}%` : `R$ ${c.valor}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-muted-foreground">
                        {c.usos_atuais} / {c.limite_usos || "∞"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.data_expiracao ? new Date(c.data_expiracao).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {c.ativo ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="h-4 w-4" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <XCircle className="h-4 w-4" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.ativo && (
                        <button
                          onClick={() => handleExcluir(c.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Desativar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Criação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-indigo-500" />
              Criar Novo Cupom
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Código</label>
                <input
                  required
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase font-mono"
                  placeholder="EX: BEMVINDO10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder={formData.tipo === "percentual" ? "10" : "50.00"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Limite Usos</label>
                  <input
                    type="number"
                    value={formData.limite_usos}
                    onChange={(e) => setFormData({ ...formData, limite_usos: e.target.value })}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Livre"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Expiração
                  </label>
                  <input
                    type="date"
                    value={formData.data_expiracao}
                    onChange={(e) => setFormData({ ...formData, data_expiracao: e.target.value })}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Criar Cupom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
