"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchObraDocumentos, uploadObraDocumento, deleteObraDocumento, type ObraDocumento } from "@/lib/api";

const OBRAS_DOCUMENTOS_KEY = ["obras_documentos"] as const;

export function useObraDocumentos(obraId: string) {
  return useQuery({
    queryKey: [...OBRAS_DOCUMENTOS_KEY, obraId],
    queryFn: () => fetchObraDocumentos(obraId),
    enabled: !!obraId,
  });
}

export function useUploadObraDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, obraId, descricao }: { file: File; obraId: string; descricao?: string }) => 
      uploadObraDocumento(file, obraId, descricao),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: [...OBRAS_DOCUMENTOS_KEY, variables.obraId] }),
  });
}

export function useDeleteObraDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentoId: string) => deleteObraDocumento(documentoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_DOCUMENTOS_KEY }),
  });
}
