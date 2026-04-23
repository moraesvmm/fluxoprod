DO $DO_BLOCK$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%'
    LOOP
        EXECUTE format('
            CREATE OR REPLACE FUNCTION %I.tenant_listar_alertas_estoque(p_status VARCHAR DEFAULT NULL, p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
            RETURNS JSONB
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = %I
            AS $tenant_func$
            BEGIN
              RETURN COALESCE(
                (SELECT jsonb_agg(
                  jsonb_build_object(
                    ''id'', sub.id,
                    ''produto_id'', sub.produto_id,
                    ''produto_nome'', sub.nome,
                    ''tipo_alerta'', sub.tipo_alerta,
                    ''estoque_atual'', sub.estoque_atual,
                    ''estoque_minimo'', sub.estoque_minimo,
                    ''mensagem'', sub.mensagem,
                    ''status'', sub.status,
                    ''criado_em'', sub.criado_em,
                    ''resolvido_em'', sub.resolvido_em
                  )
                )
                FROM (
                  SELECT a.*, p.nome
                  FROM alertas_estoque a
                  JOIN produtos p ON a.produto_id = p.id
                  WHERE (p_status IS NULL OR a.status = p_status)
                  ORDER BY a.criado_em DESC
                  LIMIT p_limit OFFSET p_offset
                ) sub),
                ''[]''::JSONB
              );
            EXCEPTION WHEN OTHERS THEN
              RETURN jsonb_build_object(''error'', SQLERRM);
            END;
            $tenant_func$;
        ', schema_record.schema_name, schema_record.schema_name);
    END LOOP;
END
$DO_BLOCK$;
