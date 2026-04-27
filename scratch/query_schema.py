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

sql = """
SELECT schema_name FROM public.empresas LIMIT 1;
"""

data_str = json.dumps({"query": sql}).encode("utf-8")
req = urllib.request.Request(url, data=data_str, headers=headers, method="POST")

try:
    response = urllib.request.urlopen(req)
    print(response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
