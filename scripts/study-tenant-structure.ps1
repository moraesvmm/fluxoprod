$SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
$SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

$headers = @{
    "apikey" = $SERVICE_ROLE
    "Authorization" = "Bearer $SERVICE_ROLE"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== ESTUDANDO ESTRUTURA DO TENANT_62A495E1 ===" -ForegroundColor Cyan
Write-Host ""

# Usar RPC para executar SQL e verificar tabelas no schema tenant
Write-Host "1. Verificando tabelas no schema tenant_62a495e1:" -ForegroundColor Yellow

$sql = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'tenant_62a495e1' 
  AND table_type = 'BASE TABLE' 
ORDER BY table_name
"@

$body = @{
    sql = $sql
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Headers $headers -Method POST -Body $body -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Tabelas encontradas:" -ForegroundColor Green
    $data | ForEach-Object { Write-Host "  - $($_.table_name)" }
} catch {
    Write-Host "RPC exec_sql não disponível, tentando via PostgreSQL..." -ForegroundColor Yellow
    Write-Host "Não é possível verificar tabelas via REST API. Usando abordagem alternativa..." -ForegroundColor Yellow
}

# Tentar acessar tabelas específicas via REST API
Write-Host "`n2. Tentando acessar tabelas específicas:" -ForegroundColor Yellow

$tabelas = @("clientes", "produtos", "estoque", "vendas", "financeiro", "funcionarios", "ordens_servico", "obras", "comissoes", "comissoes_regras")

foreach ($tabela in $tabelas) {
    try {
        $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/$tabela?select=id&limit=1" -Headers $headers -Method GET -UseBasicParsing
        Write-Host "  ✓ $tabela - existe" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "  ✗ $tabela - não encontrada (404)" -ForegroundColor Red
        } elseif ($_.Exception.Response.StatusCode -eq 406) {
            Write-Host "  ✓ $tabela - existe (mas sem dados)" -ForegroundColor Green
        } else {
            Write-Host "  ? $tabela - erro: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# Verificar RPCs disponíveis
Write-Host "`n3. Verificando RPCs disponíveis:" -ForegroundColor Yellow

$rpcs = @("tenant_listar_clientes", "tenant_criar_cliente", "tenant_listar_produtos", "tenant_criar_produto", "tenant_listar_vendas", "tenant_processar_venda", "tenant_dashboard_kpis", "set_tenant_schema")

foreach ($rpc in $rpcs) {
    try {
        $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/$rpc" -Headers $headers -Method POST -Body "{}" -UseBasicParsing
        Write-Host "  ✓ $rpc - existe" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "  ✗ $rpc - não encontrada (404)" -ForegroundColor Red
        } else {
            Write-Host "  ? $rpc - erro: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== ESTUDO CONCLUÍDO ===" -ForegroundColor Cyan
