$SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
$SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"

$headers = @{
    "apikey" = $SERVICE_ROLE
    "Authorization" = "Bearer $SERVICE_ROLE"
    "Content-Type" = "application/json"
}

Write-Host "=== VERIFICANDO TABELAS NO TENANT_62A495E1 ===" -ForegroundColor Cyan
Write-Host ""

$tabelas = @("clientes", "produtos", "estoque", "vendas", "financeiro", "funcionarios", "ordens_servico", "obras", "comissoes", "comissoes_regras")

foreach ($tabela in $tabelas) {
    try {
        $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/$tabela?select=id&limit=1" -Headers $headers -Method GET -UseBasicParsing
        Write-Host "  $tabela - EXISTE" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "  $tabela - NAO ENCONTRADA" -ForegroundColor Red
        } elseif ($_.Exception.Response.StatusCode -eq 406) {
            Write-Host "  $tabela - EXISTE (sem dados)" -ForegroundColor Green
        } else {
            Write-Host "  $tabela - ERRO: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== VERIFICANDO RPCs ===" -ForegroundColor Cyan
Write-Host ""

$rpcs = @("tenant_listar_clientes", "tenant_criar_cliente", "tenant_listar_produtos", "tenant_criar_produto", "tenant_listar_vendas", "tenant_processar_venda", "tenant_dashboard_kpis")

foreach ($rpc in $rpcs) {
    try {
        $body = "{}" | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/$rpc" -Headers $headers -Method POST -Body $body -UseBasicParsing
        Write-Host "  $rpc - EXISTE" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "  $rpc - NAO ENCONTRADA" -ForegroundColor Red
        } else {
            Write-Host "  $rpc - ERRO: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== CONCLUIDO ===" -ForegroundColor Cyan
