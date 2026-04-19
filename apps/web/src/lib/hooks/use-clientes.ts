"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClientes, createCliente, deleteCliente, updateCliente, type ClienteCreate, type ClienteUpdate, type ClienteListParams, type ClienteListResult } from "@/lib/api";

const CLIENTES_KEY = ["clientes"] as const;

interface UseClientesOptions {
  params?: ClienteListParams;
}

export function useClientes(options?: UseClientesOptions) {
  return useQuery<ClienteListResult>({
    queryKey: [...CLIENTES_KEY, options?.params],
    queryFn: () => fetchClientes(options?.params),
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

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cliente }: { id: string; cliente: ClienteUpdate }) => updateCliente(id, cliente),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTES_KEY }),
  });
}

// Hook customizado com estado local para filtros e paginação
export function useClientesComFiltros() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<ClienteListParams>({
    limit: 20,
    order_by: 'criado_em',
    order_dir: 'DESC'
  });
  
  const query = useQuery<ClienteListResult>({
    queryKey: [...CLIENTES_KEY, filtros],
    queryFn: () => fetchClientes(filtros),
  });

  const aplicarFiltros = (novosFiltros: Partial<ClienteListParams>) => {
    setFiltros((prev: ClienteListParams) => ({ ...prev, ...novosFiltros, cursor: null }));
  };

  const proximaPagina = () => {
    if (query.data?.next_cursor) {
      setFiltros((prev: ClienteListParams) => ({ ...prev, cursor: query.data?.next_cursor }));
    }
  };

  const limparFiltros = () => {
    setFiltros({
      limit: 20,
      order_by: 'criado_em',
      order_dir: 'DESC'
    });
  };

  return {
    ...query,
    filtros,
    aplicarFiltros,
    proximaPagina,
    limparFiltros
  };
}
