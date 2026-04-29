/**
 * NFe Signer
 * Responsável por assinar digitalmente o XML da NFe.
 * Requer biblioteca 'xml-crypto'
 */

// @ts-ignore
import { SignedXml } from 'xml-crypto';

export class NfeSigner {
  /**
   * Assina o XML da NFe usando a chave privada e certificado
   */
  static sign(xml: string, privateKeyPem: string, certificatePem: string): string {
    try {
      const sig = new SignedXml();
      
      // Configurar a assinatura (Padrão SEFAZ)
      sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
      sig.addReference({
        xpath: "//*[local-name()='infNFe']",
        transforms: [
          'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          'http://www.w3.org/2001/10/xml-exc-c14n#',
        ],
        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
        isEmptyUri: false,
      });

      sig.privateKey = privateKeyPem;
      sig.publicCert = certificatePem;
      
      sig.computeSignature(xml, { 
        location: { reference: "//*[local-name()='infNFe']", action: "after" } 
      });

      return sig.getSignedXml();
    } catch (error: any) {
      console.error('Erro na assinatura XML:', error.message);
      throw new Error('Falha ao assinar digitalmente o XML da NFe.');
    }
  }

  private static cleanCert(certPem: string): string {
    return certPem
      .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
      .replace(/[\n\r]/g, '');
  }
}
