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
    if (-not (Get-Item -Path "env:$key" -ErrorAction SilentlyContinue)) { Set-Item -Path "env:$key" -Value $val }
  }
}

# Load env from repo root
Import-EnvFile (Join-Path $repoRoot ".env.local")

# Portable Node (local)
$nodeDir = Get-ChildItem -Path (Join-Path $repoRoot ".local\bin") -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "node-v*-win-x64" } |
  Sort-Object Name -Descending |
  Select-Object -First 1

if ($nodeDir) {
  $env:PATH = $nodeDir.FullName + ";" + $env:PATH
} else {
  Write-Host "AVISO: Node portátil não encontrado em .local/bin. Rode o bootstrap local antes."
}

# Ensure Next.js reads env (must be inside apps/web)
$webEnv = Join-Path $repoRoot "apps\web\.env.local"
$rootEnv = Join-Path $repoRoot ".env.local"
if ((Test-Path $rootEnv) -and !(Test-Path $webEnv)) {
  Copy-Item $rootEnv $webEnv
}

# Portable uv (local)
$uvExe = Get-ChildItem -Path (Join-Path $repoRoot ".local\bin\uv") -Recurse -Filter "uv.exe" -ErrorAction SilentlyContinue |
  Select-Object -First 1

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$repoRoot\apps\web`"; npm run dev -- --port 3000"
Write-Host "Frontend Next.js em http://localhost:3000"

# Backend
if ($uvExe) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$repoRoot\apps\api`"; `"$($uvExe.FullName)`" run --active --python .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
  Write-Host "Backend FastAPI em http://127.0.0.1:8000"
} else {
  Write-Host "AVISO: uv não encontrado em .local/bin/uv."
}
