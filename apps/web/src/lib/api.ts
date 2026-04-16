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

export interface ClienteUpdate {
  nome?: string;
  telefone?: string;
  email?: string;
  funil_fase?: string;
  status?: string;
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
  estoque_atual?: number;
  estoque_minimo?: number;
  categoria?: string;
  tipo?: string;
}

export interface ProdutoUpdate {
  nome?: string;
  descricao?: string;
  tipo?: string;
  preco_base?: number;
  sku?: string;
  preco_custo?: number;
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

export interface OrdemServicoUpdate {
  cliente_id?: string;
  colaborador_id?: string;
  veiculo_equipamento?: string;
  descricao_problema?: string;
  status?: string;
  valor_orcamento?: number;
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

export interface ObraUpdate {
  cliente_id?: string;
  nome?: string;
  descricao?: string;
  endereco?: string;
  data_inicio?: string;
  data_fim_prevista?: string;
  status?: string;
  orcamento_total?: number;
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

export interface Funcionario {
  id: string;
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  salario?: number;
  role?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface FuncionarioCreate {
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  salario?: number;
  role?: string;
}

export interface FuncionarioUpdate {
  nome?: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  salario?: number;
  role?: string;
}

export interface Financeiro {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  categoria?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface FinanceiroCreate {
  tipo: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status?: string;
  categoria?: string;
}

export interface FinanceiroUpdate {
  tipo?: string;
  descricao?: string;
  valor?: number;
  data_vencimento?: string;
  status?: string;
  categoria?: string;
}

export interface Comissao {
  id: string;
  colaborador_id: string;
  venda_id?: string;
  valor_comissao: number;
  valor_venda?: number;
  periodo_referencia: string;
  status_pagamento: string;
  data_pagamento?: string;
  criado_em: string;
}

export interface ComissaoUpdate {
  status_pagamento?: string;
  data_pagamento?: string;
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
  if (data?.error) throw new Error(data.error);
  return { id: data?.cliente_id, ...cliente, criado_em: new Date().toISOString() } as Cliente;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_cliente', { p_cliente_id: id });
  if (error) throw new Error(error.message);
}

export async function updateCliente(id: string, cliente: ClienteUpdate): Promise<Cliente> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_cliente', {
      p_cliente_id: id,
      p_nome: cliente.nome,
      p_email: cliente.email,
      p_telefone: cliente.telefone,
      p_funil_fase: cliente.funil_fase || 'lead',
      p_status: cliente.status || 'ativo'
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as Cliente;
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
      p_descricao: produto.descricao || null,
      p_tipo: produto.tipo || 'produto',
      p_preco_base: produto.preco_venda || 0,
      p_sku: produto.sku || null,
      p_preco_custo: produto.preco_custo || 0,
      p_categoria: produto.categoria || 'geral'
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { id: data?.produto_id, ...produto, criado_em: new Date().toISOString() } as Produto;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_produto', { p_produto_id: id });
  if (error) throw new Error(error.message);
}

export async function updateProduto(id: string, produto: ProdutoUpdate): Promise<Produto> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_produto', {
      p_produto_id: id,
      p_nome: produto.nome,
      p_descricao: produto.descricao,
      p_tipo: produto.tipo || 'produto',
      p_preco_base: produto.preco_base,
      p_sku: produto.sku,
      p_preco_custo: produto.preco_custo,
      p_categoria: produto.categoria
    });
  if (error) throw new Error(error.message);
  return data as Produto;
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
  if (data?.error) throw new Error(data.error);
  return { id: data?.os_id, ...os, criado_em: new Date().toISOString() } as OrdemServico;
}

export async function deleteOS(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_os', { p_os_id: id });
  if (error) throw new Error(error.message);
}

export async function updateOS(id: string, os: OrdemServicoUpdate): Promise<OrdemServico> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_os', {
      p_os_id: id,
      p_cliente_id: os.cliente_id,
      p_colaborador_id: os.colaborador_id,
      p_veiculo_equipamento: os.veiculo_equipamento,
      p_descricao_problema: os.descricao_problema,
      p_status: os.status || 'aberta',
      p_valor_orcamento: os.valor_orcamento
    });
  if (error) throw new Error(error.message);
  return data as OrdemServico;
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
  if (data?.error) throw new Error(data.error);
  return { id: data?.obra_id, ...obra, criado_em: new Date().toISOString() } as Obra;
}

