const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://moraesvmm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeSQL() {
  try {
    const sql = `
      DROP FUNCTION IF EXISTS public.tenant_dashboard_kpis();
      CREATE OR REPLACE FUNCTION public.tenant_dashboard_kpis() 
      RETURNS TABLE(
        total_vendas NUMERIC, 
        qtd_vendas BIGINT, 
        qtd_clientes BIGINT, 
        qtd_produtos BIGINT, 
        qtd_os_abertas BIGINT, 
        qtd_obras_em_andamento BIGINT,
        estoque_baixo BIGINT, 
        saldo NUMERIC
      ) 
      LANGUAGE plpgsql 
      SECURITY DEFINER 
      AS $$
      DECLARE 
        v_schema TEXT;
      BEGIN
        SELECT schema_name INTO v_schema 
        FROM public.user_profiles up 
        JOIN public.empresas e ON e.id = up.empresa_id 
        WHERE up.user_id = auth.uid();
        
        IF v_schema IS NULL OR v_schema = 'public' THEN
          RETURN;
        END IF;
        
        RETURN QUERY EXECUTE format('
          SELECT 
            COALESCE((SELECT SUM(valor_total) FROM %I.vendas), 0)::NUMERIC,
            COALESCE((SELECT COUNT(*) FROM %I.vendas), 0)::BIGINT,
            COALESCE((SELECT COUNT(*) FROM %I.clientes), 0)::BIGINT,
            COALESCE((SELECT COUNT(*) FROM %I.produtos), 0)::BIGINT,
            COALESCE((SELECT COUNT(*) FROM %I.ordens_servico WHERE status = ''aberta''), 0)::BIGINT,
            COALESCE((SELECT COUNT(*) FROM %I.obras WHERE status = ''em_andamento''), 0)::BIGINT,
            COALESCE((SELECT COUNT(*) FROM %I.estoque WHERE quantidade <= quantidade_minima), 0)::BIGINT,
            COALESCE((SELECT SUM(CASE WHEN tipo IN (''receita'', ''receber'') THEN valor ELSE -valor END) FROM %I.financeiro), 0)::NUMERIC
        ', v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema);
      END;
      $$;

      GRANT EXECUTE ON FUNCTION public.tenant_dashboard_kpis TO authenticated, anon;

      NOTIFY pgrst, 'reload schema';
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Erro ao executar SQL:', error);
      process.exit(1);
    }
    
    console.log('SQL executado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

executeSQL();
