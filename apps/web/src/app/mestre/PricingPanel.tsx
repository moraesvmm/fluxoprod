"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Tag, History, DollarSign, Package, Percent } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Plano {
  id: string; key: string; nome: string; preco: number;
  preco_promocional: number | null; descricao: string;
  modulos_incluidos: string[]; ordem_exibicao: number;
}

interface ModuloAvulso {
  id: string; key: string; nome: string; preco: number;
  preco_promocional: number | null; descricao: string;
  icone: string; features: string[]; ordem_exibicao: number;
}

interface HistoricoItem {
  id: string; tipo: string; referencia_nome: string;
  preco_anterior: number; preco_novo: number;
  foi_promocional: boolean; alterado_por: string; criado_em: string;
}

export default function PricingPanel() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [modulos, setModulos] = useState<ModuloAvulso[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, { preco: string; promo: string }>>({});
  const [toast, setToast] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [planosRes, modulosRes, histRes] = await Promise.all([
      supabase.rpc("listar_planos_checkout"),
      supabase.rpc("listar_modulos_avulsos_checkout"),
      supabase.rpc("master_listar_historico_precos"),
    ]);
    if (planosRes.data) setPlanos(planosRes.data as Plano[]);
    if (modulosRes.data) setModulos(modulosRes.data as ModuloAvulso[]);
    if (histRes.data) setHistorico(histRes.data as HistoricoItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startEditing = (id: string, preco: number, promo: number | null) => {
    setEditingPrices(p => ({ ...p, [id]: { preco: String(preco), promo: promo ? String(promo) : "" } }));
  };

  const cancelEditing = (id: string) => {
    setEditingPrices(p => { const n = { ...p }; delete n[id]; return n; });
  };

  const savePlano = async (plano: Plano) => {
    const edit = editingPrices[plano.id];
    if (!edit) return;
    const preco = parseFloat(edit.preco);
    const promo = edit.promo ? parseFloat(edit.promo) : null;
    if (isNaN(preco) || preco <= 0) { showToast("Preço inválido"); return; }
    if (promo !== null && (isNaN(promo) || promo <= 0 || promo >= preco)) { showToast("Preço promocional deve ser menor que o preço base"); return; }

    setSaving(plano.id);
    const { data } = await supabase.rpc("master_atualizar_plano", {
      p_id: plano.id, p_preco: preco, p_preco_promocional: promo, p_ativo: true,
    });
    const res = data as { status: string; message: string } | null;
    if (res?.status === "ok") {
      showToast(`✅ ${plano.nome} atualizado`);
      cancelEditing(plano.id);
      fetchData();
    } else {
      showToast(`❌ ${res?.message || "Erro"}`);
    }
    setSaving(null);
  };

  const saveModulo = async (mod: ModuloAvulso) => {
    const edit = editingPrices[mod.id];
    if (!edit) return;
    const preco = parseFloat(edit.preco);
    const promo = edit.promo ? parseFloat(edit.promo) : null;
    if (isNaN(preco) || preco <= 0) { showToast("Preço inválido"); return; }
    if (promo !== null && (isNaN(promo) || promo <= 0 || promo >= preco)) { showToast("Preço promocional deve ser menor que o preço base"); return; }

    setSaving(mod.id);
    const { data } = await supabase.rpc("master_atualizar_modulo_avulso", {
      p_id: mod.id, p_preco: preco, p_preco_promocional: promo, p_ativo: true,
    });
    const res = data as { status: string; message: string } | null;
    if (res?.status === "ok") {
      showToast(`✅ ${mod.nome} atualizado`);
      cancelEditing(mod.id);
      fetchData();
    } else {
      showToast(`❌ ${res?.message || "Erro"}`);
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const inputCls = "w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none";

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fixed top-4 right-4 z-50 bg-[#1e1e24] border border-white/10 text-white text-sm px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </motion.div>
      )}

      {/* PLANOS */}
      <div>
        <div className="flex items-center gap-2 mb-4 text-indigo-400 border-b border-white/10 pb-3">
          <DollarSign className="w-5 h-5" />
          <h2 className="text-lg font-semibold text-white">Planos</h2>
        </div>
        <div className="grid gap-4">
          {planos.map(p => {
            const isEditing = !!editingPrices[p.id];
            const edit = editingPrices[p.id];
            return (
              <div key={p.id} className="bg-[#121216] border border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-base">{p.nome}</h3>
                    <p className="text-muted-foreground text-xs">{p.descricao}</p>
                  </div>
                  {p.preco_promocional && !isEditing && (
                    <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full">
                      <Percent className="w-3 h-3" /> Promo Ativa
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Preço Base (R$)</label>
                        <input className={inputCls} value={edit.preco} onChange={e => setEditingPrices(prev => ({ ...prev, [p.id]: { ...prev[p.id], preco: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Preço Promocional (R$)</label>
                        <input className={inputCls} value={edit.promo} placeholder="Vazio = sem promoção" onChange={e => setEditingPrices(prev => ({ ...prev, [p.id]: { ...prev[p.id], promo: e.target.value } }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => cancelEditing(p.id)} className="px-4 py-2 text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg transition-colors">Cancelar</button>
                      <button onClick={() => savePlano(p)} disabled={saving === p.id} className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
                        {saving === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      {p.preco_promocional ? (
                        <>
                          <span className="text-muted-foreground line-through text-sm">R$ {p.preco.toFixed(2)}</span>
                          <span className="text-2xl font-black text-emerald-400">R$ {p.preco_promocional.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-black text-white">R$ {p.preco.toFixed(2)}</span>
                      )}
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                    <button onClick={() => startEditing(p.id, p.preco, p.preco_promocional)} className="px-4 py-2 text-xs border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500/50 rounded-lg transition-all">
                      Editar Preço
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MÓDULOS AVULSOS */}
      <div>
        <div className="flex items-center gap-2 mb-4 text-purple-400 border-b border-white/10 pb-3">
          <Package className="w-5 h-5" />
          <h2 className="text-lg font-semibold text-white">Módulos Avulsos</h2>
        </div>
        <div className="grid gap-3">
          {modulos.map(m => {
            const isEditing = !!editingPrices[m.id];
            const edit = editingPrices[m.id];
            return (
              <div key={m.id} className="bg-[#121216] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl w-10 text-center">{m.icone}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">{m.nome}</h3>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input className={inputCls} value={edit.preco} placeholder="Preço" onChange={e => setEditingPrices(prev => ({ ...prev, [m.id]: { ...prev[m.id], preco: e.target.value } }))} />
                      <input className={inputCls} value={edit.promo} placeholder="Promo (vazio=sem)" onChange={e => setEditingPrices(prev => ({ ...prev, [m.id]: { ...prev[m.id], promo: e.target.value } }))} />
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      {m.preco_promocional ? (
                        <>
                          <span className="text-muted-foreground line-through text-xs">R$ {m.preco.toFixed(2)}</span>
                          <span className="text-emerald-400 font-bold text-sm">R$ {m.preco_promocional.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium">R$ {m.preco.toFixed(2)}/mês</span>
                      )}
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => cancelEditing(m.id)} className="p-2 text-gray-400 hover:text-white border border-white/10 rounded-lg text-xs">✕</button>
                    <button onClick={() => saveModulo(m)} disabled={saving === m.id} className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs disabled:opacity-50">
                      {saving === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => startEditing(m.id, m.preco, m.preco_promocional)} className="px-3 py-1.5 text-xs border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/50 rounded-lg transition-all shrink-0">
                    Editar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* HISTÓRICO */}
      <div>
        <div className="flex items-center gap-2 mb-4 text-amber-400 border-b border-white/10 pb-3">
          <History className="w-5 h-5" />
          <h2 className="text-lg font-semibold text-white">Histórico de Alterações</h2>
        </div>
        {historico.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">Nenhuma alteração registrada ainda.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {historico.map(h => (
              <div key={h.id} className="bg-[#121216] border border-white/5 rounded-lg p-3 flex items-center justify-between text-xs">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mr-2 ${h.tipo === "plano" ? "bg-indigo-500/20 text-indigo-300" : "bg-purple-500/20 text-purple-300"}`}>
                    {h.tipo === "plano" ? "Plano" : "Módulo"}
                  </span>
                  <span className="text-white font-medium">{h.referencia_nome}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <span>R$ {Number(h.preco_anterior).toFixed(2)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-400 font-semibold">R$ {Number(h.preco_novo).toFixed(2)}</span>
                  <span className="text-muted-foreground hidden sm:inline">{new Date(h.criado_em).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
