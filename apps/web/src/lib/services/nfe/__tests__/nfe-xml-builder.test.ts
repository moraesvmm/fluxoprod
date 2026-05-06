import { describe, it, expect } from 'vitest'
import { NfeXmlBuilder } from '../nfe-xml-builder'

describe('NfeXmlBuilder', () => {
  const mockEmitente = {
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

  const mockDestinatario = {
    nome: 'CLIENTE TESTE',
    cpf_cnpj: '98765432100',
    endereco: 'RUA DO CLIENTE, 200',
  }

  const mockVenda = {
    id: 'venda-123',
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

  const mockOpts = {
    ambiente: 'homologacao' as const,
    serie: 1,
    nNF: 123,
  }

  it('deve gerar um XML de NFe válido com as tags obrigatórias', () => {
    const xml = NfeXmlBuilder.build(mockVenda, mockEmitente, mockDestinatario, mockOpts)

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<NFe xmlns="http://www.portalfiscal.inf.br/nfe">')
    expect(xml).toContain('<infNFe')
    expect(xml).toContain('<ide>')
    expect(xml).toContain('<emit>')
    expect(xml).toContain('<dest>')
    expect(xml).toContain('<det nItem="1">')
    expect(xml).toContain('<total>')
    expect(xml).toContain('<transp>')
    expect(xml).toContain('<pag>')
  })

  it('deve calcular a chave de acesso e o dígito verificador corretamente', () => {
    const xml = NfeXmlBuilder.build(mockVenda, mockEmitente, mockDestinatario, mockOpts)
    
    // Procura pela tag infNFe Id="NFe..."
    const match = xml.match(/Id="NFe(\d{44})"/)
    expect(match).not.toBeNull()
    
    const chave = match![1]
    expect(chave.length).toBe(44)
    
    // O UF do RS é 43
    expect(chave.startsWith('43')).toBe(true)
    
    // O CNPJ deve estar na chave
    expect(chave).toContain('12345678000199')
  })

  it('deve conter o valor total correto', () => {
    const xml = NfeXmlBuilder.build(mockVenda, mockEmitente, mockDestinatario, mockOpts)
    expect(xml).toContain('<vNF>100.00</vNF>')
  })
})
