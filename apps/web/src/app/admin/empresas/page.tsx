"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Trash2, AlertTriangle, CalendarClock } from "lucide-react";
import { deleteEmpresaComUsuariosAction } from "./actions";

interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  porte: string | null;
  segmento: string | null;
  schema_name: string;
  status: string;
  criado_em: string;
  data_vencimento: string | null;
  subscription_status: string | null;
}

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showTrialModal, setShowTrialModal] = useState<Empresa | null>(null);
  const [trialDays, setTrialDays] = useState<number>(14);
  const [extendingTrial, setExtendingTrial] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("empresas")
        .select("id, cnpj, razao_social, porte, segmento, schema_name, status, criado_em, data_vencimento, subscription_status")
        .order("criado_em", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEmpresas(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (empresaId: string) => {
    try {
      setDeletingId(empresaId);
      const result = await deleteEmpresaComUsuariosAction(empresaId);

      if (result.success) {
        await loadEmpresas();
        setShowConfirm(null);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExtendTrial = async () => {
    if (!showTrialModal) return;
    try {
      setExtendingTrial(true);
      const { data, error } = await supabase.rpc('mestre_prorrogar_trial_empresa', {
        p_empresa_id: showTrialModal.id,
        p_dias_trial: trialDays
      });
      if (error) throw error;
      
      const result = data as any;
      if (result.status === 'success') {
        await loadEmpresas();
        setShowTrialModal(null);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtendingTrial(false);
    }
  };

  const isMaster = (empresa: Empresa) => {
    return empresa.schema_name === 'public' || empresa.cnpj === '00.000.000/0001-00';
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <p className="text-sm text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-bold">Empresas</h1>
        <p className="mt-2 text-sm text-rose-600">Erro ao carregar: {error}</p>
        <button onClick={loadEmpresas} className="mt-4 text-sm text-blue-600 hover:underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
        <p className="text-sm text-slate-600">Cadastro central e schemas provisionados.</p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Razão social</th>
              <th className="px-4 py-3 text-left font-semibold">CNPJ</th>
              <th className="px-4 py-3 text-left font-semibold">Schema</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-4 py-3 font-medium text-slate-900">{e.razao_social}</td>
                <td className="px-4 py-3 text-slate-700">{e.cnpj}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{e.schema_name}</td>
                <td className="px-4 py-3 text-slate-700">{e.status}</td>
                <td className="px-4 py-3">
                  {!isMaster(e) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowTrialModal(e)}
                        className="text-indigo-600 hover:text-indigo-800"
                        title="Prorrogar Trial"
                      >
                        <CalendarClock className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowConfirm(e.id)}
                        disabled={deletingId === e.id}
                        className="text-rose-600 hover:text-rose-800 disabled:opacity-50"
                        title="Excluir Empresa Permanentemente"
                      >
                        {deletingId === e.id ? (
                          <span className="text-xs">Excluindo...</span>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  Nenhuma empresa cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Confirmar Exclusão Definitiva</h2>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Esta ação irá excluir completamente a empresa, <span className="font-bold">deletar todos os seus usuários do sistema de autenticação (Auth)</span>, e excluir o schema do banco de dados. Esta operação é irreversível.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showConfirm)}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prorrogação de Trial */}
      {showTrialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Prorrogar Trial</h2>
            <p className="text-sm text-slate-600 mb-2">Empresa: <span className="font-bold">{showTrialModal.razao_social}</span></p>
            {showTrialModal.subscription_status === 'ACTIVE' && (
              <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded text-sm flex gap-2 items-start border border-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Atenção: Esta empresa possui uma assinatura ativa no Asaas. Estender o trial localmente não cancelará a cobrança agendada.</p>
              </div>
            )}
            <div className="mb-6 mt-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">Novo Período de Trial</label>
              <select 
                value={trialDays} 
                onChange={(e) => setTrialDays(Number(e.target.value))}
                className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={7}>7 Dias (Padrão/Reverter)</option>
                <option value={14}>14 Dias</option>
                <option value={21}>21 Dias</option>
                <option value={9999}>Permanente</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTrialModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExtendTrial}
                disabled={extendingTrial}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {extendingTrial ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

