import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";

type SupabaseTyped = ReturnType<typeof createClient> extends infer C
  ? C extends { rpc: unknown }
  ? C
  : never
  : never;

function getSupabase() {
  return createClient() as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;
}

export interface FichaTecnica {
  id: string;
  produto_acabado_id: string;
  materia_prima_id: string;
  quantidade_necessaria: number;
  criado_em: string;
  produto_acabado_nome?: string;
  materia_prima_nome?: string;
  unidade_medida?: string;
}

export interface OrdemProducao {
  id: string;
  numero_op: number;
  produto_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  status: 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';
  data_inicio: string | null;
  data_fim: string | null;
  custo_total_materiais: number;
  criado_em: string;
  produto_nome?: string;
  unidade_medida?: string;
}

export interface InsumoConsumido {
  insumo_id: string;
  quantidade_consumida: number;
}

export async function fetchFichasTecnicas(): Promise<FichaTecnica[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('tenant_listar_fichas_tecnicas', {
    p_limit: 1000,
    p_offset: 0
  });
  if (error) throw error;
  return (data as unknown as FichaTecnica[]) ?? [];
}

export async function createFichaTecnica(payload: {
  produto_acabado_id: string;
  materia_prima_id: string;
  quantidade_necessaria: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('tenant_criar_ficha_tecnica', {
    p_produto_acabado_id: payload.produto_acabado_id,
    p_materia_prima_id: payload.materia_prima_id,
    p_quantidade_necessaria: payload.quantidade_necessaria
  });
  if (error) throw error;
  const result = data as unknown as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? 'Erro ao criar ficha técnica');
  return result;
}

export async function fetchOrdensProducao(): Promise<OrdemProducao[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('tenant_listar_ordens_producao', {
    p_limit: 1000,
    p_offset: 0
  });
  if (error) throw error;
  return (data as unknown as OrdemProducao[]) ?? [];
}

export async function abrirOrdemProducao(payload: {
  produto_id: string;
  quantidade_planejada: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('tenant_abrir_ordem_producao', {
    p_produto_id: payload.produto_id,
    p_quantidade_planejada: payload.quantidade_planejada
  });
  if (error) throw error;
  const result = data as unknown as { success: boolean; error?: string };
  if (!result.success) throw new Error(result.error ?? 'Erro ao abrir ordem de produção');
  return result;
}

export async function concluirOrdemProducao(payload: {
  ordem_id: string;
  quantidade_produzida: number;
  insumos: InsumoConsumido[];
}): Promise<{ success: boolean; error?: string; insumos_consumidos?: number }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('tenant_concluir_ordem_producao', {
    p_ordem_id: payload.ordem_id,
    p_qtd_produzida: payload.quantidade_produzida,
    // A RPC aceita Json — passamos o array tipado como unknown para satisfazer o contrato
    p_insumos: payload.insumos as unknown as import("@supabase/supabase-js").Json
  });
  if (error) throw error;
  const result = data as unknown as { success: boolean; error?: string; insumos_consumidos?: number };
  if (!result.success) throw new Error(result.error ?? 'Erro ao concluir ordem de produção');
  return result;
}
