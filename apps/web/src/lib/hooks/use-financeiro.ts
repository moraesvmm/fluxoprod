"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFinanceiro, updateFinanceiro, type FinanceiroUpdate } from "@/lib/api";

const FINANCEIRO_KEY = ["financeiro"] as const;

export function useFinanceiro() {
  return useQuery({
    queryKey: FINANCEIRO_KEY,
    queryFn: fetchFinanceiro,
  });
}

export function useUpdateFinanceiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, financeiro }: { id: string; financeiro: FinanceiroUpdate }) => updateFinanceiro(id, financeiro),
    onSuccess: () => qc.invalidateQueries({ queryKey: FINANCEIRO_KEY }),
  });
}
