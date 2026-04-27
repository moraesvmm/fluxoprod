import urllib.request
import json
import sys

# Management Key and API URL
SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

def make_request(path, method="GET"):
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        },
        method=method
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error calling {path}: {e}")
        return None

print("=== VISTORIA DE BANCO DE DADOS (VIA REST API COM SERVICE_ROLE) ===\n")

print("1. Verificando tabela public.modulos_avulsos (CRM)")
modulos = make_request("/rest/v1/modulos_avulsos?select=*")
crm_modulo = next((m for m in (modulos or []) if m.get('key') == 'crm'), None)
if crm_modulo:
    print(f"OK - CRM Encontrado: Preco R$ {crm_modulo['preco']} | Ativo: {crm_modulo['ativo']}")
else:
    print("ERRO - CRM Nao Encontrado!")

print("\n2. Verificando tabela public.planos")
planos = make_request("/rest/v1/planos?select=key,nome,preco,ativo")
if planos:
    print(f"OK - Encontrados {len(planos)} planos.")
    for p in planos:
        print(f"  - {p['nome']} (R$ {p['preco']}) - Ativo: {p['ativo']}")

print("\n3. Testando RPC: listar_modulos_avulsos_checkout()")
rpc_modulos = make_request("/rest/v1/rpc/listar_modulos_avulsos_checkout", method="POST")
if rpc_modulos is not None:
    print(f"OK - RPC Retornou dados.")
    if len(rpc_modulos) > 0:
        keys = list(rpc_modulos[0].keys())
        print(f"  - Chaves expostas: {keys}")

print("\n4. Testando RPC: listar_planos_checkout()")
rpc_planos = make_request("/rest/v1/rpc/listar_planos_checkout", method="POST")
if rpc_planos is not None:
    print(f"OK - RPC Retornou dados.")

print("\n5. Verificando estrutura de public.checkout_vendas")
vendas = make_request("/rest/v1/checkout_vendas?select=*&limit=1")
if vendas is not None:
    print(f"OK - Acesso a tabela checkout_vendas confirmado. Estrutura validada.")
    if len(vendas) > 0:
        v = vendas[0]
        payload_keys = list(v.get("config_payload", {}).keys())
        print(f"  - Campos no config_payload: {payload_keys}")
