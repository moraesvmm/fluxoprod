import json
import urllib.request
import os
import sys

# Management Key and API URL
SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

# Construct URI 
db_uri = "postgresql://postgres:Vmm041126!Database@db.wkxtlvxotvutycbupfuh.supabase.co:5432/postgres"

sql_file_path = "apps/api/migrations/rpc_crm_fixes.sql"

# Read SQL
try:
    with open(sql_file_path, "r", encoding="utf-8") as f:
        sql_script = f.read()
except Exception as e:
    print(f"Failed to read SQL script: {e}")
    sys.exit(1)

# Using pg8000 if available, else standard psycopg2. In a corporate env, it's safer to just run an RPC that can execute SQL, 
# or use psycopg2 directly. Since psycopg2 might not be installed, let's try to install it.
import subprocess
try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"], stdout=subprocess.DEVNULL)
    import psycopg2

try:
    print("Connecting to Supabase Database...")
    conn = psycopg2.connect(db_uri)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("Executing SQL Migration...")
    cursor.execute(sql_script)
    print("Migration executed successfully.")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error executing SQL: {e}")
    sys.exit(1)

