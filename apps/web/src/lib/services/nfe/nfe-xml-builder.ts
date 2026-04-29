/**
 * NFe XML Builder
 * Responsável por gerar o XML da NFe 4.00 baseado nos dados do ERP.
 */

import { Venda, Produto, Cliente, Empresa } from '@/lib/api';

export class NfeXmlBuilder {
  /**
   * Gera o XML completo da NFe (sem assinatura)
   */
  static build(venda: Venda & { itens: any[] }, emitente: Empresa, destinatario: Cliente): string {
    const agora = new Date().toISOString();
    const cnf = Math.floor(10000000 + Math.random() * 90000000).toString(); // Código numérico aleatório
    
    // Simplificação extrema para o MVP da estrutura
    // Em um cenário real, cada tag seguiria o manual da SEFAZ
    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<infNFe Id="NFe${this.gerarChaveAcesso(venda, emitente, cnf)}" version="4.00">`;
    
    // 1. Identificação (ide)
    xml += `<ide>`;
    xml += `<cUF>${this.getUfCode(emitente.uf || 'RS')}</cUF>`;
    xml += `<cNF>${cnf}</cNF>`;
    xml += `<natOp>Venda de Mercadoria</natOp>`;
    xml += `<mod>55</mod>`;
    xml += `<serie>1</serie>`;
    xml += `<nNF>${venda.id.substring(0, 8)}</nNF>`; // Número da nota (simplificado)
    xml += `<dhEmi>${agora}</dhEmi>`;
    xml += `<tpNF>1</tpNF>`; // 1=Saída
    xml += `<idDest>1</idDest>`; // 1=Interna
    xml += `<cMunFG>${emitente.cidade || '4314902'}</cMunFG>`;
    xml += `<tpImp>1</tpImp>`;
    xml += `<tpEmis>1</tpEmis>`;
    xml += `<cDV>0</cDV>`;
    xml += `<tpAmb>2</tpAmb>`; // 2=Homologação
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
    venda.itens.forEach((item, index) => {
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
      xml += `<vProd>${item.subtotal.toFixed(2)}</vProd>`;
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
    xml += `<vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${venda.valor.toFixed(2)}</vProd>`;
    xml += `<vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>${(venda.desconto_aplicado || 0).toFixed(2)}</vDesc>`;
    xml += `<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro>`;
    xml += `<vNF>${venda.valor.toFixed(2)}</vNF>`;
    xml += `</ICMSTot></total>`;

    // 6. Transporte (transp)
    xml += `<transp><modFrete>9</modFrete></transp>`;

    // 7. Pagamento (pag)
    xml += `<pag><detPag>`;
    xml += `<tPag>${this.getMetodoPagamentoCode(venda.metodo)}</tPag>`;
    xml += `<vPag>${venda.valor.toFixed(2)}</vPag>`;
    xml += `</detPag></pag>`;

    xml += `</infNFe>`;
    return xml;
  }

  private static gerarChaveAcesso(venda: Venda, emitente: Empresa, cnf: string): string {
    // Exemplo simplificado de chave
    return "43" + new Date().toISOString().substring(2, 4) + new Date().toISOString().substring(5, 7) + 
           emitente.cnpj?.replace(/\D/g, '').padStart(14, '0') + "55" + "001" + 
           venda.id.substring(0, 9).padStart(9, '0') + "1" + cnf.padStart(8, '0') + "0";
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
