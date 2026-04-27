import urllib.request
import json
import sys

# Management Key and API URL
SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

def make_request(path, method="GET", body=None):
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        },
        data=json.dumps(body).encode('utf-8') if body else None,
        method=method
    )
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        return f"Error: {e}"

# We can query information_schema or pg_proc via a custom RPC if it exists, 
# but usually there isn't one. 
# However, I can try to fetch the table structure of interacoes_clientes.

print("--- ESTRUTURA DE interacoes_clientes ---")
res = make_request("/rest/v1/interacoes_clientes?select=*&limit=1")
print(res)

print("\n--- ESTRUTURA DE crm_nurturing_alertas ---")
res = make_request("/rest/v1/crm_nurturing_alertas?select=*&limit=1")
print(res)
