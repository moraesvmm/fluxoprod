import 'server-only'

import { createAdminClient } from '@/utils/supabase/admin'

export interface FiscalConfigView {
  inscricao_estadual: string
  inscricao_municipal: string
  regime_tributario: string
  nfe_ambiente: 'producao' | 'homologacao'
  codigo_municipio_ibge: string
  certificado_configurado: boolean
  senha_certificado_configurada: boolean
}

export interface FiscalConfigUpdateInput {
  inscricao_estadual?: string
  inscricao_municipal?: string
  regime_tributario?: string
  nfe_ambiente?: 'producao' | 'homologacao'
  nfe_certificado_senha?: string
  codigo_municipio_ibge?: string
}

function normalizeRegimeTributario(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return ''
  if (normalized === '1' || normalized === 'simples nacional') return '1'
  throw new Error('O fluxo nativo de NF-e está disponível somente para empresas do Simples Nacional.')
}

function getRegimeTributarioForView(value: string | number | null | undefined): string {
  if (value == null) return ''
  try {
    return normalizeRegimeTributario(String(value))
  } catch {
    return ''
  }
}

export async function getFiscalConfig(empresaId: string): Promise<FiscalConfigView> {
  const admin = createAdminClient()
  const { data: empresa, error } = await admin
    .from('empresas')
    .select('id, inscricao_estadual, inscricao_municipal, regime_tributario, nfe_ambiente, nfe_certificado_senha, codigo_municipio_ibge')
    .eq('id', empresaId)
    .single()

  if (error || !empresa) {
    throw new Error('Configuração fiscal da empresa não encontrada.')
  }

  const { data: files, error: storageError } = await admin.storage
    .from('fiscal')
    .list(empresaId, {
      search: 'certificado.pfx',
    })

  if (storageError) {
    throw new Error(`Falha ao verificar certificado da empresa: ${storageError.message}`)
  }

  return {
    inscricao_estadual: empresa.inscricao_estadual || '',
    inscricao_municipal: empresa.inscricao_municipal || '',
    regime_tributario: getRegimeTributarioForView(empresa.regime_tributario),
    nfe_ambiente: empresa.nfe_ambiente === 'producao' ? 'producao' : 'homologacao',
    codigo_municipio_ibge: empresa.codigo_municipio_ibge || '',
    certificado_configurado: (files || []).some((file) => file.name === 'certificado.pfx'),
    senha_certificado_configurada: !!empresa.nfe_certificado_senha,
  }
}

export async function updateFiscalConfig(
  empresaId: string,
  input: FiscalConfigUpdateInput
): Promise<FiscalConfigView> {
  const admin = createAdminClient()
  const payload: Record<string, string> = {
    inscricao_estadual: input.inscricao_estadual?.trim() || '',
    inscricao_municipal: input.inscricao_municipal?.trim() || '',
    regime_tributario: normalizeRegimeTributario(input.regime_tributario),
    nfe_ambiente: input.nfe_ambiente === 'producao' ? 'producao' : 'homologacao',
    codigo_municipio_ibge: input.codigo_municipio_ibge?.trim() || '',
  }

  if (input.nfe_certificado_senha?.trim()) {
    payload.nfe_certificado_senha = input.nfe_certificado_senha.trim()
  }

  const { error } = await admin
    .from('empresas')
    .update(payload)
    .eq('id', empresaId)

  if (error) {
    throw new Error(`Falha ao salvar configuração fiscal: ${error.message}`)
  }

  return getFiscalConfig(empresaId)
}
