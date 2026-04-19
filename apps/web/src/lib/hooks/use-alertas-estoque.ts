"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { verificarAlertasEstoque, fetchAlertasEstoque, resolverAlertaEstoque, type AlertaEstoque } from "@/lib/api";

const ALERTAS_KEY = ["alertas_estoque"] as const;

export function useAlertasEstoque(status?: string) {
  return useQuery({
    queryKey: status ? [...ALERTAS_KEY, status] : ALERTAS_KEY,
    queryFn: () => fetchAlertasEstoque(status),
  });
}

export function useVerificarAlertasEstoque() {
  return useMutation({
    mutationFn: verificarAlertasEstoque,
  });
}

export function useResolverAlertaEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alertaId, status }: { alertaId: string; status: string }) => 
      resolverAlertaEstoque(alertaId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERTAS_KEY }),
  });
}
