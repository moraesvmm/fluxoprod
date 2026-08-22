SET search_path TO tenant_vitormoraes_5fdcf8, public;

-- ========== 1. OBRAS ==========
DO $$
DECLARE
  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid; v_c5 uuid;
  v_o1 uuid; v_o2 uuid; v_o3 uuid; v_o4 uuid; v_o5 uuid;
BEGIN
  SELECT id INTO v_c1 FROM clientes WHERE nome = 'TechBras Solucoes LTDA';
  SELECT id INTO v_c2 FROM clientes WHERE nome = 'Distribuidora Norte LTDA';
  SELECT id INTO v_c3 FROM clientes WHERE nome = 'AutoPecas Vitoria LTDA';
  SELECT id INTO v_c4 FROM clientes WHERE nome = 'Ana Costa';
  SELECT id INTO v_c5 FROM clientes WHERE nome = 'Restaurante Sabor Arte';

  INSERT INTO obras (id, nome, cliente_id, descricao, endereco, data_inicio, data_fim_prevista, status, orcamento_total, criado_em)
  VALUES (gen_random_uuid(), 'Reforma Escritorio TechBras', v_c1, 'Reforma completa do escritorio com modernizacao', 'Av. Paulista, 1000 - SP', '2026-02-01', '2026-08-30', 'em_andamento', 180000, NOW() - INTERVAL '6 months') RETURNING id INTO v_o1;
  
  INSERT INTO obras (id, nome, cliente_id, descricao, endereco, data_inicio, data_fim_prevista, status, orcamento_total, criado_em)
  VALUES (gen_random_uuid(), 'Construcao Galpao Distribuidora', v_c2, 'Construcao de galpao 2000m', 'Distrito Industrial - Manaus', '2026-03-15', '2026-12-15', 'em_andamento', 450000, NOW() - INTERVAL '5 months') RETURNING id INTO v_o2;
  
  INSERT INTO obras (id, nome, cliente_id, descricao, endereco, data_inicio, data_fim_prevista, status, orcamento_total, criado_em)
  VALUES (gen_random_uuid(), 'Ampliacao Loja AutoPecas', v_c3, 'Ampliacao da area de showroom', 'Av. Jeronimo Monteiro - Vitoria', '2026-01-10', '2026-04-30', 'concluida', 85000, NOW() - INTERVAL '7 months') RETURNING id INTO v_o3;
  
  INSERT INTO obras (id, nome, cliente_id, descricao, endereco, data_inicio, data_fim_prevista, status, orcamento_total, criado_em)
  VALUES (gen_random_uuid(), 'Projeto Residencial Ana Costa', v_c4, 'Construcao residencial alto padrao', 'Av. Batel, 789 - Curitiba', '2026-09-01', '2027-06-30', 'planejada', 320000, NOW() - INTERVAL '1 month') RETURNING id INTO v_o4;
  
  INSERT INTO obras (id, nome, cliente_id, descricao, endereco, data_inicio, data_fim_prevista, status, orcamento_total, criado_em)
  VALUES (gen_random_uuid(), 'Reforma Restaurante Sabor', v_c5, 'Reforma da cozinha industrial', 'Rua do Comercio - Maceio', '2026-05-01', '2026-09-30', 'em_andamento', 120000, NOW() - INTERVAL '3 months') RETURNING id INTO v_o5;

  INSERT INTO obras_etapas (obra_id, nome, descricao, data_prevista, status, ordem) VALUES
    (v_o1, 'Demolicao', 'Remocao de paredes', '2026-02-28', 'concluida', 1),
    (v_o1, 'Eletrica', 'Nova instalacao', '2026-04-30', 'concluida', 2),
    (v_o1, 'Hidraulica', 'Reforma banheiros', '2026-06-30', 'em_andamento', 3),
    (v_o2, 'Terraplanagem', 'Preparacao terreno', '2026-04-15', 'concluida', 1),
    (v_o2, 'Fundacao', 'Estrutura metalica', '2026-06-30', 'concluida', 2),
    (v_o2, 'Cobertura', 'Fechamento lateral', '2026-09-30', 'em_andamento', 3);

  INSERT INTO obras_custos (obra_id, categoria, descricao, valor_previsto, valor_real, data, tipo) VALUES
    (v_o1, 'Material', 'Material eletrico', 25000, 23500, '2026-03-15', 'material'),
    (v_o1, 'Mao de Obra', 'Equipe demolicao', 15000, 15000, '2026-02-15', 'mao_de_obra'),
    (v_o2, 'Material', 'Estrutura metalica', 180000, 175000, '2026-05-10', 'material'),
    (v_o2, 'Mao de Obra', 'Terraplanagem', 35000, 38000, '2026-04-01', 'mao_de_obra');
