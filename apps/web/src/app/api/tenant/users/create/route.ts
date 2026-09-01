import 'server-only';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendWelcomeEmail } from '@/lib/email';

interface CreateUserPayload {
  nome: string;
  email: string;
  password: string;
  modulos_permitidos: string[]; // keys dos módulos liberados
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  let createdAuthUserId: string | null = null;

  try {
    // 1. Validar sessão do chamador via cookie de sessão
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user: caller }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !caller) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // 2. Verificar que o chamador é tenant_admin e obter empresa_id
    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('role, empresa_id')
      .eq('user_id', caller.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Permissão negada. Apenas administradores podem convidar usuários.' }, { status: 403 });
    }

    const empresa_id = callerProfile.empresa_id;

    // 3. Verificar limite de usuários do plano
    const { data: limiteRows } = await admin.rpc('verificar_limite_usuarios', { p_empresa_id: empresa_id });
    const limiteData = limiteRows?.[0];

    if (!limiteData?.pode_criar) {
      const { data: empresa } = await admin.from('empresas').select('plan_name, limite_usuarios').eq('id', empresa_id).maybeSingle();
      return NextResponse.json({
        error: `Limite de usuários atingido para o plano ${empresa?.plan_name || 'atual'} (${empresa?.limite_usuarios || 3} usuários). Faça upgrade para adicionar mais membros.`,
        upgrade_required: true,
        usuarios_ativos: limiteData?.usuarios_ativos,
        limite: limiteData?.limite,
      }, { status: 403 });
    }

    // 4. Validar payload
    const payload = (await request.json()) as CreateUserPayload;

    if (!payload.nome?.trim() || !payload.email?.trim() || !payload.password?.trim()) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }
    if (payload.password.trim().length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const requestedModules = Array.isArray(payload.modulos_permitidos)
      ? [...new Set(payload.modulos_permitidos.filter((key): key is string => typeof key === 'string'))]
      : [];
    const { data: contractedModules } = await admin
      .from('empresa_modulos')
      .select('modulo_key')
      .eq('empresa_id', empresa_id)
      .eq('ativo', true);
    const contractedKeys = new Set((contractedModules || []).map((module) => module.modulo_key));
    const invalidModules = requestedModules.filter((key) => key !== 'dashboard' && !contractedKeys.has(key));
    if (invalidModules.length > 0) {
      return NextResponse.json({ error: 'Um ou mais módulos não estão contratados pela empresa.' }, { status: 400 });
    }

    // 5. Criar usuário no Auth (email_confirm: false → Supabase envia link de ativação)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      email_confirm: false,
      user_metadata: { nome: payload.nome.trim() },
    });

    if (createError) {
      if (createError.message.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 409 });
      }
      throw new Error(createError.message);
    }

    createdAuthUserId = newUser.user.id;

    // 6. Vincular ao tenant (role sempre inicia como tenant_user)
    const { error: profileError } = await admin.from('user_profiles').insert({
      user_id: createdAuthUserId,
      empresa_id,
      role: 'tenant_user',
      nome: payload.nome.trim(),
    });

    if (profileError) throw new Error(profileError.message);

    // 7. Gravar o estado de cada modulo contratado. Ausencia de linha nunca deve
    // significar permissao implicita para um usuario novo.
    const permittedKeys = new Set([...requestedModules, 'dashboard']);
    const modulosPayload = [...new Set(['dashboard', ...contractedKeys])].map((key) => ({
      user_id: createdAuthUserId!,
      empresa_id,
      modulo_key: key,
      permitido: permittedKeys.has(key),
    }));

    const { error: modulosError } = await admin
      .from('usuario_modulos_permitidos')
      .upsert(modulosPayload, { onConflict: 'user_id,empresa_id,modulo_key' });

    if (modulosError) {
      console.error('[users/create] Erro ao gravar módulos:', modulosError);
      throw new Error('Não foi possível configurar as permissões iniciais do usuário.');
    }

    const origin = request.headers.get('origin') || `https://${request.headers.get('host') || 'fluxoerp.com.br'}`;
    // @ts-expect-error O SDK exige password para signup, mas o usuário já foi criado com senha.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: payload.email.trim().toLowerCase(),
      options: { redirectTo: `${origin}/login?confirmed=true` },
    });
    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(linkError?.message || 'Não foi possível gerar o link de ativação.');
    }
    await sendWelcomeEmail(payload.email.trim().toLowerCase(), payload.nome.trim(), linkData.properties.action_link);

    return NextResponse.json({
      success: true,
      message: 'Usuário criado. Um e-mail de confirmação foi enviado.',
      data: { user_id: createdAuthUserId },
    });

  } catch (error: unknown) {
    // Rollback: remover usuário do Auth se o vínculo falhou
    if (createdAuthUserId) {
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }
    console.error('[POST /api/tenant/users/create]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno.' }, { status: 500 });
  }
}
