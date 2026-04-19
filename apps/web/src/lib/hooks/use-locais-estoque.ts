"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { criarLocalEstoque, fetchLocaisEstoque, desativarLocalEstoque, type LocalEstoque } from "@/lib/api";

const LOCAIS_ESTOQUE_KEY = ["locais_estoque"] as const;

export function useLocaisEstoque() {
  return useQuery({
    queryKey: LOCAIS_ESTOQUE_KEY,
    queryFn: fetchLocaisEstoque,
  });
}

export function useCriarLocalEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarLocalEstoque,
    onSuccess: () => qc.invalidateQueries({ queryKey: LOCAIS_ESTOQUE_KEY }),
  });
}

export function useDesativarLocalEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: desativarLocalEstoque,
    onSuccess: () => qc.invalidateQueries({ queryKey: LOCAIS_ESTOQUE_KEY }),
  });
}
