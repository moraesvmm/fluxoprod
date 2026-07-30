import re

filepath = '/Users/macbook/.gemini/antigravity/brain/ded959ef-0b2a-4c3c-a8bd-b8dfa5072f5d/.system_generated/steps/209/output.txt'
with open(filepath, 'r') as f:
    content = f.read()

# Since the string has literal \n and escapes, let's just use re to find fechamentos_mensais table block
match = re.search(r'CREATE TABLE.*?fechamentos_mensais.*?\);', content, re.DOTALL)
if match:
    print(match.group(0).encode('utf-8').decode('unicode_escape'))
else:
    print("Not found")

