"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFuncionarios, updateFuncionario, type FuncionarioUpdate } from "@/lib/api";

const FUNCIONARIOS_KEY = ["funcionarios"] as const;

export function useFuncionarios() {
  return useQuery({
    queryKey: FUNCIONARIOS_KEY,
    queryFn: fetchFuncionarios,
  });
}

export function useUpdateFuncionario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, funcionario }: { id: string; funcionario: FuncionarioUpdate }) => updateFuncionario(id, funcionario),
    onSuccess: () => qc.invalidateQueries({ queryKey: FUNCIONARIOS_KEY }),
  });
}
