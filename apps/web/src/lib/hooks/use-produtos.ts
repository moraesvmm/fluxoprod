"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProdutos, createProduto, deleteProduto, type ProdutoCreate } from "@/lib/api";

const PRODUTOS_KEY = ["produtos"] as const;

export function useProdutos() {
  return useQuery({
    queryKey: PRODUTOS_KEY,
    queryFn: fetchProdutos,
  });
}

export function useCreateProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (produto: ProdutoCreate) => createProduto(produto),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUTOS_KEY }),
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUTOS_KEY }),
  });
}
