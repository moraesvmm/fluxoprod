import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database.types';
export { createClient as getSupabase };

export const getSupabaseStrict = () => createClient() as import('@supabase/supabase-js').SupabaseClient<Database>;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };
type UnknownRecord = Record<string, unknown>;
type RpcMutationResult = { error?: string | null } & UnknownRecord;
type UntypedSupabaseClient = ReturnType<typeof createClient>;

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord;
  }

  return null;
}

function getStringField(value: unknown, key: string): string | undefined {
  const record = asRecord(value);
  const field = record?.[key];
  return typeof field === 'string' ? field : undefined;
}

function getNumberField(value: unknown, key: string): number | undefined {
  const record = asRecord(value);
  const field = record?.[key];
  return typeof field === 'number' ? field : undefined;
}

function getArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function assertRpcResult(data: unknown): RpcMutationResult {
  const record = asRecord(data) as RpcMutationResult | null;

  if (record?.error) {
    throw new Error(record.error);
  }

  return record ?? {};
}

// ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ Types ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬
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

export interface NurturingSuggestion {
  id: string | null;
  tipo: 'RECOMPRA' | 'RECUPERACAO' | 'ANIVERSARIO';
  categoria: 'recompra' | 'recuperacao';
  produto_servico: string | null;
  data_alerta: string;
  mensagem_sugerida: string;
  cliente_nome: string;
  cliente_telefone: string;
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
    [key: string]: JsonValue | undefined;
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
    [key: string]: JsonValue | undefined;
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
  preco_base?: number;
  criado_em: string;
  tipo_item?: string;
  unidade_medida?: string;
  image_urls?: string[];
  nf_entrada?: string;
}

export interface ProdutoLookupError {
  error: string;
}

export type ProdutoLookupResult = Produto | ProdutoLookupError | null;

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
  image_urls?: string[];
  nf_entrada?: string;
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
  image_urls?: string[];
  nf_entrada?: string;
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

export interface CaixaContexto {
  filial_id: string;
  filial_nome: string;
  caixa_id: string;
  caixa_codigo: string;
  caixa_nome: string;
  papel: 'operador' | 'supervisor' | 'gerente' | string;
}

export interface CaixaMovimento {
  id: string;
  tipo: 'entrada' | 'saida' | 'estorno' | 'ajuste' | 'suprimento' | string;
  valor: number;
  forma_pagamento: string;
  origem_tipo: string;
  origem_id?: string;
  descricao: string;
  criado_em: string;
}

export interface CircuitoPorForma {
  entradas: number;
  estornos: number;
  saidas: number;
  saldo: number;
}

export interface ResumoCaixa {
  success: boolean;
  sessao_id?: string;
  fechamento_id?: string;
  status: 'nao_aberto' | 'aberto' | 'fechado' | 'reaberto' | string;
  data_operacional: string;
  valor_abertura: number;
  valor_esperado: number;
  formas: Record<string, number>;
  circuito_por_forma: Record<string, CircuitoPorForma>;
  movimentos: CaixaMovimento[];
}

export interface FechamentoCaixaInput {
  filialId: string;
  caixaId: string;
  data: string;
  valoresContados: Record<string, number>;
  observacao?: string;
}

export interface DashboardDono {
  faturamento_hoje: number;
  faturamento_mes: number;
  vendas_mes: number;
  saldo_financeiro: number;
  contas_vencidas: number;
  filial_id: string | null;
  visao: 'geral' | 'filial';
}

