"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { criarTransferencia, fetchTransferencias, concluirTransferencia, cancelarTransferencia, type TransferenciaEstoque, type TransferenciaCreate } from "@/lib/api";

const TRANSFERENCIAS_ESTOQUE_KEY = ["transferencias_estoque"] as const;

export function useTransferencias(status?: string) {
  return useQuery({
    queryKey: status ? [...TRANSFERENCIAS_ESTOQUE_KEY, status] : TRANSFERENCIAS_ESTOQUE_KEY,
    queryFn: () => fetchTransferencias(status),
  });
}

export function useCriarTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarTransferencia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSFERENCIAS_ESTOQUE_KEY });
      qc.invalidateQueries({ queryKey: ["estoque_por_local"] });
    },
  });
}

export function useConcluirTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: concluirTransferencia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSFERENCIAS_ESTOQUE_KEY });
      qc.invalidateQueries({ queryKey: ["estoque_por_local"] });
    },
  });
}

export function useCancelarTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelarTransferencia,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSFERENCIAS_ESTOQUE_KEY });
      qc.invalidateQueries({ queryKey: ["estoque_por_local"] });
    },
  });
}
