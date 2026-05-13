import 'server-only';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

async function getCallerAdminProfile(admin: ReturnType<typeof createAdminClient>, callerId: string) {
  const { data } = await admin
    .from('user_profiles')
    .select('role, empresa_id')
    .eq('user_id', callerId)
    .is('deleted_at', null)
    .maybeSingle();
  return data;
}

async function getTargetProfile(admin: ReturnType<typeof createAdminClient>, targetId: string, empresaId: string) {
  const { data } = await admin
    .from('user_profiles')
    .select('user_id, role, empresa_id')
    .eq('user_id', targetId)
    .eq('empresa_id', empresaId)
    .is('deleted_at', null)
    .maybeSingle();
  return data;
}

// DELETE /api/tenant/users/[id] — soft-delete + ban no Auth
export async function DELETE(
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

    const callerProfile = await getCallerAdminProfile(admin, caller.id);
    if (!callerProfile || callerProfile.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }

    // Proteção: admin não pode se auto-excluir
    if (caller.id === targetUserId) {
      return NextResponse.json({ error: 'Você não pode remover sua própria conta.' }, { status: 400 });
    }

    // Verificar que o alvo pertence ao mesmo tenant
    const targetProfile = await getTargetProfile(admin, targetUserId, callerProfile.empresa_id);
    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuário não encontrado neste tenant.' }, { status: 404 });
    }

    // Soft-delete em user_profiles
    const { error: softDeleteError } = await admin
      .from('user_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
      .eq('empresa_id', callerProfile.empresa_id);

    if (softDeleteError) throw new Error(softDeleteError.message);

    // Banir no Auth (impede novo login sem destruir dados)
    await admin.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' }); // ~100 anos

    return NextResponse.json({ success: true, message: 'Usuário removido com sucesso.' });

  } catch (error: any) {
    console.error('[DELETE /api/tenant/users/[id]]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

// PATCH /api/tenant/users/[id] — alterar role
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

    const callerProfile = await getCallerAdminProfile(admin, caller.id);
    if (!callerProfile || callerProfile.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }

    if (caller.id === targetUserId) {
      return NextResponse.json({ error: 'Você não pode alterar seu próprio papel.' }, { status: 400 });
    }

    const body = await request.json();
    const newRole = body.role as string;

    if (!['tenant_admin', 'tenant_user'].includes(newRole)) {
      return NextResponse.json({ error: 'Role inválido. Use tenant_admin ou tenant_user.' }, { status: 400 });
    }

    const targetProfile = await getTargetProfile(admin, targetUserId, callerProfile.empresa_id);
    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuário não encontrado neste tenant.' }, { status: 404 });
    }

    const { error: updateError } = await admin
      .from('user_profiles')
      .update({ role: newRole })
      .eq('user_id', targetUserId)
      .eq('empresa_id', callerProfile.empresa_id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ success: true, message: 'Papel atualizado com sucesso.' });

  } catch (error: any) {
    console.error('[PATCH /api/tenant/users/[id]]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
