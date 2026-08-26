import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { focusNfeClient, type FocusNfeEnvironment, type FocusNfeResponse } from './focus-nfe-client'

export async function autoProvisionFocusCompany(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>,
  empresaId: string,
): Promise<{ provisioned: boolean; reason?: string }> {
  if (process.env.FOCUSNFE_AUTO_PROVISION !== 'true') {
    return { provisioned: false, reason: 'automacao_desabilitada' }
  }

  const { data: empresa, error } = await admin
    .from('empresas')
    .select('id, cnpj, razao_social, inscricao_estadual, inscricao_municipal, logradouro, numero, complemento, bairro, cidade, uf, cep, regime_tributario, nfe_certificado_senha, focusnfe_empresa_id')
    .eq('id', empresaId)
    .single()

  if (error || !empresa) return { provisioned: false, reason: 'empresa_nao_encontrada' }
  if (empresa.focusnfe_empresa_id) return { provisioned: true, reason: 'ja_provisionada' }

  const certificate = await admin.storage.from('fiscal').download(`${empresa.id}/certificado.pfx`)
  if (certificate.error || !certificate.data) return { provisioned: false, reason: 'certificado_ausente' }

  const response = await focusNfeClient.createCompany('producao', {
    nome: empresa.razao_social,
    cnpj: empresa.cnpj.replace(/\D/g, ''),
    inscricao_estadual: empresa.inscricao_estadual || undefined,
    inscricao_municipal: empresa.inscricao_municipal || undefined,
    logradouro: empresa.logradouro || undefined,
    numero: empresa.numero || undefined,
    complemento: empresa.complemento || undefined,
    bairro: empresa.bairro || undefined,
    municipio: empresa.cidade || undefined,
    uf: empresa.uf || undefined,
    cep: empresa.cep || undefined,
    regime_tributario: regimeOf(empresa.regime_tributario),
    habilita_nfe: true,
    habilita_nfce: true,
    habilita_nfse: true,
    arquivo_certificado_base64: Buffer.from(await certificate.data.arrayBuffer()).toString('base64'),
    ...(empresa.nfe_certificado_senha ? { senha_certificado: empresa.nfe_certificado_senha } : {}),
  })

  const responseWithTokens = response as FocusNfeResponse & {
    id?: string | number
    empresa_id?: string | number
    token_producao?: string
    token_homologacao?: string
  }
  const { error: updateError } = await admin.from('empresas').update({
    focusnfe_empresa_id: String(responseWithTokens.id || responseWithTokens.empresa_id || ''),
    focusnfe_token_producao: responseWithTokens.token_producao || null,
    focusnfe_token_homologacao: responseWithTokens.token_homologacao || null,
    focusnfe_configurado_em: new Date().toISOString(),
  }).eq('id', empresa.id)

  if (updateError) throw new Error(`Falha ao salvar provisionamento FocusNFe: ${updateError.message}`)
  return { provisioned: true }
}

interface FocusCompany {
  id: string
  cnpj: string
  razao_social: string
  inscricao_estadual?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  regime_tributario?: string | number | null
  nfe_ambiente?: FocusNfeEnvironment | null
  fiscal_provedor?: string | null
  focusnfe_token_producao?: string | null
  focusnfe_token_homologacao?: string | null
}

interface FocusSale {
  id: string
  valor_total: number
  desconto_aplicado?: number | null
  vendas_itens: FocusSaleItem[]
  clientes?: FocusCustomer | null
}

interface FocusSaleItem {
  produto_id: string
  quantidade: number
  preco_unitario: number
  subtotal?: number | null
  produtos?: {
    id?: string
    nome?: string
    ncm?: string | null
    cfop_padrao?: string | null
    origem?: number | null
  } | null
}

interface FocusCustomer {
  nome?: string | null
  cpf_cnpj?: string | null
}

function environmentOf(company: FocusCompany): FocusNfeEnvironment {
  return company.nfe_ambiente === 'producao' ? 'producao' : 'homologacao'
}

function regimeOf(value: string | number | null | undefined): number {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === '1' || normalized === 'simples nacional') return 1
  if (normalized === '2') return 2
  return 3
}

function normalizedCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

function responseStatus(response: FocusNfeResponse): string {
  if (response.status === 'autorizado') return 'emitida'
  if (response.status === 'processando_autorizacao') return 'pendente'
  return 'erro'
}

