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
    regime_tributario: empresa.regime_tributario != null ? String(empresa.regime_tributario) : '',
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
    regime_tributario: input.regime_tributario?.trim() || '',
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
