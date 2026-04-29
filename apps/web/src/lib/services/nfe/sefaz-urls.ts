/**
 * Mapeamento de URLs dos Web Services da SEFAZ para NFe 4.00
 * Fonte: Portal da Nota Fiscal Eletrônica (Sefaz)
 */

export interface SefazUrls {
  autorizacao: string;
  retAutorizacao: string;
  consultaProtocolo: string;
  statusServico: string;
}

export const SEFAZ_WS: Record<string, { homologacao: SefazUrls; producao: SefazUrls }> = {
  // Rio Grande do Sul (SVRS atende diversos estados)
  RS: {
    homologacao: {
      autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NfeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      statusServico: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx'
    },
    producao: {
      autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NfeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      statusServico: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx'
    }
  },
  // São Paulo
  SP: {
    homologacao: {
      autorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      retAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      consultaProtocolo: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsulta4.asmx',
      statusServico: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx'
    },
    producao: {
      autorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      retAutorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      consultaProtocolo: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsulta4.asmx',
      statusServico: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx'
    }
  },
  // Minas Gerais
  MG: {
    homologacao: {
      autorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
      consultaProtocolo: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsulta4',
      statusServico: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4'
    },
    producao: {
      autorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
      consultaProtocolo: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsulta4',
      statusServico: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4'
    }
  },
  // SVRS (Atende AC, AL, AP, DF, PB, PI, RJ, RN, RO, RR, SC, SE, TO)
  SVRS: {
    homologacao: {
      autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NfeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      statusServico: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx'
    },
    producao: {
      autorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NfeAutorizacao4.asmx',
      retAutorizacao: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      statusServico: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx'
    }
  }
};

/**
 * Retorna o Web Service correto baseado na UF e ambiente
 */
export function getSefazUrl(uf: string, ambiente: 'homologacao' | 'producao'): SefazUrls {
  const svrsStates = ['AC', 'AL', 'AP', 'DF', 'PB', 'PI', 'RJ', 'RN', 'RO', 'RR', 'SC', 'SE', 'TO'];
  
  let key = uf.toUpperCase();
  if (svrsStates.includes(key)) key = 'SVRS';
  
  const config = SEFAZ_WS[key] || SEFAZ_WS['SVRS'];
  return config[ambiente];
}
