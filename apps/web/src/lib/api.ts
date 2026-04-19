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
  custo_unitario?: number;
  metodo_valoracao?: string;
  codigo_barras?: string;
  codigo_qr?: string;
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

export interface AlertaEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo_alerta: string;
  estoque_atual: number;
  estoque_minimo: number;
  mensagem: string;
  status: string;
  criado_em: string;
  resolvido_em?: string;
}

export interface KitItem {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
}

export interface Kit {
  id: string;
  produto_id: string;
  produto_nome: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  itens: KitItem[];
}

export interface KitCreate {
  produto_id: string;
  nome: string;
  descricao?: string;
  itens: { produto_id: string; quantidade: number }[];
}

export interface LocalEstoque {
  id: string;
  nome: string;
  tipo: string;
  endereco?: string;
  ativo: boolean;
  criado_em: string;
}

export interface EstoquePorLocal {
  id: string;
  produto_id: string;
  local_id: string;
  quantidade: number;
  criado_em: string;
  atualizado_em: string;
}

export interface TransferenciaEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  local_origem_id: string;
  local_origem_nome: string;
  local_destino_id: string;
  local_destino_nome: string;
  quantidade: number;
  status: string;
  observacao?: string;
  criado_por: string;
  criado_em: string;
  concluida_em?: string;
}

export interface TransferenciaCreate {
  produto_id: string;
  local_origem_id: string;
  local_destino_id: string;
  quantidade: number;
  observacao?: string;
  criado_por: string;
}

export interface ValorizacaoEstoque {
  valor_total: number;
  metodo: string;
  produtos_sem_custo: number;
}

export interface CodigoBarrasResponse {
  success: boolean;
  codigo_barras: string;
  ja_existia?: boolean;
}

export interface PrevisaoDemanda {
  id: string;
  produto_id: string;
  produto_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  dias_analise: number;
  demanda_prevista: number;
  media_venda_diaria: number;
  demanda_real?: number;
  precisao?: number;
  dias_para_zerar?: number;
  criado_em: string;
}

export interface PrevisaoResult {
  success: boolean;
  demanda_prevista: number;
  media_venda_diaria: number;
  previsao_id: string;
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

export interface ObraEtapa {
  id: string;
  obra_id: string;
  nome: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  data_inicio?: string;
  data_fim_prevista?: string;
  ordem: number;
  orcamento?: number;
  criado_em: string;
}

export interface ObraEtapaCreate {
  obra_id: string;
  nome: string;
  descricao?: string;
  status?: 'pendente' | 'em_andamento' | 'concluida';
  data_inicio?: string;
  data_fim_prevista?: string;
  ordem?: number;
  orcamento?: number;
}

export interface ObraEtapaUpdate {
  id?: string;
  obra_id?: string;
  nome?: string;
  descricao?: string;
  status?: 'pendente' | 'em_andamento' | 'concluida';
  data_inicio?: string;
  data_fim_prevista?: string;
  ordem?: number;
  orcamento?: number;
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
      p_telefone: cliente.telefone || null,
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
      p_categoria: produto.categoria || 'geral',
      p_estoque_atual: produto.estoque_atual || 0,
      p_estoque_minimo: produto.estoque_minimo || 10
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

// Alertas de Estoque
export async function verificarAlertasEstoque(): Promise<{ success: boolean; alertas_criados: number }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_verificar_alertas_estoque');
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; alertas_criados: number };
}

export async function fetchAlertasEstoque(status?: string): Promise<AlertaEstoque[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_alertas_estoque', {
      p_status: status || null,
      p_limit: 100,
      p_offset: 0
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data || [];
}

export async function resolverAlertaEstoque(alertaId: string, status: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_resolver_alerta_estoque', {
      p_alerta_id: alertaId,
      p_status: status
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// Kits
export async function criarKit(kit: KitCreate): Promise<{ kit_id: string }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_kit', {
      p_produto_id: kit.produto_id,
      p_nome: kit.nome,
      p_descricao: kit.descricao,
      p_itens: JSON.stringify(kit.itens)
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { kit_id: string };
}

export async function fetchKits(): Promise<Kit[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_kits');
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data || [];
}

export async function excluirKit(kitId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_excluir_kit', {
      p_kit_id: kitId
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

export async function venderKit(kitId: string, quantidade: number = 1): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_vender_kit', {
      p_kit_id: kitId,
      p_quantidade: quantidade
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// Locais de Estoque
export async function criarLocalEstoque(local: Omit<LocalEstoque, 'id' | 'ativo' | 'criado_em'>): Promise<{ local_id: string }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_local_estoque', {
      p_nome: local.nome,
      p_tipo: local.tipo,
      p_endereco: local.endereco
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { local_id: string };
}

