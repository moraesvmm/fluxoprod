"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gerarPrevisaoDemanda, fetchPrevisoesDemanda, atualizarDemandaReal, type PrevisaoDemanda, type PrevisaoResult } from "@/lib/api";

const PREVISOES_KEY = ["previsoes_demanda"] as const;

export function usePrevisoesDemanda(produtoId?: string) {
  return useQuery({
    queryKey: [...PREVISOES_KEY, produtoId],
    queryFn: () => fetchPrevisoesDemanda(produtoId),
  });
}

export function useGerarPrevisaoDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ produtoId, diasAnalise, diasPrevisao }: { produtoId: string; diasAnalise?: number; diasPrevisao?: number }) => 
      gerarPrevisaoDemanda(produtoId, diasAnalise, diasPrevisao),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PREVISOES_KEY });
    },
  });
}

export function useAtualizarDemandaReal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ previsaoId, demandaReal }: { previsaoId: string; demandaReal: number }) => 
      atualizarDemandaReal(previsaoId, demandaReal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PREVISOES_KEY });
    },
  });
}
