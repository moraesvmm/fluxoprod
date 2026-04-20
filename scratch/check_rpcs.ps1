$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"
    "Content-Type" = "application/json"
}

$rpcUrl = "https://wkxtlvxotvutycbupfuh.supabase.co/rest/v1/rpc/"

$rpcs = @(
    "tenant_listar_clientes",
    "tenant_listar_tags_catalog",
    "tenant_dashboard_metricas",
    "tenant_dashboard_kpis_por_mes"
)

foreach ($rpc in $rpcs) {
    Write-Host "Checking RPC: $rpc"
    try {
        $response = Invoke-WebRequest -Uri ($rpcUrl + $rpc) -Method Post -Headers $headers -Body "{}" -ErrorAction Ignore
        Write-Host "Status: $($response.StatusCode)"
    } catch {
        Write-Host "Error: $($_.Exception.Message)"
    }
}
