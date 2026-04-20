import urllib.request
import json
import sys

sql_path = "apps/api/migrations/rpc_crm_fixes.sql"
url = "https://wkxtlvxotvutycbupfuh.supabase.co/rest/v1/rpc/exec_sql"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU",
    "Content-Type": "application/json"
}

try:
    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()
except Exception as e:
    print(f"Failed to read SQL script: {e}")
    sys.exit(1)

data = {"query": sql} # Often it's 'sql' or 'query'. Let's look at the JS script: `supabase.rpc('exec_sql', { sql })` -> parameter is sql.
data_str = json.dumps({"query": sql}).encode("utf-8") # Let's format correctly.

# The javascript script used `{ sql }`, so the argument name is `sql`.
data_str = json.dumps({"sql": sql}).encode("utf-8")

req = urllib.request.Request(url, data=data_str, headers=headers, method="POST")

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode('utf-8')}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
