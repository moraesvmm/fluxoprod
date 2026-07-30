import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'demo.suplementos@fluxoerp.com.br';
  const password = 'demo_password123';
  const companyName = 'Suplementos Demo LTDA';
  const schemaName = `tenant_suplementos_${randomUUID().replace(/-/g, '').slice(0, 6)}`;
  const empresaId = randomUUID();
  
  console.log(`Creating user ${email}...`);
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome: 'Admin Demo' }
  });
  
  if (userError && !userError.message.includes('already')) {
    console.error('Error creating user:', userError);
    return;
  }
  
  let authUserId = user?.user?.id;
  if (!authUserId) {
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    authUserId = existingUser.users.find(u => u.email === email)?.id;
  }
  
  if (!authUserId) throw new Error('User not found');
  
  console.log(`Provisioning company ${companyName}...`);
  const { data: provisionData, error: provisionError } = await supabase.rpc(
    'provisionar_empresa_master',
    {
      p_empresa_id: empresaId,
      p_cnpj: '00000000000100',
      p_razao_social: companyName,
      p_porte: 'Pequeno',
      p_segmento: 'Comércio/Varejo',
      p_schema_name: schemaName,
      p_modules: ['crm', 'catalogo', 'estoque', 'vendas', 'financeiro', 'rh', 'producao', 'relatorios']
    }
  );
  
  if (provisionError) {
    console.error('Error provisioning company:', provisionError);
    return;
  }
  
  console.log('Company provisioned. Setting trial to permanent...');
  await supabase.from('empresas').update({
    subscription_status: 'ACTIVE',
    status: 'ativo',
    data_vencimento: '2099-12-31 23:59:59',
    trial_ends_at: '2099-12-31 23:59:59',
    plan_name: 'Pro',
    limite_usuarios: 50,
  }).eq('id', empresaId);
  
  await supabase.from('user_profiles').upsert({
    user_id: authUserId,
    role: 'tenant_admin',
    empresa_id: empresaId,
    nome: 'Admin Demo'
  });
  
  console.log(`Populating data into ${schemaName}...`);
  
  // A client specifically for the tenant schema
  const tenantClient = createClient(supabaseUrl, supabaseKey, {
    db: { schema: schemaName }
  });
  
  // Create Categories
  const catProteinasId = randomUUID();
  const catAminoacidosId = randomUUID();
  const catPreTreinoId = randomUUID();
  
  await tenantClient.from('categorias').insert([
    { id: catProteinasId, nome: 'Proteínas', tipo: 'produto' },
    { id: catAminoacidosId, nome: 'Aminoácidos', tipo: 'produto' },
    { id: catPreTreinoId, nome: 'Pré-Treinos', tipo: 'produto' }
  ]);
  
  // Create Products
  const wheyId = randomUUID();
  const creatinaId = randomUUID();
  const bcaaId = randomUUID();
  
  await tenantClient.from('produtos').insert([
    { id: wheyId, nome: 'Whey Protein Isolado 900g', sku: 'WP-ISO-900', categoria_id: catProteinasId, preco_venda: 189.90, preco_custo: 100.00, controle_estoque: true, tipo_item: 'produto_acabado' },
    { id: creatinaId, nome: 'Creatina Monohidratada 300g', sku: 'CREA-MONO-300', categoria_id: catAminoacidosId, preco_venda: 89.90, preco_custo: 45.00, controle_estoque: true, tipo_item: 'produto_acabado' },
    { id: bcaaId, nome: 'BCAA 2400 100 Caps', sku: 'BCAA-2400-100', categoria_id: catAminoacidosId, preco_venda: 49.90, preco_custo: 20.00, controle_estoque: true, tipo_item: 'produto_acabado' }
  ]);
  
  // Create Stock
  await tenantClient.from('estoque_movimentos').insert([
    { produto_id: wheyId, tipo: 'entrada', quantidade: 50, motivo: 'Saldo inicial', custo_unitario: 100.00, data_movimento: new Date().toISOString() },
    { produto_id: creatinaId, tipo: 'entrada', quantidade: 100, motivo: 'Saldo inicial', custo_unitario: 45.00, data_movimento: new Date().toISOString() },
    { produto_id: bcaaId, tipo: 'entrada', quantidade: 200, motivo: 'Saldo inicial', custo_unitario: 20.00, data_movimento: new Date().toISOString() }
  ]);
  
  await tenantClient.from('estoque_saldos').insert([
    { produto_id: wheyId, saldo_atual: 50, custo_medio: 100.00, valor_total: 5000.00 },
    { produto_id: creatinaId, saldo_atual: 100, custo_medio: 45.00, valor_total: 4500.00 },
    { produto_id: bcaaId, saldo_atual: 200, custo_medio: 20.00, valor_total: 4000.00 }
  ]);
  
  // Create Customers
  const cli1Id = randomUUID();
  const cli2Id = randomUUID();
  
  await tenantClient.from('clientes').insert([
    { id: cli1Id, nome_razao: 'João Silva', tipo_pessoa: 'F', email: 'joao.silva@exemplo.com', telefone: '11999999999', status: 'ativo' },
    { id: cli2Id, nome_razao: 'Academia Fit LTDA', tipo_pessoa: 'J', documento: '12345678000199', email: 'contato@academiafit.com', telefone: '1133334444', status: 'ativo' }
  ]);
  
  // Create Sales
  const venda1Id = randomUUID();
  await tenantClient.from('vendas').insert([
    { id: venda1Id, cliente_id: cli1Id, valor_total: 189.90, status: 'concluida', data_venda: new Date().toISOString(), vendedor_id: authUserId }
  ]);
  
  await tenantClient.from('vendas_itens').insert([
    { venda_id: venda1Id, produto_id: wheyId, quantidade: 1, preco_unitario: 189.90, valor_total: 189.90 }
  ]);
  
  await tenantClient.from('estoque_movimentos').insert([
    { produto_id: wheyId, tipo: 'saida', quantidade: 1, motivo: 'Venda #1', custo_unitario: 100.00, data_movimento: new Date().toISOString(), origem_id: venda1Id }
  ]);
  
  await tenantClient.from('estoque_saldos').update({ saldo_atual: 49, valor_total: 4900.00 }).eq('produto_id', wheyId);
  
  // Create Financials
  await tenantClient.from('contas_receber').insert([
    { descricao: 'Venda #1 - João Silva', cliente_id: cli1Id, valor: 189.90, data_vencimento: new Date().toISOString(), status: 'pago', data_recebimento: new Date().toISOString(), origem_tipo: 'venda', origem_id: venda1Id }
  ]);
  
  await tenantClient.from('contas_pagar').insert([
    { descricao: 'Fornecedor Embalagens', valor: 350.00, data_vencimento: new Date().toISOString(), status: 'pendente' },
    { descricao: 'Energia Elétrica', valor: 200.00, data_vencimento: new Date().toISOString(), status: 'pendente' }
  ]);

  console.log('Seed completed successfully!');
  console.log('Login credentials:');
  console.log('Email:', email);
  console.log('Password:', password);
}

main().catch(console.error);
