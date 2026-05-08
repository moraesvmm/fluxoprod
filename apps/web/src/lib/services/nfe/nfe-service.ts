/**
 * NFe Service (Orchestrator)
 * Fluxo server-side explícito por tenant schema.
 */

import { XMLParser } from 'fast-xml-parser'

import { CertificateManager } from './certificate-manager'
import { NfeSigner } from './nfe-signer'
import { NfeXmlBuilder } from './nfe-xml-builder'
import { SefazClient } from './sefaz-client'
import { getSefazUrl } from './sefaz-urls'

export interface NfeEmissionResult {
  success: boolean
  chave?: string
  protocolo?: string
  xml?: string
  xmlUrl?: string
  error?: string
}

interface NfeEmitirArgs {
  admin: any
  tenantSchema: string
  empresa: {
    id: string
    cnpj?: string
    razao_social: string
    inscricao_estadual?: string
    inscricao_municipal?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    uf?: string
    cep?: string
    codigo_municipio_ibge?: string
    regime_tributario?: string | number
    nfe_ambiente?: 'producao' | 'homologacao'
    nfe_certificado_senha?: string
  }
  vendaId: string
  certBase64: string
  certPassword: string
}

interface VendaFiscal {
  id: string
  cliente_id?: string | null
  valor_total: number
  metodo_pagamento?: string | null
  desconto_aplicado?: number | null
  nfe_status?: string | null
  vendas_itens: Array<{
    produto_id: string
    quantidade: number
    preco_unitario: number
    subtotal?: number | null
    produtos?: {
      id: string
      nome: string
      ncm?: string | null
      cfop_padrao?: string | null
      origem?: number | null
    }
  }>
  clientes?: {
    id: string
    nome: string
    cpf_cnpj?: string | null
    endereco?: string | null
  } | null
}

function isSimplesNacional(regime: string | number | undefined): boolean {
  if (typeof regime === 'number') {
    return regime === 1
  }

  if (!regime) return false

  const normalized = String(regime).trim().toLowerCase()
  return normalized === '1' || normalized === 'simples nacional'
}

