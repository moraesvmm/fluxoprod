/**
 * NFe XML Builder
 * Responsavel por gerar o XML da NFe 4.00 baseado nos dados do ERP.
 */

export class NfeXmlBuilder {
  /**
   * Gera o XML completo da NFe (sem assinatura)
   */
  static build(
    venda: any,
    emitente: {
      cnpj?: string
      razao_social: string
      inscricao_estadual?: string
      logradouro?: string
      numero?: string
      bairro?: string
      cidade?: string
      uf?: string
      cep?: string
      codigo_municipio_ibge?: string
      regime_tributario?: string | number
    },
    destinatario: {
      nome: string
      cpf_cnpj?: string | null
      endereco?: string | null
    },
    opts: { ambiente?: 'homologacao' | 'producao'; serie: number; nNF: number; natOp?: string; tpEmis?: number }
  ): string {
    const agora = new Date().toISOString()
    const cnf = Math.floor(10000000 + Math.random() * 90000000).toString()
    const ambiente = opts.ambiente || 'homologacao'
    const serie = opts.serie
    const natOp = opts?.natOp || 'Venda de Mercadoria'
    const codigoMunicipio = String(emitente.codigo_municipio_ibge || '').replace(/\D/g, '')
    const nomeMunicipio = emitente.cidade || ''
    const itens: any[] = Array.isArray(venda?.vendas_itens)
      ? venda.vendas_itens
      : Array.isArray(venda?.itens)
        ? venda.itens
        : []
    const valorTotal = Number(venda?.valor_total ?? venda?.valor ?? 0)
    const metodo = String(venda?.metodo_pagamento ?? venda?.metodo ?? '')

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`
    const chaveSemDV = this.gerarChaveAcessoSemDV(venda, emitente, cnf, serie, opts.nNF)
    const cDV = this.calcularDV(chaveSemDV)
    const chave = `${chaveSemDV}${cDV}`
    xml += `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">`
    xml += `<infNFe Id="NFe${chave}" version="4.00">`

    xml += `<ide>`
    xml += `<cUF>${this.getUfCode(emitente.uf || 'RS')}</cUF>`
    xml += `<cNF>${cnf}</cNF>`
    xml += `<natOp>${natOp}</natOp>`
    xml += `<mod>55</mod>`
    xml += `<serie>${serie}</serie>`
    xml += `<nNF>${String(opts.nNF).padStart(1, '0')}</nNF>`
    xml += `<dhEmi>${agora}</dhEmi>`
    xml += `<tpNF>1</tpNF>`
    xml += `<idDest>1</idDest>`
    xml += `<cMunFG>${codigoMunicipio}</cMunFG>`
    xml += `<tpImp>1</tpImp>`
    xml += `<tpEmis>${opts.tpEmis ?? 1}</tpEmis>`
    xml += `<cDV>${cDV}</cDV>`
    xml += `<tpAmb>${ambiente === 'producao' ? 1 : 2}</tpAmb>`
    xml += `<finNFe>1</finNFe>`
    xml += `<indFinal>1</indFinal>`
    xml += `<indPres>1</indPres>`
    xml += `<procEmi>0</procEmi>`
    xml += `<verProc>FluxoERP_2.6</verProc>`
    xml += `</ide>`

    xml += `<emit>`
    xml += `<CNPJ>${emitente.cnpj?.replace(/\D/g, '')}</CNPJ>`
    xml += `<xNome>${emitente.razao_social}</xNome>`
    xml += `<enderEmit>`
    xml += `<xLgr>${emitente.logradouro || 'Rua Teste'}</xLgr>`
    xml += `<nro>${emitente.numero || '123'}</nro>`
    xml += `<xBairro>${emitente.bairro || 'Centro'}</xBairro>`
    xml += `<cMun>${codigoMunicipio}</cMun>`
    xml += `<xMun>${nomeMunicipio}</xMun>`
    xml += `<UF>${emitente.uf || 'RS'}</UF>`
    xml += `<CEP>${emitente.cep?.replace(/\D/g, '') || '90000000'}</CEP>`
    xml += `</enderEmit>`
    xml += `<IE>${emitente.inscricao_estadual?.replace(/\D/g, '')}</IE>`
    xml += `<CRT>${this.getRegimeTributarioCode(emitente.regime_tributario)}</CRT>`
    xml += `</emit>`

    xml += `<dest>`
    const docDest = destinatario.cpf_cnpj?.replace(/\D/g, '')
    if (docDest?.length === 11) xml += `<CPF>${docDest}</CPF>`
    else xml += `<CNPJ>${docDest}</CNPJ>`
    xml += `<xNome>${destinatario.nome}</xNome>`
    xml += `<indIEDest>9</indIEDest>`
    xml += `</dest>`

    itens.forEach((item, index) => {
      const quantidade = Number(item.quantidade ?? 0)
      const precoUnitario = Number(item.preco_unitario ?? 0)
      const subtotal = Number(item.subtotal ?? (precoUnitario * quantidade))

      xml += `<det nItem="${index + 1}">`
      xml += `<prod>`
      xml += `<cProd>${String(item.produto_id || '').substring(0, 8)}</cProd>`
      xml += `<cEAN>SEM GTIN</cEAN>`
      xml += `<xProd>${item.produtos?.nome || 'Produto'}</xProd>`
      xml += `<NCM>${item.produtos?.ncm || '00000000'}</NCM>`
      xml += `<CFOP>${item.produtos?.cfop_padrao || '5102'}</CFOP>`
      xml += `<uCom>UN</uCom>`
      xml += `<qCom>${quantidade.toFixed(4)}</qCom>`
      xml += `<vUnCom>${precoUnitario.toFixed(10)}</vUnCom>`
      xml += `<vProd>${subtotal.toFixed(2)}</vProd>`
      xml += `<cEANTrib>SEM GTIN</cEANTrib>`
      xml += `<uTrib>UN</uTrib>`
      xml += `<qTrib>${quantidade.toFixed(4)}</qTrib>`
      xml += `<vUnTrib>${precoUnitario.toFixed(10)}</vUnTrib>`
      xml += `<indTot>1</indTot>`
      xml += `</prod>`

      xml += `<imposto>`
      xml += `<ICMS><ICMSSN102><orig>${item.produtos?.origem ?? 0}</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>`
      xml += `<PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>`
      xml += `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>`
      xml += `</imposto>`
      xml += `</det>`
    })

    xml += `<total><ICMSTot>`
    xml += `<vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>`
    xml += `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${valorTotal.toFixed(2)}</vProd>`
    xml += `<vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>${Number(venda?.desconto_aplicado || 0).toFixed(2)}</vDesc>`
    xml += `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro>`
    xml += `<vNF>${valorTotal.toFixed(2)}</vNF>`
    xml += `</ICMSTot></total>`

    xml += `<transp><modFrete>9</modFrete></transp>`
    xml += `<pag><detPag>`
    xml += `<tPag>${this.getMetodoPagamentoCode(metodo)}</tPag>`
    xml += `<vPag>${valorTotal.toFixed(2)}</vPag>`
    xml += `</detPag></pag>`

    xml += `</infNFe>`
    xml += `</NFe>`
    return xml
  }

