require('dotenv').config({ path: '../../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { fakerPT_BR: faker } = require('@faker-js/faker');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = 'tenant_suplementos_257cc9';
const EMPRESA_ID = '7545fead-a3c6-4e7b-b430-366346795aab';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: SCHEMA }
});

const publicSupabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIAS = [
  'Proteínas', 'Aminoácidos', 'Pré-Treinos', 'Vitaminas e Minerais',
  'Termogênicos', 'Hipercalóricos', 'Snacks e Barrinhas', 'Acessórios'
];

async function main() {
  console.log(`Starting large seed for ${SCHEMA}...`);

  // 1. Get Admin User
  const { data: profiles, error: profileErr } = await publicSupabase
    .from('user_profiles')
    .select('user_id, nome')
    .eq('empresa_id', EMPRESA_ID)
    .limit(1);

  if (profileErr || !profiles.length) {
    console.error('Error fetching admin user:', profileErr);
    return;
  }
  const adminUser = profiles[0];

  // 2. Generate Products
  console.log('Generating Products...');
  const produtos = [];
  const estoques = [];

  for (let i = 0; i < 60; i++) {
    const categoria = faker.helpers.arrayElement(CATEGORIAS);
    const isAccessory = categoria === 'Acessórios';
    
    let nome = '';
    if (categoria === 'Proteínas') nome = `Whey Protein ${faker.helpers.arrayElement(['Isolado', 'Concentrado', 'Hidrolisado'])} ${faker.helpers.arrayElement(['900g', '1.8kg', '2kg'])} - Sabor ${faker.helpers.arrayElement(['Morango', 'Baunilha', 'Chocolate'])}`;
    else if (categoria === 'Aminoácidos') nome = `${faker.helpers.arrayElement(['BCAA', 'Glutamina', 'Creatina'])} ${faker.number.int({min: 100, max: 500})}g`;
    else if (categoria === 'Pré-Treinos') nome = `Pré-Treino ${faker.word.adjective().toUpperCase()} ${faker.number.int({min: 150, max: 300})}g`;
    else if (categoria === 'Vitaminas e Minerais') nome = `Multivitamínico ${faker.helpers.arrayElement(['Homem', 'Mulher', 'Sport'])} ${faker.number.int({min: 30, max: 120})} Caps`;
    else if (categoria === 'Termogênicos') nome = `Termogênico ${faker.helpers.arrayElement(['Lipo', 'Shred', 'Burn'])} ${faker.number.int({min: 60, max: 120})} Caps`;
    else if (categoria === 'Hipercalóricos') nome = `Massa ${faker.number.int({min: 1000, max: 3000})} ${faker.helpers.arrayElement(['3kg', '1.5kg'])}`;
    else if (categoria === 'Snacks e Barrinhas') nome = `Barra de Proteína Sabor ${faker.helpers.arrayElement(['Amendoim', 'Brownie', 'Cookies'])} (Caixa com 12)`;
    else nome = `Coqueteleira ${faker.helpers.arrayElement(['600ml', '800ml'])} ${faker.color.human()}`;

    const preco_base = Number(faker.commerce.price({ min: 30, max: 350, dec: 2 }));
    const custo_unitario = Number((preco_base * faker.number.float({ min: 0.3, max: 0.6 })).toFixed(2));
    
    const prodId = faker.string.uuid();
    produtos.push({
      id: prodId,
      nome,
      descricao: faker.commerce.productDescription(),
      tipo: 'produto',
      preco_base,
      categoria,
      custo_unitario,
    });

    estoques.push({
      produto_id: prodId,
      sku: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
      quantidade: faker.number.int({ min: 10, max: 300 }),
      quantidade_minima: faker.number.int({ min: 5, max: 30 })
    });
  }
  
  await supabase.from('produtos').insert(produtos);
  await supabase.from('estoque').insert(estoques);

  // 3. Generate Clients/Leads
  console.log('Generating Clients...');
  const clientes = [];
  const funilFases = ['Lead', 'Qualificado', 'Em Negociação', 'Proposta Enviada', 'Cliente', 'Perdido'];
  
  for (let i = 0; i < 150; i++) {
    const isEmpresa = faker.datatype.boolean(0.3); // 30% B2B
    clientes.push({
      id: faker.string.uuid(),
      nome: isEmpresa ? faker.company.name() : faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      telefone: faker.phone.number(),
      cpf_cnpj: faker.string.numeric(isEmpresa ? 14 : 11),
      funil_fase: faker.helpers.arrayElement(funilFases),
      status: faker.datatype.boolean(0.8) ? 'ativo' : 'inativo',
      criado_em: faker.date.recent({ days: 180 }).toISOString()
    });
  }
  await supabase.from('clientes').insert(clientes);

  // 4. Generate Sales & Financials over the last 6 months
  console.log('Generating Sales and Financials...');
  const vendas = [];
  const vendasItens = [];
  const financeiros = [];
  
  // Distribute 400 sales across the last 6 months
  for (let i = 0; i < 400; i++) {
    const isCompleted = faker.datatype.boolean(0.9); // 90% concluded
    const vendaId = faker.string.uuid();
    const cliente = faker.helpers.arrayElement(clientes);
    const dateVenda = faker.date.recent({ days: 180 });
    
    // Pick 1-4 products
    const numItems = faker.number.int({ min: 1, max: 4 });
    let totalVenda = 0;
    
    for (let j = 0; j < numItems; j++) {
      const prod = faker.helpers.arrayElement(produtos);
      const qtde = faker.number.int({ min: 1, max: 3 });
      const preco_unitario = prod.preco_base;
      totalVenda += qtde * preco_unitario;
      
      vendasItens.push({
        venda_id: vendaId,
        produto_id: prod.id,
        quantidade: qtde,
        preco_unitario: preco_unitario
      });
    }

    const discount = faker.datatype.boolean(0.2) ? Number((totalVenda * 0.1).toFixed(2)) : 0;
    totalVenda = totalVenda - discount;

    vendas.push({
      id: vendaId,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      vendedor_id: adminUser.user_id,
      vendedor_nome: adminUser.nome,
      valor_total: Number(totalVenda.toFixed(2)),
      desconto_aplicado: discount,
      metodo_pagamento: faker.helpers.arrayElement(['PIX', 'Cartão de Crédito', 'Boleto']),
      status: isCompleted ? 'concluido' : faker.helpers.arrayElement(['pendente', 'cancelado']),
      criado_em: dateVenda.toISOString(),
      atualizado_em: dateVenda.toISOString()
    });

    if (isCompleted) {
      financeiros.push({
        tipo: 'receber',
        descricao: `Venda #${vendaId.substring(0, 8)} - ${cliente.nome}`,
        valor: Number(totalVenda.toFixed(2)),
        data_vencimento: dateVenda.toISOString(),
        status: 'pago',
        criado_em: dateVenda.toISOString(),
        atualizado_em: dateVenda.toISOString()
      });
    }
  }
  
  // Insert in batches of 100 to avoid limits
  for (let i = 0; i < vendas.length; i += 100) {
    await supabase.from('vendas').insert(vendas.slice(i, i + 100));
  }
  for (let i = 0; i < vendasItens.length; i += 100) {
    await supabase.from('vendas_itens').insert(vendasItens.slice(i, i + 100));
  }
  for (let i = 0; i < financeiros.length; i += 100) {
    await supabase.from('financeiro').insert(financeiros.slice(i, i + 100));
  }

  // 5. Generate regular expenses (Despesas) to show long term cashflow
  console.log('Generating Expenses...');
  const despesas = [];
  const despesasFixas = ['Energia Elétrica', 'Água', 'Internet', 'Aluguel Galpão', 'Salários', 'Contabilidade'];
  const fornecedores = ['Fornecedor Suplementos A', 'Distribuidora Fit', 'Embalagens LTDA', 'Transportadora Rápida'];
  
  // 120 expenses distributed over the last 6 months
  for (let i = 0; i < 120; i++) {
    const isFixa = faker.datatype.boolean(0.6);
    const descricao = isFixa ? faker.helpers.arrayElement(despesasFixas) : faker.helpers.arrayElement(fornecedores);
    const valor = faker.number.float({ min: 100, max: 4000, dec: 2 });
    const dateVencimento = faker.date.recent({ days: 180 });
    
    despesas.push({
      tipo: 'pagar',
      descricao,
      valor: Number(valor.toFixed(2)),
      data_vencimento: dateVencimento.toISOString(),
      status: dateVencimento < new Date() ? 'pago' : 'pendente',
      criado_em: dateVencimento.toISOString(),
      atualizado_em: dateVencimento.toISOString()
    });
  }
  
  for (let i = 0; i < despesas.length; i += 100) {
    await supabase.from('financeiro').insert(despesas.slice(i, i + 100));
  }

  console.log('Finished seeding demo data successfully!');
}

main().catch(console.error);
