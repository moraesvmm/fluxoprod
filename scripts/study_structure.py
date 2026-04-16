import requests
import json

SUPABASE_URL = 'https://wkxtlvxotvutycbupfuh.supabase.co'
SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU'

headers = {
    'apikey': SERVICE_ROLE,
    'Authorization': f'Bearer {SERVICE_ROLE}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def execute_sql(sql):
    """Executa SQL via RPC do Supabase"""
    url = f'{SUPABASE_URL}/rest/v1/rpc/exec_sql'
    payload = {'sql': sql}
    response = requests.post(url, headers=headers, json=payload)
    return response.json()

print('=== ESTUDANDO ESTRUTURA DO BANCO DE DADOS ===\n')

# 1. Verificar schemas de tenants
print('1. Schemas de tenants:')
sql1 = "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name"
try:
    result = execute_sql(sql1)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Erro: {e}')

# 2. Verificar tabelas em schemas tenant
print('\n2. Tabelas em schemas tenant:')
sql2 = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema LIKE 'tenant_%' AND table_type = 'BASE TABLE' ORDER BY table_schema, table_name"
try:
    result = execute_sql(sql2)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Erro: {e}')

# 3. Verificar tabelas no schema public
print('\n3. Tabelas no schema public:')
sql3 = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
try:
    result = execute_sql(sql3)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Erro: {e}')

# 4. Verificar RPCs no schema public
print('\n4. RPCs no schema public:')
sql4 = "SELECT routine_name, routine_schema, security_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'tenant_%' ORDER BY routine_name"
try:
    result = execute_sql(sql4)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Erro: {e}')

# 5. Verificar tabela transacoes_financeiras
print('\n5. Tabela transacoes_financeiras:')
sql5 = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'transacoes_financeiras' ORDER BY table_schema"
try:
    result = execute_sql(sql5)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Erro: {e}')

# 6. Verificar tabela financeiro
print('\n6. Tabela financeiro:')
sql6 = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'financeiro' AND table_schema LIKE 'tenant_%' ORDER BY table_schema"
try:
    result = execute_sql(sql6)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Erro: {e}')

# 7. Verificar tabelas de comissões
print('\n7. Tabelas de comissões:')
sql7 = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN ('comissoes', 'comissoes_regras') AND table_schema LIKE 'tenant_%' ORDER BY table_schema, table_name"
try:
    result = execute_sql(sql7)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f'Erro: {e}')

print('\n=== ESTUDO CONCLUÍDO ===')
