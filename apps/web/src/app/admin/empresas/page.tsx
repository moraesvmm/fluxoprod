"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Trash2, AlertTriangle } from "lucide-react";

interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  porte: string | null;
  segmento: string | null;
  schema_name: string;
  status: string;
  criado_em: string;
}

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("empresas")
        .select("id, cnpj, razao_social, porte, segmento, schema_name, status, criado_em")
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
      const { data, error } = await supabase.rpc('deletar_empresa_master', {
        p_empresa_id: empresaId,
        p_confirmacao_exclusao: true
      });

      if (error) throw error;

      const result = data as { status: string; message: string };
      if (result.status === 'success') {
        await loadEmpresas();
        setShowConfirm(null);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
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
                    <button
                      onClick={() => setShowConfirm(e.id)}
                      disabled={deletingId === e.id}
                      className="text-rose-600 hover:text-rose-800 disabled:opacity-50"
                    >
                      {deletingId === e.id ? (
                        <span className="text-xs">Excluindo...</span>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
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
              <h2 className="text-lg font-semibold">Confirmar Exclusão</h2>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Esta ação irá excluir completamente a empresa e todos os seus dados, incluindo o schema do banco de dados. Esta operação é irreversível.
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
    </div>
  );
}

