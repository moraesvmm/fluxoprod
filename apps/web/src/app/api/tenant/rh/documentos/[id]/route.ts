import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tenant/rh/documentos/[id] — Gera signed URL temporária
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token invalido" }, { status: 401 });
    }

    // Obter storage_path via RPC (garante isolamento tenant)
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: docData, error: rpcError } = await supabaseUser.rpc(
      "tenant_obter_documento",
      { p_documento_id: id }
    );

    if (rpcError || !docData || docData.error) {
      return NextResponse.json(
        { error: docData?.error || "Documento nao encontrado" },
        { status: 404 }
      );
    }

    // Gerar signed URL (5 minutos)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("documentos-rh")
      .createSignedUrl(docData.storage_path, 300);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: "Falha ao gerar URL de acesso" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      nome_arquivo: docData.nome_arquivo,
      mime_type: docData.mime_type,
    });
  } catch (err) {
    console.error("Erro ao obter documento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/tenant/rh/documentos/[id] — Remove documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token invalido" }, { status: 401 });
    }

    // Excluir metadados via RPC (retorna storage_path)
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: deleteResult, error: rpcError } = await supabaseUser.rpc(
      "tenant_excluir_documento",
      { p_documento_id: id }
    );

    if (rpcError || !deleteResult || deleteResult.error) {
      return NextResponse.json(
        { error: deleteResult?.error || "Falha ao excluir documento" },
        { status: 404 }
      );
    }

    // Remover arquivo do Storage
    if (deleteResult.storage_path) {
      await supabaseAdmin.storage
        .from("documentos-rh")
        .remove([deleteResult.storage_path]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir documento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
