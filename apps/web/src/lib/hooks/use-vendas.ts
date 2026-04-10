"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchVendas, createVenda, deleteVenda, type VendaCreate } from "@/lib/api";

const VENDAS_KEY = ["vendas"] as const;

export function useVendas() {
  return useQuery({
    queryKey: VENDAS_KEY,
    queryFn: fetchVendas,
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
