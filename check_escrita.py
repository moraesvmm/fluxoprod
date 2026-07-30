import re

filepath = '/Users/macbook/.gemini/antigravity/brain/ded959ef-0b2a-4c3c-a8bd-b8dfa5072f5d/.system_generated/steps/253/output.txt'
with open(filepath, 'r') as f:
    content = f.read()

# find fechamentos_mensais
match = re.search(r'CREATE TABLE IF NOT EXISTS.*?fechamentos_mensais.*?\);', content, re.DOTALL)
if match:
    print(match.group(0).encode('utf-8').decode('unicode_escape'))
    
match2 = re.search(r'CREATE INDEX IF NOT EXISTS idx_%I_fechamentos_mes ON %I.fechamentos_mensais\(mes\);', content)
if match2:
    print(match2.group(0).encode('utf-8').decode('unicode_escape'))
