"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEntradasEstoque,
  fetchMovimentacoesEstoque,
  registrarEntradaEstoque,
  type EstoqueEntradaCreate,
} from "@/lib/api";

const ENTRADAS_KEY = ["estoque_entradas"] as const;
const MOVIMENTACOES_KEY = ["estoque_movimentacoes"] as const;

export function useEntradasEstoque(produtoId?: string) {
  return useQuery({
    queryKey: produtoId ? [...ENTRADAS_KEY, produtoId] : ENTRADAS_KEY,
    queryFn: () => fetchEntradasEstoque(produtoId),
  });
}

export function useMovimentacoesEstoque(produtoId?: string, tipo?: string) {
  return useQuery({
    queryKey: [
      ...MOVIMENTACOES_KEY,
      ...(produtoId ? [produtoId] : []),
      ...(tipo ? [tipo] : []),
    ],
    queryFn: () => fetchMovimentacoesEstoque(produtoId, tipo),
  });
}

export function useRegistrarEntradaEstoque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entrada: EstoqueEntradaCreate) => registrarEntradaEstoque(entrada),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTRADAS_KEY });
      queryClient.invalidateQueries({ queryKey: MOVIMENTACOES_KEY });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      queryClient.invalidateQueries({ queryKey: ["estoque_por_local"] });
    },
  });
}