export interface LotacaoFilial {
  filial_id: string;
  filial_nome: string;
  caixas_ativos: number;
  permitido: boolean;
  papel: 'operador' | 'supervisor' | 'gerente' | null;
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

export interface EstoqueEntradaItemCreate {
  produto_id: string;
  quantidade: number;
  custo_unitario: number;
  local_id?: string;
  lote?: string;
  data_validade?: string;
}

export interface EstoqueEntradaCreate {
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor_documento?: string;
  numero_documento?: string;
  serie_documento?: string;
  chave_nfe?: string;
  data_emissao?: string;
  observacao?: string;
  origem?: 'manual' | 'xml_nfe' | 'focus_nfe' | 'estoque_inicial' | 'importacao';
  itens: EstoqueEntradaItemCreate[];
  idempotency_key: string;
}

export interface EstoqueEntrada {
  id: string;
  fornecedor_nome?: string;
  fornecedor_documento?: string;
  numero_documento?: string;
  serie_documento?: string;
  chave_nfe?: string;
  data_emissao?: string;
  data_entrada: string;
  valor_total: number;
  origem: string;
  status: string;
  quantidade_itens: number;
}

export interface EstoqueMovimentacao {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo: string;
  origem: string;
  quantidade: number;
  saldo_anterior: number;
  saldo_posterior: number;
  custo_unitario?: number;
  documento?: string;
  entrada_id?: string;
  venda_id?: string;
  transferencia_id?: string;
  criado_em: string;
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
  dias_para_zerar: number | null;
  periodo_inicio: string;
  periodo_fim: string;
  produto_nome?: string;
  demanda_real?: number | null;
  precisao?: number | null;
}

export interface CRMDashboardMetricas {
  total_clientes: number;
  clientes_ativos: number;
  clientes_inativos_30d: number;
  ltv_medio: number;
  churn_rate: number;
  funil_counts: {
    lead: number;
    qualificado: number;
    proposta: number;
    negociacao: number;
    fechado: number;
    perdido: number;
  };
  taxa_conversao: {
    lead_to_qualificado: number;
    qualificado_to_proposta: number;
    proposta_to_negociacao: number;
    negociacao_to_fechado: number;
  };
  velocidade_media: number;
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
  equipamento_serial?: string;
  laudo_tecnico?: string;
  checklist_entrada?: JsonValue;
  tempo_total_minutos?: number;
  timer_iniciado_em?: string;
  criado_em: string;
  atualizado_em?: string;
  cliente?: { nome: string; documento?: string; email?: string }; // joined
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
  equipamento_serial?: string;
  laudo_tecnico?: string;
  checklist_entrada?: JsonValue;
}

export interface OrdemServicoUpdate {
  cliente_id?: string;
  colaborador_id?: string;
  veiculo_equipamento?: string;
  descricao_problema?: string;
  status?: string;
  valor_orcamento?: number;
  equipamento_serial?: string;
  laudo_tecnico?: string;
  checklist_entrada?: JsonValue;
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
  dados_extraidos?: Record<string, JsonValue | undefined>;
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
  filial_id?: string;
}

export interface FinanceiroCreate {
  filial_id?: string;
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

// ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ Supabase-backed data functions ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬ÃÂÂ¢âââ€šÂ¬ÂÂâââ‚¬Å¡ÂÂ¬
// These replace the old ApiClient that hit localhost:8000
// NOW ALL OPERATIONS USE RPCs (OpÃÃ†â€™ÂÂÂ§ÃÃ†â€™ÂÂÂ£o A - Database as Source of Truth)

const getSupabase = () => createClient();

function isMissingRpcError(message: string) {
  return message.includes("PGRST202") || message.includes("Could not find the function");
}

// VENDAS - Usar RPC tenant_listar_vendas para leitura
export async function fetchVendas(searchTerm?: string, dataVenda?: string | null): Promise<Venda[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_vendas', {
      p_limit: 100,
      p_busca: searchTerm || undefined,
      p_data: dataVenda || undefined
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown as Venda[]) || [];
}

// Vendas sÃÃ†â€™ÂÂÂ£o criadas via RPC tenant_processar_venda (PDV)
// createVenda mantida apenas para compatibilidade, mas nÃÃ†â€™ÂÂÂ£o deve ser usada
export async function createVenda(venda: VendaCreate): Promise<Venda> {
  throw new Error('Use RPC tenant_processar_venda para criar vendas');
}

export async function updateVenda(id: string, venda: VendaUpdate): Promise<Venda> {
  throw new Error('AtualizaÃÃ†â€™ÂÂÂ§ÃÃ†â€™ÂÂÂ£o de vendas nÃÃ†â€™ÂÂÂ£o implementada via RPC');
}

export async function cancelarVenda(id: string): Promise<unknown> {
  // RPC não mapeada no database.types.ts ââ‚¬â€ usar cliente não-tipado
  const { data, error } = await _untyped().rpc('tenant_cancelar_venda', { p_venda_id: id });
  if (error) throw new Error(error.message);
  return data;
}

export async function devolverItem(vendaId: string, itemId: string, quantidade: number): Promise<unknown> {
  // RPC não mapeada no database.types.ts ââ‚¬â€ usar cliente não-tipado
  const { data, error } = await _untyped().rpc('tenant_devolver_item', {
      p_venda_id: vendaId,
      p_venda_item_id: itemId,
      p_quantidade: quantidade
    });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVenda(id: string): Promise<void> {
  throw new Error('ExclusÃÃ†â€™ÂÂÂ£o de vendas nÃÃ†â€™ÂÂÂ£o implementada via RPC');
}

// CLIENTES - Usar RPCs para operaÃÃ†â€™ÂÂÂ§ÃÃ†â€™ÂÂÂµes CRUD
export async function fetchClientes(params?: ClienteListParams): Promise<ClienteListResult> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_clientes', {
      p_cursor: params?.cursor || undefined,
      p_limit: params?.limit || 20,
      p_status: params?.status || undefined,
      p_funil_fase: params?.funil_fase || undefined,
      p_busca: params?.busca || undefined,
      p_order_by: params?.order_by || 'criado_em',
      p_order_dir: params?.order_dir || 'DESC',
      p_tags: params?.tags || undefined
    });
  if (error) throw new Error(error.message);

  // Extrair next_cursor do ÃÃ†â€™ºltimo item
  type ClienteCursorRow = Cliente & { next_cursor?: string | null };
  const clientes = getArray<ClienteCursorRow>(data);
  const next_cursor = clientes.length > 0 ? clientes[clientes.length - 1].next_cursor : null;

  // Remover next_cursor dos objetos de cliente
  const clientesLimpos = clientes.map(({ next_cursor: _, ...rest }) => rest);

  return { data: clientesLimpos, next_cursor };
}

export async function createCliente(cliente: ClienteCreate): Promise<Cliente> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_criar_cliente', {
      p_nome: cliente.nome,
      p_email: cliente.email,
      p_telefone: cliente.telefone,
      p_endereco: cliente.endereco || undefined,
      p_funil_fase: 'lead',
      p_status: 'ativo',
      p_cpf_cnpj: cliente.cpf_cnpj || undefined
    });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    id: getStringField(result, 'cliente_id') ?? '',
    ...cliente,
    criado_em: new Date().toISOString(),
  } as Cliente;
}

export async function importarClientesLote(clientes: ClienteCreate[]): Promise<{ count: number }> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_importar_clientes_lote', {
      p_clientes: clientes as unknown as JsonValue
    });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return { count: getNumberField(result, 'count') ?? 0 };
}

export async function obterSugestoesNurturing(): Promise<NurturingSuggestion[]> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_obter_sugestoes_nurturing');
  if (error) throw new Error(error.message);
  return getArray<NurturingSuggestion>(data);
}

export async function finalizarAlertaNurturing(id: string) {
  const { data, error } = await getSupabaseStrict().rpc('tenant_finalizar_alerta_nurturing', { p_alerta_id: id });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_excluir_cliente', { p_cliente_id: id });
  if (error) throw new Error(error.message);
}

export async function updateCliente(id: string, cliente: ClienteUpdate): Promise<Cliente> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_atualizar_cliente', {
      p_cliente_id: id,
      p_nome: cliente.nome ?? undefined,
      p_email: cliente.email ?? undefined,
      p_telefone: cliente.telefone ?? undefined,
      p_funil_fase: cliente.funil_fase ?? undefined,
      p_status: cliente.status ?? undefined,
      p_cpf_cnpj: cliente.cpf_cnpj ?? undefined,
      p_endereco: cliente.endereco ?? undefined
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown) as Cliente;
}

// INTERAÃââ‚¬Â¡Ãââ‚¬Â¢ES DE CLIENTES - Usar RPCs para operaÃÂÂ§ÃÂÂµes CRUD
export async function fetchInteracoes(params: InteracaoClienteListParams): Promise<InteracaoClienteListResult> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_interacoes', {
      p_cliente_id: params.cliente_id,
      p_limit: params.limit || 20,
      p_cursor: params.cursor ?? undefined
    });
  if (error) throw new Error(error.message);

  // Extrair next_cursor do último item
  type InteracaoCursorRow = InteracaoCliente & { next_cursor?: string | null };
  const interacoes = getArray<InteracaoCursorRow>(data);
  const next_cursor = interacoes.length > 0 ? interacoes[interacoes.length - 1].next_cursor : null;

  // Remover next_cursor dos objetos de interaÃÂÂ§ÃÂÂ£o
  const interacoesLimpos = interacoes.map(({ next_cursor: _, ...rest }) => rest);

  return { data: interacoesLimpos, next_cursor };
}

export async function createInteracao(interacao: InteracaoClienteCreate): Promise<InteracaoCliente> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_criar_interacao', {
      p_cliente_id: interacao.cliente_id,
      p_tipo: interacao.tipo,
      p_titulo: interacao.titulo,
      p_descricao: interacao.descricao ?? undefined,
      p_data_interacao: interacao.data_interacao || new Date().toISOString(),
      p_duracao_minutos: interacao.duracao_minutos ?? undefined,
      p_usuario_id: interacao.usuario_id ?? undefined,
      p_metadata: interacao.metadata || {}
    });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    id: getStringField(result, 'interacao_id') ?? '',
    ...interacao,
    criado_em: new Date().toISOString(),
  } as InteracaoCliente;
}