  private static gerarChaveAcessoSemDV(
    venda: any,
    emitente: {
      cnpj?: string
      uf?: string
    },
    cnf: string,
    serie: number,
    nNF: number
  ): string {
    const now = new Date()
    const aa = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const cUF = this.getUfCode(emitente.uf || 'RS')
    const cnpj = String(emitente.cnpj || '').replace(/\D/g, '').padStart(14, '0')
    const mod = '55'
    const serie3 = String(serie).padStart(3, '0')
    const nNF9 = String(nNF).padStart(9, '0')
    const tpEmis = '1'
    const cnf8 = String(cnf).padStart(8, '0')
    return `${cUF}${aa}${mm}${cnpj}${mod}${serie3}${nNF9}${tpEmis}${cnf8}`
  }

  private static calcularDV(chaveSemDV: string): string {
    const pesos = [2, 3, 4, 5, 6, 7, 8, 9]
    let soma = 0
    for (let i = 0; i < chaveSemDV.length; i++) {
      const idx = chaveSemDV.length - 1 - i
      const dig = Number(chaveSemDV[idx])
      soma += dig * pesos[i % pesos.length]
    }
    const mod = soma % 11
    const dv = mod === 0 || mod === 1 ? 0 : 11 - mod
    return String(dv)
  }

  private static getUfCode(uf: string): string {
    const codes: Record<string, string> = {
      AC: '12',
      AL: '27',
      AM: '13',
      AP: '16',
      BA: '29',
      CE: '23',
      DF: '53',
      ES: '32',
      GO: '52',
      MA: '21',
      MG: '31',
      MS: '50',
      MT: '51',
      PA: '15',
      PB: '25',
      PE: '26',
      PI: '22',
      PR: '41',
      RJ: '33',
      RN: '24',
      RO: '11',
      RR: '14',
      RS: '43',
      SC: '42',
      SE: '28',
      SP: '35',
      TO: '17',
    }
    return codes[uf] || '43'
  }

  private static getMetodoPagamentoCode(metodo: string): string {
    const codes: Record<string, string> = {
      dinheiro: '01',
      cartao_credito: '03',
      cartao_debito: '04',
      pix: '17',
    }
    return codes[metodo] || '99'
  }

  private static getRegimeTributarioCode(regime: string | number | undefined): string {
    if (typeof regime === 'number') {
      return String(regime)
    }

    if (!regime) return '1'

    const normalized = String(regime).toLowerCase()
    if (normalized.includes('simples') && normalized.includes('excesso')) return '2'
    if (normalized.includes('simples')) return '1'
    return '3'
  }
}
