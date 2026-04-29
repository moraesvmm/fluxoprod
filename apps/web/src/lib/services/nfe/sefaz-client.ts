/**
 * SEFAZ Client
 * Gerencia a comunicação SOAP com os Web Services da SEFAZ via HTTPS com mTLS.
 */

import axios from 'axios';
import * as https from 'https';

export class SefazClient {
  /**
   * Envia um envelope SOAP para a SEFAZ
   */
  static async sendSoap(
    url: string,
    nfeAutorizacaoPayloadXml: string,
    certPem: string,
    keyPem: string,
    opts?: { ambiente?: 'homologacao' | 'producao' }
  ): Promise<string> {
    // #region agent log
    fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'E',location:'apps/web/src/lib/services/nfe/sefaz-client.ts:15',message:'SefazClient.sendSoap start',data:{url,xmlChars:typeof nfeAutorizacaoPayloadXml==='string'?nfeAutorizacaoPayloadXml.length:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const ambiente = opts?.ambiente || 'homologacao';

    const soapEnvelope = `
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">${nfeAutorizacaoPayloadXml}</nfeDadosMsg>
        </soap12:Body>
      </soap12:Envelope>
    `.trim();

    // Criar Agente HTTPS com o Certificado e Chave para mTLS
    const httpsAgent = new https.Agent({
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: ambiente === 'producao'
    });

    try {
      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
        },
        httpsAgent,
        timeout: 30000 // 30 segundos
      });

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'E',location:'apps/web/src/lib/services/nfe/sefaz-client.ts:48',message:'SefazClient.sendSoap success',data:{status:response?.status||null,responseChars:typeof response?.data==='string'?response.data.length:null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      return response.data;
    } catch (error: any) {
      console.error('Erro na comunicação SOAP SEFAZ:', error.response?.data || error.message);

      // #region agent log
      fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'E',location:'apps/web/src/lib/services/nfe/sefaz-client.ts:55',message:'SefazClient.sendSoap error',data:{errorMessage:error?.message||String(error),status:error?.response?.status||null,hasResponseData:!!error?.response?.data},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      throw new Error('Falha na comunicação com os servidores da SEFAZ.');
    }
  }
}
