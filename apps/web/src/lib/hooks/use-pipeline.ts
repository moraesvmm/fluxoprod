"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClientes, updateCliente, type Cliente } from "@/lib/api";

const PIPELINE_KEY = ["pipeline"] as const;

export interface Coluna {
  fase: string;
  label: string;
  cor: string;
  clientes: Cliente[];
}

const FASES_CONFIG: { fase: string; label: string; cor: string }[] = [
  { fase: 'lead', label: 'Lead', cor: 'blue' },
  { fase: 'qualificado', label: 'Qualificado', cor: 'indigo' },
  { fase: 'proposta', label: 'Proposta', cor: 'purple' },
  { fase: 'negociacao', label: 'Negociação', cor: 'amber' },
  { fase: 'fechado', label: 'Fechado', cor: 'green' },
  { fase: 'perdido', label: 'Perdido', cor: 'gray' },
];

const COR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
};

export function usePipeline() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: PIPELINE_KEY,
    queryFn: async () => {
      const result = await fetchClientes();
      return result.data || [];
    },
  });

  const colunas: Coluna[] = FASES_CONFIG.map(config => ({
    ...config,
    cor: COR_CLASSES[config.cor],
    clientes: (query.data || []).filter(c => c.funil_fase === config.fase),
  }));

  const moverClienteMutation = useMutation({
    mutationFn: async ({ clienteId, novaFase }: { clienteId: string; novaFase: string }) => {
      await updateCliente(clienteId, { funil_fase: novaFase });
    },
    onMutate: async ({ clienteId, novaFase }) => {
      // Cancelar queries em andamento
      await qc.cancelQueries({ queryKey: PIPELINE_KEY });

      // Snapshot do estado anterior
      const previousClientes = qc.getQueryData(PIPELINE_KEY) as Cliente[];

      // Optimistic update
      qc.setQueryData(PIPELINE_KEY, (old: Cliente[] = []) => 
        old.map(c => c.id === clienteId ? { ...c, funil_fase: novaFase } : c)
      );

      return { previousClientes };
    },
    onError: (error, variables, context) => {
      // Reverter em caso de erro
      if (context?.previousClientes) {
        qc.setQueryData(PIPELINE_KEY, context.previousClientes);
      }
    },
    onSettled: () => {
      // Recarregar dados para garantir consistência
      qc.invalidateQueries({ queryKey: PIPELINE_KEY });
    },
  });

  const moverCliente = async (clienteId: string, novaFase: string) => {
    await moverClienteMutation.mutateAsync({ clienteId, novaFase });
  };

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: PIPELINE_KEY });
  };

  return {
    colunas,
    loading: query.isLoading,
    moverCliente,
    recarregar,
    isMoving: moverClienteMutation.isPending,
  };
}