END;
$$;

-- ========== 2. ORDENS DE SERVICO ==========
DO $$
DECLARE
  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_f1 uuid;
  v_os1 uuid; v_os2 uuid; v_os3 uuid;
BEGIN
  SELECT id INTO v_c1 FROM clientes WHERE nome = 'Maria Silva';
  SELECT id INTO v_c2 FROM clientes WHERE nome = 'Roberto Almeida';
  SELECT id INTO v_c3 FROM clientes WHERE nome = 'Fernanda Lima';
  SELECT id INTO v_f1 FROM funcionarios WHERE nome = 'Bruno Tecnico';

  INSERT INTO ordens_servico (id, cliente_id, colaborador_id, veiculo_equipamento, descricao_problema, status, valor_orcamento, criado_em) VALUES
    (gen_random_uuid(), v_c1, v_f1, 'Notebook Dell Inspiron', 'Tela piscando', 'concluida', 850.00, NOW() - INTERVAL '6 months') RETURNING id INTO v_os1;
  INSERT INTO ordens_servico (id, cliente_id, colaborador_id, veiculo_equipamento, descricao_problema, status, valor_orcamento, criado_em) VALUES
    (gen_random_uuid(), v_c2, v_f1, 'Desktop Gamer', 'Nao liga', 'concluida', 1200.00, NOW() - INTERVAL '5 months') RETURNING id INTO v_os2;
  INSERT INTO ordens_servico (id, cliente_id, colaborador_id, veiculo_equipamento, descricao_problema, status, valor_orcamento, criado_em) VALUES
    (gen_random_uuid(), v_c3, v_f1, 'iMac 27', 'SSD defeituoso', 'concluida', 1500.00, NOW() - INTERVAL '4 months') RETURNING id INTO v_os3;

  INSERT INTO ordens_servico_itens (ordem_servico_id, produto_id, descricao, quantidade, preco_unitario) VALUES
    (v_os1, NULL, 'Mao de obra', 1, 350.00),
    (v_os2, NULL, 'Diagnostico', 1, 250.00),
    (v_os3, NULL, 'Backup', 1, 500.00);
END;
$$;

-- ========== 3. FINANCEIRO ==========
INSERT INTO financeiro (tipo, descricao, valor, data_vencimento, status, criado_em) VALUES
('receber', 'Venda de equipamentos - TechBras', 8500.00, '2026-01-15', 'pago', '2026-01-10T10:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Jan', 4500.00, '2026-01-05', 'pago', '2026-01-02T09:00:00-03:00'),
('receber', 'Servico de manutencao - Maria Silva', 2800.00, '2026-02-10', 'pago', '2026-02-05T14:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Fev', 4500.00, '2026-02-05', 'pago', '2026-02-02T09:00:00-03:00'),
('receber', 'Projeto Construtora Horizonte', 12000.00, '2026-03-15', 'pago', '2026-03-10T10:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Mar', 4500.00, '2026-03-05', 'pago', '2026-03-02T09:00:00-03:00'),
('receber', 'Venda corporativa - Distribuidora', 15000.00, '2026-04-12', 'pago', '2026-04-08T09:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Abr', 4500.00, '2026-04-05', 'pago', '2026-04-02T09:00:00-03:00'),
('receber', 'Contrato mensal Farmacia Popular', 6500.00, '2026-05-10', 'pago', '2026-05-05T10:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Mai', 4500.00, '2026-05-05', 'pago', '2026-05-02T09:00:00-03:00'),
('receber', 'Servico consultoria TI', 7500.00, '2026-06-25', 'pago', '2026-06-20T14:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Jun', 4500.00, '2026-06-05', 'pago', '2026-06-02T09:00:00-03:00'),
('receber', 'Servicos de OS acumulados', 5800.00, '2026-07-20', 'pago', '2026-07-15T11:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Jul', 4500.00, '2026-07-05', 'pago', '2026-07-02T09:00:00-03:00'),
('receber', 'Venda equipamentos - Supermercado Bom Preco', 11200.00, '2026-08-15', 'pendente', '2026-08-05T10:00:00-03:00'),
('pagar', 'Aluguel do escritorio - Ago', 4500.00, '2026-08-05', 'pago', '2026-08-02T09:00:00-03:00');

