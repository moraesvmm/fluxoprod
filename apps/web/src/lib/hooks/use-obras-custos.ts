"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchObraCustos, createObraCusto, updateObraCusto, deleteObraCusto, fetchObraResumoFinanceiro, type ObraCustoCreate, type ObraCustoUpdate, type ObraResumoFinanceiro } from "@/lib/api";

const OBRAS_CUSTOS_KEY = ["obras_custos"] as const;

export function useObraCustos(obraId: string) {
  return useQuery({
    queryKey: [...OBRAS_CUSTOS_KEY, obraId],
    queryFn: () => fetchObraCustos(obraId),
    enabled: !!obraId,
  });
}

export function useCreateObraCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (custo: ObraCustoCreate) => createObraCusto(custo),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: [...OBRAS_CUSTOS_KEY, variables.obra_id] }),
  });
}

export function useUpdateObraCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ custoId, custo }: { custoId: string; custo: ObraCustoUpdate }) => updateObraCusto(custoId, custo),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: OBRAS_CUSTOS_KEY });
    },
  });
}

export function useDeleteObraCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (custoId: string) => deleteObraCusto(custoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_CUSTOS_KEY }),
  });
}

export function useObraResumoFinanceiro(obraId: string) {
  return useQuery({
    queryKey: ["obras_resumo_financeiro", obraId],
    queryFn: () => fetchObraResumoFinanceiro(obraId),
    enabled: !!obraId,
  });
}
