"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchObras, createObra, deleteObra, updateObra, type ObraCreate, type ObraUpdate } from "@/lib/api";

const OBRAS_KEY = ["obras"] as const;

export function useObras() {
  return useQuery({
    queryKey: OBRAS_KEY,
    queryFn: fetchObras,
  });
}

export function useCreateObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (obra: ObraCreate) => createObra(obra),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_KEY }),
  });
}

export function useDeleteObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteObra(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_KEY }),
  });
}

export function useUpdateObra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, obra }: { id: string; obra: ObraUpdate }) => updateObra(id, obra),
    onSuccess: () => qc.invalidateQueries({ queryKey: OBRAS_KEY }),
  });
}
