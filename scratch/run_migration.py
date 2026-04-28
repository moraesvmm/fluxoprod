import psycopg2
import sys

uri = "postgresql://postgres:Vmm041126!Database@db.wkxtlvxotvutycbupfuh.supabase.co:5432/postgres"

sql = """
-- 1. Remover do catálogo global
DELETE FROM public.modulos_catalogo 
WHERE key = 'configuracoes';

-- 2. Remover associações existentes para evitar confusão em auditorias
DELETE FROM public.empresa_modulos 
WHERE modulo_key = 'configuracoes';
"""

try:
    conn = psycopg2.connect(uri)
    cur = conn.cursor()
    print("Conectado ao banco de dados.")
    
    cur.execute(sql)
    conn.commit()
    
    print(f"Execução concluída. Linhas afetadas: {cur.rowcount}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Erro ao executar SQL: {e}")
    sys.exit(1)