export async function deleteInteracao(id: string): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_excluir_interacao', { p_interacao_id: id });
  if (error) throw new Error(error.message);
}

// TAGS - RPCs para gerenciar tags de clientes
export async function adicionarTag(clienteId: string, tag: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_adicionar_tag', { p_cliente_id: clienteId, p_tag: tag });
  if (error) throw new Error(error.message);
  return data as { success: boolean; error?: string };
}

export async function removerTag(clienteId: string, tag: string): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_remover_tag', { p_cliente_id: clienteId, p_tag: tag });
  if (error) throw new Error(error.message);
}

export async function listarTagsCatalog(busca: string = '', limit: number = 20): Promise<TagCatalog[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_tags_catalog', { p_busca: busca, p_limit: limit });
  if (error) throw new Error(error.message);
  return (data as unknown as TagCatalog[]) || [];
}

// CAMPANHA EM MASSA - RPC para envio de campanhas
export async function enviarCampanhaMassa(
  clienteIds: string[],
  titulo: string,
  mensagem: string,
  tipo: string = 'email'
): Promise<{ success: boolean; enviados: number; falhas: number; total: number }> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_enviar_campanha', {
      p_cliente_ids: clienteIds,
      p_titulo: titulo,
      p_mensagem: mensagem,
      p_tipo: tipo
    });
  if (error) throw new Error(error.message);
  return data as { success: boolean; enviados: number; falhas: number; total: number };
}

// PRODUTOS - Usar RPCs para operaÃÂÂ§ÃÂÂµes CRUD
export async function fetchProdutos(): Promise<Produto[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_produtos');
  if (error) throw new Error(error.message);
  return (data as unknown as Produto[]) || [];
}

export async function createProduto(produto: ProdutoCreate): Promise<Produto> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_criar_produto', {
      p_nome: produto.nome,
      p_descricao: produto.descricao ?? undefined,
      p_tipo: produto.tipo || 'produto',
      p_preco_base: produto.preco_venda || 0,
      p_sku: produto.sku ?? undefined,
      p_preco_custo: produto.preco_custo || 0,
      p_categoria: produto.categoria || 'geral',
      p_estoque_atual: produto.estoque_atual || 0,
      p_estoque_minimo: produto.estoque_minimo || 10,
      p_nf_entrada: produto.nf_entrada || null,
      p_image_urls: produto.image_urls
    });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    id: getStringField(result, 'produto_id') ?? '',
    ...produto,
    criado_em: new Date().toISOString(),
  } as Produto;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_excluir_produto', { p_produto_id: id });
  if (error) throw new Error(error.message);
}

export async function updateProduto(id: string, produto: ProdutoUpdate): Promise<Produto> {
  // RPC params são required no schema â€” usar _untyped() para params opcionais
  const { data, error } = await _untyped().rpc('tenant_atualizar_produto', {
    p_produto_id: id,
    p_nome: produto.nome,
    p_descricao: produto.descricao,
    p_tipo: produto.tipo,
    p_preco_base: produto.preco_base,
    p_sku: produto.sku,
    p_preco_custo: produto.preco_custo,
    p_categoria: produto.categoria,
    p_nf_entrada: produto.nf_entrada,
    p_image_urls: produto.image_urls
  });
  if (error) throw new Error(error.message);
  return assertRpcResult(data) as unknown as Produto;
}

// --------------------------------------------------------------------------------
// Canais de Venda
// --------------------------------------------------------------------------------

export interface CanalVenda {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em?: string;
}

export async function fetchCanaisVenda(): Promise<CanalVenda[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_listar_canais_venda');
  if (error) {
    console.error('Erro ao buscar canais de venda:', error);
    throw error;
  }
  return (data as CanalVenda[]) || [];
}

export async function createCanalVenda(nome: string, ativo: boolean = true): Promise<CanalVenda> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_criar_canal_venda', {
    p_nome: nome,
    p_ativo: ativo,
  });
  if (error) {
    console.error('Erro ao criar canal de venda:', error);
    throw error;
  }
  assertRpcResult(data);
  return data as CanalVenda;
}

export async function updateCanalVenda(id: string, nome: string, ativo: boolean): Promise<CanalVenda> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_atualizar_canal_venda', {
    p_id: id,
    p_nome: nome,
    p_ativo: ativo,
  });
  if (error) {
    console.error('Erro ao atualizar canal de venda:', error);
    throw error;
  }
  assertRpcResult(data);
  return data as CanalVenda;
}

export async function deleteCanalVenda(id: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('tenant_deletar_canal_venda', {
    p_id: id,
  });
  if (error) {
    console.error('Erro ao deletar canal de venda:', error);
    throw error;
  }
  assertRpcResult(data);
}

// --------------------------------------------------------------------------------
// Notas Fiscais (Controle Documental)
// --------------------------------------------------------------------------------

export interface NotaFiscal {
  id: string;
  tipo: 'entrada' | 'saida';
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  emitente_nome?: string;
  emitente_cnpj?: string;
  destinatario_nome?: string;
  destinatario_cnpj?: string;
  valor_total: number;
  data_emissao: string;
  data_entrada_saida?: string;
  status: 'ativa' | 'cancelada' | 'inutilizada';
  venda_id?: string;
  xml_url?: string;
  pdf_url?: string;
  observacoes?: string;
  criado_em: string;
}

