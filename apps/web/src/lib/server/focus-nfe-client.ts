import 'server-only'

export type FocusNfeEnvironment = 'homologacao' | 'producao'

export interface FocusNfeCompanyPayload {
  nome: string
  nome_fantasia?: string
  cnpj: string
  inscricao_estadual?: string
  inscricao_municipal?: string
  logradouro?: string
  numero?: string | number
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string | number
  telefone?: string
  email?: string
  regime_tributario?: number
  habilita_nfe?: boolean
  habilita_nfce?: boolean
  habilita_nfse?: boolean
  arquivo_certificado_base64?: string
  senha_certificado?: string
}

export interface FocusNfeResponse {
  status: string
  ref?: string
  cnpj_emitente?: string
  chave_nfe?: string
  numero?: string
  serie?: string
  caminho_xml_nota_fiscal?: string
  caminho_danfe?: string
  codigo?: string
  mensagem?: string
  erros?: Array<{ campo?: string; mensagem?: string }>
  [key: string]: unknown
}

function getBaseUrl(environment: FocusNfeEnvironment): string {
  return environment === 'producao'
    ? process.env.FOCUSNFE_PRODUCAO_URL || 'https://api.focusnfe.com.br/v2'
    : process.env.FOCUSNFE_HOMOLOGACAO_URL || 'https://homologacao.focusnfe.com.br/v2'
}

function getToken(environment: FocusNfeEnvironment, tokenOverride?: string): string {
  if (tokenOverride) return tokenOverride

  const token = environment === 'producao'
    ? process.env.FOCUSNFE_TOKEN_PRODUCAO
    : process.env.FOCUSNFE_TOKEN_HOMOLOGACAO

  if (!token) {
    throw new Error(`Token FocusNFe não configurado para o ambiente ${environment}.`)
  }

  return token
}

function authHeader(token: string): string {
  return `Basic ${Buffer.from(`${token}:`).toString('base64')}`
}

async function request<T>(
  environment: FocusNfeEnvironment,
  path: string,
  init: RequestInit = {},
  tokenOverride?: string,
): Promise<T> {
  const token = getToken(environment, tokenOverride)
  const response = await fetch(`${getBaseUrl(environment)}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(token),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })

  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { mensagem: text || response.statusText }
  }

  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'mensagem' in body
      ? String(body.mensagem)
      : `FocusNFe respondeu HTTP ${response.status}.`
    throw new Error(message)
  }

  return body as T
}

export const focusNfeClient = {
  createCompany(environment: FocusNfeEnvironment, payload: FocusNfeCompanyPayload, dryRun = false) {
    const query = dryRun ? '?dry_run=1' : ''
    return request<FocusNfeResponse>(environment, `/empresas${query}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  emitNfe(
    environment: FocusNfeEnvironment,
    reference: string,
    payload: Record<string, unknown>,
    tokenOverride?: string,
  ) {
    const query = `?ref=${encodeURIComponent(reference)}`
    return request<FocusNfeResponse>(environment, `/nfe${query}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, tokenOverride)
  },

  getNfe(environment: FocusNfeEnvironment, reference: string, tokenOverride?: string) {
    return request<FocusNfeResponse>(environment, `/nfe/${encodeURIComponent(reference)}`, {}, tokenOverride)
  },

  createWebhook(
    environment: FocusNfeEnvironment,
    payload: { event: string; url: string; cnpj?: string; authorization?: string; authorization_header?: string },
    tokenOverride?: string,
  ) {
    return request<FocusNfeResponse>(environment, '/hooks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, tokenOverride)
  },
}
