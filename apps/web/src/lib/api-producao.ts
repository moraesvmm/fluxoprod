import { createClient } from "@/utils/supabase/client";

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
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_listar_fichas_tecnicas', {
    p_limit: 1000,
    p_offset: 0
  });
  
  if (error) throw error;
  return data as FichaTecnica[];
}

export async function createFichaTecnica(payload: { produto_acabado_id: string, materia_prima_id: string, quantidade_necessaria: number }): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_criar_ficha_tecnica', {
    p_produto_acabado_id: payload.produto_acabado_id,
    p_materia_prima_id: payload.materia_prima_id,
    p_quantidade_necessaria: payload.quantidade_necessaria
  });
    
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function fetchOrdensProducao(): Promise<OrdemProducao[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_listar_ordens_producao', {
    p_limit: 1000,
    p_offset: 0
  });
  
  if (error) throw error;
  return data as OrdemProducao[];
}

export async function abrirOrdemProducao(payload: { produto_id: string, quantidade_planejada: number }): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_abrir_ordem_producao', {
    p_produto_id: payload.produto_id,
    p_quantidade_planejada: payload.quantidade_planejada
  });
    
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function concluirOrdemProducao(payload: { ordem_id: string, quantidade_produzida: number, insumos: InsumoConsumido[] }): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_concluir_ordem_producao', {
    p_ordem_id: payload.ordem_id,
    p_qtd_produzida: payload.quantidade_produzida,
    p_insumos: payload.insumos
  });
  
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  
  return data;
}
