-- ============================================================
-- SEED DATA for tenant_vitormoraes_5fdcf8
-- All modules: Clientes, Produtos, Estoque, Funcionarios,
-- Vendas, Financeiro, Obras, Ordens de Servico
-- ============================================================

SET search_path TO tenant_vitormoraes_5fdcf8, public;

-- ========== 1. CLIENTES (20) ==========
INSERT INTO clientes (nome, email, telefone, cpf_cnpj, funil_fase, status, endereco, criado_em) VALUES
('TechBras Solucoes LTDA', 'contato@techbras.com.br', '(11) 3456-7890', '12.345.678/0001-90', 'cliente', 'ativo', 'Av. Paulista, 1000 - Sao Paulo, SP', NOW() - INTERVAL '7 months'),
('Maria Silva', 'maria.silva@gmail.com', '(21) 99876-5432', '123.456.789-00', 'cliente', 'ativo', 'Rua das Flores, 123 - Rio de Janeiro, RJ', NOW() - INTERVAL '6 months'),
('Joao Pereira ME', 'joao@pereirame.com.br', '(31) 98765-4321', '98.765.432/0001-10', 'negociacao', 'ativo', 'Rua Minas Gerais, 456 - Belo Horizonte, MG', NOW() - INTERVAL '5 months'),
('Ana Costa', 'ana.costa@outlook.com', '(41) 99654-3210', '987.654.321-00', 'cliente', 'ativo', 'Av. Batel, 789 - Curitiba, PR', NOW() - INTERVAL '5 months'),
('Distribuidora Norte LTDA', 'vendas@distnorte.com.br', '(92) 3333-4444', '45.678.901/0001-23', 'cliente', 'ativo', 'Av. Eduardo Ribeiro, 100 - Manaus, AM', NOW() - INTERVAL '4 months'),
('Pedro Santos', 'pedro.santos@hotmail.com', '(85) 98765-1234', '456.789.012-34', 'proposta', 'ativo', 'Rua Fortaleza, 321 - Fortaleza, CE', NOW() - INTERVAL '4 months'),
('Construtora Horizonte SA', 'projetos@horizonte.eng.br', '(48) 3456-9876', '67.890.123/0001-45', 'cliente', 'ativo', 'Rod. SC-401, Km 5 - Florianopolis, SC', NOW() - INTERVAL '3 months'),
('Fernanda Lima', 'fernanda.lima@yahoo.com.br', '(51) 99123-4567', '567.890.123-45', 'cliente', 'ativo', 'Av. Ipiranga, 654 - Porto Alegre, RS', NOW() - INTERVAL '3 months'),
('AutoPecas Vitoria LTDA', 'compras@autopecasvit.com.br', '(27) 3222-1111', '78.901.234/0001-56', 'cliente', 'ativo', 'Av. Jeronimo Monteiro, 200 - Vitoria, ES', NOW() - INTERVAL '2 months'),
('Carlos Mendes', 'carlos.mendes@gmail.com', '(62) 98877-6655', '678.901.234-56', 'lead', 'ativo', 'Rua 24, Qd 10 - Goiania, GO', NOW() - INTERVAL '2 months'),
('Farmacia Popular Saude', 'farmacia@popular.com.br', '(71) 3555-6677', '89.012.345/0001-67', 'cliente', 'ativo', 'Rua Chile, 50 - Salvador, BA', NOW() - INTERVAL '2 months'),
('Roberto Almeida', 'roberto.almeida@uol.com.br', '(81) 99988-7766', '789.012.345-67', 'cliente', 'ativo', 'Av. Boa Viagem, 1500 - Recife, PE', NOW() - INTERVAL '1 month'),
('Loja Digital Express', 'sac@digitalexpress.com.br', '(47) 3344-5566', '90.123.456/0001-78', 'cliente', 'ativo', 'Rua XV de Novembro, 300 - Blumenau, SC', NOW() - INTERVAL '1 month'),
('Juliana Ribeiro', 'juliana.ribeiro@gmail.com', '(19) 99765-4321', '890.123.456-78', 'qualificado', 'ativo', 'Rua Barao de Jaguara, 100 - Campinas, SP', NOW() - INTERVAL '3 weeks'),
('Metalurgica Aco Forte', 'contato@acoforte.ind.br', '(15) 3222-8899', '01.234.567/0001-89', 'cliente', 'ativo', 'Rod. Raposo Tavares, Km 92 - Sorocaba, SP', NOW() - INTERVAL '2 weeks'),
('Lucas Ferreira', 'lucas.ferreira@outlook.com', '(34) 98876-5544', '901.234.567-89', 'lead', 'ativo', 'Av. Rondon Pacheco, 4600 - Uberlandia, MG', NOW() - INTERVAL '10 days'),
('Supermercado Bom Preco', 'gerencia@bompreco.com.br', '(79) 3211-4455', '23.456.789/0001-01', 'negociacao', 'ativo', 'Av. Augusto Franco, 200 - Aracaju, SE', NOW() - INTERVAL '1 week'),
('Patricia Oliveira', 'patricia.oliveira@gmail.com', '(65) 99654-7788', '012.345.678-90', 'proposta', 'ativo', 'Av. CPA, 1234 - Cuiaba, MT', NOW() - INTERVAL '5 days'),
('Restaurante Sabor Arte', 'reservas@saborarte.com.br', '(82) 3333-2211', '34.567.890/0001-12', 'cliente', 'ativo', 'Rua do Comercio, 55 - Maceio, AL', NOW() - INTERVAL '3 days'),
('Rafael Nascimento', 'rafael.nasc@gmail.com', '(86) 99123-0099', '234.567.890-12', 'lead', 'ativo', 'Av. Frei Serafim, 1800 - Teresina, PI', NOW() - INTERVAL '1 day');

