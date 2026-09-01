"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFinanceiro, updateFinanceiro, createFinanceiro, deleteFinanceiro, type FinanceiroUpdate, type FinanceiroCreate } from "@/lib/api";

const FINANCEIRO_KEY = ["financeiro"] as const;

export function useFinanceiro(filialId?: string | null) {
  return useQuery({
    queryKey: [...FINANCEIRO_KEY, filialId],
    queryFn: () => fetchFinanceiro(filialId),
  });
}

export function useUpdateFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, financeiro }: { id: string; financeiro: FinanceiroUpdate }) => updateFinanceiro(id, financeiro),
    onSuccess: () => qc.invalidateQueries({ queryKey: FINANCEIRO_KEY }),
  });
}

export function useCreateFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (financeiro: FinanceiroCreate) => createFinanceiro(financeiro),
    onSuccess: () => qc.invalidateQueries({ queryKey: FINANCEIRO_KEY }),
  });
}

export function useDeleteFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFinanceiro(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: FINANCEIRO_KEY }),
  });
}
