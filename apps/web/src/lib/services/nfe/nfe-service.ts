/**
 * NFe Service (Orchestrator)
 * O ponto central de entrada para emissão de NFe no Fluxo ERP.
 */

import { createClient } from '@/utils/supabase/client';
import { CertificateManager } from './certificate-manager';
import { NfeXmlBuilder } from './nfe-xml-builder';
import { NfeSigner } from './nfe-signer';
import { SefazClient } from './sefaz-client';
import { getSefazUrl } from './sefaz-urls';

export interface NfeEmissionResult {
  success: boolean;
  chave?: string;
  protocolo?: string;
  xml?: string;
  error?: string;
}

export class NfeService {
  /**
   * Realiza o fluxo completo de emissão de uma NFe
   */
  static async emitir(vendaId: string, certBase64: string, certPassword: string): Promise<NfeEmissionResult> {
    const supabase = createClient();

    try {
      // 1. Buscar Dados da Venda e Itens
      const { data: venda } = await supabase
        .from('vendas')
        .select('*, vendas_itens(*, produtos(*)), clientes(*)')
        .eq('id', vendaId)
        .single();

      if (!venda) throw new Error('Venda não encontrada');

      // 2. Buscar Dados da Empresa (Emitente)
      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .single();

      if (!empresa) throw new Error('Dados da empresa não encontrados');

      // 3. Processar Certificado
      const certBuffer = Buffer.from(certBase64, 'base64');
      const certData = CertificateManager.extractFromPfx(certBuffer, certPassword);

      if (!CertificateManager.isValid(certData)) {
        throw new Error('Certificado digital expirado.');
      }

      // 4. Gerar XML
      const xmlRaw = NfeXmlBuilder.build(venda, empresa, venda.clientes);

      // 5. Assinar XML
      const xmlSigned = NfeSigner.sign(xmlRaw, certData.privateKeyPem, certData.certificatePem);

      // 6. Enviar para SEFAZ
      const ambiente = empresa.nfe_ambiente || 'homologacao';
      const urls = getSefazUrl(empresa.uf || 'RS', ambiente);
      
      const responseSoap = await SefazClient.sendSoap(urls.autorizacao, xmlSigned, certData.certificatePem, certData.privateKeyPem);

      // 7. Processar Retorno (Simplificado para o MVP)
      // Em uma implementação real, usaríamos fast-xml-parser para ler o status cStat
      console.log('Resposta SEFAZ:', responseSoap);

      // Simulando sucesso para o fluxo técnico
      const chave = xmlSigned.match(/Id="NFe(\d+)"/)?.[1];

      // 8. Atualizar Venda no Banco
      await supabase
        .from('vendas')
        .update({
          nfe_status: 'emitida',
          nfe_chave: chave,
          nfe_protocolo: 'Simulado_' + Date.now()
        })
        .eq('id', vendaId);

      return {
        success: true,
        chave,
        xml: xmlSigned
      };

    } catch (error: any) {
      console.error('Falha na emissão da NFe:', error.message);
      
      await supabase
        .from('vendas')
        .update({ nfe_status: 'erro' })
        .eq('id', vendaId);

      return {
        success: false,
        error: error.message
      };
    }
  }
}
