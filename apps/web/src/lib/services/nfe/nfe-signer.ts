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
      
      // NF-e 4.00 exige contrato alinhado a SHA-256 no fluxo nativo.
      sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
      sig.addReference({
        xpath: "//*[local-name()='infNFe']",
        transforms: [
          'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          'http://www.w3.org/2001/10/xml-exc-c14n#',
        ],
        digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
        isEmptyUri: false,
      });

      sig.privateKey = privateKeyPem;
      sig.publicCert = certificatePem;
      
      sig.computeSignature(xml, { 
        location: { reference: "//*[local-name()='infNFe']", action: "after" } 
      });

      return sig.getSignedXml();
    } catch (error: unknown) {
      console.error('Erro na assinatura XML:', error instanceof Error ? error.message : error);
      throw new Error('Falha ao assinar digitalmente o XML da NFe.');
    }
  }

  private static cleanCert(certPem: string): string {
    return certPem
      .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
      .replace(/[\n\r]/g, '');
  }
}
