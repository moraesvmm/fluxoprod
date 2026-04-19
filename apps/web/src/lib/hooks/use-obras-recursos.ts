"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchObrasRecursos, alocarRecursoObra, updateObraRecurso, deleteObraRecurso, type ObraRecursoCreate, type ObraRecursoUpdate } from "@/lib/api";

const OBRAS_RECURSOS_KEY = ["obras_recursos"] as const;

export function useObraRecursos(obraId: string) {
  return useQuery({
    queryKey: [...OBRAS_RECURSOS_KEY, obraId],
    queryFn: () => fetchObrasRecursos(obraId),
    enabled: !!obraId,
  });
}

export function useAlocarRecursoObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recurso: ObraRecursoCreate) => alocarRecursoObra(recurso),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: [...OBRAS_RECURSOS_KEY, variables.obra_id] }),
  });
}

export function useUpdateObraRecurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recursoId, recurso }: { recursoId: string; recurso: ObraRecursoUpdate }) => updateObraRecurso(recursoId, recurso),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_RECURSOS_KEY }),
  });
}

export function useDeleteObraRecurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recursoId: string) => deleteObraRecurso(recursoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_RECURSOS_KEY }),
  });
}
