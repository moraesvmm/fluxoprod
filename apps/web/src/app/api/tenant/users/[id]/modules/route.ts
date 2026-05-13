import 'server-only';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

// PATCH /api/tenant/users/[id]/modules — atualizar módulos permitidos
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = createAdminClient();
  const { id: targetUserId } = await params;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    );

    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    // Verificar que é tenant_admin
    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('role, empresa_id')
      .eq('user_id', caller.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }

    // Verificar que o alvo pertence ao mesmo tenant
    const { data: targetProfile } = await admin
      .from('user_profiles')
      .select('user_id, empresa_id')
      .eq('user_id', targetUserId)
      .eq('empresa_id', callerProfile.empresa_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuário não encontrado neste tenant.' }, { status: 404 });
    }

    // Payload: { modulos: [{ key: 'crm', permitido: true }, ...] }
    const body = await request.json();
    const modulos = body.modulos as { key: string; permitido: boolean }[];

    if (!Array.isArray(modulos) || modulos.length === 0) {
      return NextResponse.json({ error: 'Lista de módulos inválida.' }, { status: 400 });
    }

    // Chamar RPC de upsert (SECURITY DEFINER garante que a RPC usa auth.uid() internamente)
    // Como estamos no server-side com service_role, chamamos diretamente via insert/upsert
    const upsertRows = modulos.map(m => ({
      user_id: targetUserId,
      empresa_id: callerProfile.empresa_id,
      modulo_key: m.key,
      permitido: m.permitido,
    }));

    const { error: upsertError } = await admin
      .from('usuario_modulos_permitidos')
      .upsert(upsertRows, { onConflict: 'user_id,empresa_id,modulo_key' });

    if (upsertError) throw new Error(upsertError.message);

    return NextResponse.json({ success: true, message: 'Permissões de módulo atualizadas.' });

  } catch (error: any) {
    console.error('[PATCH /api/tenant/users/[id]/modules]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

// GET /api/tenant/users/[id]/modules — listar módulos do usuário
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = createAdminClient();
  const { id: targetUserId } = await params;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
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

    // Buscar todos os módulos do catálogo com status contratado + permitido para esse usuário
    const { data: catalogo } = await admin
      .from('modulos_catalogo')
      .select('key, nome');

    const { data: contratados } = await admin
      .from('empresa_modulos')
      .select('modulo_key, ativo')
      .eq('empresa_id', callerProfile.empresa_id);

    const { data: permitidos } = await admin
      .from('usuario_modulos_permitidos')
      .select('modulo_key, permitido')
      .eq('user_id', targetUserId)
      .eq('empresa_id', callerProfile.empresa_id);

    const contratadosMap = Object.fromEntries(
      (contratados || []).map(c => [c.modulo_key, c.ativo])
    );
    const permitidosMap = Object.fromEntries(
      (permitidos || []).map(p => [p.modulo_key, p.permitido])
    );

    const result = (catalogo || []).map(mc => ({
      modulo_key: mc.key,
      modulo_nome: mc.nome,
      contratado: contratadosMap[mc.key] ?? false,
      permitido: permitidosMap[mc.key] ?? false,
    }));

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('[GET /api/tenant/users/[id]/modules]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
