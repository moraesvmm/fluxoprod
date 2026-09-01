"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchVendas, createVenda, deleteVenda, cancelarVenda, devolverItem, type VendaCreate } from "@/lib/api";

const VENDAS_KEY = ["vendas"] as const;

export function useVendas(searchTerm?: string, dataVenda?: string | null) {
  return useQuery({
    queryKey: [...VENDAS_KEY, searchTerm, dataVenda],
    queryFn: () => fetchVendas(searchTerm, dataVenda),
  });
}

export function useCreateVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (venda: VendaCreate) => createVenda(venda),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDAS_KEY }),
  });
}

export function useDeleteVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVenda(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDAS_KEY }),
  });
}

export function useCancelVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarVenda(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDAS_KEY }),
  });
}

export function useDevolverItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendaId, itemId, quantidade }: { vendaId: string; itemId: string; quantidade: number }) => 
      devolverItem(vendaId, itemId, quantidade),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDAS_KEY }),
  });
}
