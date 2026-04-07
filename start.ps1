Write-Host "Iniciando FLUXO SaaS Master..."

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\web; npm run dev"
Write-Host "Frontend Next.js iniciando em http://localhost:3000..."

# Backend (se o Python estiver configurado pelo usuário na sequência)
Write-Host "Dica: Para o backend, rode na pasta apps/api: `uvicorn main:app --reload`"