export async function fetchLocaisEstoque(): Promise<LocalEstoque[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_locais_estoque');
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data || [];
}

export async function desativarLocalEstoque(localId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_desativar_local_estoque', {
      p_local_id: localId
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// Transferências de Estoque
export async function criarTransferencia(transferencia: TransferenciaCreate): Promise<{ transferencia_id: string }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_transferencia', {
      p_produto_id: transferencia.produto_id,
      p_local_origem_id: transferencia.local_origem_id,
      p_local_destino_id: transferencia.local_destino_id,
      p_quantidade: transferencia.quantidade,
      p_observacao: transferencia.observacao,
      p_criado_por: transferencia.criado_por
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { transferencia_id: string };
}

export async function fetchTransferencias(status?: string): Promise<TransferenciaEstoque[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_transferencias', {
      p_status: status
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data || [];
}

export async function concluirTransferencia(transferenciaId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_concluir_transferencia', {
      p_transferencia_id: transferenciaId
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

export async function cancelarTransferencia(transferenciaId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_cancelar_transferencia', {
      p_transferencia_id: transferenciaId
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// Valoração de Estoque
export async function calcularValorEstoque(metodo: string = 'custo_medio'): Promise<ValorizacaoEstoque> {
  const { data, error } = await getSupabase()
    .rpc('tenant_calcular_valor_estoque', {
      p_metodo: metodo
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as ValorizacaoEstoque;
}

export async function atualizarCustoProduto(produtoId: string, custo: number, metodo: string = 'custo_medio'): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_custo_produto', {
      p_produto_id: produtoId,
      p_custo_unitario: custo,
      p_metodo_valoracao: metodo
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// Códigos de Barras/QR
export async function gerarCodigoBarras(produtoId: string): Promise<CodigoBarrasResponse> {
  const { data, error } = await getSupabase()
    .rpc('tenant_gerar_codigo_barras', {
      p_produto_id: produtoId
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as CodigoBarrasResponse;
}

export async function buscarProdutoPorCodigo(codigo: string): Promise<any> {
  const { data, error } = await getSupabase()
    .rpc('tenant_buscar_produto_por_codigo', {
      p_codigo: codigo
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// Previsão de Demanda
export async function gerarPrevisaoDemanda(produtoId: string, diasAnalise: number = 30, diasPrevisao: number = 30): Promise<PrevisaoResult> {
  const { data, error } = await getSupabase()
    .rpc('tenant_gerar_previsao_demanda', {
      p_produto_id: produtoId,
      p_dias_analise: diasAnalise,
      p_dias_previsao: diasPrevisao
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as PrevisaoResult;
}

export async function fetchPrevisoesDemanda(produtoId?: string): Promise<PrevisaoDemanda[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_previsoes_demanda', {
      p_produto_id: produtoId || null
    });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function atualizarDemandaReal(previsaoId: string, demandaReal: number): Promise<{ success: boolean; precisao: number }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_demanda_real', {
      p_previsao_id: previsaoId,
      p_demanda_real: demandaReal
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; precisao: number };
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
      p_cliente_id: os.cliente_id || null,
      p_colaborador_id: os.colaborador_id || null,
      p_veiculo_equipamento: os.veiculo_equipamento || null,
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
      p_status: 'planejada',
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

// ETAPAS DE OBRAS - Usar RPCs para operações CRUD
export interface ObraEtapa {
  id: string;
  obra_id: string;
  nome: string;
  descricao?: string;
  data_prevista: string;
  data_conclusao?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  ordem: number;
  criado_em: string;
  atualizado_em?: string;
}

export interface ObraEtapaCreate {
  obra_id: string;
  nome: string;
  descricao?: string;
  data_prevista: string;
  ordem: number;
  status?: 'pendente' | 'em_andamento' | 'concluida';
}

export interface ObraEtapaUpdate {
  nome?: string;
  descricao?: string;
  data_prevista?: string;
  data_conclusao?: string;
  status?: 'pendente' | 'em_andamento' | 'concluida';
  ordem?: number;
}

export interface ObraProgresso {
  total: number;
  concluidas: number;
  em_andamento: number;
  pendentes: number;
  percentual: number;
}

export async function fetchObraEtapas(obraId: string): Promise<ObraEtapa[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_etapas_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createObraEtapa(etapa: ObraEtapaCreate): Promise<ObraEtapa> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_etapa_obra', {
      p_obra_id: etapa.obra_id,
      p_nome: etapa.nome,
      p_descricao: etapa.descricao,
      p_data_prevista: etapa.data_prevista ? new Date(etapa.data_prevista) : null,
      p_ordem: etapa.ordem,
      p_status: etapa.status || 'pendente'
    });
  if (error) throw new Error(error.message);
  return { id: data?.etapa_id, ...etapa, criado_em: new Date().toISOString() } as ObraEtapa;
}

export async function updateObraEtapa(etapaId: string, etapa: ObraEtapaUpdate): Promise<ObraEtapa> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_etapa_obra', {
      p_etapa_id: etapaId,
      p_nome: etapa.nome,
      p_descricao: etapa.descricao,
      p_data_prevista: etapa.data_prevista ? new Date(etapa.data_prevista) : null,
      p_data_conclusao: etapa.data_conclusao ? new Date(etapa.data_conclusao) : null,
      p_status: etapa.status || 'pendente',
      p_ordem: etapa.ordem
    });
  if (error) throw new Error(error.message);
  return data as ObraEtapa;
}

export async function deleteObraEtapa(etapaId: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_etapa_obra', { p_etapa_id: etapaId });
  if (error) throw new Error(error.message);
}

export async function fetchObraProgresso(obraId: string): Promise<ObraProgresso> {
  const { data, error } = await getSupabase()
    .rpc('tenant_obras_progresso', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return data as ObraProgresso;
}

// CUSTOS DE OBRAS - Usar RPCs para operações CRUD
export interface ObraCusto {
  id: string;
  obra_id: string;
  categoria: string;
  descricao?: string;
  valor_previsto: number;
  valor_real?: number;
  data: string;
  tipo: 'material' | 'mao_de_obra' | 'equipamento' | 'servico' | 'outro';
  fornecedor_id?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface ObraCustoCreate {
  obra_id: string;
  categoria: string;
  descricao?: string;
  valor_previsto: number;
  data: string;
  tipo: 'material' | 'mao_de_obra' | 'equipamento' | 'servico' | 'outro';
  fornecedor_id?: string;
}

export interface ObraCustoUpdate {
  categoria?: string;
  descricao?: string;
  valor_previsto?: number;
  valor_real?: number;
  data?: string;
  tipo?: 'material' | 'mao_de_obra' | 'equipamento' | 'servico' | 'outro';
  fornecedor_id?: string;
}

export interface ObraResumoFinanceiro {
  orcamento_total: number;
  total_previsto: number;
  total_real: number;
  variacao: number;
  percentual_orcamento_utilizado: number;
}

export async function fetchObraCustos(obraId: string): Promise<ObraCusto[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_custos_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createObraCusto(custo: ObraCustoCreate): Promise<ObraCusto> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_custo_obra', {
      p_obra_id: custo.obra_id,
      p_categoria: custo.categoria,
      p_descricao: custo.descricao,
      p_valor_previsto: custo.valor_previsto,
      p_data: custo.data ? new Date(custo.data) : null,
      p_tipo: custo.tipo,
      p_fornecedor_id: custo.fornecedor_id
    });
  if (error) throw new Error(error.message);
  return { id: data?.custo_id, ...custo, criado_em: new Date().toISOString() } as ObraCusto;
}

export async function updateObraCusto(custoId: string, custo: ObraCustoUpdate): Promise<ObraCusto> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_custo_obra', {
      p_custo_id: custoId,
      p_categoria: custo.categoria,
      p_descricao: custo.descricao,
      p_valor_previsto: custo.valor_previsto,
      p_valor_real: custo.valor_real,
      p_data: custo.data ? new Date(custo.data) : null,
      p_tipo: custo.tipo,
      p_fornecedor_id: custo.fornecedor_id
    });
  if (error) throw new Error(error.message);
  return data as ObraCusto;
}

export async function deleteObraCusto(custoId: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_custo_obra', { p_custo_id: custoId });
  if (error) throw new Error(error.message);
}

export async function fetchObraResumoFinanceiro(obraId: string): Promise<ObraResumoFinanceiro> {
  const { data, error } = await getSupabase()
    .rpc('tenant_obras_resumo_financeiro', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return data as ObraResumoFinanceiro;
}

// RECURSOS DE OBRAS - Usar RPCs para operações CRUD
export interface ObraRecurso {
  id: string;
  obra_id: string;
  tipo: 'material' | 'mao_de_obra' | 'equipamento';
  descricao: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
  status: 'alocado' | 'em_uso' | 'liberado';
  data_alocacao: string;
  fornecedor_id?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface ObraRecursoCreate {
  obra_id: string;
  tipo: 'material' | 'mao_de_obra' | 'equipamento';
  descricao: string;
  quantidade: number;
  unidade?: string;
  custo_unitario: number;
  status?: 'alocado' | 'em_uso' | 'liberado';
  data_alocacao?: string;
  fornecedor_id?: string;
}

export interface ObraRecursoUpdate {
  tipo?: 'material' | 'mao_de_obra' | 'equipamento';
  descricao?: string;
  quantidade?: number;
  unidade?: string;
  custo_unitario?: number;
  status?: 'alocado' | 'em_uso' | 'liberado';
  data_alocacao?: string;
  fornecedor_id?: string;
}

export async function fetchObrasRecursos(obraId: string): Promise<ObraRecurso[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_recursos_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function alocarRecursoObra(recurso: ObraRecursoCreate): Promise<ObraRecurso> {
  const { data, error } = await getSupabase()
    .rpc('tenant_alocar_recurso_obra', {
      p_obra_id: recurso.obra_id,
      p_tipo: recurso.tipo,
      p_descricao: recurso.descricao,
      p_quantidade: recurso.quantidade,
      p_unidade: recurso.unidade || 'un',
      p_custo_unitario: recurso.custo_unitario,
      p_status: recurso.status || 'alocado',
      p_data_alocacao: recurso.data_alocacao ? new Date(recurso.data_alocacao) : null,
      p_fornecedor_id: recurso.fornecedor_id
    });
  if (error) throw new Error(error.message);
  return { id: data?.recurso_id, ...recurso, criado_em: new Date().toISOString() } as ObraRecurso;
}

export async function updateObraRecurso(recursoId: string, recurso: ObraRecursoUpdate): Promise<ObraRecurso> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_recurso_obra', {
      p_recurso_id: recursoId,
      p_tipo: recurso.tipo,
      p_descricao: recurso.descricao,
      p_quantidade: recurso.quantidade,
      p_unidade: recurso.unidade,
      p_custo_unitario: recurso.custo_unitario,
      p_status: recurso.status || 'alocado',
      p_data_alocacao: recurso.data_alocacao ? new Date(recurso.data_alocacao) : null,
      p_fornecedor_id: recurso.fornecedor_id
    });
  if (error) throw new Error(error.message);
  return data as ObraRecurso;
}

export async function deleteObraRecurso(recursoId: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_recurso_obra', { p_recurso_id: recursoId });
  if (error) throw new Error(error.message);
}

// DOCUMENTOS DE OBRAS - Usar Supabase Storage + RPCs para operações CRUD
export interface ObraDocumento {
  id: string;
  obra_id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  caminho_storage: string;
  descricao?: string;
  criado_por: string;
  criado_em: string;
}

export async function fetchObraDocumentos(obraId: string): Promise<ObraDocumento[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_documentos_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function uploadObraDocumento(file: File, obraId: string, descricao?: string): Promise<ObraDocumento> {
  const supabase = getSupabase();
  
  // Obter schema do tenant
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('empresa_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();
    
  if (!profileData) throw new Error('Perfil não encontrado');
  
  const { data: empresaData } = await supabase
    .from('empresas')
    .select('schema_name')
    .eq('id', profileData.empresa_id)
    .single();
    
  if (!empresaData) throw new Error('Empresa não encontrada');
  
  const schema = empresaData.schema_name;
  
  // Validações
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxFileSize) {
    throw new Error('Arquivo muito grande. Máximo 10MB.');
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido.');
  }
  
  // Gerar caminho único
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop();
  const caminho = `${schema}/${obraId}/${timestamp}_${random}.${ext}`;
  
  // Upload via Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('obras-documentos')
    .upload(caminho, file);
    
  if (uploadError) throw new Error(uploadError.message);
  
  // Obter URL pública
  const { data: { publicUrl } } = supabase
    .storage
    .from('obras-documentos')
    .getPublicUrl(caminho);
  
  // Registrar via RPC
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('tenant_upload_documento_obra', {
      p_obra_id: obraId,
      p_nome: file.name,
      p_tipo: file.type,
      p_tamanho: file.size,
      p_url: publicUrl,
      p_caminho_storage: caminho,
      p_descricao: descricao,
      p_criado_por: (await supabase.auth.getUser()).data.user?.id
    });
    
  if (rpcError) throw new Error(rpcError.message);
  
  return {
    id: rpcData?.documento_id,
    obra_id: obraId,
    nome: file.name,
    tipo: file.type,
    tamanho: file.size,
    url: publicUrl,
    caminho_storage: caminho,
    descricao,
    criado_por: (await supabase.auth.getUser()).data.user?.id || '',
    criado_em: new Date().toISOString()
  } as ObraDocumento;
}

export async function deleteObraDocumento(documentoId: string): Promise<void> {
  const supabase = getSupabase();
  
  // Chamar RPC para obter caminho_storage
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('tenant_excluir_documento_obra', { p_documento_id: documentoId });
    
  if (rpcError) throw new Error(rpcError.message);
  
  // Remover do storage
  const caminho = rpcData?.caminho_storage;
  if (caminho) {
    const { error: storageError } = await supabase
      .storage
      .from('obras-documentos')
      .remove([caminho]);
      
    if (storageError) {
      console.error('Erro ao remover do storage:', storageError);
      // Não lançar erro se o storage falhar, pois o registro já foi removido do banco
    }
  }
}
