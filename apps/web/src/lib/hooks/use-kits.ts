"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { criarKit, fetchKits, excluirKit, venderKit, type Kit, type KitCreate } from "@/lib/api";

const KITS_KEY = ["kits"] as const;

export function useKits() {
  return useQuery({
    queryKey: KITS_KEY,
    queryFn: fetchKits,
  });
}

export function useCriarKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarKit,
    onSuccess: () => qc.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useExcluirKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: excluirKit,
    onSuccess: () => qc.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useVenderKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kitId, quantidade }: { kitId: string; quantidade?: number }) => 
      venderKit(kitId, quantidade),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KITS_KEY });
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}
