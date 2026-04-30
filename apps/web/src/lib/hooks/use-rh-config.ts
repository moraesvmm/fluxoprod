"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/api";

const RH_CONFIG_KEY = ["rh_config"] as const;

export function useRHConfig() {
  return useQuery({
    queryKey: RH_CONFIG_KEY,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .rpc('tenant_buscar_configuracao', { p_chave: 'rh_dia_pagamento' });
      
      if (error) {
        // Se o erro for que a RPC não existe, tentamos o fallback. 
        // Se for erro de permissão ou outro, retornamos nulo.
        if (error.code === 'PGRST202') { // RPC not found
          const { data: directData, error: directError } = await getSupabase()
            .from('configuracoes')
            .select('valor')
            .eq('chave', 'rh_dia_pagamento')
            .single();
            
          if (directError) return { dia: null };
          return { dia: directData?.valor ? parseInt(directData.valor, 10) : null };
        }
        return { dia: null };
      }
      
      // Se data for null, significa que a configuração não existe no banco ou usuário sem tenant
      if (!data) return { dia: null };
      
      return { dia: data?.valor ? parseInt(data.valor, 10) : null };
    },
  });
}

export function useUpdateRHConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dia: number) => {
      const { data, error } = await getSupabase()
        .rpc('tenant_salvar_configuracao', { 
          p_chave: 'rh_dia_pagamento',
          p_valor: dia.toString(),
          p_descricao: 'Dia de pagamento dos funcionários'
        });
        
      if (error) {
        // Fallback to direct upsert
        const { error: directError } = await getSupabase()
          .from('configuracoes')
          .upsert({ 
            chave: 'rh_dia_pagamento', 
            valor: dia.toString(), 
            descricao: 'Dia de pagamento dos funcionários' 
          }, { onConflict: 'chave' });
          
        if (directError) throw new Error(directError.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RH_CONFIG_KEY }),
  });
}
