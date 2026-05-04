import 'server-only';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

// GET /api/tenant/users — listar todos os usuários do tenant
export async function GET() {
  const admin = createAdminClient();

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('role, empresa_id')
      .eq('user_id', caller.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }

    // Buscar todos os user_profiles do tenant
    const { data: profiles, error: profilesError } = await admin
      .from('user_profiles')
      .select('user_id, nome, role, criado_em')
      .eq('empresa_id', callerProfile.empresa_id)
      .is('deleted_at', null)
      .order('criado_em', { ascending: true });

    if (profilesError) throw new Error(profilesError.message);

    // Buscar emails via auth (listUsers)
    const userIds = (profiles || []).map(p => p.user_id);
    const emailMap: Record<string, { email: string; ultimo_login: string | null }> = {};

    // Buscar em lotes de 50 para evitar sobrecarga
    for (let i = 0; i < userIds.length; i += 50) {
      const chunk = userIds.slice(i, i + 50);
      for (const uid of chunk) {
        const { data: authUser } = await admin.auth.admin.getUserById(uid);
        if (authUser?.user) {
          emailMap[uid] = {
            email: authUser.user.email || '',
            ultimo_login: authUser.user.last_sign_in_at || null,
          };
        }
      }
    }

    const result = (profiles || []).map(p => ({
      user_id: p.user_id,
      nome: p.nome,
      email: emailMap[p.user_id]?.email || '',
      role: p.role,
      criado_em: p.criado_em,
      ultimo_login: emailMap[p.user_id]?.ultimo_login || null,
    }));

    // Buscar limite e contagem
    const { data: limiteRows } = await admin.rpc('verificar_limite_usuarios', {
      p_empresa_id: callerProfile.empresa_id,
    });
    const limiteData = limiteRows?.[0];

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        usuarios_ativos: limiteData?.usuarios_ativos ?? result.length,
        limite: limiteData?.limite ?? 3,
        pode_criar: limiteData?.pode_criar ?? true,
      },
    });

  } catch (error: any) {
    console.error('[GET /api/tenant/users]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