-- ========== 2. PRODUTOS (15) ==========
INSERT INTO produtos (nome, descricao, tipo, preco_base, categoria, custo_unitario, criado_em) VALUES
('Notebook ProMax 15', 'Notebook profissional com tela 15.6, 16GB RAM, SSD 512GB', 'produto', 4599.90, 'Eletronicos', 2800.00, NOW() - INTERVAL '7 months'),
('Mouse Ergonomico Wireless', 'Mouse sem fio com design ergonomico e DPI ajustavel', 'produto', 189.90, 'Perifericos', 65.00, NOW() - INTERVAL '7 months'),
('Teclado Mecanico RGB', 'Teclado mecanico switch blue com iluminacao RGB', 'produto', 349.90, 'Perifericos', 120.00, NOW() - INTERVAL '6 months'),
('Monitor UltraWide 34', 'Monitor curvo 34 WQHD 144Hz IPS', 'produto', 3299.00, 'Monitores', 1950.00, NOW() - INTERVAL '6 months'),
('Headset Gamer 7.1', 'Headset com som surround 7.1 e microfone removivel', 'produto', 459.90, 'Perifericos', 180.00, NOW() - INTERVAL '5 months'),
('SSD NVMe 1TB', 'SSD M.2 NVMe PCIe 4.0, leitura 7000MB/s', 'produto', 699.90, 'Componentes', 380.00, NOW() - INTERVAL '5 months'),
('Webcam Full HD', 'Webcam 1080p com autofoco e microfone integrado', 'produto', 299.90, 'Perifericos', 95.00, NOW() - INTERVAL '4 months'),
('Cadeira Ergonomica Pro', 'Cadeira de escritorio com apoio lombar e bracos 4D', 'produto', 1899.90, 'Mobiliario', 850.00, NOW() - INTERVAL '4 months'),
('Hub USB-C 10 em 1', 'Adaptador USB-C com HDMI, Ethernet, USB-A, SD', 'produto', 249.90, 'Acessorios', 78.00, NOW() - INTERVAL '3 months'),
('Fonte 750W Modular', 'Fonte ATX 750W 80+ Gold totalmente modular', 'produto', 649.90, 'Componentes', 310.00, NOW() - INTERVAL '3 months'),
('Gabinete ATX Mesh', 'Gabinete ATX com frontal mesh e vidro temperado', 'produto', 499.90, 'Componentes', 210.00, NOW() - INTERVAL '2 months'),
('Memoria RAM DDR5 32GB', 'Kit 2x16GB DDR5 6000MHz CL30', 'produto', 899.90, 'Componentes', 520.00, NOW() - INTERVAL '2 months'),
('Mousepad XL Speed', 'Mousepad extended 900x400mm superficie speed', 'produto', 129.90, 'Acessorios', 32.00, NOW() - INTERVAL '1 month'),
('Suporte Monitor Duplo', 'Suporte articulado para 2 monitores ate 32', 'produto', 399.90, 'Mobiliario', 150.00, NOW() - INTERVAL '1 month'),
('Cabo HDMI 2.1 3m', 'Cabo HDMI 2.1 4K 120Hz 8K 60Hz', 'produto', 89.90, 'Acessorios', 22.00, NOW() - INTERVAL '2 weeks');

