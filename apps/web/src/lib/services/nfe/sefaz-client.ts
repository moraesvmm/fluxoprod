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

      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: unknown }; message?: string };
      console.error('Erro na comunicação SOAP SEFAZ:', axiosErr?.response?.data || (error instanceof Error ? error.message : error));
      throw new Error('Falha na comunicação com os servidores da SEFAZ.');
    }
  }
}
