"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClientes, createCliente, deleteCliente, type ClienteCreate } from "@/lib/api";

const CLIENTES_KEY = ["clientes"] as const;

export function useClientes() {
  return useQuery({
    queryKey: CLIENTES_KEY,
    queryFn: fetchClientes,
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cliente: ClienteCreate) => createCliente(cliente),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTES_KEY }),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTES_KEY }),
  });
}
