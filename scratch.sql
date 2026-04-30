SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('tenant_listar_vendas', 'tenant_listar_transacoes', 'tenant_obter_dre', 'tenant_listar_produtos', 'tenant_listar_clientes', 'tenant_listar_funcionarios', 'tenant_listar_comissoes');
