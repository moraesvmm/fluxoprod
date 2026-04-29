import { NextResponse } from 'next/server';
import { NfeService } from '@/lib/services/nfe/nfe-service';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  
  try {
    const { vendaId, certPassword } = await request.json();
    
    if (!vendaId) {
      return NextResponse.json({ success: false, error: 'vendaId é obrigatório' }, { status: 400 });
    }

    // 1. Buscar a Venda e identificar o Tenant
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .select('vendedor_id') // vendedor_id nos ajuda a achar o contexto se necessário, ou usamos o auth
      .eq('id', vendaId)
      .single();

    // 2. Buscar dados da Empresa (incluindo senha do certificado)
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nfe_certificado_senha')
      .single(); // O middleware de schema routing garante que pegamos a empresa certa

    if (empresaError || !empresa) {
      return NextResponse.json({ success: false, error: 'Empresa não encontrada ou sem acesso.' }, { status: 404 });
    }

    // 3. Buscar o certificado do Supabase Storage específico da empresa
    const { data: certBlob, error: downloadError } = await supabase
      .storage
      .from('fiscal')
      .download(`${empresa.id}/certificado.pfx`);

    if (downloadError || !certBlob) {
      return NextResponse.json({ 
        success: false, 
        error: 'Certificado digital não encontrado. Faça o upload nas configurações da sua empresa.' 
      }, { status: 404 });
    }

    const arrayBuffer = await certBlob.arrayBuffer();
    const certBase64 = Buffer.from(arrayBuffer).toString('base64');

    // 4. Chamar o serviço de emissão usando a senha salva no banco
    const result = await NfeService.emitir(vendaId, certBase64, empresa.nfe_certificado_senha || '');

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API NFe Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
