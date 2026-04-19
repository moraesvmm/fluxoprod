"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchObraEtapas, createObraEtapa, updateObraEtapa, deleteObraEtapa, fetchObraProgresso, type ObraEtapaCreate, type ObraEtapaUpdate, type ObraProgresso } from "@/lib/api";

const OBRAS_ETAPAS_KEY = ["obras_etapas"] as const;

export function useObraEtapas(obraId: string) {
  return useQuery({
    queryKey: [...OBRAS_ETAPAS_KEY, obraId],
    queryFn: () => fetchObraEtapas(obraId),
    enabled: !!obraId,
  });
}

export function useCreateObraEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (etapa: ObraEtapaCreate) => createObraEtapa(etapa),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: [...OBRAS_ETAPAS_KEY, variables.obra_id] }),
  });
}

export function useUpdateObraEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ etapaId, etapa }: { etapaId: string; etapa: ObraEtapaUpdate }) => updateObraEtapa(etapaId, etapa),
    onSuccess: (_, variables) => {
      // Preciso invalidar todas as queries de etapas pois não tenho obraId aqui
      qc.invalidateQueries({ queryKey: OBRAS_ETAPAS_KEY });
    },
  });
}

export function useDeleteObraEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (etapaId: string) => deleteObraEtapa(etapaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_ETAPAS_KEY }),
  });
}

export function useObraProgresso(obraId: string) {
  return useQuery({
    queryKey: ["obras_progresso", obraId],
    queryFn: () => fetchObraProgresso(obraId),
    enabled: !!obraId,
  });
}
