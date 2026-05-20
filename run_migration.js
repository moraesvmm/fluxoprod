const fs = require('fs');

async function run() {
  const sql = fs.readFileSync('apps/api/migrations/mrp_producao.sql', 'utf8');
  const mgmtKey = 'sbp_0e26ffabc310da35d676e8bbe9cf508740520bf9';
  const projectId = 'wkxtlvxotvutycbupfuh';

  console.log('Executando SQL via Supabase Management API...');
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mgmtKey}`
    },
    body: JSON.stringify({
      query: sql
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Erro ao executar SQL:', err);
    process.exit(1);
  } else {
    console.log('Migração concluída com sucesso!');
  }
}

run();
