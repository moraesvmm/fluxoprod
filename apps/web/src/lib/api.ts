import { createClient } from '@/utils/supabase/client';
export { createClient as getSupabase };

// ─── Types ───────────────────────────────────────────────
export interface Venda {
  id: string;
  cliente: string;
  cliente_id?: string;
  valor: number;
  valor_total?: number;
  total?: number;
  metodo: string;
  metodo_pagamento?: string;
  status: 'concluido' | 'pendente' | 'cancelado' | 'parcialmente_devolvida' | string;
  vendedor_id?: string;
  vendedor_nome?: string;
  criado_em: string;
  data_venda?: string;
  atualizado_em?: string;
  nfe_status?: 'nao_emitida' | 'pendente' | 'emitida' | 'erro' | 'cancelada';
  nfe_chave?: string;
  nfe_xml_url?: string;
  nfe_pdf_url?: string;
  nfe_protocolo?: string;
  valor_custo_total?: number;
  desconto_aplicado?: number;
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
  cpf_cnpj?: string;
  documento?: string;
  endereco?: string;
  funil_fase?: string;
  status?: string;
  tags?: string[];
  criado_em: string;
  atualizado_em?: string;
  deleted_at?: string;
}

export interface ClienteCreate {
  nome: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  endereco?: string;
  funil_fase?: string;
  status?: string;
}

export interface ClienteUpdate {
  nome?: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  endereco?: string;
  funil_fase?: string;
  status?: string;
}

export interface ClienteListParams {
  cursor?: string | null;
  limit?: number;
  status?: string | null;
  funil_fase?: string | null;
  busca?: string | null;
  order_by?: string;
  order_dir?: string;
  tags?: string[] | null;
}

export interface ClienteListResult {
  data: Cliente[];
  next_cursor?: string | null;
}

export interface InteracaoCliente {
  id: string;
  cliente_id: string;
  tipo: 'ligacao' | 'email' | 'reuniao' | 'nota' | 'whatsapp' | 'visita' | 'venda';
  titulo: string;
  descricao?: string;
  data_interacao: string;
  duracao_minutos?: number;
  usuario_id?: string;
  metadata?: {
    produto_descricao?: string;
    valor?: number;
    ciclo_recompra_dias?: number;
    [key: string]: any;
  };
  criado_em: string;
  atualizado_em?: string;
}

export interface InteracaoClienteCreate {
  cliente_id: string;
  tipo: 'ligacao' | 'email' | 'reuniao' | 'nota' | 'whatsapp' | 'visita' | 'venda';
  titulo: string;
  descricao?: string;
  data_interacao?: string;
  duracao_minutos?: number;
  usuario_id?: string;
  metadata?: {
    produto_descricao?: string;
    valor?: number;
    ciclo_recompra_dias?: number;
    [key: string]: any;
  };
}

export interface InteracaoClienteListParams {
  cliente_id: string;
  limit?: number;
  cursor?: string | null;
}

export interface InteracaoClienteListResult {
  data: InteracaoCliente[];
  next_cursor?: string | null;
}

export interface TagCatalog {
  id: string;
  nome: string;
  cor: string;
  uso_count: number;
  criado_em: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  sku?: string;
  preco_custo?: number;
  preco_venda?: number;
  ncm?: string;
  cfop_padrao?: string;
  origem?: number;
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
  preco_venda?: number;
  estoque_minimo?: number;
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
  numero: number;
  cliente_id?: string;
  veiculo_equipamento?: string;
  descricao_problema?: string;
  colaborador_id?: string;
  status: string;
  valor_orcamento: number;
  tempo_total_minutos?: number;
  timer_iniciado_em?: string;
  criado_em: string;
  atualizado_em?: string;
  cliente?: { nome: string }; // joined
  colaborador?: { nome: string }; // joined
}

export interface OSLucro {
  total_venda: number;
  total_custo: number;
  lucro: number;
}

