import { NextResponse } from 'next/server'

import { focusNfeClient, type FocusNfeEnvironment } from '@/lib/server/focus-nfe-client'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

async function requireMaster() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.role !== 'master') throw new Error('Apenas usuário master pode provisionar a FocusNFe.')
  return admin
}

export async function POST(request: Request) {
  try {
    const admin = await requireMaster()
    const body = await request.json() as {
      empresaId?: string
      ambiente?: FocusNfeEnvironment
      dryRun?: boolean
      ativar?: boolean
    }

    if (!body.empresaId) {
      return NextResponse.json({ success: false, error: 'empresaId é obrigatório.' }, { status: 400 })
    }

    const ambiente = body.ambiente === 'producao' ? 'producao' : 'homologacao'
    const { data: empresa, error } = await admin
      .from('empresas')
      .select('id, cnpj, razao_social, inscricao_estadual, inscricao_municipal, logradouro, numero, complemento, bairro, cidade, uf, cep, regime_tributario, nfe_certificado_senha, focusnfe_empresa_id')
      .eq('id', body.empresaId)
      .single()

    if (error || !empresa) {
      return NextResponse.json({ success: false, error: 'Empresa não encontrada.' }, { status: 404 })
    }

    if (empresa.focusnfe_empresa_id && !body.dryRun) {
      if (body.ativar === true) {
        const { error: activationError } = await admin
          .from('empresas')
          .update({ fiscal_provedor: 'focusnfe' })
          .eq('id', empresa.id)
        if (activationError) throw new Error(`Falha ao ativar FocusNFe: ${activationError.message}`)
      }

      return NextResponse.json({
        success: true,
        alreadyProvisioned: true,
        activated: body.ativar === true,
        focusEmpresaId: empresa.focusnfe_empresa_id,
        ambiente,
      })
    }

    const certificate = await admin.storage.from('fiscal').download(`${empresa.id}/certificado.pfx`)
    const certBase64 = certificate.data
      ? Buffer.from(await certificate.data.arrayBuffer()).toString('base64')
      : undefined

    // A API de Empresas da Focus opera em produção; ela devolve os tokens dos ambientes.
    const response = await focusNfeClient.createCompany('producao', {
      nome: empresa.razao_social,
      cnpj: empresa.cnpj.replace(/\D/g, ''),
      inscricao_estadual: empresa.inscricao_estadual || undefined,
      inscricao_municipal: empresa.inscricao_municipal || undefined,
      logradouro: empresa.logradouro || undefined,
      numero: empresa.numero || undefined,
      complemento: empresa.complemento || undefined,
      bairro: empresa.bairro || undefined,
      municipio: empresa.cidade || undefined,
      uf: empresa.uf || undefined,
      cep: empresa.cep || undefined,
      regime_tributario: Number(empresa.regime_tributario || 1),
      habilita_nfe: true,
      habilita_nfce: true,
      habilita_nfse: true,
      ...(certBase64 ? { arquivo_certificado_base64: certBase64 } : {}),
      ...(empresa.nfe_certificado_senha ? { senha_certificado: empresa.nfe_certificado_senha } : {}),
    }, body.dryRun === true)

    if (body.dryRun) {
      return NextResponse.json({ success: true, dryRun: true, response })
    }

    const focusResponse = response as FocusNfeResponseWithTokens
    const update: Record<string, unknown> = {
      focusnfe_empresa_id: String(focusResponse.id || focusResponse.empresa_id || empresa.focusnfe_empresa_id || ''),
      focusnfe_token_producao: focusResponse.token_producao || null,
      focusnfe_token_homologacao: focusResponse.token_homologacao || null,
      focusnfe_configurado_em: new Date().toISOString(),
    }

    if (body.ativar === true) update.fiscal_provedor = 'focusnfe'

    const { error: updateError } = await admin.from('empresas').update(update).eq('id', empresa.id)
    if (updateError) throw new Error(`Falha ao salvar vínculo FocusNFe: ${updateError.message}`)

    const webhookUrl = process.env.FOCUSNFE_WEBHOOK_URL
    const webhookSecret = process.env.FOCUSNFE_WEBHOOK_SECRET
    const environmentToken = ambiente === 'producao' ? focusResponse.token_producao : focusResponse.token_homologacao
    if (webhookUrl && environmentToken) {
      await focusNfeClient.createWebhook('producao', {
        event: 'nfe',
        cnpj: empresa.cnpj.replace(/\D/g, ''),
        url: webhookUrl,
        ...(webhookSecret ? {
          authorization: webhookSecret,
          authorization_header: 'x-fluxo-focus-secret',
        } : {}),
      }, environmentToken)
    }

    return NextResponse.json({
      success: true,
      activated: body.ativar === true,
      focusEmpresaId: update.focusnfe_empresa_id,
      ambiente,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Falha ao provisionar FocusNFe.' },
      { status: 500 },
    )
  }
}

type FocusNfeResponseWithTokens = {
  id?: string | number
  empresa_id?: string | number
  token_producao?: string
  token_homologacao?: string
}
