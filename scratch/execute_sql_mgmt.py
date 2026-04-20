import urllib.request
import json
import sys

ref = "wkxtlvxotvutycbupfuh"
url = f"https://api.supabase.com/v1/projects/{ref}/database/query"

headers = {
    "Authorization": "Bearer sbp_0e26ffabc310da35d676e8bbe9cf508740520bf9",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

sql_path = "apps/api/migrations/rpc_crm_fixes.sql"
try:
    with open(sql_path, "r", encoding="utf-8") as f:
        sql = f.read()
except Exception as e:
    print(f"Failed to read SQL script: {e}")
    sys.exit(1)

data_str = json.dumps({"query": sql}).encode("utf-8")

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
