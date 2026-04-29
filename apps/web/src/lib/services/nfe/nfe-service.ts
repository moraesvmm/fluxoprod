/**
 * NFe Service (Orchestrator)
 * O ponto central de entrada para emissão de NFe no Fluxo ERP.
 */

import { CertificateManager } from './certificate-manager';
import { NfeXmlBuilder } from './nfe-xml-builder';
import { NfeSigner } from './nfe-signer';
import { SefazClient } from './sefaz-client';
import { getSefazUrl } from './sefaz-urls';
import { XMLParser } from 'fast-xml-parser';

export interface NfeEmissionResult {
  success: boolean;
  chave?: string;
  protocolo?: string;
  xml?: string;
  xmlUrl?: string;
  error?: string;
}

export class NfeService {
  private static parseAutorizacaoResponse(xml: string): {
    ok: boolean;
    cStat?: string;
    xMotivo?: string;
    chNFe?: string;
    nProt?: string;
  } {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      ignoreDeclaration: true,
      parseTagValue: true,
      parseAttributeValue: false,
      trimValues: true,
    });

    const doc = parser.parse(xml);
    const body = doc?.Envelope?.Body;
    const ret = body?.nfeAutorizacaoLoteResult || body?.nfeAutorizacaoLoteResponse?.nfeAutorizacaoLoteResult;
    const payload = ret?.retEnviNFe || ret;
    const cStat = String(payload?.cStat ?? '');
    const xMotivo = payload?.xMotivo ? String(payload.xMotivo) : undefined;
    const prot = payload?.protNFe?.infProt || payload?.infProt;
    const chNFe = prot?.chNFe ? String(prot.chNFe) : undefined;
    const nProt = prot?.nProt ? String(prot.nProt) : undefined;
    const ok = cStat === '100' || (cStat === '104' && prot?.cStat === '100');
    return { ok, cStat, xMotivo, chNFe, nProt };
  }

  private static buildEnviNfeXml(xmlNfeSignedOrRaw: string): string {
    // NFeAutorizacao4 espera enviNFe (lote) contendo uma NFe.
    const idLote = String(Date.now());
    const indSinc = '1';
    return `
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>${idLote}</idLote>
        <indSinc>${indSinc}</indSinc>
        ${xmlNfeSignedOrRaw}
      </enviNFe>
    `.trim();
  }

  /**
   * Realiza o fluxo completo de emissão de uma NFe
   */
  static async emitir(
    supabase: any,
    vendaId: string,
    certBase64: string,
    certPassword: string
  ): Promise<NfeEmissionResult> {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'C',location:'apps/web/src/lib/services/nfe/nfe-service.ts:33',message:'NfeService.emitir start',data:{hasVendaId:!!vendaId,hasCertBase64:!!certBase64,hasCertPassword:!!certPassword,usingClientSupabase:true},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // 1. Buscar Dados da Venda e Itens
      const { data: venda } = await supabase
        .from('vendas')
        .select('*, vendas_itens(*, produtos(*)), clientes(*)')
        .eq('id', vendaId)
        .single();

      if (!venda) throw new Error('Venda não encontrada');

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'D',location:'apps/web/src/lib/services/nfe/nfe-service.ts:48',message:'NfeService venda loaded',data:{vendaId:venda?.id||null,hasItensArray:Array.isArray((venda as any)?.itens),hasVendasItensArray:Array.isArray((venda as any)?.vendas_itens),metodo:(venda as any)?.metodo||null,valor:(venda as any)?.valor_total??(venda as any)?.valor??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // 2. Buscar Dados da Empresa (Emitente)
      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .single();

      if (!empresa) throw new Error('Dados da empresa não encontrados');

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'B',location:'apps/web/src/lib/services/nfe/nfe-service.ts:59',message:'NfeService empresa loaded',data:{empresaId:empresa?.id||null,uf:empresa?.uf||null,ambiente:empresa?.nfe_ambiente||null,hasCnpj:!!empresa?.cnpj},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // 3. Processar Certificado
      const certBuffer = Buffer.from(certBase64, 'base64');
      const certData = CertificateManager.extractFromPfx(certBuffer, certPassword);

      if (!CertificateManager.isValid(certData)) {
        throw new Error('Certificado digital expirado.');
      }

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'B',location:'apps/web/src/lib/services/nfe/nfe-service.ts:72',message:'NfeService certificate ok',data:{commonName:certData?.commonName||null,notAfter:certData?.notAfter?new Date(certData.notAfter).toISOString():null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // 4. Gerar XML
      const xmlRaw = NfeXmlBuilder.build(venda, empresa, venda.clientes);

      // 5. Assinar XML
      const xmlSigned = NfeSigner.sign(xmlRaw, certData.privateKeyPem, certData.certificatePem);

      // 6. Enviar para SEFAZ
      const ambiente = empresa.nfe_ambiente || 'homologacao';
      const urls = getSefazUrl(empresa.uf || 'RS', ambiente);
      
      const enviNFe = this.buildEnviNfeXml(xmlSigned);
      const responseSoap = await SefazClient.sendSoap(urls.autorizacao, enviNFe, certData.certificatePem, certData.privateKeyPem, { ambiente });

      // 7. Processar Retorno (Simplificado para o MVP)
      const parsed = this.parseAutorizacaoResponse(responseSoap);

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'E',location:'apps/web/src/lib/services/nfe/nfe-service.ts:90',message:'NfeService SEFAZ SOAP response received',data:{ambiente,urlAutorizacao:urls?.autorizacao||null,responseChars:typeof responseSoap==='string'?responseSoap.length:null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const chave = parsed.chNFe || xmlSigned.match(/Id="NFe(\d+)"/)?.[1];
      const protocolo = parsed.nProt;

      if (!parsed.ok) {
        const errMsg = `SEFAZ rejeitou/recusou: cStat=${parsed.cStat || '??'} ${parsed.xMotivo || ''}`.trim();
        await supabase
          .from('vendas')
          .update({
            nfe_status: 'erro',
            nfe_erro: errMsg,
            nfe_chave: chave || null,
          })
          .eq('id', vendaId);
        return { success: false, error: errMsg };
      }

      // Upload do XML autorizado/assinado (melhor esforço)
      let xmlUrl: string | undefined;
      try {
        if (empresa?.id && chave) {
          const filePath = `${empresa.id}/nfe/${chave}.xml`;
          const blob = new Blob([xmlSigned], { type: 'application/xml' });
          await supabase.storage.from('fiscal').upload(filePath, blob, { upsert: true, contentType: 'application/xml' });
          const { data: signed } = await supabase.storage.from('fiscal').createSignedUrl(filePath, 60 * 60);
          xmlUrl = signed?.signedUrl || undefined;
        }
      } catch {}

      // 8. Atualizar Venda no Banco
      await supabase
        .from('vendas')
        .update({
          nfe_status: 'emitida',
          nfe_chave: chave,
          nfe_protocolo: protocolo || null,
          nfe_xml_url: xmlUrl || null,
          nfe_xml: xmlSigned
        })
        .eq('id', vendaId);

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'E',location:'apps/web/src/lib/services/nfe/nfe-service.ts:111',message:'NfeService venda updated as emitida (simulado)',data:{vendaId,hasChave:!!chave},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      return {
        success: true,
        chave,
        protocolo,
        xmlUrl,
        xml: xmlSigned
      };

    } catch (error: any) {
      console.error('Falha na emissão da NFe:', error.message);

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'C',location:'apps/web/src/lib/services/nfe/nfe-service.ts:124',message:'NfeService emitir failed',data:{errorMessage:error?.message||String(error)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      
      await supabase
        .from('vendas')
        .update({ nfe_status: 'erro', nfe_erro: error.message })
        .eq('id', vendaId);

      return {
        success: false,
        error: error.message
      };
    }
  }
}
