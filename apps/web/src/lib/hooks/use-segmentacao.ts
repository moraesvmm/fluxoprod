"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adicionarTag, removerTag, listarTagsCatalog, fetchClientes, type Cliente, type TagCatalog } from "@/lib/api";

const TAGS_KEY = ["tags"] as const;

export function useSegmentacao(clienteId?: string) {
  const qc = useQueryClient();
  const [tagsAtivas, setTagsAtivas] = useState<string[]>([]);
  const [tagsFiltro, setTagsFiltro] = useState<string[]>([]);
  const [operadorFiltro, setOperadorFiltro] = useState<'all' | 'any'>('all');

  // Buscar catalog de tags
  const catalogQuery = useQuery({
    queryKey: [TAGS_KEY[0], "catalog"],
    queryFn: () => listarTagsCatalog(),
  });

  // Buscar tags de um cliente específico
  const clienteQuery = useQuery({
    queryKey: [TAGS_KEY[0], "cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const result = await fetchClientes();
      const cliente = result.data?.find(c => c.id === clienteId);
      return cliente?.tags || [];
    },
    enabled: !!clienteId,
  });

  const adicionarTagMutation = useMutation({
    mutationFn: async ({ clienteId, tag }: { clienteId: string; tag: string }) => {
      await adicionarTag(clienteId, tag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TAGS_KEY[0]] });
    },
  });

  const removerTagMutation = useMutation({
    mutationFn: async ({ clienteId, tag }: { clienteId: string; tag: string }) => {
      await removerTag(clienteId, tag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TAGS_KEY[0]] });
    },
  });

  const adicionarTag = async (clienteId: string, tag: string) => {
    await adicionarTagMutation.mutateAsync({ clienteId, tag });
  };

  const removerTag = async (clienteId: string, tag: string) => {
    await removerTagMutation.mutateAsync({ clienteId, tag });
  };

  const filtrarPorTags = (tags: string[], operador: 'all' | 'any' = 'all') => {
    setTagsFiltro(tags);
    setOperadorFiltro(operador);
  };

  const limparFiltroTags = () => {
    setTagsFiltro([]);
    setOperadorFiltro('all');
  };

  const buscarCatalog = async (busca: string) => {
    return await listarTagsCatalog(busca, 20);
  };

  const buscarTagsCliente = async (id: string) => {
    if (!id) return [];
    const result = await fetchClientes();
    const cliente = result.data?.find(c => c.id === id);
    return cliente?.tags || [];
  };

  return {
    tags: catalogQuery.data || [],
    loading: catalogQuery.isLoading,
    adicionarTag,
    removerTag,
    filtrarPorTags,
    tagsAtivas,
    setTagsAtivas,
    limparFiltroTags,
    catalogTags: catalogQuery.data || [],
    buscarCatalog,
    buscarTagsCliente,
    isAdding: adicionarTagMutation.isPending,
    isRemoving: removerTagMutation.isPending,
    tagsFiltro,
    operadorFiltro,
  };
}
