"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRegraComissao,
  deleteRegraComissao,
  fetchComissoes,
  fetchRegrasComissao,
  updateComissao,
  type ComissaoUpdate,
  type RegraComissaoCreate,
} from "@/lib/api";

const COMISSOES_KEY = ["comissoes"] as const;
const REGRAS_COMISSAO_KEY = ["regras-comissao"] as const;

export function useComissoes() {
  return useQuery({
    queryKey: COMISSOES_KEY,
    queryFn: fetchComissoes,
  });
}

export function useUpdateComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comissao }: { id: string; comissao: ComissaoUpdate }) => updateComissao(id, comissao),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMISSOES_KEY }),
  });
}

export function useRegrasComissao() {
  return useQuery({
    queryKey: REGRAS_COMISSAO_KEY,
    queryFn: fetchRegrasComissao,
  });
}

export function useCreateRegraComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (regra: RegraComissaoCreate) => createRegraComissao(regra),
    onSuccess: () => qc.invalidateQueries({ queryKey: REGRAS_COMISSAO_KEY }),
  });
}

export function useDeleteRegraComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (regraId: string) => deleteRegraComissao(regraId),
    onSuccess: () => qc.invalidateQueries({ queryKey: REGRAS_COMISSAO_KEY }),
  });
}
