# Script para iniciar servidor FLUXO em ambiente corporativo restrito
# Usa Node portátil local sem dependências globais

$ErrorActionPreference = "Stop"
$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host "=== Iniciando FLUXO (ambiente corporativo restrito) ==="

# 1. Configurar Node portátil local
$nodeDir = Join-Path $repoRoot ".local\bin\node-v20.19.0-win-x64"
$nodeExe = Join-Path $nodeDir "node.exe"
$npmExe = Join-Path $nodeDir "npm-cli.js"

if (!(Test-Path $nodeExe)) {
    Write-Host "ERRO: Node portátil não encontrado em $nodeDir"
    exit 1
}

Write-Host "Node portátil encontrado em: $nodeExe"

# 2. Baixar npm-cli.js se não existir
if (!(Test-Path $npmExe)) {
    Write-Host "Baixando npm-cli.js..."
    try {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/npm/cli/v10.9.0/lib/npm.js" -OutFile $npmExe
        Write-Host "npm-cli.js baixado com sucesso"
    } catch {
        Write-Host "ERRO: Não foi possível baixar npm-cli.js"
        exit 1
    }
} else {
    Write-Host "npm-cli.js já existe"
}

# 3. Configurar variáveis de ambiente locais (apenas para esta sessão)
$env:NEXT_PUBLIC_SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTEyNjAsImV4cCI6MjA5MTA2NzI2MH0.XUEkBM2dCEvHNbh00W969QjZ-gIwJ0yA5T-KLO3PtIw"
$env:NEXT_PUBLIC_API_URL = "http://localhost:8000"

Write-Host "Variáveis de ambiente configuradas"

# 4. Verificar se node_modules existe
$nodeModulesPath = Join-Path $repoRoot "apps\web\node_modules"
if (!(Test-Path $nodeModulesPath)) {
    Write-Host "Instalando dependências (pode levar alguns minutos)..."
    Push-Location (Join-Path $repoRoot "apps\web")
    try {
        & $nodeExe $npmExe install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERRO: Falha ao instalar dependências"
            Pop-Location
            exit 1
        }
        Write-Host "Dependências instaladas com sucesso"
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Dependências já instaladas"
}

# 5. Iniciar frontend
Write-Host "Iniciando frontend Next.js em http://localhost:3000"
$frontendScript = {
    param($repoRoot, $nodeExe, $npmExe)
    $env:NEXT_PUBLIC_SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTEyNjAsImV4cCI6MjA5MTA2NzI2MH0.XUEkBM2dCEvHNbh00W969QjZ-gIwJ0yA5T-KLO3PtIw"
    $env:NEXT_PUBLIC_API_URL = "http://localhost:8000"
    Set-Location (Join-Path $repoRoot "apps\web")
    & $nodeExe $npmExe run dev -- --port 3000
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript.ToString().Replace('$repoRoot', $repoRoot).Replace('$nodeExe', $nodeExe).Replace('$npmExe', $npmExe)

# 6. Iniciar backend (se uv existir)
$uvExe = Get-ChildItem -Path (Join-Path $repoRoot ".local\bin") -Filter "uv.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($uvExe) {
    Write-Host "Iniciando backend FastAPI em http://127.0.0.1:8000"
    $backendScript = {
        param($repoRoot, $uvExe)
        $env:SUPABASE_URL = "https://wkxtlvxotvutycbupfuh.supabase.co"
        $env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreHRsdnhvdHZ1dHljYnVwZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MTI2MCwiZXhwIjoyMDkxMDY3MjYwfQ.U_FguLhWFCaZ7tUFut9fWoRp0vsFJW7E8ZNOwdUCjVU"
        Set-Location (Join-Path $repoRoot "apps\api")
        & $uvExe.FullName run --active --python (Join-Path $repoRoot ".venv\Scripts\python.exe") -m uvicorn main:app --reload --port 8000
    }
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript.ToString().Replace('$repoRoot', $repoRoot).Replace('$uvExe', $uvExe)
} else {
    Write-Host "AVISO: uv não encontrado. Backend não iniciado."
}

Write-Host "=== Servidor iniciado ==="
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend: http://127.0.0.1:8000 (se uv disponível)"
