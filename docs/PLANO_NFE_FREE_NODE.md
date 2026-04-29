# Plano de Ação: Emissão de NFe "Custo Zero" (Node.js Nativo)

Este documento detalha a estratégia para implementar a emissão de Nota Fiscal Eletrônica (NFe) 4.00 diretamente pelo Fluxo ERP, sem o uso de serviços pagos (SaaS).

## 🎯 Objetivo
Habilitar o Fluxo ERP a gerar, assinar, transmitir e gerenciar NFes utilizando apenas bibliotecas Open Source em ambiente Node.js.

---

## 🛠️ Stack Tecnológica Sugerida
Para evitar custos e dependências externas, utilizaremos:
1.  **`node-forge`**: Processamento do certificado digital A1 (.pfx) e extração de chaves.
2.  **`xml-crypto`**: Assinatura digital do XML seguindo o padrão C14N e XMLDSIG.
3.  **`axios` + `https` (agente customizado)**: Comunicação SOAP com mTLS (Autenticação Mútua).
4.  **`fast-xml-parser`**: Conversão bidirecional entre JSON e XML.
5.  **`pdfmake` ou `danfe-node`**: Geração do DANFE em PDF para visualização.

---

## 📅 Cronograma de Implementação

### Fase 1: Infraestrutura e Segurança (Base)
- [ ] **Gerenciador de Certificados**: Implementar lógica para ler o certificado `.pfx` do Supabase Storage e extrair `privateKey` e `certificate`.
- [ ] **Mapeador de Web Services**: Criar um dicionário com as URLs dos servidores da SEFAZ (Produção e Homologação) para cada UF (Estado).
- [ ] **Configuração Fiscal do Tenant**: Adicionar campos de Endereço Completo, IE, IM e Regime Tributário na tabela `empresas`.

### Fase 2: Motor de XML (Geração e Assinatura)
- [ ] **Mapeador ERP -> NFe**: Função que transforma o objeto `Venda` + `Itens` no formato estruturado da NFe 4.00.
- [ ] **Assinador Digital**: Implementar a lógica de canonicalização e assinatura da tag `<infNFe>`.
- [ ] **Validação XSD**: (Opcional, mas recomendado) Validar o XML contra os esquemas da SEFAZ antes do envio.

### Fase 3: Transmissão e Protocolo (Comunicação)
- [ ] **Cliente SOAP Nativo**: Criar um cliente HTTPS que utilize o certificado digital para autenticação nos servidores do governo.
- [ ] **Fluxo de Autorização**:
    1. Envio do Lote (`enviNFe`).
    2. Recebimento do Recibo.
    3. Consulta do Protocolo (`retEnviNFe`).
- [ ] **Tratamento de Rejeições**: Mapear erros comuns (Duplicidade, Rejeição de Tributos) para mensagens amigáveis no PDV.

### Fase 4: Integração PDV e Gestão
- [ ] **Disparo Pós-Venda**: Integrar a chamada do motor de NFe ao fluxo final do PDV.
- [ ] **Histórico Fiscal**: Atualizar a tabela `vendas` com a chave de acesso, protocolo e XML autorizado.
- [ ] **Visualização**: Implementar o botão "Visualizar DANFE" que gera o PDF em tempo real.

---

## ⚠️ Riscos e Ressalvas
- **Manutenção de URLs**: A SEFAZ ocasionalmente altera as URLs dos Web Services, exigindo atualizações no dicionário.
- **Complexidade Tributária**: O sistema precisará de campos para NCM, CFOP e Origem nos produtos para evitar rejeições fiscais.
- **Performance**: A assinatura de XML e geração de PDF consomem CPU; em ambientes de alta escala, pode ser necessário delegar para Edge Functions.

---

## ✅ Próximos Passos
1.  Criar o diretório `src/lib/services/nfe/`.
2.  Adicionar as colunas fiscais no banco de dados via migração SQL.
3.  Implementar o primeiro teste de leitura de certificado A1.