-- ========== 3. FUNCIONARIOS (8) ==========
INSERT INTO funcionarios (nome, cargo, salario, role, cpf, data_nascimento, endereco, data_admissao, dia_pagamento, criado_em) VALUES
('Marcos Vendedor', 'Vendedor Senior', 4500.00, 'funcionario', '111.222.333-44', '1990-03-15', 'Rua Augusta, 500 - SP', '2025-01-10', 5, NOW() - INTERVAL '7 months'),
('Camila Vendas', 'Vendedora Pleno', 3800.00, 'funcionario', '222.333.444-55', '1993-07-22', 'Av. Brasil, 200 - RJ', '2025-03-01', 5, NOW() - INTERVAL '6 months'),
('Bruno Tecnico', 'Tecnico de Suporte', 3200.00, 'funcionario', '333.444.555-66', '1995-11-10', 'Rua Curitiba, 100 - PR', '2025-02-15', 5, NOW() - INTERVAL '6 months'),
('Larissa Estoque', 'Gestora de Estoque', 4000.00, 'funcionario', '444.555.666-77', '1991-09-05', 'Av. Garibaldi, 300 - BA', '2025-04-01', 5, NOW() - INTERVAL '5 months'),
('Diego Financeiro', 'Analista Financeiro', 4200.00, 'funcionario', '555.666.777-88', '1988-01-28', 'Rua Afonso Pena, 400 - MG', '2025-01-20', 5, NOW() - INTERVAL '7 months'),
('Aline Atendimento', 'Atendente', 2800.00, 'funcionario', '666.777.888-99', '1997-04-18', 'Av. Sapopemba, 1500 - SP', '2025-05-01', 5, NOW() - INTERVAL '4 months'),
('Ricardo Obras', 'Engenheiro Civil', 7500.00, 'funcionario', '777.888.999-00', '1985-12-03', 'Rua Eng. Reboucas, 800 - SC', '2025-02-01', 5, NOW() - INTERVAL '6 months'),
('Tatiane RH', 'Analista de RH', 3600.00, 'funcionario', '888.999.000-11', '1994-06-25', 'Av. Independencia, 600 - RS', '2025-03-15', 5, NOW() - INTERVAL '6 months');

-- ========== 4. LOCAIS DE ESTOQUE E CANAIS ==========
INSERT INTO locais_estoque (nome, tipo, endereco) VALUES
('Deposito Central', 'deposito', 'Rua Industrial, 500 - Sao Paulo, SP'),
('Loja Fisica Centro', 'loja', 'Av. Paulista, 1000 - Sao Paulo, SP'),
('Deposito Secundario', 'deposito', 'Rod. Anhanguera, Km 30 - Jundiai, SP');

INSERT INTO canais_venda (nome) VALUES
('Loja Fisica'), ('E-commerce'), ('WhatsApp'), ('Marketplace'), ('Telefone');

-- ========== 5. ESTOQUE (15 registros) ==========
INSERT INTO estoque (produto_id, sku, quantidade, quantidade_minima)
SELECT p.id,
  'SKU-' || ROW_NUMBER() OVER (ORDER BY p.criado_em) || '-' || LEFT(p.id::text, 4),
  CASE
    WHEN p.preco_base > 3000 THEN 8 + (random() * 12)::int
    WHEN p.preco_base > 1000 THEN 15 + (random() * 25)::int
    WHEN p.preco_base > 300 THEN 30 + (random() * 50)::int
    ELSE 50 + (random() * 100)::int
  END,
  CASE
    WHEN p.preco_base > 3000 THEN 5
    WHEN p.preco_base > 1000 THEN 10
    WHEN p.preco_base > 300 THEN 15
    ELSE 20
  END
FROM produtos p WHERE p.deleted_at IS NULL;
