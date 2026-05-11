/**
 * Fiscal Bridge Service
 * Este serviço gerencia a comunicação entre o Fluxo ERP e o micro-serviço PHP (NFePHP).
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from "@/types/database.types";

interface EmitirNfeParams {
  vendaId: string;
  ambiente: 'homologacao' | 'producao';
}

export async function solicitarEmissaoNfe({ vendaId, ambiente }: EmitirNfeParams) {
  const supabase = createClient() as import('@supabase/supabase-js').SupabaseClient<Database>;

  // 1. Buscar dados completos da venda e da empresa (emitente)
  // Nota: Implementação simplificada para demonstração da arquitetura
  const { data: venda } = await supabase
    .from('vendas')
    .select('*, vendas_itens(*, produtos(*)), clientes(*)')
    .eq('id', vendaId)
    .single();

  if (!venda) throw new Error('Venda não encontrada');

  // 2. Buscar configurações da empresa e o certificado digital
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .single(); // No multi-tenant real, buscar pelo ID da empresa logada

  if (!(empresa as any)?.focusnfe_token_homologacao && !process.env.FISCAL_BRIDGE_URL) {
    // Caso ainda não tenha o micro-serviço, apenas logamos o que aconteceria
    console.log('Simulação de envio para Ponte Fiscal:', { venda, ambiente });
    return { success: true, message: 'Simulação concluída (Aguardando Micro-serviço)' };
  }

  // 3. Chamar a Ponte Fiscal (Micro-serviço Docker/PHP)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_FISCAL_BRIDGE_URL}/emitir-nfe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.FISCAL_BRIDGE_API_KEY || '',
      },
      body: JSON.stringify({
        venda,
        empresa,
        config: {
          ambiente,
          // Certificado viria do Supabase Storage
          cert_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/certificados/${empresa?.id}.pfx`,
        }
      }),
    });

    const result = await response.json();

    if (result.success) {
      // 4. Atualizar o banco de dados com a chave e XML retornados
      await supabase
        .from('vendas')
        .update({
          nfe_status: 'emitida',
          nfe_chave: result.chave,
          nfe_xml: result.xml_url
        } as any)
        .eq('id', vendaId);
    }

    return result;
  } catch (error) {
    console.error('Erro na Ponte Fiscal:', error);
    return { success: false, error: 'Falha na comunicação com o servidor fiscal.' };
  }
}
