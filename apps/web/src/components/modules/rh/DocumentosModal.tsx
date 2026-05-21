"use client";

import { useState, useCallback, useRef } from "react";
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  Download,
  Loader2,
  FolderOpen,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  useDocumentosRH,
  useUploadDocumento,
  useExcluirDocumento,
} from "@/lib/hooks/use-documentos-rh";
import { obterUrlDocumento, type Funcionario, type DocumentoFuncionario } from "@/lib/api";
import { DadosPessoaisForm } from "./DadosPessoaisForm";


interface DocumentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  funcionario: Funcionario | null;
  onToast: (message: string, type: "success" | "error") => void;
}

const TIPOS_DOCUMENTO = [
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "cnh", label: "CNH" },
  { value: "ctps", label: "CTPS" },
  { value: "contrato", label: "Contrato de Trabalho" },
  { value: "holerite", label: "Holerite" },
  { value: "comprovante_residencia", label: "Comprovante de Residência" },
  { value: "atestado", label: "Atestado Médico" },
  { value: "outros", label: "Outros" },
];

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIconeDocumento(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  }
  return <FileText className="h-5 w-5 text-rose-500" />;
}

function getLabelTipo(tipo: string): string {
  return TIPOS_DOCUMENTO.find((t) => t.value === tipo)?.label || tipo;
}

export function DocumentosModal({
  isOpen,
  onClose,
  funcionario,
  onToast,
}: DocumentosModalProps) {
  const [activeTab, setActiveTab] = useState<"documentos" | "dados">(
    "documentos"
  );
  const [tipoUpload, setTipoUpload] = useState("rg");
  const [isDragging, setIsDragging] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documentos = [], isLoading } = useDocumentosRH(
    funcionario?.id || null
  );
  const uploadDoc = useUploadDocumento();
  const excluirDoc = useExcluirDocumento();

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !funcionario) return;

      const file = files[0];
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        onToast(
          "Formato não suportado. Use PDF, JPG, PNG ou WEBP.",
          "error"
        );
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        onToast("Arquivo muito grande. Limite: 10MB.", "error");
        return;
      }

      try {
        await uploadDoc.mutateAsync({
          funcionarioId: funcionario.id,
          tipo: tipoUpload,
          arquivo: file,
        });
        onToast("Documento enviado com sucesso!", "success");
      } catch (err: unknown) {
        onToast(
          "Erro no upload: " + (err instanceof Error ? err.message : "Tente novamente."),
          "error"
        );
      }
    },
    [funcionario, tipoUpload, uploadDoc, onToast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const handleVisualizar = async (docId: string) => {
    setLoadingUrl(docId);
    try {
      const url = await obterUrlDocumento(docId);
      window.open(url, "_blank");
    } catch (err: unknown) {
      onToast(
        "Erro ao abrir documento: " + (err instanceof Error ? err.message : "Tente novamente."),
        "error"
      );
    } finally {
      setLoadingUrl(null);
    }
  };

  const handleExcluir = async () => {
    if (!deleteDocId) return;
    try {
      await excluirDoc.mutateAsync(deleteDocId);
      onToast("Documento excluído com sucesso!", "success");
    } catch (err: unknown) {
      onToast(
        "Erro ao excluir: " + (err instanceof Error ? err.message : "Tente novamente."),
        "error"
      );
    } finally {
      setDeleteDocId(null);
    }
  };

  if (!funcionario) return null;

  return (
    <>
      <ConfirmModal
        isOpen={!!deleteDocId}
        onConfirm={handleExcluir}
        onCancel={() => setDeleteDocId(null)}
        title="Excluir documento"
        message="Tem certeza que deseja excluir este documento? O arquivo será removido permanentemente."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Documentos — ${funcionario.nome}`}
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("documentos")}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "documentos"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Documentos ({documentos.length})
            </button>
            <button
              onClick={() => setActiveTab("dados")}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "dados"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4" />
              Dados Pessoais
            </button>
          </div>

          {/* Tab: Documentos */}
          {activeTab === "documentos" && (
            <div className="space-y-4">
              {/* Upload Controls */}
              <div className="flex items-center gap-3">
                <select
                  value={tipoUpload}
                  onChange={(e) => setTipoUpload(e.target.value)}
                  className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadDoc.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploadDoc.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadDoc.isPending ? "Enviando..." : "Enviar Arquivo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-border"
                }`}
              >
                <Upload
                  className={`mx-auto h-8 w-8 mb-2 ${
                    isDragging ? "text-primary" : "text-slate-300"
                  }`}
                />
                <p className="text-sm text-muted-foreground">
                  {isDragging
                    ? "Solte o arquivo aqui..."
                    : "Arraste e solte um arquivo aqui, ou clique no botão acima"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PDF, JPG, PNG ou WEBP • Máximo 10MB
                </p>
              </div>

              {/* Lista de documentos */}
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Carregando documentos...
                </div>
              ) : documentos.length === 0 ? (
                <div className="py-8 text-center">
                  <FolderOpen className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum documento cadastrado
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {documentos.map((doc: DocumentoFuncionario) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getIconeDocumento(doc.mime_type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {doc.nome_arquivo}
                          </p>
                          <p className="text-xs text-slate-400">
                            {getLabelTipo(doc.tipo)} •{" "}
                            {formatarTamanho(doc.tamanho_bytes)} •{" "}
                            {new Date(doc.criado_em).toLocaleDateString(
                              "pt-BR"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVisualizar(doc.id)}
                          disabled={loadingUrl === doc.id}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Visualizar"
                        >
                          {loadingUrl === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleVisualizar(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDocId(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Dados Pessoais */}
          {activeTab === "dados" && (
            <DadosPessoaisForm
              funcionario={funcionario}
              onToast={onToast}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
