/**
 * Certificate Manager
 * Responsável por extrair chaves e certificados de arquivos .pfx (PKCS#12)
 * Requer biblioteca 'node-forge'
 */

// @ts-ignore
import * as forge from 'node-forge';

export interface CertificateData {
  privateKeyPem: string;
  certificatePem: string;
  commonName: string;
  notAfter: Date;
}

export class CertificateManager {
  /**
   * Extrai dados do certificado a partir de um buffer PFX
   */
  static extractFromPfx(pfxBuffer: Buffer, password: string): CertificateData {
    try {
      // Converte buffer para binário forge
      const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

      // 1. Extrair Chave Privada
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (!keyBag || !keyBag[0]) throw new Error('Chave privada não encontrada no PFX');
      const privateKey = keyBag[0].key;
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

      // 2. Extrair Certificado
      const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag];
      if (!certBag || !certBag[0]) throw new Error('Certificado não encontrado no PFX');
      const certificate = certBag[0].cert;
      const certificatePem = forge.pki.certificateToPem(certificate);

      // 3. Metadados
      const commonName = certificate.subject.getField('CN').value;
      const notAfter = certificate.validity.notAfter;

      return {
        privateKeyPem,
        certificatePem,
        commonName,
        notAfter
      };
    } catch (error: any) {
      console.error('Erro ao processar certificado:', error.message);
      throw new Error('Falha ao descriptografar o certificado. Verifique a senha.');
    }
  }

  /**
   * Verifica se o certificado ainda é válido
   */
  static isValid(certData: CertificateData): boolean {
    return new Date() < certData.notAfter;
  }
}
