import json
import re

filepath = '/Users/macbook/.gemini/antigravity/brain/ded959ef-0b2a-4c3c-a8bd-b8dfa5072f5d/.system_generated/steps/209/output.txt'

with open(filepath, 'r') as f:
    content = f.read()

# Find JSON block
# The JSON block starts with '[' and ends with ']' just before </untrusted-data...
start = content.find('[')
end = content.rfind(']') + 1

json_str = content[start:end]

# It might have unescaped newlines because it's printed raw? No, json.loads handles it if properly escaped.
# The error was "Expecting property name enclosed in double quotes: line 1 column 3". This happens if it sees `[{ \n` without quotes around keys.
# Let's just use Python's ast.literal_eval if it's python-like, but it's JSON. 
# Wait! Supabase returns a literal string `[{"prosrc":"\nBEGIN\n...` but wait, maybe the `\n` is actually a literal newline in the string! JSON strings cannot contain unescaped literal newlines.
# If supabase returned unescaped newlines inside the JSON string, json.loads will fail.

# Let's clean literal newlines inside strings
def fix_json_newlines(json_str):
    # This is tricky. Let's just extract the body of prosrc directly.
    pass

# Extract everything between "prosrc":" and "}
match = re.search(r'"prosrc":"(.*)"\}', json_str, re.DOTALL)
if not match:
    print("Could not extract prosrc")
    exit(1)

prosrc_raw = match.group(1)

# prosrc_raw might have literal newlines, or escaped \n.
# We will use it directly. We just need to replace EXECUTE format('...', novo_schema, ...) with EXECUTE replace('...', '__SCHEMA__', quote_ident(novo_schema))

def replacer(m):
    sql_str = m.group(1)
    # args = m.group(2) # we ignore this, we just replace all novo_schema with nothing
    
    # Replace %I with __SCHEMA__
    new_sql = sql_str.replace('%I', '__SCHEMA__')
    
    return f"EXECUTE replace({new_sql}, '__SCHEMA__', quote_ident(novo_schema));"

# The format call looks like: EXECUTE format('...', novo_schema, novo_schema...);
# Note that the string might have newlines.
pattern = re.compile(r"EXECUTE\s+format\s*\(\s*('.*?')\s*,\s*(novo_schema(?:,\s*novo_schema)*)\s*\);", re.DOTALL)

new_prosrc = pattern.sub(replacer, prosrc_raw)

# Now write the SQL file
# Since prosrc_raw is a string with escaped \n if it was JSON encoded, we need to decode it.
# Actually, if it's JSON encoded, \n is literal '\' followed by 'n'.
new_prosrc_decoded = new_prosrc.encode('utf-8').decode('unicode_escape')

out_sql = f"""
CREATE OR REPLACE FUNCTION public._provisionar_tabelas(novo_schema text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
{new_prosrc_decoded}
$function$;
"""

with open('/Users/macbook/fluxoprod/novo_provisionar_tabelas.sql', 'w') as f:
    f.write(out_sql)

print("Saved to novo_provisionar_tabelas.sql")

