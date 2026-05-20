import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFichasTecnicas, createFichaTecnica, fetchOrdensProducao, abrirOrdemProducao, concluirOrdemProducao, FichaTecnica, OrdemProducao } from '../api-producao';

export function useFichasTecnicas() {
  return useQuery<FichaTecnica[]>({
    queryKey: ['fichas_tecnicas'],
    queryFn: fetchFichasTecnicas,
  });
}

export function useCreateFichaTecnica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFichaTecnica,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas_tecnicas'] });
    },
  });
}

export function useOrdensProducao() {
  return useQuery<OrdemProducao[]>({
    queryKey: ['ordens_producao'],
    queryFn: fetchOrdensProducao,
  });
}

export function useAbrirOrdemProducao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: abrirOrdemProducao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens_producao'] });
    },
  });
}

export function useConcluirOrdemProducao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: concluirOrdemProducao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens_producao'] });
      // Invalidate products to refresh inventory levels
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
    },
  });
}
