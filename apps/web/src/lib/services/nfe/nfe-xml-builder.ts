/**
 * NFe XML Builder
 * Responsável por gerar o XML da NFe 4.00 baseado nos dados do ERP.
 */

import { Venda, Produto, Cliente, Empresa } from '@/lib/api';

export class NfeXmlBuilder {
  /**
   * Gera o XML completo da NFe (sem assinatura)
   */
  static build(
    venda: any,
    emitente: Empresa,
    destinatario: Cliente,
    opts?: { ambiente?: 'homologacao' | 'producao'; serie?: number; nNF?: number; natOp?: string }
  ): string {
    const agora = new Date().toISOString();
    const cnf = Math.floor(10000000 + Math.random() * 90000000).toString(); // Código numérico aleatório
    const ambiente = opts?.ambiente || 'homologacao';
    const serie = opts?.serie ?? 1;
    const natOp = opts?.natOp || 'Venda de Mercadoria';
    const itens: any[] = Array.isArray(venda?.vendas_itens) ? venda.vendas_itens : Array.isArray(venda?.itens) ? venda.itens : [];
    const valorTotal = Number(venda?.valor_total ?? venda?.valor ?? 0);
    const metodo = String(venda?.metodo_pagamento ?? venda?.metodo ?? '');
    
    // Simplificação extrema para o MVP da estrutura
    // Em um cenário real, cada tag seguiria o manual da SEFAZ
    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    const chaveSemDV = this.gerarChaveAcessoSemDV(venda, emitente, cnf, serie, opts?.nNF);
    const cDV = this.calcularDV(chaveSemDV);
    const chave = `${chaveSemDV}${cDV}`;
    xml += `<infNFe Id="NFe${chave}" version="4.00">`;
    
    // 1. Identificação (ide)
    xml += `<ide>`;
    xml += `<cUF>${this.getUfCode(emitente.uf || 'RS')}</cUF>`;
    xml += `<cNF>${cnf}</cNF>`;
    xml += `<natOp>${natOp}</natOp>`;
    xml += `<mod>55</mod>`;
    xml += `<serie>${serie}</serie>`;
    xml += `<nNF>${String(opts?.nNF ?? 1).padStart(1, '0')}</nNF>`;
    xml += `<dhEmi>${agora}</dhEmi>`;
    xml += `<tpNF>1</tpNF>`; // 1=Saída
    xml += `<idDest>1</idDest>`; // 1=Interna
    xml += `<cMunFG>${emitente.cidade || '4314902'}</cMunFG>`;
    xml += `<tpImp>1</tpImp>`;
    xml += `<tpEmis>1</tpEmis>`;
    xml += `<cDV>${cDV}</cDV>`;
    xml += `<tpAmb>${ambiente === 'producao' ? 1 : 2}</tpAmb>`;
    xml += `<finNFe>1</finNFe>`;
    xml += `<indFinal>1</indFinal>`;
    xml += `<indPres>1</indPres>`;
    xml += `<procEmi>0</procEmi>`;
    xml += `<verProc>FluxoERP_2.4</verProc>`;
    xml += `</ide>`;

    // 2. Emitente (emit)
    xml += `<emit>`;
    xml += `<CNPJ>${emitente.cnpj?.replace(/\D/g, '')}</CNPJ>`;
    xml += `<xNome>${emitente.razao_social}</xNome>`;
    xml += `<enderEmit>`;
    xml += `<xLgr>${emitente.logradouro || 'Rua Teste'}</xLgr>`;
    xml += `<nro>${emitente.numero || '123'}</nro>`;
    xml += `<xBairro>${emitente.bairro || 'Centro'}</xBairro>`;
    xml += `<cMun>${emitente.cidade || '4314902'}</cMun>`;
    xml += `<xMun>Porto Alegre</xMun>`;
    xml += `<UF>${emitente.uf || 'RS'}</UF>`;
    xml += `<CEP>${emitente.cep?.replace(/\D/g, '') || '90000000'}</CEP>`;
    xml += `</enderEmit>`;
    xml += `<IE>${emitente.inscricao_estadual?.replace(/\D/g, '')}</IE>`;
    xml += `<CRT>${emitente.regime_tributario || 1}</CRT>`;
    xml += `</emit>`;

    // 3. Destinatário (dest)
    xml += `<dest>`;
    const docDest = destinatario.cpf_cnpj?.replace(/\D/g, '');
    if (docDest?.length === 11) xml += `<CPF>${docDest}</CPF>`;
    else xml += `<CNPJ>${docDest}</CNPJ>`;
    xml += `<xNome>${destinatario.nome}</xNome>`;
    xml += `<indIEDest>9</indIEDest>`; // 9=Não Contribuinte
    xml += `</dest>`;

    // 4. Itens (det)
    itens.forEach((item, index) => {
      xml += `<det nItem="${index + 1}">`;
      xml += `<prod>`;
      xml += `<cProd>${item.produto_id.substring(0, 8)}</cProd>`;
      xml += `<cEAN>SEM GTIN</cEAN>`;
      xml += `<xProd>${item.produtos?.nome || 'Produto'}</xProd>`;
      xml += `<NCM>${item.produtos?.ncm || '00000000'}</NCM>`;
      xml += `<CFOP>${item.produtos?.cfop_padrao || '5102'}</CFOP>`;
      xml += `<uCom>UN</uCom>`;
      xml += `<qCom>${item.quantidade.toFixed(4)}</qCom>`;
      xml += `<vUnCom>${item.preco_unitario.toFixed(10)}</vUnCom>`;
      const subtotal = Number(item.subtotal ?? (Number(item.preco_unitario ?? 0) * Number(item.quantidade ?? 0)));
      xml += `<vProd>${subtotal.toFixed(2)}</vProd>`;
      xml += `<cEANTrib>SEM GTIN</cEANTrib>`;
      xml += `<uTrib>UN</uTrib>`;
      xml += `<qTrib>${item.quantidade.toFixed(4)}</qTrib>`;
      xml += `<vUnTrib>${item.preco_unitario.toFixed(10)}</vUnTrib>`;
      xml += `<indTot>1</indTot>`;
      xml += `</prod>`;
      
      // Impostos (Simples Nacional - CSOSN 102)
      xml += `<imposto>`;
      xml += `<ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>`;
      xml += `<PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>`;
      xml += `<COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>`;
      xml += `</imposto>`;
      xml += `</det>`;
    });

    // 5. Totais (total)
    xml += `<total><ICMSTot>`;
    xml += `<vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST>`;
    xml += `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${valorTotal.toFixed(2)}</vProd>`;
    xml += `<vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>${Number(venda?.desconto_aplicado || 0).toFixed(2)}</vDesc>`;
    xml += `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro>`;
    xml += `<vNF>${valorTotal.toFixed(2)}</vNF>`;
    xml += `</ICMSTot></total>`;

    // 6. Transporte (transp)
    xml += `<transp><modFrete>9</modFrete></transp>`;

    // 7. Pagamento (pag)
    xml += `<pag><detPag>`;
    xml += `<tPag>${this.getMetodoPagamentoCode(metodo)}</tPag>`;
    xml += `<vPag>${valorTotal.toFixed(2)}</vPag>`;
    xml += `</detPag></pag>`;

    xml += `</infNFe>`;
    return xml;
  }