export interface OrdemServicoCreate {
  cliente_id?: string;
  veiculo_equipamento?: string;
  descricao_problema?: string;
  colaborador_id?: string;
  status?: string;
  valor_orcamento?: number;
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
  preco_custo?: number;
  ncm?: string;
  cfop_padrao?: string;
  origem?: number;
  criado_em: string;
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
  subscription_id?: string;
  subscription_status?: 'ACTIVE' | 'OVERDUE' | 'INACTIVE' | 'TRIAL';
  data_vencimento?: string;
  trial_ends_at?: string;
  plan_name?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  regime_tributario?: string | number;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  codigo_municipio_ibge?: string;
  focusnfe_token_producao?: string;
  focusnfe_token_homologacao?: string;
  nfe_ambiente?: 'producao' | 'homologacao';
  nfe_certificado_senha?: string;
  limite_usuarios?: number;
}

export interface EmpresaUpdate {
  cnpj?: string;
  razao_social?: string;
  porte?: string;
  segmento?: string;
  status?: string;
  subscription_id?: string;
  subscription_status?: 'ACTIVE' | 'OVERDUE' | 'INACTIVE' | 'TRIAL';
  data_vencimento?: string;
  trial_ends_at?: string;
  plan_name?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  regime_tributario?: string | number;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  codigo_municipio_ibge?: string;
  focusnfe_token_producao?: string;
  focusnfe_token_homologacao?: string;
  nfe_ambiente?: 'producao' | 'homologacao';
  nfe_certificado_senha?: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  salario?: number;
  role?: string;
  ultimo_mes_pago?: string;
  dia_pagamento?: number;
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  nome_mae?: string;
  endereco?: string;
  pis_pasep?: string;
  ctps?: string;
  data_admissao?: string;
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
  ultimo_mes_pago?: string;
  dia_pagamento?: number;
}

export interface FuncionarioUpdate {
  nome?: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  salario?: number;
  role?: string;
  ultimo_mes_pago?: string;
  dia_pagamento?: number;
}

export interface DocumentoFuncionario {
  id: string;
  funcionario_id: string;
  tipo: string;
  nome_arquivo: string;
  tamanho_bytes: number;
  mime_type: string;
  storage_path: string;
  dados_extraidos?: Record<string, any>;
  criado_em: string;
}

export interface DadosPessoais {
  cpf?: string;
  rg?: string;
  data_nascimento?: string;
  nome_mae?: string;
  endereco?: string;
  pis_pasep?: string;
  ctps?: string;
  data_admissao?: string;
}

export interface Cupom {
  id: string;
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  limite_usos?: number;
  usos_atuais: number;
  data_expiracao?: string;
  ativo: boolean;
  criado_em: string;
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
  conciliado?: boolean;
  banco_transacao_id?: string;
  banco_nome?: string;
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

export interface RegraComissao {
  id: string;
  colaborador_id: string;
  tipo_calculo: string;
  valor: number;
  ativo: boolean;
  criado_em: string;
}

export interface RegraComissaoCreate {
  colaborador_id: string;
  tipo_calculo: string;
  valor: number;
  ativo?: boolean;
}

export interface ComissaoUpdate {
  status_pagamento?: string;
  data_pagamento?: string;
}

// ─── Supabase-backed data functions ──────────────────────
// These replace the old ApiClient that hit localhost:8000
// NOW ALL OPERATIONS USE RPCs (Opção A - Database as Source of Truth)

const getSupabase = () => createClient();

function isMissingRpcError(message: string) {
  return message.includes("PGRST202") || message.includes("Could not find the function");
}

// VENDAS - Usar RPC tenant_listar_vendas para leitura
export async function fetchVendas(searchTerm?: string): Promise<Venda[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_vendas', { 
      p_limit: 100,
      p_busca: searchTerm || null
    });
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

export async function cancelarVenda(id: string): Promise<any> {
  const { data, error } = await getSupabase()
    .rpc('tenant_cancelar_venda', { p_venda_id: id });
  if (error) throw new Error(error.message);
  return data;
}

