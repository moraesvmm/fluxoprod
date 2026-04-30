"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarDocumentosRH,
  uploadDocumentoRH,
  excluirDocumentoRH,
  atualizarDadosPessoais,
  type DadosPessoais,
} from "@/lib/api";

export function useDocumentosRH(funcionarioId: string | null) {
  return useQuery({
    queryKey: ["documentos-rh", funcionarioId],
    queryFn: () => listarDocumentosRH(funcionarioId!),
    enabled: !!funcionarioId,
  });
}

export function useUploadDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      funcionarioId,
      tipo,
      arquivo,
    }: {
      funcionarioId: string;
      tipo: string;
      arquivo: File;
    }) => uploadDocumentoRH(funcionarioId, tipo, arquivo),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["documentos-rh", variables.funcionarioId],
      });
    },
  });
}

export function useExcluirDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentoId: string) => excluirDocumentoRH(documentoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos-rh"] });
    },
  });
}

export function useAtualizarDadosPessoais() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      funcionarioId,
      dados,
    }: {
      funcionarioId: string;
      dados: DadosPessoais;
    }) => atualizarDadosPessoais(funcionarioId, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
    },
  });
}