export async function uploadProductImage(file: File, produtoId: string): Promise<string> {
  const supabase = createClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${produtoId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  // Get tenant schema using RPC to properly namespace the storage
  const { data: schemaData } = await supabase.rpc('get_tenant_schema');
  let schema = 'public';
  if (typeof schemaData === 'string' && schemaData !== 'public') {
    schema = schemaData;
  } else {
    const schemaRecord = asRecord(schemaData);
    if (typeof schemaRecord?.schema === 'string') schema = schemaRecord.schema;
  }

  const filePath = `${schema}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('Erro ao fazer upload da imagem:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Alertas de Estoque
export async function verificarAlertasEstoque(): Promise<{ success: boolean; alertas_criados: number }> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_verificar_alertas_estoque');
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown) as { success: boolean; alertas_criados: number };
}

export async function fetchAlertasEstoque(status?: string): Promise<AlertaEstoque[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_alertas_estoque', {
      p_status: status ?? undefined,
      p_limit: 100,
      p_offset: 0
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown as AlertaEstoque[]) || [];
}

export async function resolverAlertaEstoque(alertaId: string, status: string): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_resolver_alerta_estoque', {
      p_alerta_id: alertaId,
      p_status: status
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// Kits
export async function criarKit(kit: KitCreate): Promise<{ kit_id: string }> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_criar_kit', {
      p_produto_id: kit.produto_id,
      p_nome: kit.nome,
      p_descricao: kit.descricao || '',
      p_itens: kit.itens as unknown as JsonValue
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown) as { kit_id: string };
}

export async function fetchKits(): Promise<Kit[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_kits');
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown as Kit[]) || [];
}

export async function excluirKit(kitId: string): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_excluir_kit', {
      p_kit_id: kitId
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

export async function venderKit(kitId: string, quantidade: number = 1): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_vender_kit', {
      p_kit_id: kitId,
      p_quantidade: quantidade
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// Locais de Estoque
export async function criarLocalEstoque(local: Omit<LocalEstoque, 'id' | 'ativo' | 'criado_em'>): Promise<{ local_id: string }> {
  const { data, error } = await _untyped().rpc('tenant_criar_local_estoque', {
    p_nome: local.nome,
    p_tipo: local.tipo,
    p_endereco: local.endereco
  });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return result as { local_id: string };
}

export async function fetchLocaisEstoque(): Promise<LocalEstoque[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_locais_estoque');
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown as LocalEstoque[]) || [];
}

export async function desativarLocalEstoque(localId: string): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_desativar_local_estoque', {
      p_local_id: localId
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

function parseResumoCaixa(data: unknown): ResumoCaixa {
  const result = assertRpcResult(data);
  const formasRecord = asRecord(result.formas);
  const formas = Object.fromEntries(
    Object.entries(formasRecord ?? {}).flatMap(([forma, valor]) =>
      typeof valor === 'number' ? [[forma, valor]] : []
    )
  );
  const circuitoRecord = asRecord(result.circuito_por_forma);
  const circuitoPorForma = Object.fromEntries(
    Object.entries(circuitoRecord ?? {}).flatMap(([forma, valores]) => {
      const registro = asRecord(valores);
      if (!registro) return [];
      return [[forma, {
        entradas: getNumberField(registro, 'entradas') ?? 0,
        estornos: getNumberField(registro, 'estornos') ?? 0,
        saidas: getNumberField(registro, 'saidas') ?? 0,
        saldo: getNumberField(registro, 'saldo') ?? 0,
      }]];
    })
  );

  return {
    success: result.success === true,
    sessao_id: getStringField(result, 'sessao_id'),
    fechamento_id: getStringField(result, 'fechamento_id'),
    status: getStringField(result, 'status') ?? 'nao_aberto',
    data_operacional: getStringField(result, 'data_operacional') ?? '',
    valor_abertura: getNumberField(result, 'valor_abertura') ?? 0,
    valor_esperado: getNumberField(result, 'valor_esperado') ?? 0,
    formas,
    circuito_por_forma: circuitoPorForma,
    movimentos: getArray<CaixaMovimento>(result.movimentos),
  };
}

export async function fetchContextosCaixa(): Promise<CaixaContexto[]> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_listar_contextos_caixa');
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return getArray<CaixaContexto>(data);
}

export async function fetchResumoCaixa(filialId: string, caixaId: string, data?: string): Promise<ResumoCaixa> {
  const { data: response, error } = await getSupabaseStrict().rpc('tenant_obter_resumo_caixa', {
    p_filial_id: filialId,
    p_caixa_id: caixaId,
    p_data: data,
  });
  if (error) throw new Error(error.message);
  return parseResumoCaixa(response);
}

export async function abrirCaixa(filialId: string, caixaId: string, valorAbertura: number): Promise<void> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_abrir_caixa', {
    p_filial_id: filialId,
    p_caixa_id: caixaId,
    p_valor_abertura: valorAbertura,
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

export async function registrarMovimentoCaixa(
  filialId: string,
  caixaId: string,
  tipo: 'saida' | 'suprimento' | 'ajuste',
  valor: number,
  formaPagamento: string,
  motivo: string
): Promise<void> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_registrar_movimento_caixa', {
    p_filial_id: filialId,
    p_caixa_id: caixaId,
    p_tipo: tipo,
    p_valor: valor,
    p_forma_pagamento: formaPagamento,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

export async function fecharCaixa(input: FechamentoCaixaInput): Promise<{ fechamentoId?: string; diferenca: number }> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_fechar_caixa', {
    p_filial_id: input.filialId,
    p_caixa_id: input.caixaId,
    p_data: input.data,
    p_valores_contados: input.valoresContados,
    p_observacao: input.observacao || null,
  });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    fechamentoId: getStringField(result, 'fechamento_id'),
    diferenca: getNumberField(result, 'diferenca') ?? 0,
  };
}

export async function reabrirCaixa(fechamentoId: string, motivo: string): Promise<void> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_reabrir_caixa', {
    p_fechamento_id: fechamentoId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

export async function fetchLotacoesFiliais(userId: string): Promise<LotacaoFilial[]> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_listar_lotacoes_filiais', {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return getArray<LotacaoFilial>(data);
}

export async function salvarLotacoesFiliais(
  userId: string,
  lotacoes: { filial_id: string; papel: 'operador' | 'supervisor' | 'gerente' }[]
): Promise<void> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_salvar_lotacoes_filiais', {
    p_user_id: userId,
    p_lotacoes: lotacoes,
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// TransferÃÃ†â€™ªncias de Estoque
export async function criarTransferencia(transferencia: TransferenciaCreate): Promise<{ transferencia_id: string }> {
  const { data, error } = await _untyped().rpc('tenant_criar_transferencia', {
    p_produto_id: transferencia.produto_id,
    p_local_origem_id: transferencia.local_origem_id,
    p_local_destino_id: transferencia.local_destino_id,
    p_quantidade: transferencia.quantidade,
    p_observacao: transferencia.observacao,
    p_criado_por: transferencia.criado_por
  });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return result as { transferencia_id: string };
}

export async function fetchTransferencias(status?: string): Promise<TransferenciaEstoque[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_transferencias', {
      p_status: status
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown as TransferenciaEstoque[]) || [];
}

export async function concluirTransferencia(transferenciaId: string): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_concluir_transferencia', {
      p_transferencia_id: transferenciaId
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

export async function cancelarTransferencia(transferenciaId: string): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_cancelar_transferencia', {
      p_transferencia_id: transferenciaId
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// Entradas e movimentacoes de estoque
export async function registrarEntradaEstoque(entrada: EstoqueEntradaCreate): Promise<{ entrada_id: string; valor_total?: number; duplicada?: boolean }> {
  const { data, error } = await _untyped().rpc('tenant_registrar_entrada_estoque', {
    p_itens: entrada.itens,
    p_fornecedor_id: entrada.fornecedor_id || null,
    p_fornecedor_nome: entrada.fornecedor_nome || null,
    p_fornecedor_documento: entrada.fornecedor_documento || null,
    p_numero_documento: entrada.numero_documento || null,
    p_serie_documento: entrada.serie_documento || null,
    p_chave_nfe: entrada.chave_nfe || null,
    p_data_emissao: entrada.data_emissao || null,
    p_observacao: entrada.observacao || null,
    p_origem: entrada.origem || 'manual',
    p_idempotency_key: entrada.idempotency_key,
  });
  if (error) throw new Error(error.message);
  return assertRpcResult(data) as { entrada_id: string; valor_total?: number; duplicada?: boolean };
}

export async function fetchEntradasEstoque(produtoId?: string): Promise<EstoqueEntrada[]> {
  const { data, error } = await _untyped().rpc('tenant_listar_entradas_estoque', {
    p_produto_id: produtoId || null,
    p_limit: 100,
    p_offset: 0,
  });
  if (error) throw new Error(error.message);
  return (data as EstoqueEntrada[]) || [];
}

export async function fetchMovimentacoesEstoque(produtoId?: string, tipo?: string): Promise<EstoqueMovimentacao[]> {
  const { data, error } = await _untyped().rpc('tenant_listar_movimentacoes_estoque', {
    p_produto_id: produtoId || null,
    p_tipo: tipo || null,
    p_limit: 100,
    p_offset: 0,
  });
  if (error) throw new Error(error.message);
  return (data as EstoqueMovimentacao[]) || [];
}

// ValoraÃÃ†â€™ÂÂÂ§ÃÃ†â€™ÂÂÂ£o de Estoque
export async function calcularValorEstoque(metodo: string = 'custo_medio'): Promise<ValorizacaoEstoque> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_calcular_valor_estoque', {
      p_metodo: metodo
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown) as ValorizacaoEstoque;
}

export async function atualizarCustoProduto(produtoId: string, custo: number, metodo: string = 'custo_medio'): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_atualizar_custo_produto', {
      p_produto_id: produtoId,
      p_custo_unitario: custo,
      p_metodo_valoracao: metodo
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// CÃÃ†â€™ÂÂÂ³digos de Barras/QR
export async function gerarCodigoBarras(produtoId: string): Promise<CodigoBarrasResponse> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_gerar_codigo_barras', {
      p_produto_id: produtoId
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown) as CodigoBarrasResponse;
}

export async function buscarProdutoPorCodigo(codigo: string): Promise<ProdutoLookupResult> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_buscar_produto_por_codigo', {
      p_codigo: codigo
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as ProdutoLookupResult) ?? null;
}

// PrevisÃÃ†â€™ÂÂÂ£o de Demanda
export async function gerarPrevisaoDemanda(produtoId: string, diasAnalise: number = 30, diasPrevisao: number = 30): Promise<PrevisaoResult> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_gerar_previsao_demanda', {
      p_produto_id: produtoId,
      p_dias_analise: diasAnalise,
      p_dias_previsao: diasPrevisao
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown) as PrevisaoResult;
}

export async function fetchPrevisoesDemanda(produtoId?: string): Promise<PrevisaoDemanda[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_previsoes_demanda', {
      p_produto_id: produtoId ?? undefined
    });
  if (error) throw new Error(error.message);
  return (data as unknown as PrevisaoDemanda[]) || [];
}

export async function atualizarDemandaReal(previsaoId: string, demandaReal: number): Promise<{ success: boolean; precisao: number }> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_atualizar_demanda_real', {
      p_previsao_id: previsaoId,
      p_demanda_real: demandaReal
    });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return data as { success: boolean; precisao: number };
}

// OS - Usar RPCs para operações CRUD
export async function fetchOS(): Promise<OrdemServico[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_ordens_servico');
  if (error) throw new Error(error.message);
  return (data as unknown as OrdemServico[]) || [];
}

export async function createOS(os: OrdemServicoCreate): Promise<OrdemServico> {
  const { data, error } = await _untyped().rpc('tenant_criar_os', {
    p_cliente_id: os.cliente_id,
    p_colaborador_id: os.colaborador_id,
    p_veiculo_equipamento: os.veiculo_equipamento,
    p_descricao_problema: os.descricao_problema,
    p_status: os.status,
    p_valor_orcamento: os.valor_orcamento,
    p_equipamento_serial: os.equipamento_serial,
    p_laudo_tecnico: os.laudo_tecnico,
    p_checklist_entrada: os.checklist_entrada
  });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    id: getStringField(result, 'os_id') ?? '',
    ...os,
    valor_orcamento: os.valor_orcamento || 0,
    criado_em: new Date().toISOString(),
  } as OrdemServico;
}

export async function deleteOS(id: string): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_excluir_os', { p_os_id: id });
  if (error) throw new Error(error.message);
}

export async function updateOS(id: string, os: OrdemServicoUpdate): Promise<OrdemServico> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_atualizar_os', {
      p_os_id: id,
      p_cliente_id: os.cliente_id ?? undefined,
      p_colaborador_id: os.colaborador_id ?? undefined,
      p_veiculo_equipamento: os.veiculo_equipamento ?? undefined,
      p_descricao_problema: os.descricao_problema ?? undefined,
      p_status: os.status ?? undefined,
      p_valor_orcamento: os.valor_orcamento ?? undefined,
      p_equipamento_serial: os.equipamento_serial ?? undefined,
      p_laudo_tecnico: os.laudo_tecnico ?? undefined,
      p_checklist_entrada: os.checklist_entrada ?? undefined
    });
  if (error) throw new Error(error.message);
  return (data as unknown) as OrdemServico;
}

export async function fetchOSLucro(id: string): Promise<OSLucro> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_obter_lucro_os', { p_os_id: id });
  if (error) throw new Error(error.message);
  return (data as unknown) as OSLucro;
}

export async function gerenciarTimerOS(id: string, acao: 'iniciar' | 'parar'): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_gerenciar_timer_os', { p_os_id: id, p_acao: acao });
  if (error) throw new Error(error.message);
}

// OBRAS - Usar RPCs para operações CRUD
export async function fetchObras(): Promise<Obra[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_obras');
  if (error) throw new Error(error.message);
  return (data as unknown as Obra[]) || [];
}

export async function createObra(obra: ObraCreate): Promise<Obra> {
  const { data, error } = await _untyped().rpc('tenant_criar_obra', {
    p_cliente_id: obra.cliente_id,
    p_nome: obra.nome,
    p_descricao: obra.descricao,
    p_endereco: obra.endereco,
    p_data_inicio: obra.data_inicio,
    p_data_fim_prevista: obra.data_fim_prevista,
    p_status: 'planejada',
    p_orcamento_total: obra.orcamento || 0
  });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    id: getStringField(result, 'obra_id') ?? '',
    ...obra,
    criado_em: new Date().toISOString(),
  } as Obra;
}

export async function deleteObra(id: string): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_excluir_obra', { p_obra_id: id });
  if (error) throw new Error(error.message);
}

export async function updateObra(id: string, obra: ObraUpdate): Promise<Obra> {
  const { data, error } = await _untyped().rpc('tenant_atualizar_obra', {
    p_obra_id: id,
    p_cliente_id: obra.cliente_id,
    p_nome: obra.nome,
    p_descricao: obra.descricao,
    p_endereco: obra.endereco,
    p_data_inicio: obra.data_inicio,
    p_data_fim_prevista: obra.data_fim_prevista,
    p_status: obra.status,
    p_orcamento_total: obra.orcamento_total
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as Obra;
}

// EMPRESAS - Mantido para uso pÃÃ†â€™ºblico (nÃÃ†â€™ÂÂÂ£o tenant)
export async function fetchEmpresa(): Promise<Empresa | null> {
  const { data, error } = await getSupabaseStrict()
    .from('empresas')
    .select('id, cnpj, razao_social, porte, segmento, schema_name, criado_em, status, subscription_id, subscription_status, data_vencimento, trial_ends_at, plan_name, inscricao_estadual, inscricao_municipal, regime_tributario, logradouro, numero, complemento, bairro, cidade, uf, cep, codigo_municipio_ibge, nfe_ambiente')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown) as Empresa | null;
}

export async function updateEmpresa(id: string, empresa: EmpresaUpdate): Promise<Empresa> {
  // EmpresaUpdate.regime_tributario aceita string|number; schema espera number|null
  const { data, error } = await _untyped().from('empresas').update(empresa).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return (data as unknown) as Empresa;
}

// FUNCIONARIOS - Usar RPCs para operaÃÃ†â€™ÂÂÂ§ÃÃ†â€™ÂÂÂµes CRUD
export async function fetchFuncionarios(): Promise<Funcionario[]> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_funcionarios');
  if (error) throw new Error(error.message);
  return (data as unknown as Funcionario[]) || [];
}

export async function updateFuncionario(id: string, funcionario: FuncionarioUpdate): Promise<Funcionario> {
  const { data, error } = await _untyped().rpc('tenant_atualizar_funcionario', {
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
  return (data as unknown) as Funcionario;
}

export async function createFuncionario(funcionario: FuncionarioCreate): Promise<Funcionario> {
  const { data, error } = await _untyped().rpc('tenant_criar_funcionario', {
    p_nome: funcionario.nome,
    p_cargo: funcionario.cargo,
    p_email: funcionario.email,
    p_telefone: funcionario.telefone,
    p_salario: funcionario.salario,
    p_role: funcionario.role || 'funcionario',
    p_dia_pagamento: funcionario.dia_pagamento
  });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    id: getStringField(result, 'funcionario_id') ?? '',
    ...funcionario,
    criado_em: new Date().toISOString(),
  } as Funcionario;
}

export async function deleteFuncionario(id: string): Promise<void> {
  const { error } = await getSupabaseStrict()
    .rpc('tenant_excluir_funcionario', { p_funcionario_id: id });
  if (error) throw new Error(error.message);
}

export async function registrarPagamentoRH(funcionarioId: string, mes: string): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_registrar_pagamento_rh', { p_funcionario_id: funcionarioId, p_mes: mes });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

export async function registrarPagamentoRHTodos(mes: string): Promise<void> {
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_registrar_pagamento_rh_todos', { p_mes: mes });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// DOCUMENTOS RH
export async function uploadDocumentoRH(funcionarioId: string, tipo: string, arquivo: File): Promise<DocumentoFuncionario> {
  const supabase = getSupabaseStrict();
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
  const { data, error } = await getSupabaseStrict()
    .rpc('tenant_listar_documentos', { p_funcionario_id: funcionarioId });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown as DocumentoFuncionario[]) || [];
}

export async function obterUrlDocumento(documentoId: string): Promise<string> {
  const supabase = getSupabaseStrict();
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
  const supabase = getSupabaseStrict();
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
  const { data, error } = await _untyped().rpc('tenant_atualizar_dados_pessoais', {
    p_funcionario_id: funcionarioId,
    p_cpf: dados.cpf,
    p_rg: dados.rg,
    p_data_nascimento: dados.data_nascimento,
    p_nome_mae: dados.nome_mae,
    p_endereco: dados.endereco,
    p_pis_pasep: dados.pis_pasep,
    p_ctps: dados.ctps,
    p_data_admissao: dados.data_admissao,
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// FINANCEIRO - RPCs com schema distinto do tipo local - usar _untyped()
export async function fetchFinanceiro(filialId?: string | null): Promise<Financeiro[]> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_listar_financeiro_filial', {
    p_filial_id: filialId ?? null,
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return (data as unknown as Financeiro[]) || [];
}

export async function fetchDashboardDono(filialId?: string | null): Promise<DashboardDono> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_obter_dashboard_dono', {
    p_filial_id: filialId ?? null,
  });
  if (error) throw new Error(error.message);
  const result = assertRpcResult(data);
  return {
    faturamento_hoje: getNumberField(result, 'faturamento_hoje') ?? 0,
    faturamento_mes: getNumberField(result, 'faturamento_mes') ?? 0,
    vendas_mes: getNumberField(result, 'vendas_mes') ?? 0,
    saldo_financeiro: getNumberField(result, 'saldo_financeiro') ?? 0,
    contas_vencidas: getNumberField(result, 'contas_vencidas') ?? 0,
    filial_id: getStringField(result, 'filial_id') ?? null,
    visao: getStringField(result, 'visao') === 'filial' ? 'filial' : 'geral',
  };
}

export async function updateFinanceiro(id: string, filialId: string, financeiro: FinanceiroUpdate): Promise<Financeiro> {
  if (!financeiro.tipo || !financeiro.descricao || financeiro.valor === undefined || !financeiro.data_vencimento) {
    throw new Error('Informe todos os dados obrigatórios do lançamento.');
  }
  const { data, error } = await getSupabaseStrict().rpc('tenant_atualizar_financeiro_filial', {
    p_filial_id: filialId,
    p_financeiro_id: id,
    p_tipo: financeiro.tipo,
    p_descricao: financeiro.descricao,
    p_valor: financeiro.valor,
    p_data_vencimento: financeiro.data_vencimento,
    p_status: financeiro.status || 'pendente',
    p_categoria: financeiro.categoria || null
  });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
  return { id, filial_id: filialId, ...financeiro } as Financeiro;
}

export async function createFinanceiro(financeiro: FinanceiroCreate): Promise<Financeiro> {
  if (!financeiro.filial_id) throw new Error('Selecione uma filial antes de criar um lançamento financeiro.');
  const { data, error } = await getSupabaseStrict().rpc('tenant_criar_financeiro_filial', {
    p_filial_id: financeiro.filial_id,
    p_tipo: financeiro.tipo,
    p_descricao: financeiro.descricao,
    p_valor: financeiro.valor,
    p_data_vencimento: financeiro.data_vencimento,
    p_status: financeiro.status || 'pendente',
    p_categoria: financeiro.categoria || null
  });
  if (error) throw new Error(error.message);
  return {
    id: getStringField(data, 'financeiro_id') ?? '',
    ...financeiro,
    criado_em: new Date().toISOString(),
  } as Financeiro;
}

export async function deleteFinanceiro(id: string, filialId: string): Promise<void> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_excluir_financeiro_filial', { p_financeiro_id: id, p_filial_id: filialId });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

export async function conciliarFinanceiro(filialId: string, conciliacoes: { financeiro_id: string; banco_transacao_id: string; banco_nome: string; data_conciliacao: string }[]): Promise<void> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_conciliar_financeiro_filial', { p_filial_id: filialId, p_conciliacoes: conciliacoes });
  if (error) throw new Error(error.message);
  assertRpcResult(data);
}

// COMISSOES - RPCs nao mapeadas no types - usar _untyped()
export async function fetchComissoes(): Promise<Comissao[]> {
  const { data, error } = await getSupabaseStrict().rpc('tenant_listar_comissoes');
  if (error) throw new Error(error.message);
  return (data as unknown as Comissao[]) || [];
}

export async function fetchRegrasComissao(): Promise<RegraComissao[]> {
  const { data, error } = await _untyped().rpc('tenant_listar_regras_comissao');
  if (error) {
    if (isMissingRpcError(error.message)) return [];
    throw new Error(error.message);
  }
  return (data as unknown as RegraComissao[]) || [];
}

export async function createRegraComissao(regra: RegraComissaoCreate): Promise<RegraComissao> {
  const { data, error } = await _untyped().rpc('tenant_criar_regra_comissao', {
    p_colaborador_id: regra.colaborador_id,
    p_tipo_calculo: regra.tipo_calculo,
    p_valor: regra.valor,
    p_ativo: regra.ativo ?? true,
  });
  if (error) {
    if (isMissingRpcError(error.message)) throw new Error('A funcao de regras de comissao ainda nao foi publicada neste ambiente.');
    throw new Error(error.message);
  }
  const result = assertRpcResult(data);
  return {
    id: getStringField(result, 'regra_id') ?? '',
    colaborador_id: regra.colaborador_id,
    tipo_calculo: regra.tipo_calculo,
    valor: regra.valor,
    ativo: regra.ativo ?? true,
    criado_em: new Date().toISOString(),
  };
}

export async function deleteRegraComissao(regraId: string): Promise<void> {
  const { data, error } = await _untyped().rpc('tenant_excluir_regra_comissao', { p_regra_id: regraId });
  if (error) {
    if (isMissingRpcError(error.message)) throw new Error('A funcao de regras de comissao ainda nao foi publicada neste ambiente.');
    throw new Error(error.message);
  }
  assertRpcResult(data);
}

export async function updateComissao(id: string, comissao: ComissaoUpdate): Promise<Comissao> {
  const { data, error } = await _untyped().rpc('tenant_atualizar_comissao', {
    p_comissao_id: id,
    p_status_pagamento: comissao.status_pagamento,
    p_data_pagamento: comissao.data_pagamento
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as Comissao;
}

// Interfaces de Recursos e Documentos de Obras (restauradas)
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
  const { data, error } = await _untyped().rpc('tenant_listar_etapas_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return (data as unknown as ObraEtapa[]) || [];
}

export async function createObraEtapa(etapa: ObraEtapaCreate): Promise<ObraEtapa> {
  const { data, error } = await _untyped().rpc('tenant_criar_etapa_obra', {
    p_obra_id: etapa.obra_id,
    p_nome: etapa.nome,
    p_descricao: etapa.descricao,
    p_data_prevista: etapa.data_prevista,
    p_ordem: etapa.ordem,
    p_status: etapa.status || 'pendente'
  });
  if (error) throw new Error(error.message);
  return {
    id: getStringField(data, 'etapa_id') ?? '',
    ...etapa,
    criado_em: new Date().toISOString(),
  } as ObraEtapa;
}

export async function updateObraEtapa(etapaId: string, etapa: ObraEtapaUpdate): Promise<ObraEtapa> {
  const { data, error } = await _untyped().rpc('tenant_atualizar_etapa_obra', {
    p_etapa_id: etapaId,
    p_nome: etapa.nome,
    p_descricao: etapa.descricao,
    p_data_prevista: etapa.data_prevista,
    p_data_conclusao: etapa.data_conclusao,
    p_status: etapa.status,
    p_ordem: etapa.ordem
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ObraEtapa;
}

export async function deleteObraEtapa(etapaId: string): Promise<void> {
  const { error } = await _untyped().rpc('tenant_excluir_etapa_obra', { p_etapa_id: etapaId });
  if (error) throw new Error(error.message);
}

export async function fetchObraProgresso(obraId: string): Promise<ObraProgresso> {
  const { data, error } = await _untyped().rpc('tenant_obras_progresso', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return (data as unknown) as ObraProgresso;
}
// NOTA: RPCs de custos/recursos/documentos/progresso ainda não estão no database.types.ts
// Interfaces de Custos e Resumo Financeiro de Obras (restauradas)
export interface ObraCusto {
  id: string;
  obra_id: string;
  categoria: string;
  descricao: string;
  valor_previsto: number;
  valor_real?: number;
  data?: string;
  tipo: 'material' | 'mao_de_obra' | 'equipamento' | 'servico' | 'outro';
  fornecedor_id?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface ObraCustoCreate {
  obra_id: string;
  categoria: string;
  descricao: string;
  valor_previsto: number;
  data?: string;
  tipo?: 'material' | 'mao_de_obra' | 'equipamento' | 'servico' | 'outro';
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

// Usando escape hatch `as any` para RPCs não mapeadas (Gradual Typing ââ‚¬â€ Fase 3 pendente)
const _untyped = () => createClient() as unknown as UntypedSupabaseClient;

export async function fetchObraCustos(obraId: string): Promise<ObraCusto[]> {
  const { data, error } = await _untyped().rpc('tenant_listar_custos_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return (data as unknown as ObraCusto[]) || [];
}

export async function createObraCusto(custo: ObraCustoCreate): Promise<ObraCusto> {
  const { data, error } = await _untyped().rpc('tenant_criar_custo_obra', {
    p_obra_id: custo.obra_id,
    p_categoria: custo.categoria,
    p_descricao: custo.descricao,
    p_valor_previsto: custo.valor_previsto,
    p_data: custo.data ?? undefined,
    p_tipo: custo.tipo,
    p_fornecedor_id: custo.fornecedor_id
  });
  if (error) throw new Error(error.message);
  return {
    id: getStringField(data, 'custo_id') ?? '',
    ...custo,
    criado_em: new Date().toISOString(),
  } as ObraCusto;
}

export async function updateObraCusto(custoId: string, custo: ObraCustoUpdate): Promise<ObraCusto> {
  const { data, error } = await _untyped().rpc('tenant_atualizar_custo_obra', {
    p_custo_id: custoId,
    p_categoria: custo.categoria,
    p_descricao: custo.descricao,
    p_valor_previsto: custo.valor_previsto,
    p_valor_real: custo.valor_real,
    p_data: custo.data ?? undefined,
    p_tipo: custo.tipo,
    p_fornecedor_id: custo.fornecedor_id
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ObraCusto;
}

export async function deleteObraCusto(custoId: string): Promise<void> {
  const { error } = await _untyped().rpc('tenant_excluir_custo_obra', { p_custo_id: custoId });
  if (error) throw new Error(error.message);
}

export async function fetchObraResumoFinanceiro(obraId: string): Promise<ObraResumoFinanceiro> {
  const { data, error } = await _untyped().rpc('tenant_obras_resumo_financeiro', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return (data as unknown) as ObraResumoFinanceiro;
}

// RECURSOS DE OBRAS
export async function fetchObrasRecursos(obraId: string): Promise<ObraRecurso[]> {
  const { data, error } = await _untyped().rpc('tenant_listar_recursos_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return (data as unknown as ObraRecurso[]) || [];
}

export async function alocarRecursoObra(recurso: ObraRecursoCreate): Promise<ObraRecurso> {
  const { data, error } = await _untyped().rpc('tenant_alocar_recurso_obra', {
    p_obra_id: recurso.obra_id,
    p_tipo: recurso.tipo,
    p_descricao: recurso.descricao,
    p_quantidade: recurso.quantidade,
    p_unidade: recurso.unidade || 'un',
    p_custo_unitario: recurso.custo_unitario,
    p_status: recurso.status || 'alocado',
    p_data_alocacao: recurso.data_alocacao ?? undefined,
    p_fornecedor_id: recurso.fornecedor_id
  });
  if (error) throw new Error(error.message);
  return {
    id: getStringField(data, 'recurso_id') ?? '',
    ...recurso,
    criado_em: new Date().toISOString(),
  } as ObraRecurso;
}

export async function updateObraRecurso(recursoId: string, recurso: ObraRecursoUpdate): Promise<ObraRecurso> {
  const { data, error } = await _untyped().rpc('tenant_atualizar_recurso_obra', {
    p_recurso_id: recursoId,
    p_tipo: recurso.tipo,
    p_descricao: recurso.descricao,
    p_quantidade: recurso.quantidade,
    p_unidade: recurso.unidade,
    p_custo_unitario: recurso.custo_unitario,
    p_status: recurso.status,
    p_data_alocacao: recurso.data_alocacao ?? undefined,
    p_fornecedor_id: recurso.fornecedor_id
  });
  if (error) throw new Error(error.message);
  return (data as unknown) as ObraRecurso;
}

export async function deleteObraRecurso(recursoId: string): Promise<void> {
  const { error } = await _untyped().rpc('tenant_excluir_recurso_obra', { p_recurso_id: recursoId });
  if (error) throw new Error(error.message);
}

// DOCUMENTOS DE OBRAS
export async function fetchObraDocumentos(obraId: string): Promise<ObraDocumento[]> {
  const { data, error } = await _untyped().rpc('tenant_listar_documentos_obra', { p_obra_id: obraId });
  if (error) throw new Error(error.message);
  return (data as unknown as ObraDocumento[]) || [];
}

export async function uploadObraDocumento(file: File, obraId: string, descricao?: string): Promise<ObraDocumento> {
  const supabase = getSupabaseStrict();

  // Obter schema do tenant
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('empresa_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single();

  if (!profileData) throw new Error('Perfil não encontrado');

  const { data: empresaData } = await supabase
    .from('empresas')
    .select('schema_name')
    .eq('id', profileData.empresa_id ?? '')
    .single();

  if (!empresaData) throw new Error('Empresa não encontrada');

  const schema = empresaData.schema_name;

  // Validações
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxFileSize) throw new Error('Arquivo muito grande. Máximo 10MB.');

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) throw new Error('Tipo de arquivo não permitido.');

  // Gerar caminho único
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop();
  const caminho = `${schema}/${obraId}/${timestamp}_${random}.${ext}`;

  // Upload via Supabase Storage
  const { error: uploadError } = await supabase.storage.from('obras-documentos').upload(caminho, file);
  if (uploadError) throw new Error(uploadError.message);

  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage.from('obras-documentos').getPublicUrl(caminho);

  // Registrar via RPC (não mapeada no types)
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const { data: rpcData, error: rpcError } = await _untyped().rpc('tenant_upload_documento_obra', {
    p_obra_id: obraId,
    p_nome: file.name,
    p_tipo: file.type,
    p_tamanho: file.size,
    p_url: publicUrl,
    p_caminho_storage: caminho,
    p_descricao: descricao,
    p_criado_por: userId
  });

  if (rpcError) throw new Error(rpcError.message);

  return {
    id: getStringField(rpcData, 'documento_id') ?? '',
    obra_id: obraId,
    nome: file.name,
    tipo: file.type,
    tamanho: file.size,
    url: publicUrl,
    caminho_storage: caminho,
    descricao,
    criado_por: userId || '',
    criado_em: new Date().toISOString()
  } as ObraDocumento;
}

export async function deleteObraDocumento(documentoId: string): Promise<void> {
  const supabase = getSupabaseStrict();

  // Chamar RPC para obter caminho_storage (não mapeada no types)
  const { data: rpcData, error: rpcError } = await _untyped().rpc('tenant_excluir_documento_obra', { p_documento_id: documentoId });
  if (rpcError) throw new Error(rpcError.message);

  // Remover do storage
  const caminho = getStringField(rpcData, 'caminho_storage');
  if (caminho) {
    const { error: storageError } = await supabase.storage.from('obras-documentos').remove([caminho]);
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
  return (data as unknown) as Cupom[];
}

export async function criarCupomAdmin(cupom: Partial<Cupom>): Promise<unknown> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_criar_cupom", {
    p_codigo: cupom.codigo || '',
    p_tipo: cupom.tipo || 'desconto_fixo',
    p_valor: cupom.valor || 0,
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

export async function fetchCRMDashboardMetricas(): Promise<CRMDashboardMetricas> {
  const supabase = getSupabaseStrict();
  const { data, error } = await supabase.rpc('tenant_dashboard_metricas');
  
  if (error || !data) {
    throw error || new Error("Falha ao carregar métricas do CRM");
  }

  return (data as unknown) as CRMDashboardMetricas;
}
