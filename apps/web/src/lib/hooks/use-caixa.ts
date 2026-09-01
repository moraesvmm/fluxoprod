"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  abrirCaixa,
  fecharCaixa,
  fetchContextosCaixa,
  fetchResumoCaixa,
  registrarMovimentoCaixa,
  reabrirCaixa,
  type FechamentoCaixaInput,
} from "@/lib/api";

const CONTEXTOS_CAIXA_KEY = ["caixa", "contextos"] as const;
const RESUMO_CAIXA_KEY = ["caixa", "resumo"] as const;

function invalidateCaixa(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["caixa"] });
}

export function useContextosCaixa() {
  return useQuery({
    queryKey: CONTEXTOS_CAIXA_KEY,
    queryFn: fetchContextosCaixa,
  });
}

export function useResumoCaixa(filialId?: string, caixaId?: string, data?: string) {
  return useQuery({
    queryKey: [...RESUMO_CAIXA_KEY, filialId, caixaId, data],
    queryFn: () => fetchResumoCaixa(filialId!, caixaId!, data),
    enabled: Boolean(filialId && caixaId),
  });
}

export function useAbrirCaixa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filialId, caixaId, valorAbertura }: { filialId: string; caixaId: string; valorAbertura: number }) =>
      abrirCaixa(filialId, caixaId, valorAbertura),
    onSuccess: () => invalidateCaixa(queryClient),
  });
}

export function useRegistrarMovimentoCaixa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      filialId: string;
      caixaId: string;
      tipo: 'saida' | 'suprimento' | 'ajuste';
      valor: number;
      formaPagamento: string;
      motivo: string;
    }) => registrarMovimentoCaixa(
      input.filialId,
      input.caixaId,
      input.tipo,
      input.valor,
      input.formaPagamento,
      input.motivo
    ),
    onSuccess: () => invalidateCaixa(queryClient),
  });
}

export function useFecharCaixa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fecharCaixa,
    onSuccess: () => invalidateCaixa(queryClient),
  });
}

export function useReabrirCaixa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fechamentoId, motivo }: { fechamentoId: string; motivo: string }) => reabrirCaixa(fechamentoId, motivo),
    onSuccess: () => invalidateCaixa(queryClient),
  });
}

export type { FechamentoCaixaInput };