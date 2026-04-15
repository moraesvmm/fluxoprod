$SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
$SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

$headers = @{
    "apikey" = $SERVICE_ROLE
    "Authorization" = "Bearer $SERVICE_ROLE"
    "Content-Type" = "application/json"
}

Write-Host "=== ESTUDANDO ESTRUTURA DO BANCO DE DADOS ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar tabelas no schema public
Write-Host "1. Tabelas no schema public:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/empresas?select=*&limit=1" -Headers $headers -Method GET
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Conexão com Supabase bem-sucedida!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao conectar: $_" -ForegroundColor Red
}

# 2. Verificar empresas
Write-Host "`n2. Empresas cadastradas:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/empresas?select=id,razao_social,schema_name,status" -Headers $headers -Method GET
    $data = $response.Content | ConvertFrom-Json
    $data | Format-Table -AutoSize
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}

# 3. Verificar modulos_catalogo
Write-Host "`n3. Módulos no catálogo:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/modulos_catalogo?select=key,nome,descricao" -Headers $headers -Method GET
    $data = $response.Content | ConvertFrom-Json
    $data | Format-Table -AutoSize
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}

# 4. Verificar user_profiles
Write-Host "`n4. User profiles:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/user_profiles?select=user_id,role,empresa_id&limit=5" -Headers $headers -Method GET
    $data = $response.Content | ConvertFrom-Json
    $data | Format-Table -AutoSize
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}

Write-Host "`n=== ESTUDO CONCLUÍDO ===" -ForegroundColor Cyan
