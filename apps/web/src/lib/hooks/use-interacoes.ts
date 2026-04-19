"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchInteracoes, createInteracao, deleteInteracao, type InteracaoClienteCreate, type InteracaoClienteListParams, type InteracaoClienteListResult } from "@/lib/api";

const INTERACOES_KEY = ["interacoes"] as const;

interface UseInteracoesOptions {
  clienteId: string;
}

export function useInteracoes(options: UseInteracoesOptions) {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);
  
  const query = useQuery<InteracaoClienteListResult>({
    queryKey: [...INTERACOES_KEY, options.clienteId, cursor],
    queryFn: () => fetchInteracoes({ cliente_id: options.clienteId, cursor, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: (interacao: InteracaoClienteCreate) => createInteracao(interacao),
    onSuccess: () => qc.invalidateQueries({ queryKey: [INTERACOES_KEY[0], options.clienteId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInteracao(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [INTERACOES_KEY[0], options.clienteId] }),
  });

  const carregarMais = () => {
    if (query.data?.next_cursor) {
      setCursor(query.data.next_cursor);
    }
  };

  const hasMore = !!query.data?.next_cursor;

  return {
    interacoes: query.data?.data || [],
    loading: query.isLoading,
    criar: createMutation.mutateAsync,
    excluir: deleteMutation.mutateAsync,
    carregarMais,
    hasMore,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
