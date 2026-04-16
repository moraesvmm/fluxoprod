const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wkxtlvxotvutycbupfuh.supabase.co';
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function studyStructure() {
  console.log('=== ESTUDANDO ESTRUTURA DO BANCO DE DADOS ===\n');

  try {
    // 1. Verificar schemas de tenants
    console.log('1. Schemas de tenants:');
    const { data: schemas, error: schemasError } = await supabase
      .rpc('query', { 
        sql: "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name"
      });
    
    if (schemasError) {
      console.error('Erro ao buscar schemas:', schemasError);
      // Tentar via SQL direto
      const { data: schemas2, error: schemasError2 } = await supabase
        .from('information_schema.schemata')
        .select('schema_name')
        .like('schema_name', 'tenant_%')
        .order('schema_name');
      
      if (schemasError2) {
        console.error('Erro ao buscar schemas (tentativa 2):', schemasError2);
      } else {
        console.log(schemas2);
      }
    } else {
      console.log(schemas);
    }

    // 2. Verificar tabelas em schemas tenant
    console.log('\n2. Tabelas em schemas tenant:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .like('table_schema', 'tenant_%')
      .eq('table_type', 'BASE TABLE')
      .order('table_schema, table_name');
    
    if (tablesError) {
      console.error('Erro ao buscar tabelas:', tablesError);
    } else {
      console.log(tables);
    }

    // 3. Verificar tabelas no schema public
    console.log('\n3. Tabelas no schema public:');
    const { data: publicTables, error: publicTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');
    
    if (publicTablesError) {
      console.error('Erro ao buscar tabelas public:', publicTablesError);
    } else {
      console.log(publicTables);
    }

    // 4. Verificar RPCs no schema public
    console.log('\n4. RPCs no schema public:');
    const { data: rpcs, error: rpcsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_schema, security_type')
      .eq('routine_schema', 'public')
      .like('routine_name', 'tenant_%')
      .order('routine_name');
    
    if (rpcsError) {
      console.error('Erro ao buscar RPCs:', rpcsError);
    } else {
      console.log(rpcs);
    }

    // 5. Verificar tabela transacoes_financeiras
    console.log('\n5. Tabela transacoes_financeiras:');
    const { data: transacoes, error: transacoesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .eq('table_name', 'transacoes_financeiras')
      .order('table_schema');
    
    if (transacoesError) {
      console.error('Erro ao buscar transacoes_financeiras:', transacoesError);
    } else {
      console.log(transacoes);
    }

    // 6. Verificar tabela financeiro
    console.log('\n6. Tabela financeiro:');
    const { data: financeiro, error: financeiroError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .eq('table_name', 'financeiro')
      .like('table_schema', 'tenant_%')
      .order('table_schema');
    
    if (financeiroError) {
      console.error('Erro ao buscar financeiro:', financeiroError);
    } else {
      console.log(financeiro);
    }

    // 7. Verificar tabelas de comissões
    console.log('\n7. Tabelas de comissões:');
    const { data: comissoes, error: comissoesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .in('table_name', ['comissoes', 'comissoes_regras'])
      .like('table_schema', 'tenant_%')
      .order('table_schema, table_name');
    
    if (comissoesError) {
      console.error('Erro ao buscar comissões:', comissoesError);
    } else {
      console.log(comissoes);
    }

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

studyStructure();
