SET search_path TO tenant_vitormoraes_5fdcf8, public;

-- ========== VENDAS (8 meses de dados) ==========
DO $$
DECLARE
  v_marcos uuid; v_camila uuid;
  v_canal_loja uuid; v_canal_ecom uuid; v_canal_whats uuid; v_canal_market uuid; v_canal_tel uuid;
  v_v uuid;
  v_notebook uuid; v_mouse uuid; v_teclado uuid; v_monitor uuid; v_headset uuid;
  v_ssd uuid; v_webcam uuid; v_cadeira uuid; v_hub uuid; v_fonte uuid;
  v_gabinete uuid; v_ram uuid; v_mousepad uuid; v_suporte uuid; v_cabo uuid;
  v_techbras uuid; v_maria uuid; v_ana uuid; v_distnorte uuid;
  v_construtora uuid; v_fernanda uuid; v_autopecas uuid; v_farmacia uuid;
  v_roberto uuid; v_digital uuid; v_metalurgica uuid; v_sabor uuid;
  v_bruno uuid;
BEGIN
  -- Vendedores
  SELECT id INTO v_marcos FROM funcionarios WHERE nome = 'Marcos Vendedor';
  SELECT id INTO v_camila FROM funcionarios WHERE nome = 'Camila Vendas';
  SELECT id INTO v_bruno FROM funcionarios WHERE nome = 'Bruno Tecnico';
  -- Canais
  SELECT id INTO v_canal_loja FROM canais_venda WHERE nome = 'Loja Fisica';
  SELECT id INTO v_canal_ecom FROM canais_venda WHERE nome = 'E-commerce';
  SELECT id INTO v_canal_whats FROM canais_venda WHERE nome = 'WhatsApp';
  SELECT id INTO v_canal_market FROM canais_venda WHERE nome = 'Marketplace';
  SELECT id INTO v_canal_tel FROM canais_venda WHERE nome = 'Telefone';
  -- Produtos
  SELECT id INTO v_notebook FROM produtos WHERE nome LIKE 'Notebook%';
  SELECT id INTO v_mouse FROM produtos WHERE nome LIKE 'Mouse%';
  SELECT id INTO v_teclado FROM produtos WHERE nome LIKE 'Teclado%';
  SELECT id INTO v_monitor FROM produtos WHERE nome LIKE 'Monitor%';
  SELECT id INTO v_headset FROM produtos WHERE nome LIKE 'Headset%';
  SELECT id INTO v_ssd FROM produtos WHERE nome LIKE 'SSD%';
  SELECT id INTO v_webcam FROM produtos WHERE nome LIKE 'Webcam%';
  SELECT id INTO v_cadeira FROM produtos WHERE nome LIKE 'Cadeira%';
  SELECT id INTO v_hub FROM produtos WHERE nome LIKE 'Hub%';
  SELECT id INTO v_fonte FROM produtos WHERE nome LIKE 'Fonte%';
  SELECT id INTO v_gabinete FROM produtos WHERE nome LIKE 'Gabinete%';
  SELECT id INTO v_ram FROM produtos WHERE nome LIKE 'Memoria%';
  SELECT id INTO v_mousepad FROM produtos WHERE nome LIKE 'Mousepad%';
  SELECT id INTO v_suporte FROM produtos WHERE nome LIKE 'Suporte%';
  SELECT id INTO v_cabo FROM produtos WHERE nome LIKE 'Cabo%';
  -- Clientes
  SELECT id INTO v_techbras FROM clientes WHERE nome LIKE 'TechBras%';
  SELECT id INTO v_maria FROM clientes WHERE nome = 'Maria Silva';
  SELECT id INTO v_ana FROM clientes WHERE nome = 'Ana Costa';
  SELECT id INTO v_distnorte FROM clientes WHERE nome LIKE 'Distribuidora%';
  SELECT id INTO v_construtora FROM clientes WHERE nome LIKE 'Construtora%';
  SELECT id INTO v_fernanda FROM clientes WHERE nome = 'Fernanda Lima';
  SELECT id INTO v_autopecas FROM clientes WHERE nome LIKE 'AutoPecas%';
  SELECT id INTO v_farmacia FROM clientes WHERE nome LIKE 'Farmacia%';
  SELECT id INTO v_roberto FROM clientes WHERE nome = 'Roberto Almeida';
  SELECT id INTO v_digital FROM clientes WHERE nome LIKE 'Loja Digital%';
  SELECT id INTO v_metalurgica FROM clientes WHERE nome LIKE 'Metalurgica%';
  SELECT id INTO v_sabor FROM clientes WHERE nome LIKE 'Restaurante%';

  -- ===== JANEIRO 2026 (4 vendas ~R$10,400) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_marcos, 'Marcos Vendedor', 2079.70, 0, 'pix', 'concluido', v_canal_loja, '2026-01-08T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_teclado, 2, 349.90), (v_v, v_mouse, 3, 189.90), (v_v, v_mousepad, 2, 129.90), (v_v, v_cabo, 5, 89.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_ana, 'Ana Costa', v_camila, 'Camila Vendas', 1899.90, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-01-15T14:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_cadeira, 1, 1899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_marcos, 'Marcos Vendedor', 4599.90, 200, 'boleto', 'concluido', v_canal_tel, '2026-01-22T09:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_notebook, 1, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_fernanda, 'Fernanda Lima', v_camila, 'Camila Vendas', 1859.60, 0, 'pix', 'concluido', v_canal_whats, '2026-01-28T16:45:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_headset, 2, 459.90), (v_v, v_hub, 2, 249.90), (v_v, v_cabo, 2, 89.90);

  -- ===== FEVEREIRO 2026 (5 vendas ~R$15,100) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_distnorte, 'Distribuidora Norte LTDA', v_marcos, 'Marcos Vendedor', 3299.00, 0, 'boleto', 'concluido', v_canal_tel, '2026-02-03T10:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_monitor, 1, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_construtora, 'Construtora Horizonte SA', v_marcos, 'Marcos Vendedor', 5039.70, 350, 'boleto', 'concluido', v_canal_loja, '2026-02-10T11:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_notebook, 1, 4599.90), (v_v, v_mouse, 1, 189.90), (v_v, v_hub, 1, 249.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_roberto, 'Roberto Almeida', v_camila, 'Camila Vendas', 2549.70, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-02-14T15:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_webcam, 3, 299.90), (v_v, v_teclado, 2, 349.90), (v_v, v_mousepad, 3, 129.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_farmacia, 'Farmacia Popular Saude', v_marcos, 'Marcos Vendedor', 1399.80, 0, 'pix', 'concluido', v_canal_whats, '2026-02-20T09:45:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_ssd, 2, 699.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_digital, 'Loja Digital Express', v_camila, 'Camila Vendas', 2879.60, 0, 'dinheiro', 'concluido', v_canal_loja, '2026-02-26T13:20:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_headset, 2, 459.90), (v_v, v_fonte, 2, 649.90), (v_v, v_mousepad, 2, 129.90);

  -- ===== MARCO 2026 (6 vendas ~R$22,500) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_marcos, 'Marcos Vendedor', 6598.00, 500, 'boleto', 'concluido', v_canal_tel, '2026-03-05T09:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_monitor, 2, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_camila, 'Camila Vendas', 4599.90, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-03-10T14:20:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_notebook, 1, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_autopecas, 'AutoPecas Vitoria LTDA', v_marcos, 'Marcos Vendedor', 3149.70, 0, 'boleto', 'concluido', v_canal_loja, '2026-03-14T10:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ssd, 3, 699.90), (v_v, v_hub, 2, 249.90), (v_v, v_cabo, 5, 89.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_fernanda, 'Fernanda Lima', v_camila, 'Camila Vendas', 2199.80, 100, 'pix', 'concluido', v_canal_whats, '2026-03-18T16:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_cadeira, 1, 1899.90), (v_v, v_webcam, 1, 299.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_construtora, 'Construtora Horizonte SA', v_marcos, 'Marcos Vendedor', 3799.60, 0, 'boleto', 'concluido', v_canal_tel, '2026-03-23T11:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_cadeira, 2, 1899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_distnorte, 'Distribuidora Norte LTDA', v_camila, 'Camila Vendas', 2249.70, 0, 'cartao_credito', 'concluido', v_canal_market, '2026-03-28T15:45:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ram, 1, 899.90), (v_v, v_ssd, 1, 699.90), (v_v, v_fonte, 1, 649.90);

  -- ===== ABRIL 2026 (7 vendas ~R$28,000) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_metalurgica, 'Metalurgica Aco Forte', v_marcos, 'Marcos Vendedor', 9199.80, 500, 'boleto', 'concluido', v_canal_tel, '2026-04-02T09:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_notebook, 2, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_roberto, 'Roberto Almeida', v_camila, 'Camila Vendas', 3299.00, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-04-07T14:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_monitor, 1, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_farmacia, 'Farmacia Popular Saude', v_marcos, 'Marcos Vendedor', 2599.60, 0, 'pix', 'concluido', v_canal_whats, '2026-04-10T10:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_fonte, 2, 649.90), (v_v, v_ssd, 1, 699.90), (v_v, v_hub, 2, 249.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_ana, 'Ana Costa', v_camila, 'Camila Vendas', 4949.70, 0, 'cartao_credito', 'concluido', v_canal_loja, '2026-04-15T15:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_gabinete, 3, 499.90), (v_v, v_ram, 3, 899.90), (v_v, v_cabo, 5, 89.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_digital, 'Loja Digital Express', v_marcos, 'Marcos Vendedor', 3459.60, 200, 'boleto', 'concluido', v_canal_market, '2026-04-18T11:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_headset, 4, 459.90), (v_v, v_teclado, 2, 349.90), (v_v, v_mousepad, 4, 129.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_camila, 'Camila Vendas', 1579.70, 0, 'pix', 'concluido', v_canal_whats, '2026-04-22T09:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_webcam, 2, 299.90), (v_v, v_teclado, 1, 349.90), (v_v, v_mousepad, 1, 129.90), (v_v, v_hub, 2, 249.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_sabor, 'Restaurante Sabor Arte', v_marcos, 'Marcos Vendedor', 2949.80, 0, 'dinheiro', 'concluido', v_canal_loja, '2026-04-28T16:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_notebook, 1, 4599.90);

  -- ===== MAIO 2026 (8 vendas ~R$35,000) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_marcos, 'Marcos Vendedor', 9199.80, 0, 'boleto', 'concluido', v_canal_tel, '2026-05-02T09:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_notebook, 2, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_distnorte, 'Distribuidora Norte LTDA', v_marcos, 'Marcos Vendedor', 6598.00, 300, 'boleto', 'concluido', v_canal_loja, '2026-05-06T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_monitor, 2, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_construtora, 'Construtora Horizonte SA', v_camila, 'Camila Vendas', 2699.70, 0, 'pix', 'concluido', v_canal_whats, '2026-05-10T14:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ram, 3, 899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_autopecas, 'AutoPecas Vitoria LTDA', v_marcos, 'Marcos Vendedor', 4599.90, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-05-14T11:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_notebook, 1, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_fernanda, 'Fernanda Lima', v_camila, 'Camila Vendas', 3649.70, 0, 'pix', 'concluido', v_canal_loja, '2026-05-18T15:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_cadeira, 1, 1899.90), (v_v, v_suporte, 2, 399.90), (v_v, v_gabinete, 1, 499.90), (v_v, v_cabo, 5, 89.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_roberto, 'Roberto Almeida', v_marcos, 'Marcos Vendedor', 2319.60, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-05-22T10:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_headset, 2, 459.90), (v_v, v_ssd, 2, 699.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_digital, 'Loja Digital Express', v_camila, 'Camila Vendas', 3599.40, 0, 'boleto', 'concluido', v_canal_market, '2026-05-26T13:45:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_webcam, 4, 299.90), (v_v, v_teclado, 3, 349.90), (v_v, v_mouse, 5, 189.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_farmacia, 'Farmacia Popular Saude', v_marcos, 'Marcos Vendedor', 1799.70, 0, 'pix', 'concluido', v_canal_whats, '2026-05-30T09:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ram, 2, 899.90);

  -- ===== JUNHO 2026 (9 vendas ~R$42,000) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_metalurgica, 'Metalurgica Aco Forte', v_marcos, 'Marcos Vendedor', 9199.80, 800, 'boleto', 'concluido', v_canal_tel, '2026-06-02T09:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_notebook, 2, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_marcos, 'Marcos Vendedor', 6598.00, 0, 'boleto', 'concluido', v_canal_loja, '2026-06-05T10:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_monitor, 2, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_ana, 'Ana Costa', v_camila, 'Camila Vendas', 4599.90, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-06-09T14:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_notebook, 1, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_distnorte, 'Distribuidora Norte LTDA', v_marcos, 'Marcos Vendedor', 5399.40, 0, 'boleto', 'concluido', v_canal_tel, '2026-06-12T11:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ram, 6, 899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_construtora, 'Construtora Horizonte SA', v_camila, 'Camila Vendas', 3799.60, 200, 'pix', 'concluido', v_canal_whats, '2026-06-16T09:45:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_cadeira, 2, 1899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_roberto, 'Roberto Almeida', v_marcos, 'Marcos Vendedor', 4949.70, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-06-19T15:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_gabinete, 3, 499.90), (v_v, v_fonte, 3, 649.90), (v_v, v_ssd, 1, 699.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_farmacia, 'Farmacia Popular Saude', v_camila, 'Camila Vendas', 2849.60, 0, 'pix', 'concluido', v_canal_whats, '2026-06-22T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_webcam, 3, 299.90), (v_v, v_teclado, 2, 349.90), (v_v, v_mousepad, 3, 129.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_autopecas, 'AutoPecas Vitoria LTDA', v_marcos, 'Marcos Vendedor', 2549.70, 0, 'boleto', 'concluido', v_canal_loja, '2026-06-25T13:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_headset, 3, 459.90), (v_v, v_hub, 2, 249.90), (v_v, v_mousepad, 5, 129.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_digital, 'Loja Digital Express', v_camila, 'Camila Vendas', 1949.50, 0, 'dinheiro', 'concluido', v_canal_loja, '2026-06-28T16:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_fonte, 3, 649.90);

  -- ===== JULHO 2026 (10 vendas ~R$52,000) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_marcos, 'Marcos Vendedor', 13799.70, 1000, 'boleto', 'concluido', v_canal_tel, '2026-07-01T09:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_notebook, 3, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_distnorte, 'Distribuidora Norte LTDA', v_marcos, 'Marcos Vendedor', 6598.00, 0, 'boleto', 'concluido', v_canal_loja, '2026-07-04T10:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_monitor, 2, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_metalurgica, 'Metalurgica Aco Forte', v_marcos, 'Marcos Vendedor', 4599.90, 300, 'boleto', 'concluido', v_canal_tel, '2026-07-07T11:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_notebook, 1, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_camila, 'Camila Vendas', 3299.00, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-07-10T14:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_monitor, 1, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_construtora, 'Construtora Horizonte SA', v_marcos, 'Marcos Vendedor', 5699.70, 0, 'pix', 'concluido', v_canal_whats, '2026-07-13T09:45:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_cadeira, 3, 1899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_fernanda, 'Fernanda Lima', v_camila, 'Camila Vendas', 4499.50, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-07-16T15:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ram, 5, 899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_autopecas, 'AutoPecas Vitoria LTDA', v_marcos, 'Marcos Vendedor', 4949.70, 0, 'boleto', 'concluido', v_canal_loja, '2026-07-19T10:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_gabinete, 3, 499.90), (v_v, v_fonte, 3, 649.90), (v_v, v_ssd, 1, 699.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_roberto, 'Roberto Almeida', v_camila, 'Camila Vendas', 3399.60, 0, 'pix', 'concluido', v_canal_whats, '2026-07-22T13:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_headset, 4, 459.90), (v_v, v_teclado, 2, 349.90), (v_v, v_mousepad, 2, 129.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_farmacia, 'Farmacia Popular Saude', v_marcos, 'Marcos Vendedor', 2799.60, 0, 'pix', 'concluido', v_canal_market, '2026-07-25T09:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ssd, 4, 699.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_digital, 'Loja Digital Express', v_camila, 'Camila Vendas', 2549.70, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-07-29T16:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_webcam, 3, 299.90), (v_v, v_suporte, 2, 399.90), (v_v, v_cabo, 5, 89.90);

  -- ===== AGOSTO 2026 (5 vendas ~R$25,000) =====
  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_techbras, 'TechBras Solucoes LTDA', v_marcos, 'Marcos Vendedor', 9199.80, 500, 'boleto', 'concluido', v_canal_tel, '2026-08-01T09:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_notebook, 2, 4599.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_construtora, 'Construtora Horizonte SA', v_marcos, 'Marcos Vendedor', 6598.00, 0, 'boleto', 'concluido', v_canal_loja, '2026-08-03T10:15:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_monitor, 2, 3299.00);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_autopecas, 'AutoPecas Vitoria LTDA', v_camila, 'Camila Vendas', 3799.60, 0, 'pix', 'concluido', v_canal_whats, '2026-08-05T14:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES (v_v, v_cadeira, 2, 1899.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_maria, 'Maria Silva', v_marcos, 'Marcos Vendedor', 2799.60, 0, 'cartao_credito', 'concluido', v_canal_ecom, '2026-08-07T11:30:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_ssd, 4, 699.90);

  INSERT INTO vendas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, valor_total, desconto_aplicado, metodo_pagamento, status, canal_venda_id, criado_em)
  VALUES (gen_random_uuid(), v_fernanda, 'Fernanda Lima', v_camila, 'Camila Vendas', 2949.50, 0, 'pix', 'concluido', v_canal_whats, '2026-08-08T09:00:00-03:00') RETURNING id INTO v_v;
  INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario) VALUES
    (v_v, v_fonte, 2, 649.90), (v_v, v_gabinete, 1, 499.90), (v_v, v_suporte, 1, 399.90), (v_v, v_hub, 3, 249.90);

  RAISE NOTICE 'All vendas inserted successfully!';
END;
$$;