export async function deleteObra(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_obra', { p_obra_id: id });
  if (error) throw new Error(error.message);
}

export async function updateObra(id: string, obra: ObraUpdate): Promise<Obra> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_obra', {
      p_obra_id: id,
      p_cliente_id: obra.cliente_id,
      p_nome: obra.nome,
      p_descricao: obra.descricao,
      p_endereco: obra.endereco,
      p_data_inicio: obra.data_inicio ? new Date(obra.data_inicio) : null,
      p_data_fim_prevista: obra.data_fim_prevista ? new Date(obra.data_fim_prevista) : null,
      p_status: obra.status || 'planejada',
      p_orcamento_total: obra.orcamento_total
    });
  if (error) throw new Error(error.message);
  return data as Obra;
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

// FUNCIONARIOS - Usar RPCs para operações CRUD
export async function fetchFuncionarios(): Promise<Funcionario[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_funcionarios');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateFuncionario(id: string, funcionario: FuncionarioUpdate): Promise<Funcionario> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_funcionario', {
      p_funcionario_id: id,
      p_nome: funcionario.nome,
      p_cargo: funcionario.cargo,
      p_email: funcionario.email,
      p_telefone: funcionario.telefone,
      p_salario: funcionario.salario,
      p_role: funcionario.role || 'funcionario'
    });
  if (error) throw new Error(error.message);
  return data as Funcionario;
}

export async function createFuncionario(funcionario: FuncionarioCreate): Promise<Funcionario> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_funcionario', {
      p_nome: funcionario.nome,
      p_cargo: funcionario.cargo,
      p_email: funcionario.email,
      p_telefone: funcionario.telefone,
      p_salario: funcionario.salario,
      p_role: funcionario.role || 'funcionario'
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { id: data?.funcionario_id, ...funcionario, criado_em: new Date().toISOString() } as Funcionario;
}

export async function deleteFuncionario(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_funcionario', { p_funcionario_id: id });
  if (error) throw new Error(error.message);
}

// FINANCEIRO - Usar RPCs para operações CRUD
export async function fetchFinanceiro(): Promise<Financeiro[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_financeiro');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateFinanceiro(id: string, financeiro: FinanceiroUpdate): Promise<Financeiro> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_financeiro', {
      p_financeiro_id: id,
      p_tipo: financeiro.tipo,
      p_descricao: financeiro.descricao,
      p_valor: financeiro.valor,
      p_data_vencimento: financeiro.data_vencimento ? new Date(financeiro.data_vencimento) : null,
      p_status: financeiro.status || 'pendente',
      p_categoria: financeiro.categoria
    });
  if (error) throw new Error(error.message);
  return data as Financeiro;
}

export async function createFinanceiro(financeiro: FinanceiroCreate): Promise<Financeiro> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_financeiro', {
      p_tipo: financeiro.tipo,
      p_descricao: financeiro.descricao,
      p_valor: financeiro.valor,
      p_data_vencimento: financeiro.data_vencimento ? new Date(financeiro.data_vencimento) : null,
      p_status: financeiro.status || 'pendente',
      p_categoria: financeiro.categoria
    });
  if (error) throw new Error(error.message);
  return { id: data?.financeiro_id, ...financeiro, criado_em: new Date().toISOString() } as Financeiro;
}

export async function deleteFinanceiro(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_financeiro', { p_financeiro_id: id });
  if (error) throw new Error(error.message);
}

// COMISSOES - Usar RPCs para operações CRUD
export async function fetchComissoes(): Promise<Comissao[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_comissoes');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateComissao(id: string, comissao: ComissaoUpdate): Promise<Comissao> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_comissao', {
      p_comissao_id: id,
      p_status_pagamento: comissao.status_pagamento,
      p_data_pagamento: comissao.data_pagamento ? new Date(comissao.data_pagamento) : null
    });
  if (error) throw new Error(error.message);
  return data as Comissao;
}
