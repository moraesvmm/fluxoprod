"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOS, createOS, deleteOS, updateOS, type OrdemServicoCreate, type OrdemServicoUpdate } from "@/lib/api";

const OS_KEY = ["os"] as const;

export function useOS() {
  return useQuery({
    queryKey: OS_KEY,
    queryFn: fetchOS,
  });
}

export function useCreateOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (os: OrdemServicoCreate) => createOS(os),
    onSuccess: () => qc.invalidateQueries({ queryKey: OS_KEY }),
  });
}

export function useDeleteOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOS(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: OS_KEY }),
  });
}

export function useUpdateOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, os }: { id: string; os: OrdemServicoUpdate }) => updateOS(id, os),
    onSuccess: () => qc.invalidateQueries({ queryKey: OS_KEY }),
  });
}
