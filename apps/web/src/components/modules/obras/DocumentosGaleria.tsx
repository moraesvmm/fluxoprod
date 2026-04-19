"use client";

import { useState, useRef } from "react";
import { ObraDocumento } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface DocumentosGaleriaProps {
  documentos: ObraDocumento[];
  onUpload?: (file: File, descricao?: string) => Promise<void>;
  onDelete?: (documentoId: string) => Promise<void>;
  onDownload?: (documento: ObraDocumento) => void;
}

const tipoIcons = {
  'image/jpeg': '🖼️',
  'image/jpg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

const tipoLabels = {
  'image/jpeg': 'Imagem',
  'image/jpg': 'Imagem',
  'image/png': 'Imagem',
  'image/gif': 'Imagem',
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
};

export function DocumentosGaleria({ documentos, onUpload, onDelete, onDownload }: DocumentosGaleriaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImage = (tipo: string) => tipo.startsWith('image/');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !onUpload) return;

    setIsUploading(true);
    try {
      await onUpload(selectedFile, descricao || undefined);
      setSelectedFile(null);
      setDescricao("");
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Área de Upload */}
      {onUpload && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {!selectedFile ? (
            <div>
              <div className="text-4xl mb-2">📁</div>
              <p className="text-sm text-muted-foreground mb-2">
                Arraste e solte arquivos aqui ou
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Selecionar Arquivo
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Tipos permitidos: JPG, PNG, GIF, PDF, DOC, DOCX (máx. 10MB)
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">{tipoIcons[selectedFile.type as keyof typeof tipoIcons] || '📄'}</div>
              <p className="text-sm font-medium text-foreground mb-2">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mb-4">{formatBytes(selectedFile.size)}</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Enviando...' : 'Enviar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setDescricao("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid de Documentos */}
      {documentos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documentos.map((documento) => (
            <div key={documento.id} className="bg-card rounded-lg border p-4 space-y-3">
              {/* Preview ou Ícone */}
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                {isImage(documento.tipo) ? (
                  <img
                    src={documento.url}
                    alt={documento.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-5xl">{tipoIcons[documento.tipo as keyof typeof tipoIcons] || '📄'}</div>
                )}
              </div>

              {/* Informações */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground truncate" title={documento.nome}>
                  {documento.nome}
                </p>
                {documento.descricao && (
                  <p className="text-xs text-muted-foreground truncate" title={documento.descricao}>
                    {documento.descricao}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tipoLabels[documento.tipo as keyof typeof tipoLabels] || documento.tipo}</span>
                  <span>•</span>
                  <span>{formatBytes(documento.tamanho)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(documento.criado_em).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                {onDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onDownload(documento)}
                  >
                    Download
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(documento.id)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-2">📭</div>
          <p>Nenhum documento anexado</p>
        </div>
      )}
    </div>
  );
}