export async function emitirNfeFocus({
  admin,
  tenantSchema,
  empresa,
  vendaId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>
  tenantSchema: string
  empresa: FocusCompany
  vendaId: string
}) {
  const environment = environmentOf(empresa)
  const token = environment === 'producao'
    ? empresa.focusnfe_token_producao
    : empresa.focusnfe_token_homologacao

  if (!token) throw new Error(`Token FocusNFe não configurado para ${environment}.`)

  const tenant = admin.schema(tenantSchema)
  const { data: venda, error: vendaError } = await tenant
    .from('vendas')
    .select('id, valor_total, desconto_aplicado, vendas_itens(*, produtos(*)), clientes(*)')
    .eq('id', vendaId)
    .single()

  if (vendaError || !venda) throw new Error('Venda não encontrada para emissão FocusNFe.')
  const sale = venda as unknown as FocusSale
  if (!sale.vendas_itens?.length) throw new Error('Venda sem itens para emissão FocusNFe.')

  const reference = `fluxo-${empresa.id}-${vendaId}`
  const { data: existing } = await admin
    .from('fiscal_emissoes')
    .select('id, status, chave, numero, serie, xml_url, danfe_url')
    .eq('empresa_id', empresa.id)
    .eq('provedor', 'focusnfe')
    .eq('tipo_documento', 'nfe')
    .eq('ambiente', environment)
    .eq('referencia', reference)
    .maybeSingle()

  if (existing?.status === 'emitida' || existing?.status === 'pendente') return existing

  const items = sale.vendas_itens.map((item, index) => {
    const product = item.produtos || {}
    const quantity = Number(item.quantidade || 0)
    const unitPrice = Number(item.preco_unitario || 0)
    return {
      numero_item: index + 1,
      codigo_produto: String(product.id || item.produto_id),
      descricao: String(product.nome || 'Produto'),
      cfop: String(product.cfop_padrao || ''),
      quantidade_comercial: quantity,
      quantidade_tributavel: quantity,
      valor_unitario_comercial: unitPrice,
      valor_unitario_tributavel: unitPrice,
      unidade_comercial: 'UN',
      unidade_tributavel: 'UN',
      valor_bruto: Number(item.subtotal ?? quantity * unitPrice),
      codigo_ncm: String(product.ncm || ''),
      inclui_no_total: 1,
      icms_origem: Number(product.origem || 0),
      icms_situacao_tributaria: '102',
      pis_situacao_tributaria: '07',
      cofins_situacao_tributaria: '07',
    }
  })

  if (items.some((item) => !item.cfop || !item.codigo_ncm)) {
    throw new Error('Produtos sem CFOP ou NCM configurados para emissão FocusNFe.')
  }

  const customer = sale.clientes || {}
  const customerDocument = normalizedCnpj(String(customer.cpf_cnpj || ''))
  const payload: Record<string, unknown> = {
    natureza_operacao: 'Venda',
    data_emissao: new Date().toISOString(),
    tipo_documento: 1,
    finalidade_emissao: 1,
    cnpj_emitente: normalizedCnpj(empresa.cnpj),
    nome_emitente: empresa.razao_social,
    logradouro_emitente: empresa.logradouro || undefined,
    numero_emitente: empresa.numero || undefined,
    bairro_emitente: empresa.bairro || undefined,
    municipio_emitente: empresa.cidade || undefined,
    uf_emitente: empresa.uf || undefined,
    cep_emitente: empresa.cep || undefined,
    inscricao_estadual_emitente: empresa.inscricao_estadual || undefined,
    regime_tributario_emitente: regimeOf(empresa.regime_tributario),
    nome_destinatario: customer.nome || undefined,
    ...(customerDocument.length === 14
      ? { cnpj_destinatario: customerDocument }
      : { cpf_destinatario: customerDocument }),
    valor_desconto: Number(sale.desconto_aplicado || 0),
    valor_total: Number(sale.valor_total || 0),
    valor_produtos: items.reduce((sum, item) => sum + item.valor_bruto, 0),
    modalidade_frete: 9,
    items,
  }

  const { error: insertError } = await admin.from('fiscal_emissoes').upsert({
    empresa_id: empresa.id,
    tenant_schema: tenantSchema,
    venda_id: vendaId,
    provedor: 'focusnfe',
    tipo_documento: 'nfe',
    ambiente: environment,
    referencia: reference,
    status: 'pendente',
    tentativas: (existing?.status ? 1 : 0),
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'empresa_id,provedor,tipo_documento,ambiente,referencia' })

  if (insertError) throw new Error(`Falha ao registrar emissão fiscal: ${insertError.message}`)

  let response: FocusNfeResponse
  try {
    response = await focusNfeClient.emitNfe(environment, reference, payload, token)
  } catch (error) {
    await admin.from('fiscal_emissoes').update({
      status: 'erro',
      erro: error instanceof Error ? error.message : 'Falha na FocusNFe.',
      atualizado_em: new Date().toISOString(),
    }).eq('empresa_id', empresa.id).eq('referencia', reference)
    throw error
  }

  const status = responseStatus(response)
  const result = {
    status,
    chave: response.chave_nfe || null,
    numero: response.numero || null,
    serie: response.serie || null,
    xml_url: response.caminho_xml_nota_fiscal || null,
    danfe_url: response.caminho_danfe || null,
    resposta: response,
    erro: response.mensagem || null,
    atualizado_em: new Date().toISOString(),
  }

  await admin.from('fiscal_emissoes').update(result).eq('empresa_id', empresa.id).eq('referencia', reference)
  await tenant.from('vendas').update({
    nfe_status: status,
    nfe_chave: response.chave_nfe || null,
    nfe_xml_url: response.caminho_xml_nota_fiscal || null,
    nfe_pdf_url: response.caminho_danfe || null,
  }).eq('id', vendaId)

  return { success: status !== 'erro', ...result, ref: reference }
}