-- ========== 4. VENDAS (Distribuídas nos 8 meses) ==========
DO $$
DECLARE
  v_marcos uuid; v_camila uuid; v_canal_loja uuid;
  v_v uuid;
  v_prod_est1 uuid; v_prod_est2 uuid; v_prod_est3 uuid;
  v_maria uuid; v_techbras uuid;
BEGIN
  -- Vendedores e Canais
  SELECT id INTO v_marcos FROM funcionarios WHERE nome = 'Marcos Vendedor';
  SELECT id INTO v_camila FROM funcionarios WHERE nome = 'Camila Vendas';
  SELECT id INTO v_canal_loja FROM canais_venda WHERE nome = 'Loja Fisica';

  -- A FK de vendas_itens.produto_id aponta para o id da tabela ESTOQUE, não para produtos.
  -- Vamos pegar IDs da tabela estoque:
  SELECT id INTO v_prod_est1 FROM estoque LIMIT 1 OFFSET 0;
  SELECT id INTO v_prod_est2 FROM estoque LIMIT 1 OFFSET 1;
  SELECT id INTO v_prod_est3 FROM estoque LIMIT 1 OFFSET 2;
  
  -- Clientes
  SELECT id INTO v_maria FROM clientes WHERE nome = 'Maria Silva';
  SELECT id INTO v_techbras FROM clientes WHERE nome = 'TechBras Solucoes LTDA';

  -- Inserir pelo menos 2 vendas em cada mês para preencher o gráfico de 8 meses:
  -- Jan
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_marcos, 'Marcos Vendedor', 2079.70, 0, 'pix', 'concluido', v_canal_loja, '2026-01-08T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est1, 2, 349.90);
  
  -- Fev
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_camila, 'Camila Vendas', 4599.90, 0, 'boleto', 'concluido', v_canal_loja, '2026-02-15T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est2, 1, 4599.90);

  -- Mar
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_marcos, 'Marcos Vendedor', 5599.90, 0, 'pix', 'concluido', v_canal_loja, '2026-03-20T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est3, 2, 2799.95);

  -- Abr
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_camila, 'Camila Vendas', 7200.00, 0, 'boleto', 'concluido', v_canal_loja, '2026-04-10T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est1, 4, 1800.00);

  -- Mai
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_marcos, 'Marcos Vendedor', 8500.00, 0, 'pix', 'concluido', v_canal_loja, '2026-05-05T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est2, 5, 1700.00);

  -- Jun
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_camila, 'Camila Vendas', 9800.00, 0, 'boleto', 'concluido', v_canal_loja, '2026-06-12T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est3, 2, 4900.00);

  -- Jul
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_marcos, 'Marcos Vendedor', 12500.00, 0, 'pix', 'concluido', v_canal_loja, '2026-07-25T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est1, 5, 2500.00);

  -- Ago
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_camila, 'Camila Vendas', 4200.00, 0, 'boleto', 'concluido', v_canal_loja, '2026-08-05T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_prod_est2, 2, 2100.00);

END;
$$;