export async function devolverItem(vendaId: string, itemId: string, quantidade: number): Promise<any> {
  const { data, error } = await getSupabase()
    .rpc('tenant_devolver_item', { 
      p_venda_id: vendaId,
      p_venda_item_id: itemId,
      p_quantidade: quantidade
    });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVenda(id: string): Promise<void> {
  throw new Error('Exclusão de vendas não implementada via RPC');
}

// CLIENTES - Usar RPCs para operações CRUD
export async function fetchClientes(params?: ClienteListParams): Promise<ClienteListResult> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_clientes', {
      p_cursor: params?.cursor || null,
      p_limit: params?.limit || 20,
      p_status: params?.status || null,
      p_funil_fase: params?.funil_fase || null,
      p_busca: params?.busca || null,
      p_order_by: params?.order_by || 'criado_em',
      p_order_dir: params?.order_dir || 'DESC',
      p_tags: params?.tags || null
    });
  if (error) throw new Error(error.message);
  
  // Extrair next_cursor do último item
  const clientes = data || [];
  const next_cursor = clientes.length > 0 ? clientes[clientes.length - 1].next_cursor : null;
  
  // Remover next_cursor dos objetos de cliente
  const clientesLimpos = clientes.map((c: any) => {
    const { next_cursor: _, ...rest } = c;
    return rest;
  });
  
  return { data: clientesLimpos, next_cursor };
}

export async function createCliente(cliente: ClienteCreate): Promise<Cliente> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_cliente', {
      p_nome: cliente.nome,
      p_email: cliente.email,
      p_telefone: cliente.telefone,
      p_endereco: cliente.endereco || null,
      p_funil_fase: 'lead',
      p_status: 'ativo',
      p_cpf_cnpj: cliente.cpf_cnpj || null
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { id: data?.cliente_id, ...cliente, criado_em: new Date().toISOString() } as Cliente;
}

export async function importarClientesLote(clientes: any[]): Promise<{ count: number }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_importar_clientes_lote', {
      p_clientes: clientes
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { count: data?.count || 0 };
}

export async function obterSugestoesNurturing() {
  const { data, error } = await getSupabase().rpc('tenant_obter_sugestoes_nurturing');
  if (error) throw new Error(error.message);
  return data;
}

export async function finalizarAlertaNurturing(id: string | null) {
  const { data, error } = await getSupabase().rpc('tenant_finalizar_alerta_nurturing', { p_alerta_id: id });
  if (error) throw new Error(error.message);
  return data;
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
      p_nome: cliente.nome ?? null,
      p_email: cliente.email ?? null,
      p_telefone: cliente.telefone ?? null,
      p_funil_fase: cliente.funil_fase ?? null,
      p_status: cliente.status ?? null,
      p_cpf_cnpj: cliente.cpf_cnpj ?? null,
      p_endereco: cliente.endereco ?? null
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as Cliente;
}

// INTERAÇÕES DE CLIENTES - Usar RPCs para operações CRUD
export async function fetchInteracoes(params: InteracaoClienteListParams): Promise<InteracaoClienteListResult> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_interacoes', {
      p_cliente_id: params.cliente_id,
      p_limit: params.limit || 20,
      p_cursor: params.cursor || null
    });
  if (error) throw new Error(error.message);
  
  // Extrair next_cursor do último item
  const interacoes = data || [];
  const next_cursor = interacoes.length > 0 ? interacoes[interacoes.length - 1].next_cursor : null;
  
  // Remover next_cursor dos objetos de interação
  const interacoesLimpos = interacoes.map((i: any) => {
    const { next_cursor: _, ...rest } = i;
    return rest;
  });
  
  return { data: interacoesLimpos, next_cursor };
}

