Write-Host "Iniciando FLUXO (dev) sem requisitos de TI..."

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Import-EnvFile([string]$path) {
  if (!(Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (!$line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    Set-Item -Path "env:$key" -Value $val
  }
}

# Load env from repo root
Import-EnvFile (Join-Path $repoRoot ".env.local")

# Load backend env
Import-EnvFile (Join-Path $repoRoot "apps\api\.env")

# Configurar Node usando $env:LOCALAPPDATA
$localNodePath = Join-Path $env:LOCALAPPDATA "node"
if (Test-Path $localNodePath) {
  $env:PATH = $localNodePath + ";" + $env:PATH
  Write-Host "Node configurado via $env:LOCALAPPDATA"
}

# Verificar se Node está disponível
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue

if ($nodeCmd -and $npmCmd) {
  Write-Host "Usando Node e npm do sistema"
} else {
  Write-Host "AVISO: Node ou npm não encontrado no sistema."
}

# Ensure Next.js reads env (must be inside apps/web)
$webEnv = Join-Path $repoRoot "apps\web\.env.local"
$rootEnv = Join-Path $repoRoot ".env.local"
if ((Test-Path $rootEnv) -and !(Test-Path $webEnv)) {
  Copy-Item $rootEnv $webEnv
}

# Frontend
if ($nodeCmd -and $npmCmd) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$repoRoot\apps\web`"; npm run dev -- --port 3000"
  Write-Host "Frontend Next.js em http://localhost:3000"
} else {
  Write-Host "AVISO: Node ou npm não encontrado. Frontend não iniciado."
}

# Backend
if ($uvExe) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$repoRoot\apps\api`"; `"$($uvExe.FullName)`" run --active --python .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
  Write-Host "Backend FastAPI em http://127.0.0.1:8000"
} else {
  Write-Host "AVISO: uv não encontrado em .local/bin/uv."
}
