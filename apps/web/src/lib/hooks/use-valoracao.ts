"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calcularValorEstoque, atualizarCustoProduto, gerarCodigoBarras, buscarProdutoPorCodigo, type ValorizacaoEstoque, type CodigoBarrasResponse } from "@/lib/api";

const VALORIZACAO_KEY = ["valoracao_estoque"] as const;

export function useValorizacaoEstoque(metodo: string = 'custo_medio') {
  return useQuery({
    queryKey: [...VALORIZACAO_KEY, metodo],
    queryFn: () => calcularValorEstoque(metodo),
  });
}

export function useAtualizarCustoProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ produtoId, custo, metodo }: { produtoId: string; custo: number; metodo?: string }) => 
      atualizarCustoProduto(produtoId, custo, metodo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VALORIZACAO_KEY });
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

export function useGerarCodigoBarras() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: gerarCodigoBarras,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

export function useBuscarProdutoPorCodigo() {
  return useMutation({
    mutationFn: buscarProdutoPorCodigo,
  });
}