export async function createInteracao(interacao: InteracaoClienteCreate): Promise<InteracaoCliente> {
  const { data, error } = await getSupabase()
    .rpc('tenant_criar_interacao', {
      p_cliente_id: interacao.cliente_id,
      p_tipo: interacao.tipo,
      p_titulo: interacao.titulo,
      p_descricao: interacao.descricao || null,
      p_data_interacao: interacao.data_interacao || new Date().toISOString(),
      p_duracao_minutos: interacao.duracao_minutos || null,
      p_usuario_id: interacao.usuario_id || null,
      p_metadata: interacao.metadata || {}
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { id: data?.interacao_id, ...interacao, criado_em: new Date().toISOString() } as InteracaoCliente;
}

export async function deleteInteracao(id: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_excluir_interacao', { p_interacao_id: id });
  if (error) throw new Error(error.message);
}

// TAGS - RPCs para gerenciar tags de clientes
export async function adicionarTag(clienteId: string, tag: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_adicionar_tag', { p_cliente_id: clienteId, p_tag: tag });
  if (error) throw new Error(error.message);
  return data as { success: boolean; error?: string };
}

export async function removerTag(clienteId: string, tag: string): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_remover_tag', { p_cliente_id: clienteId, p_tag: tag });
  if (error) throw new Error(error.message);
}

export async function listarTagsCatalog(busca: string = '', limit: number = 20): Promise<TagCatalog[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_tags_catalog', { p_busca: busca, p_limit: limit });
  if (error) throw new Error(error.message);
  return data || [];
}

// CAMPANHA EM MASSA - RPC para envio de campanhas
export async function enviarCampanhaMassa(
  clienteIds: string[],
  titulo: string,
  mensagem: string,
  tipo: string = 'email'
): Promise<{ success: boolean; enviados: number; falhas: number; total: number }> {
  const { data, error } = await getSupabase()
    .rpc('tenant_enviar_campanha', { 
      p_cliente_ids: clienteIds, 
      p_titulo: titulo, 
      p_mensagem: mensagem,
      p_tipo: tipo
    });
  if (error) throw new Error(error.message);
  return data as { success: boolean; enviados: number; falhas: number; total: number };
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
      p_valor_orcamento: os.valor_orcamento || 0
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { id: data?.os_id, ...os, valor_orcamento: os.valor_orcamento || 0, criado_em: new Date().toISOString() } as OrdemServico;
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
      p_cliente_id: os.cliente_id ?? null,
      p_colaborador_id: os.colaborador_id ?? null,
      p_veiculo_equipamento: os.veiculo_equipamento ?? null,
      p_descricao_problema: os.descricao_problema ?? null,
      p_status: os.status ?? null,
      p_valor_orcamento: os.valor_orcamento ?? null
    });
  if (error) throw new Error(error.message);
  return data as OrdemServico;
}

export async function fetchOSLucro(id: string): Promise<OSLucro> {
  const { data, error } = await getSupabase()
    .rpc('tenant_obter_lucro_os', { p_os_id: id });
  if (error) throw new Error(error.message);
  return data as OSLucro;
}

