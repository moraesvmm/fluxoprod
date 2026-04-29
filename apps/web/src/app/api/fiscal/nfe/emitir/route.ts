import { NextResponse } from 'next/server';
import { NfeService } from '@/lib/services/nfe/nfe-service';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

function agentLog(payload: Record<string, any>) {
  try {
    // best-effort local NDJSON fallback (no secrets)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const line = `${JSON.stringify(payload)}\n`;
    // Write to current working directory (apps/web) + workspace root (../../)
    fs.appendFileSync(path.resolve(process.cwd(), 'debug-4abf1b.log'), line);
    fs.appendFileSync(path.resolve(process.cwd(), '..', '..', 'debug-4abf1b.log'), line);
  } catch {}
  try {
    fetch('http://127.0.0.1:7386/ingest/98d300c3-d003-40d3-afaf-0f1637391f9d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4abf1b'},body:JSON.stringify(payload)}).catch(()=>{});
  } catch {}
}

export async function POST(request: Request) {
  const supabase = await createClient();
  
  try {
    const { vendaId, certPassword } = await request.json();

    // #region agent log
    agentLog({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'A',location:'apps/web/src/app/api/fiscal/nfe/emitir/route.ts:20',message:'NFe emitir route POST received',data:{hasVendaId:!!vendaId,hasCertPassword:!!certPassword},timestamp:Date.now()});
    // #endregion
    
    if (!vendaId) {
      return NextResponse.json({ success: false, error: 'vendaId é obrigatório' }, { status: 400 });
    }

    // 1. Buscar a Venda e identificar o Tenant
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .select('vendedor_id') // vendedor_id nos ajuda a achar o contexto se necessário, ou usamos o auth
      .eq('id', vendaId)
      .single();

    // #region agent log
    agentLog({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'A',location:'apps/web/src/app/api/fiscal/nfe/emitir/route.ts:36',message:'NFe route venda lookup',data:{vendaFound:!!venda,hasVendaError:!!vendaError},timestamp:Date.now()});
    // #endregion

    // 2. Buscar dados da Empresa (incluindo senha do certificado)
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nfe_certificado_senha')
      .single(); // O middleware de schema routing garante que pegamos a empresa certa

    // #region agent log
    agentLog({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'B',location:'apps/web/src/app/api/fiscal/nfe/emitir/route.ts:48',message:'NFe route empresa lookup',data:{empresaFound:!!empresa,hasEmpresaError:!!empresaError,empresaId:empresa?.id||null,hasSenhaNoDb:!!empresa?.nfe_certificado_senha},timestamp:Date.now()});
    // #endregion

    if (empresaError || !empresa) {
      return NextResponse.json({ success: false, error: 'Empresa não encontrada ou sem acesso.' }, { status: 404 });
    }

    // 3. Buscar o certificado do Supabase Storage específico da empresa
    const { data: certBlob, error: downloadError } = await supabase
      .storage
      .from('fiscal')
      .download(`${empresa.id}/certificado.pfx`);

    // #region agent log
    agentLog({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'B',location:'apps/web/src/app/api/fiscal/nfe/emitir/route.ts:61',message:'NFe route certificate download result',data:{downloadOk:!!certBlob&&!downloadError,hasDownloadError:!!downloadError},timestamp:Date.now()});
    // #endregion

    if (downloadError || !certBlob) {
      return NextResponse.json({ 
        success: false, 
        error: 'Certificado digital não encontrado. Faça o upload nas configurações da sua empresa.' 
      }, { status: 404 });
    }

    const arrayBuffer = await certBlob.arrayBuffer();
    const certBase64 = Buffer.from(arrayBuffer).toString('base64');

    // 4. Chamar o serviço de emissão usando a senha salva no banco
    const result = await NfeService.emitir(supabase, vendaId, certBase64, empresa.nfe_certificado_senha || '');

    // #region agent log
    agentLog({sessionId:'4abf1b',runId:'pre-fix',hypothesisId:'A',location:'apps/web/src/app/api/fiscal/nfe/emitir/route.ts:81',message:'NFe route emitir result',data:{success:!!result?.success,hasChave:!!result?.chave,hasXml:!!result?.xml,hasError:!!result?.error},timestamp:Date.now()});
    // #endregion

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('API NFe Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
