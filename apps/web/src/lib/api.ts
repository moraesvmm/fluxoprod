import { createClient } from '@/utils/supabase/client';

// ─── Types ───────────────────────────────────────────────
export interface Venda {
  id: string;
  cliente: string;
  valor: number;
  metodo: string;
  status: string;
  vendedor_id?: string;
  vendedor_nome?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface VendaCreate {
  cliente: string;
  valor: number;
  metodo: string;
  status?: string;
  vendedor_id?: string;
  vendedor_nome?: string;
}

export interface VendaUpdate {
  cliente?: string;
  valor?: number;
  metodo?: string;
  status?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface ClienteCreate {
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  sku?: string;
  preco_custo?: number;
  preco_venda?: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria?: string;
  criado_em: string;
}

export interface ProdutoCreate {
  nome: string;
  descricao?: string;
  sku?: string;
  preco_custo?: number;
  preco_venda?: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria?: string;
}

export interface OrdemServico {
  id: string;
  empresa_id?: string;
  numero?: number;
  cliente_id?: string;
  veiculo_equipamento?: string;
  descricao_problema?: string;
  colaborador_id?: string;
  status: string;
  valor: number;
  criado_em: string;
  atualizado_em?: string;
  cliente?: { nome: string }; // joined
  colaborador?: { nome: string }; // joined
}

export interface OrdemServicoCreate {
  cliente_id?: string;
  veiculo_equipamento?: string;
  descricao_problema?: string;
  colaborador_id?: string;
  status?: string;
  valor?: number;
}

export interface Obra {
  id: string;
  empresa_id?: string;
  nome: string;
  cliente_id?: string;
  endereco?: string;
  data_inicio?: string;
  data_fim_prevista?: string;
  orcamento: number;
  descricao?: string;
  status: string;
  criado_em: string;
  atualizado_em?: string;
  cliente?: { nome: string }; // joined
}

export interface ObraCreate {
  nome: string;
  cliente_id?: string;
  endereco?: string;
  data_inicio?: string;
  data_fim_prevista?: string;
  orcamento?: number;
  descricao?: string;
  status?: string;
}

export interface Empresa {
  id: string;
  cnpj?: string;
  razao_social: string;
  porte?: string;
  segmento?: string;
  schema_name?: string;
  criado_em: string;
  status?: string;
}

export interface EmpresaUpdate {
  cnpj?: string;
  razao_social?: string;
  porte?: string;
  segmento?: string;
  status?: string;
}

// ─── Supabase-backed data functions ──────────────────────
// These replace the old ApiClient that hit localhost:8000
// NOW ALL OPERATIONS USE RPCs (Opção A - Database as Source of Truth)

const getSupabase = () => createClient();

// VENDAS - Usar RPC tenant_listar_vendas para leitura
export async function fetchVendas(): Promise<Venda[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_vendas', { p_limit: 100 });
  if (error) throw new Error(error.message);
  return data || [];
}

// Vendas são criadas via RPC tenant_processar_venda (PDV)
// createVenda mantida apenas para compatibilidade, mas não deve ser usada
export async function createVenda(venda: VendaCreate): Promise<Venda> {
  throw new Error('Use RPC tenant_processar_venda para criar vendas');
}

export async function updateVenda(id: string, venda: VendaUpdate): Promise<Venda> {
  throw new Error('Atualização de vendas não implementada via RPC');
}

export async function deleteVenda(id: string): Promise<void> {
  throw new Error('Exclusão de vendas não implementada via RPC');
}

// CLIENTES - Usar RPCs para operações CRUD
export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_clientes');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createCliente(cliente: ClienteCreate): Promise<Cliente> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_cliente', {
      p_nome: cliente.nome,
      p_email: cliente.email,
      p_telefone: cliente.telefone,
      p_funil_fase: 'lead',
      p_status: 'ativo'
    });
  if (error) throw new Error(error.message);
  return { id: data?.cliente_id, ...cliente, criado_em: new Date().toISOString() } as Cliente;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_cliente', { p_cliente_id: id });
  if (error) throw new Error(error.message);
}

// PRODUTOS - Usar RPCs para operações CRUD
export async function fetchProdutos(): Promise<Produto[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_produtos');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createProduto(produto: ProdutoCreate): Promise<Produto> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_produto', {
      p_nome: produto.nome,
      p_descricao: produto.descricao,
      p_tipo: 'produto',
      p_preco_base: produto.preco_venda || 0,
      p_sku: produto.sku,
      p_qtd_inicial: produto.estoque_atual || 0,
      p_qtd_minima: produto.estoque_minimo || 10
    });
  if (error) throw new Error(error.message);
  return { id: data?.produto_id, ...produto, criado_em: new Date().toISOString() } as Produto;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_produto', { p_produto_id: id });
  if (error) throw new Error(error.message);
}

// OS - Usar RPCs para operações CRUD
export async function fetchOS(): Promise<OrdemServico[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_ordens_servico');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createOS(os: OrdemServicoCreate): Promise<OrdemServico> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_os', {
      p_cliente_id: os.cliente_id,
      p_colaborador_id: os.colaborador_id,
      p_veiculo_equipamento: os.veiculo_equipamento,
      p_descricao_problema: os.descricao_problema,
      p_status: 'aberta',
      p_valor_orcamento: os.valor || 0
    });
  if (error) throw new Error(error.message);
  return { id: data?.os_id, ...os, criado_em: new Date().toISOString() } as OrdemServico;
}

export async function deleteOS(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_os', { p_os_id: id });
  if (error) throw new Error(error.message);
}

// OBRAS - Usar RPCs para operações CRUD
export async function fetchObras(): Promise<Obra[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_obras');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createObra(obra: ObraCreate): Promise<Obra> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_obra', {
      p_cliente_id: obra.cliente_id,
      p_nome: obra.nome,
      p_descricao: obra.descricao,
      p_endereco: obra.endereco,
      p_data_inicio: obra.data_inicio ? new Date(obra.data_inicio) : null,
      p_data_fim_prevista: obra.data_fim_prevista ? new Date(obra.data_fim_prevista) : null,
      p_status: 'planejamento',
      p_orcamento_total: obra.orcamento || 0
    });
  if (error) throw new Error(error.message);
  return { id: data?.obra_id, ...obra, criado_em: new Date().toISOString() } as Obra;
}

export async function deleteObra(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_obra', { p_obra_id: id });
  if (error) throw new Error(error.message);
}

// EMPRESAS - Mantido para uso público (não tenant)
export async function fetchEmpresa(): Promise<Empresa | null> {
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEmpresa(id: string, empresa: EmpresaUpdate): Promise<Empresa> {
  const { data, error } = await getSupabase()
    .from('empresas')
    .update(empresa)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
