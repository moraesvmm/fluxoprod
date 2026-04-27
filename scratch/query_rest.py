import urllib.request
import json

ref = "wkxtlvxotvutycbupfuh"
url = f"https://{ref}.supabase.co/rest/v1/empresas?select=schema_name&schema_name=neq.public&limit=1"

# Service Role Key
service_role = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

headers = {
    "apikey": service_role,
    "Authorization": f"Bearer {service_role}",
    "Content-Type": "application/json"
}

req = urllib.request.Request(url, headers=headers)

try:
    response = urllib.request.urlopen(req)
    print(response.read().decode("utf-8"))
except Exception as e:
    print(f"Error: {e}")