export class NfeService {
  private static parseAutorizacaoResponse(xml: string): {
    ok: boolean
    cStat?: string
    xMotivo?: string
    chNFe?: string
    nProt?: string
  } {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      ignoreDeclaration: true,
      parseTagValue: true,
      parseAttributeValue: false,
      trimValues: true,
    })

    const doc = parser.parse(xml)
    const body = doc?.Envelope?.Body
    const ret = body?.nfeAutorizacaoLoteResult || body?.nfeAutorizacaoLoteResponse?.nfeAutorizacaoLoteResult
    const payload = ret?.retEnviNFe || ret
    const cStat = String(payload?.cStat ?? '')
    const xMotivo = payload?.xMotivo ? String(payload.xMotivo) : undefined
    const prot = payload?.protNFe?.infProt || payload?.infProt
    const chNFe = prot?.chNFe ? String(prot.chNFe) : undefined
    const nProt = prot?.nProt ? String(prot.nProt) : undefined
    const ok = cStat === '100' || (cStat === '104' && prot?.cStat === '100')
    return { ok, cStat, xMotivo, chNFe, nProt }
  }

  private static buildEnviNfeXml(xmlNfeSignedOrRaw: string): string {
    const idLote = String(Date.now())
    return `
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>${idLote}</idLote>
        <indSinc>1</indSinc>
        ${xmlNfeSignedOrRaw}
      </enviNFe>
    `.trim()
  }

  private static async loadVendaFiscal(admin: any, tenantSchema: string, vendaId: string): Promise<VendaFiscal> {
    const tenant = admin.schema(tenantSchema)

    const { data: venda, error: vendaError } = await tenant
      .from('vendas')
      .select('id, cliente_id, valor_total, metodo_pagamento, desconto_aplicado, nfe_status')
      .eq('id', vendaId)
      .single()

    if (vendaError || !venda) {
      throw new Error('Venda não encontrada para emissão fiscal.')
    }

    const { data: itens, error: itensError } = await tenant
      .from('vendas_itens')
      .select('produto_id, quantidade, preco_unitario, subtotal')
      .eq('venda_id', vendaId)

    if (itensError) {
      throw new Error(`Falha ao carregar itens da venda: ${itensError.message}`)
    }

    const produtoIds = Array.from(new Set((itens || []).map((item: any) => item.produto_id).filter(Boolean)))
    const { data: produtos, error: produtosError } = produtoIds.length
      ? await tenant
          .from('produtos')
          .select('id, nome, ncm, cfop_padrao, origem')
          .in('id', produtoIds)
      : { data: [], error: null }

    if (produtosError) {
      throw new Error(`Falha ao carregar produtos da venda: ${produtosError.message}`)
    }

    const produtoMap = new Map((produtos || []).map((produto: any) => [produto.id, produto]))

    let cliente: VendaFiscal['clientes'] = null
    if (venda.cliente_id) {
      const { data: clienteData, error: clienteError } = await tenant
        .from('clientes')
        .select('id, nome, cpf_cnpj, endereco')
        .eq('id', venda.cliente_id)
        .single()

      if (clienteError) {
        throw new Error(`Falha ao carregar cliente da venda: ${clienteError.message}`)
      }

      cliente = clienteData
    }

    return {
      ...venda,
      valor_total: Number(venda.valor_total || 0),
      desconto_aplicado: Number(venda.desconto_aplicado || 0),
      vendas_itens: (itens || []).map((item: any) => ({
        ...item,
        quantidade: Number(item.quantidade || 0),
        preco_unitario: Number(item.preco_unitario || 0),
        subtotal: Number(item.subtotal || 0),
        produtos: produtoMap.get(item.produto_id),
      })),
      clientes: cliente,
    }
  }

  private static validateFiscalData(venda: VendaFiscal, empresa: NfeEmitirArgs['empresa']) {
    const requiredEmitente = [
      ['cnpj', empresa.cnpj],
      ['razao_social', empresa.razao_social],
      ['inscricao_estadual', empresa.inscricao_estadual],
      ['logradouro', empresa.logradouro],
      ['numero', empresa.numero],
      ['bairro', empresa.bairro],
      ['cidade', empresa.cidade],
      ['uf', empresa.uf],
      ['cep', empresa.cep],
      ['codigo_municipio_ibge', empresa.codigo_municipio_ibge],
      ['regime_tributario', empresa.regime_tributario],
    ].filter(([, value]) => !value)

    if (requiredEmitente.length > 0) {
      throw new Error(`Emitente incompleto para NF-e. Campos pendentes: ${requiredEmitente.map(([field]) => field).join(', ')}`)
    }

    if (!isSimplesNacional(empresa.regime_tributario)) {
      throw new Error('A emissão nativa de NF-e do Fluxo está liberada somente para empresas do Simples Nacional.')
    }

    if (!venda.clientes?.cpf_cnpj) {
      throw new Error('Cliente da venda sem CPF/CNPJ. A NF-e exige destinatário identificado neste fluxo.')
    }

    if (!Array.isArray(venda.vendas_itens) || venda.vendas_itens.length === 0) {
      throw new Error('Venda sem itens para emissão fiscal.')
    }

    const invalidProducts = venda.vendas_itens.filter(
      (item) => !item.produtos?.ncm || !item.produtos?.cfop_padrao
    )

    if (invalidProducts.length > 0) {
      const productNames = invalidProducts
        .map((item) => item.produtos?.nome || item.produto_id)
        .join(', ')
      throw new Error(`Produtos sem NCM/CFOP configurados: ${productNames}`)
    }

    const valorItens = venda.vendas_itens.reduce((total, item) => {
      const subtotal = Number(item.subtotal ?? (item.preco_unitario * item.quantidade))
      return total + subtotal
    }, 0)
    const desconto = Number(venda.desconto_aplicado || 0)
    const valorEsperado = Math.max(valorItens - desconto, 0)

    if (Math.abs(valorEsperado - Number(venda.valor_total || 0)) > 0.01) {
      throw new Error('Venda com totais fiscais inconsistentes. Revise subtotal dos itens, desconto e valor total antes de emitir a NF-e.')
    }
  }

  private static async updateVenda(admin: any, tenantSchema: string, vendaId: string, payload: Record<string, any>) {
    const { error } = await admin.schema(tenantSchema).from('vendas').update(payload).eq('id', vendaId)
    if (error) {
      throw new Error(`Falha ao atualizar status fiscal da venda: ${error.message}`)
    }
  }

  static async emitir({
    admin,
    tenantSchema,
    empresa,
    vendaId,
    certBase64,
    certPassword,
  }: NfeEmitirArgs): Promise<NfeEmissionResult> {
    try {
      if (!certPassword) {
        throw new Error('Senha do certificado não cadastrada para a empresa.')
      }

      const venda = await this.loadVendaFiscal(admin, tenantSchema, vendaId)
      this.validateFiscalData(venda, empresa)

      const certBuffer = Buffer.from(certBase64, 'base64')
      const certData = CertificateManager.extractFromPfx(certBuffer, certPassword)

      if (!CertificateManager.isValid(certData)) {
        throw new Error('Certificado digital expirado.')
      }

      if (!venda.clientes) {
        throw new Error('Cliente da venda não encontrado para emissão fiscal.')
      }

      const ambiente = empresa.nfe_ambiente || 'homologacao'
      const serieFiscal = 1 // Padrão
      const modeloFiscal = '55' // NFe

      const { data: nNF, error: rpcError } = await admin.rpc('incrementar_numero_nfe', {
        p_empresa_id: empresa.id,
        p_ambiente: ambiente,
        p_serie: serieFiscal,
        p_modelo: modeloFiscal,
      })

      if (rpcError || !nNF) {
        throw new Error(`Falha ao obter numeração sequencial (nNF): ${rpcError?.message || 'Retorno vazio'}`)
      }

      const xmlRaw = NfeXmlBuilder.build(venda, empresa, venda.clientes, {
        ambiente,
        serie: serieFiscal,
        nNF: Number(nNF),
        tpEmis: 1 // 1=Normal. Preparado para 7=SVC-RS em contingência
      })
      const xmlSigned = NfeSigner.sign(xmlRaw, certData.privateKeyPem, certData.certificatePem)

      const urls = getSefazUrl(empresa.uf || 'RS', ambiente)
      const responseSoap = await SefazClient.sendSoap(
        urls.autorizacao,
        this.buildEnviNfeXml(xmlSigned),
        certData.certificatePem,
        certData.privateKeyPem,
        { ambiente }
      )

      const parsed = this.parseAutorizacaoResponse(responseSoap)
      const chave = parsed.chNFe || xmlSigned.match(/Id="NFe(\d+)"/)?.[1]
      const protocolo = parsed.nProt

      if (!parsed.ok) {
        const errMsg = `SEFAZ rejeitou/recusou: cStat=${parsed.cStat || '??'} ${parsed.xMotivo || ''}`.trim()
        await this.updateVenda(admin, tenantSchema, vendaId, {
          nfe_status: 'erro',
          nfe_erro: errMsg,
          nfe_chave: chave || null,
        })
        return { success: false, error: errMsg }
      }

      const filePath = `${empresa.id}/nfe/${chave}.xml`
      const xmlBlob = new Blob([xmlSigned], { type: 'application/xml' })
      const { error: uploadError } = await admin.storage
        .from('fiscal')
        .upload(filePath, xmlBlob, { upsert: true, contentType: 'application/xml' })

      if (uploadError) {
        throw new Error(`Falha ao armazenar XML assinado: ${uploadError.message}`)
      }

      await this.updateVenda(admin, tenantSchema, vendaId, {
        nfe_status: 'emitida',
        nfe_chave: chave,
        nfe_protocolo: protocolo || null,
        nfe_xml_url: filePath,
        nfe_xml: xmlSigned,
        nfe_erro: null,
      })

      return {
        success: true,
        chave,
        protocolo,
        xmlUrl: filePath,
        xml: xmlSigned,
      }
    } catch (error: any) {
      console.error('Falha na emissão da NFe:', error.message)

      try {
        await this.updateVenda(admin, tenantSchema, vendaId, {
          nfe_status: 'erro',
          nfe_erro: error.message,
        })
      } catch {}

      return {
        success: false,
        error: error.message,
      }
    }
  }
}
