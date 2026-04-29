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
      sig.addReference("//*[local-name()='infNFe']", 
        ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'], 
        'http://www.w3.org/2001/04/xmlenc#sha256'
      );
      
      sig.signingKey = privateKeyPem;
      sig.keyInfoProvider = {
        getKeyInfo: () => `<X509Data><X509Certificate>${this.cleanCert(certificatePem)}</X509Certificate></X509Data>`
      };
      
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
