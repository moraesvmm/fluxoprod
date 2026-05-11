"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseStrict } from "@/lib/api";

const RH_CONFIG_KEY = ["rh_config"] as const;

interface RHConfigData {
  valor?: string | null;
}

export function useRHConfig() {
  return useQuery({
    queryKey: RH_CONFIG_KEY,
    queryFn: async () => {
      const { data, error } = await getSupabaseStrict()
        .rpc('tenant_buscar_configuracao', { p_chave: 'rh_dia_pagamento' });

      if (error) {
        // Se a RPC não existir (PGRST202), retorna nulo graciosamente
        return { dia: null };
      }

      if (!data) return { dia: null };

      // RPC retorna Json — cast defensivo para extrair o campo 'valor'
      const config = data as unknown as RHConfigData;
      return { dia: config?.valor ? parseInt(config.valor, 10) : null };
    },
  });
}

export function useUpdateRHConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dia: number) => {
      const { error } = await getSupabaseStrict()
        .rpc('tenant_salvar_configuracao', {
          p_chave: 'rh_dia_pagamento',
          p_valor: dia.toString(),
          p_descricao: 'Dia de pagamento dos funcionários'
        });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RH_CONFIG_KEY }),
  });
}
