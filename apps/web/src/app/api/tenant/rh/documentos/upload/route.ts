import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_TIPOS = [
  "rg", "cpf", "cnh", "ctps", "contrato",
  "holerite", "comprovante_residencia", "atestado", "outros",
];

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar o usuario via token Bearer
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token invalido" }, { status: 401 });
    }

    // 2. Identificar tenant schema
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("empresa_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.empresa_id) {
      return NextResponse.json({ error: "Empresa nao encontrada" }, { status: 403 });
    }

    const { data: empresa } = await supabaseAdmin
      .from("empresas")
      .select("schema_name")
      .eq("id", profile.empresa_id)
      .single();

    if (!empresa?.schema_name) {
      return NextResponse.json({ error: "Schema nao encontrado" }, { status: 403 });
    }

    // 3. Ler FormData
    const formData = await request.formData();
    const file = formData.get("arquivo") as File | null;
    const funcionarioId = formData.get("funcionario_id") as string | null;
    const tipo = formData.get("tipo") as string | null;

    if (!file || !funcionarioId || !tipo) {
      return NextResponse.json(
        { error: "Campos obrigatorios: arquivo, funcionario_id, tipo" },
        { status: 400 }
      );
    }

    // 4. Validacoes
    if (!ALLOWED_TIPOS.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo invalido. Permitidos: ${ALLOWED_TIPOS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato invalido. Permitidos: PDF, JPG, PNG, WEBP` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Limite: 10MB` },
        { status: 400 }
      );
    }

    // 5. Gerar caminho unico no Storage
    const ext = file.name.split(".").pop() || "bin";
    const uniqueId = crypto.randomUUID();
    const storagePath = `${empresa.schema_name}/${funcionarioId}/${uniqueId}.${ext}`;

    // 6. Upload para o Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documentos-rh")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro no upload:", uploadError);
      return NextResponse.json(
        { error: "Falha ao fazer upload do arquivo" },
        { status: 500 }
      );
    }

    // 7. Registrar metadados via RPC (usa o token do usuario para respeitar auth.uid())
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: rpcResult, error: rpcError } = await supabaseUser.rpc(
      "tenant_registrar_documento",
      {
        p_funcionario_id: funcionarioId,
        p_tipo: tipo,
        p_nome_arquivo: file.name,
        p_tamanho_bytes: file.size,
        p_mime_type: file.type,
        p_storage_path: storagePath,
      }
    );

    if (rpcError) {
      // Rollback: deletar o arquivo do storage
      await supabaseAdmin.storage.from("documentos-rh").remove([storagePath]);
      console.error("Erro na RPC:", rpcError);
      return NextResponse.json(
        { error: "Falha ao registrar documento no banco" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, documento: rpcResult }, { status: 201 });
  } catch (err) {
    console.error("Erro inesperado no upload:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
