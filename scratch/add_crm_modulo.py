import urllib.request
import json
import os
import sys

# Management Key and API URL
SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

payload = {
    "key": "crm",
    "nome": "CRM & Nurturing",
    "preco": 129.90,
    "descricao": "Gestão avançada de relacionamento e automação de engajamento.",
    "icone": "🎯",
    "features": ["Gestão de Funil de Vendas", "Inteligência Proativa de Nurturing", "Importação de Clientes em Lote"],
    "ordem_exibicao": 0,
    "ativo": True
}

data = json.dumps(payload).encode('utf-8')

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/modulos_avulsos",
    data=data,
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as response:
        result = response.read().decode('utf-8')
        print(f"Success: {result}")
except urllib.error.HTTPError as e:
    error_body = e.read().decode('utf-8')
    print(f"HTTP Error {e.code}: {error_body}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
