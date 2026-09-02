/**
 * Teste local (dry-run) do pipeline de emissão de NF-e SEM falar com a SEFAZ.
 * Gera um certificado autoassinado só para validar que build + assinatura do XML
 * funcionam de ponta a ponta. Não prova aceitação pela SEFAZ (isso exige certificado
 * ICP-Brasil real, por causa do mTLS).
 *
 * Rodar com: npx tsx apps/web/src/lib/services/nfe/__tests__/dry-run-local.ts
 */
// @ts-ignore - node-forge não publica types próprios (mesma exceção usada em certificate-manager.ts)
import * as forge from 'node-forge'
import { NfeXmlBuilder } from '../nfe-xml-builder'
import { NfeSigner } from '../nfe-signer'

function gerarCertificadoAutoassinado() {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)

  const attrs = [{ name: 'commonName', value: 'EMPRESA TESTE LTDA (dry-run)' }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())

  return {
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    certificatePem: forge.pki.certificateToPem(cert),
  }
}

function main() {
  console.log('1. Gerando certificado autoassinado (apenas para teste local)...')
  const { privateKeyPem, certificatePem } = gerarCertificadoAutoassinado()
  console.log('   OK - certificado gerado em memória.\n')

  const emitente = {
    cnpj: '12345678000199',
    razao_social: 'EMPRESA TESTE LTDA',
    inscricao_estadual: '123456789',
    logradouro: 'RUA TESTE',
    numero: '100',
    bairro: 'CENTRO',
    cidade: 'PORTO ALEGRE',
    uf: 'RS',
    cep: '90000000',
    codigo_municipio_ibge: '4314902',
    regime_tributario: 1, // Simples Nacional
  }

  const destinatario = {
    nome: 'CLIENTE TESTE',
    cpf_cnpj: '98765432100',
    endereco: 'RUA DO CLIENTE, 200',
  }

  const venda = {
    id: 'venda-dry-run',
    valor_total: 100.0,
    desconto_aplicado: 0,
    metodo_pagamento: 'pix',
    vendas_itens: [
      {
        produto_id: 'prod-001',
        quantidade: 1,
        preco_unitario: 100.0,
        subtotal: 100.0,
        produtos: {
          nome: 'PRODUTO TESTE',
          ncm: '61091000',
          cfop_padrao: '5102',
          origem: 0,
        },
      },
    ],
  }

  const opts = { ambiente: 'homologacao' as const, serie: 1, nNF: 123 }

  console.log('2. Montando o XML da NFe (sem assinatura)...')
  const xmlRaw = NfeXmlBuilder.build(venda, emitente, destinatario, opts)
  console.log('   OK - XML gerado, ' + xmlRaw.length + ' caracteres.\n')

  console.log('3. Assinando digitalmente o XML com o certificado de teste...')
  const xmlSigned = NfeSigner.sign(xmlRaw, privateKeyPem, certificatePem)
  console.log('   OK - XML assinado com sucesso.\n')

  const temAssinatura = xmlSigned.includes('<Signature') || xmlSigned.includes(':Signature')
  const temChave = /Id="NFe(\d{44})"/.test(xmlSigned)

  console.log('=== RESULTADO ===')
  console.log('Contém bloco de assinatura digital?', temAssinatura ? 'SIM' : 'NÃO (falhou)')
  console.log('Contém chave de acesso de 44 dígitos?', temChave ? 'SIM' : 'NÃO (falhou)')
  console.log('\n=== XML FINAL (assinado) ===\n')
  console.log(xmlSigned)
}

main()
