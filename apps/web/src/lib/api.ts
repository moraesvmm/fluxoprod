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


const getSupabase = () => createClient();

// VENDAS
export async function fetchVendas(): Promise<Venda[]> {
  const { data, error } = await getSupabase()
    .from('vendas')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createVenda(venda: VendaCreate): Promise<Venda> {
  const { data, error } = await getSupabase()
    .from('vendas')
    .insert(venda)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateVenda(id: string, venda: VendaUpdate): Promise<Venda> {
  const { data, error } = await getSupabase()
    .from('vendas')
    .update(venda)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVenda(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('vendas')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// CLIENTES
export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await getSupabase()
    .from('clientes')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createCliente(cliente: ClienteCreate): Promise<Cliente> {
  const { data, error } = await getSupabase()
    .from('clientes')
    .insert(cliente)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('clientes')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// PRODUTOS
export async function fetchProdutos(): Promise<Produto[]> {
  const { data, error } = await getSupabase()
    .from('produtos')
    .select('*')
    .order('nome');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createProduto(produto: ProdutoCreate): Promise<Produto> {
  const { data, error } = await getSupabase()
    .from('produtos')
    .insert(produto)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('produtos')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// OS
export async function fetchOS(): Promise<OrdemServico[]> {
  const { data, error } = await getSupabase()
    .from('ordens_servico')
    .select(`*, cliente:clientes(nome), colaborador:funcionarios(nome)`)
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createOS(os: OrdemServicoCreate): Promise<OrdemServico> {
  const { data, error } = await getSupabase()
    .from('ordens_servico')
    .insert(os)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteOS(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('ordens_servico')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// OBRAS
export async function fetchObras(): Promise<Obra[]> {
  const { data, error } = await getSupabase()
    .from('obras')
    .select(`*, cliente:clientes(nome)`)
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createObra(obra: ObraCreate): Promise<Obra> {
  const { data, error } = await getSupabase()
    .from('obras')
    .insert(obra)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteObra(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('obras')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// EMPRESAS
export async function fetchEmpresa(): Promise<Empresa | null> {
  const { data, error } = await getSupabase()
    .from('empresas')
    .select('*')
    .limit(1)
    .maybeSingle(); // maybeSingle returns null if 0 rows
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