  private static gerarChaveAcessoSemDV(venda: any, emitente: Empresa, cnf: string, serie: number, nNF?: number): string {
    // Formato: cUF + AAMM + CNPJ + mod + serie(3) + nNF(9) + tpEmis + cNF(8)
    const now = new Date();
    const aa = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const cUF = this.getUfCode(emitente.uf || 'RS');
    const cnpj = String(emitente.cnpj || '').replace(/\D/g, '').padStart(14, '0');
    const mod = '55';
    const serie3 = String(serie).padStart(3, '0');
    const nNF9 = String(nNF ?? 1).padStart(9, '0');
    const tpEmis = '1';
    const cnf8 = String(cnf).padStart(8, '0');
    return `${cUF}${aa}${mm}${cnpj}${mod}${serie3}${nNF9}${tpEmis}${cnf8}`;
  }

  private static calcularDV(chaveSemDV: string): string {
    // Módulo 11 (pesos 2..9, da direita para esquerda)
    const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
    let soma = 0;
    for (let i = 0; i < chaveSemDV.length; i++) {
      const idx = chaveSemDV.length - 1 - i;
      const dig = Number(chaveSemDV[idx]);
      soma += dig * pesos[i % pesos.length];
    }
    const mod = soma % 11;
    const dv = mod === 0 || mod === 1 ? 0 : 11 - mod;
    return String(dv);
  }

  private static getUfCode(uf: string): string {
    const codes: Record<string, string> = { 'RS': '43', 'SP': '35', 'MG': '31', 'RJ': '33' };
    return codes[uf] || '43';
  }

  private static getMetodoPagamentoCode(metodo: string): string {
    const codes: Record<string, string> = { 'dinheiro': '01', 'cartao_credito': '03', 'cartao_debito': '04', 'pix': '17' };
    return codes[metodo] || '99';
  }
}