export async function gerenciarTimerOS(id: string, acao: 'iniciar' | 'parar'): Promise<void> {
  const { error } = await getSupabase()
    .rpc('tenant_gerenciar_timer_os', { p_os_id: id, p_acao: acao });
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
    .select('id, cnpj, razao_social, porte, segmento, schema_name, criado_em, status, subscription_id, subscription_status, data_vencimento, trial_ends_at, plan_name, inscricao_estadual, inscricao_municipal, regime_tributario, logradouro, numero, complemento, bairro, cidade, uf, cep, codigo_municipio_ibge, nfe_ambiente')
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
      p_role: funcionario.role || 'funcionario',
      p_dia_pagamento: funcionario.dia_pagamento
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
      p_role: funcionario.role || 'funcionario',
      p_dia_pagamento: funcionario.dia_pagamento
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

export async function registrarPagamentoRH(funcionarioId: string, mes: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_registrar_pagamento_rh', { p_funcionario_id: funcionarioId, p_mes: mes });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

export async function registrarPagamentoRHTodos(mes: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_registrar_pagamento_rh_todos', { p_mes: mes });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

// DOCUMENTOS RH
export async function uploadDocumentoRH(funcionarioId: string, tipo: string, arquivo: File): Promise<DocumentoFuncionario> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Nao autenticado');

  const formData = new FormData();
  formData.append('arquivo', arquivo);
  formData.append('funcionario_id', funcionarioId);
  formData.append('tipo', tipo);

  const res = await fetch('/api/tenant/rh/documentos/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Erro no upload');
  return result.documento;
}

export async function listarDocumentosRH(funcionarioId: string): Promise<DocumentoFuncionario[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_documentos', { p_funcionario_id: funcionarioId });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}

export async function obterUrlDocumento(documentoId: string): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Nao autenticado');

  const res = await fetch(`/api/tenant/rh/documentos/${documentoId}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Erro ao obter URL');
  return result.url;
}

export async function excluirDocumentoRH(documentoId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Nao autenticado');

  const res = await fetch(`/api/tenant/rh/documentos/${documentoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Erro ao excluir');
}

export async function atualizarDadosPessoais(funcionarioId: string, dados: DadosPessoais): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc('tenant_atualizar_dados_pessoais', {
      p_funcionario_id: funcionarioId,
      p_cpf: dados.cpf || null,
      p_rg: dados.rg || null,
      p_data_nascimento: dados.data_nascimento || null,
      p_nome_mae: dados.nome_mae || null,
      p_endereco: dados.endereco || null,
      p_pis_pasep: dados.pis_pasep || null,
      p_ctps: dados.ctps || null,
      p_data_admissao: dados.data_admissao || null,
    });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
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

export async function fetchRegrasComissao(): Promise<RegraComissao[]> {
  const { data, error } = await getSupabase()
    .rpc('tenant_listar_regras_comissao');
  if (error) {
    if (isMissingRpcError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  return data || [];
}

export async function createRegraComissao(regra: RegraComissaoCreate): Promise<RegraComissao> {
  const { data, error } = await getSupabase().rpc('tenant_criar_regra_comissao', {
    p_colaborador_id: regra.colaborador_id,
    p_tipo_calculo: regra.tipo_calculo,
    p_valor: regra.valor,
    p_ativo: regra.ativo ?? true,
  });
  if (error) {
    if (isMissingRpcError(error.message)) {
      throw new Error('A funcao de regras de comissao ainda nao foi publicada neste ambiente.');
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return {
    id: data?.regra_id,
    colaborador_id: regra.colaborador_id,
    tipo_calculo: regra.tipo_calculo,
    valor: regra.valor,
    ativo: regra.ativo ?? true,
    criado_em: new Date().toISOString(),
  };
}

export async function deleteRegraComissao(regraId: string): Promise<void> {
  const { data, error } = await getSupabase().rpc('tenant_excluir_regra_comissao', {
    p_regra_id: regraId,
  });
  if (error) {
    if (isMissingRpcError(error.message)) {
      throw new Error('A funcao de regras de comissao ainda nao foi publicada neste ambiente.');
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
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

export interface ObraEtapaCreate {
  obra_id: string;
  nome: string;
  descricao?: string;
  data_prevista: string;
  ordem: number;
  status?: 'pendente' | 'em_andamento' | 'concluida';
}

export interface ObraEtapaUpdate {
  id?: string;
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

export interface DREData {
  faturamento: number;
  cmv: number;
  lucro_bruto: number;
  despesas: number;
  lucro_liquido: number;
  margem_bruta: number;
  margem_liquida: number;
  periodo: {
    inicio: string;
    fim: string;
  };
}

export async function fetchDRE(dataInicio: string, dataFim: string): Promise<DREData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_obter_dre', {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim
  });

  if (error) throw error;
  return data;
}

// ==========================================
// CUPONS (ADMIN & PUBLIC)
// ==========================================


export async function validarCupom(codigo: string): Promise<Cupom> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("validar_cupom", { p_codigo: codigo });
  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data as Cupom;
}

export async function listarCuponsAdmin(): Promise<Cupom[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_listar_cupons");
  if (error) throw error;
  return data as Cupom[];
}

export async function criarCupomAdmin(cupom: Partial<Cupom>): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_criar_cupom", {
    p_codigo: cupom.codigo,
    p_tipo: cupom.tipo,
    p_valor: cupom.valor,
    p_limite_usos: cupom.limite_usos,
    p_data_expiracao: cupom.data_expiracao
  });
  if (error) throw error;
  return data;
}

export async function excluirCupomAdmin(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_excluir_cupom", { p_id: id });
  if (error) throw error;
}

