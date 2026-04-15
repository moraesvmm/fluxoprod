"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComissoes, updateComissao, type ComissaoUpdate } from "@/lib/api";

const COMISSOES_KEY = ["comissoes"] as const;

export function useComissoes() {
  return useQuery({
    queryKey: COMISSOES_KEY,
    queryFn: fetchComissoes,
  });
}

export function useUpdateComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comissao }: { id: string; comissao: ComissaoUpdate }) => updateComissao(id, comissao),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMISSOES_KEY }),
  });
}
