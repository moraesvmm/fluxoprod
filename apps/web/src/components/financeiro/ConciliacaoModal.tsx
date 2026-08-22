"use client";

import { useState } from "react";
import { 
  X, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Loader2,
  FileText
} from "lucide-react";
import { parseOfx, OfxTransaction } from "@/lib/utils/ofx-parser";
import { Financeiro } from "@/lib/api";
import { createClient } from "@/utils/supabase/client";

interface ConciliacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTransactions: Financeiro[];
}

export function ConciliacaoModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  existingTransactions 
}: ConciliacaoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bankTransactions, setBankTransactions] = useState<OfxTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Record<string, string>>({}); // bankTxId -> financeiroId
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseOfx(content);
      setBankTransactions(parsed);
      
      // Auto-match logic
      const autoMatches: Record<string, string> = {};
      parsed.forEach(bt => {
        const match = existingTransactions.find(et => 
          !et.conciliado && 
          Math.abs(et.valor - bt.valor) < 0.01 && 
          (new Date(et.data_vencimento).toDateString() === new Date(bt.data).toDateString())
        );
        if (match) autoMatches[bt.id] = match.id;
      });
      setMatches(autoMatches);
      setLoading(false);
    };
    reader.readAsText(file);
    setFile(file);
  };

  const handleProcess = async () => {
    setProcessing(true);
    const supabase = createClient();

    try {
      for (const bankTxId in matches) {
        const financeiroId = matches[bankTxId];
        const bankTx = bankTransactions.find(t => t.id === bankTxId);

        await supabase
          .from('financeiro')
          .update({
            conciliado: true,
            banco_transacao_id: bankTxId,
            banco_nome: 'Extrato Importado',
            data_conciliacao: new Date().toISOString(),
            status: 'concluido'
          })
          .eq('id', financeiroId);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Conciliação Bancária</h2>
            <p className="text-sm text-muted-foreground">Importe seu extrato OFX e vincule aos lançamentos.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!file ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted p-12">
              <Upload className="mb-4 h-12 w-12 text-slate-300" />
              <p className="mb-2 font-medium text-foreground">Arraste seu arquivo OFX aqui</p>
              <p className="mb-6 text-sm text-muted-foreground">Ou clique para selecionar do seu computador</p>
              <input 
                type="file" 
                accept=".ofx" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="ofx-upload" 
              />
              <label 
                htmlFor="ofx-upload"
                className="cursor-pointer rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
              >
                Selecionar Arquivo
              </label>
            </div>
          ) : loading ? (
            <div className="flex h-full flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Processando extrato...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {bankTransactions.length} transações encontradas no arquivo
                </span>
                <span className="text-sm font-medium text-indigo-600">
                  {Object.keys(matches).length} correspondências sugeridas
                </span>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Extrato Bancário</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 font-medium">Lançamento no Sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bankTransactions.map(bt => (
                      <tr key={bt.id} className="hover:bg-muted">
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{bt.descricao}</span>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{new Date(bt.data).toLocaleDateString()}</span>
                              <span className={bt.tipo === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}>
                                {bt.tipo === 'CREDIT' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bt.valor)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {matches[bt.id] ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="mx-auto h-5 w-5 text-slate-300" />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {matches[bt.id] ? (
                            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-emerald-900">
                                  {existingTransactions.find(t => t.id === matches[bt.id])?.descricao}
                                </span>
                                <span className="text-[10px] text-emerald-700">
                                  Vínculo confirmado
                                </span>
                              </div>
                              <button 
                                onClick={() => {
                                  const newMatches = { ...matches };
                                  delete newMatches[bt.id];
                                  setMatches(newMatches);
                                }}
                                className="text-emerald-600 hover:text-emerald-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <select 
                              className="w-full rounded-lg border-border bg-transparent py-1.5 text-xs focus:ring-primary"
                              onChange={(e) => setMatches({ ...matches, [bt.id]: e.target.value })}
                              value=""
                            >
                              <option value="">Vincular manualmente...</option>
                              {existingTransactions
                                .filter(et => !et.conciliado && !Object.values(matches).includes(et.id))
                                .map(et => (
                                  <option key={et.id} value={et.id}>
                                    {et.descricao} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(et.valor)}
                                  </option>
                                ))
                              }
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t p-6">
          <button 
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button 
            disabled={Object.keys(matches).length === 0 || processing}
            onClick={handleProcess}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirmar Conciliação ({Object.keys(matches).length})
          </button>
        </div>
      </div>
    </div>
  );
}
