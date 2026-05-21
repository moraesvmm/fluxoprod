"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { useImportClientes } from "@/lib/hooks/use-clientes";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import type { ClienteCreate } from "@/lib/api";

interface ImportadorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ImportadorClientesExcel({ isOpen, onClose, onSuccess }: ImportadorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ClienteCreate[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();
  const importMutation = useImportClientes();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        if (typeof bstr !== "string") return;

        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        
        const mappedData = mapFields(json);
        
        if (mappedData.length === 0) {
          toastError("Nenhum dado válido encontrado. Verifique se a planilha tem uma coluna com 'Nome'.");
          return;
        }

        setData(mappedData);
        setFile(uploadedFile);
        setStep('preview');
      } catch (err) {
        toastError("Erro ao ler o arquivo. Certifique-se de que é um Excel (.xlsx) ou CSV válido.");
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const mapFields = (rawJson: Record<string, unknown>[]): ClienteCreate[] => {
    return rawJson.map(row => {
      const obj: ClienteCreate = { nome: '' };
      
      const rowKeys = Object.keys(row).reduce((acc, k) => {
        acc[k.toLowerCase().trim()] = k;
        return acc;
      }, {} as Record<string, string>);

      Object.entries(row).forEach(([key, value]) => {
        const k = key.toLowerCase().trim();
        const v = String(value || '').trim();
        if (!v) return;

        if (['nome', 'cliente', 'nome completo', 'razao social', 'razão social'].includes(k)) obj.nome = v;
        else if (['email', 'e-mail', 'contato'].includes(k)) obj.email = v;
        else if (['telefone', 'celular', 'whatsapp', 'fone', 'tel'].includes(k)) obj.telefone = v;
        else if (['cpf', 'cnpj', 'documento', 'cpf/cnpj', 'cpf_cnpj'].includes(k)) obj.cpf_cnpj = v;
      });

      const enderecoParts: string[] = [];
      const fieldPatterns = {
        rua: ['rua', 'logradouro', 'endereço', 'endereco', 'address'],
        num: ['numero', 'número', 'nº', 'number'],
        bairro: ['bairro', 'neighborhood'],
        cidade: ['cidade', 'municipio', 'city'],
        estado: ['estado', 'uf', 'state'],
        cep: ['cep', 'zip', 'zipcode']
      };

      const getFieldValue = (patterns: string[]) => {
        const foundKey = Object.keys(rowKeys).find(k => patterns.includes(k));
        return foundKey ? String(row[rowKeys[foundKey]] || '').trim() : '';
      };

      const rua = getFieldValue(fieldPatterns.rua);
      const num = getFieldValue(fieldPatterns.num);
      const bairro = getFieldValue(fieldPatterns.bairro);
      const cidade = getFieldValue(fieldPatterns.cidade);
      const estado = getFieldValue(fieldPatterns.estado);
      const cep = getFieldValue(fieldPatterns.cep);

      if (rua) enderecoParts.push(rua);
      if (num) enderecoParts.push(num);
      if (bairro) enderecoParts.push(bairro);
      if (cidade) enderecoParts.push(cidade);
      if (estado) enderecoParts.push(estado);
      if (cep) enderecoParts.push(`CEP: ${cep}`);

      if (enderecoParts.length > 0) {
        obj.endereco = enderecoParts.join(', ');
      }

      return obj;
    }).filter(p => p.nome);
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setLoading(true);
    
    try {
      const CHUNK_SIZE = 500;
      let totalImported = 0;
      const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const res = await importMutation.mutateAsync(chunk);
        // importMutation.mutateAsync retorna o que importarClientesLote retorna
        // No api.ts importarClientesLote costuma retornar { count: number }
        totalImported += (res as { count?: number })?.count || chunk.length;
      }

      success(`${totalImported} clientes importados com sucesso!`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toastError("Erro na importação: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setData([]);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Clientes via Excel">
      <div className="space-y-6">
        {step === 'upload' ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-violet-500 hover:bg-violet-50/50 transition-all cursor-pointer group"
          >
            <div className="p-4 bg-violet-100 text-violet-600 rounded-full group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">Clique ou arraste o arquivo</p>
              <p className="text-muted-foreground text-sm">Suporta .xlsx, .xls e .csv</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">{data.length} registros prontos para importar</p>
                </div>
              </div>
              <button onClick={reset} className="p-1 hover:bg-slate-200 rounded-md text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-auto border border-border rounded-lg">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-muted sticky top-0 border-b border-border shadow-sm">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-foreground">Nome</th>
                    <th className="px-3 py-2 font-semibold text-foreground">CPF/CNPJ</th>
                    <th className="px-3 py-2 font-semibold text-foreground">Email</th>
                    <th className="px-3 py-2 font-semibold text-foreground">Endereço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-card">
                  {data.slice(0, 10).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-foreground">{p.nome}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{p.cpf_cnpj || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.email || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground italic truncate max-w-[200px]" title={p.endereco}>
                        {p.endereco || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 10 && (
                <div className="p-2 text-center text-xs text-slate-400 bg-slate-50/50 border-t border-slate-100">
                  E mais {data.length - 10} registros...
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Atenção:</strong> Mapeamos automaticamente campos como Nome, E-mail, Telefone e Endereço (Rua, Número, Bairro, etc). 
                Qualquer outra coluna será descartada durante o processo.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 bg-violet-600 text-white py-2.5 rounded-lg font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Importação
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-card border border-border text-foreground py-2.5 rounded-lg font-semibold hover:bg-muted transition-colors shadow-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
