param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$backendPath = Join-Path $repoRoot "backend"
$frontendPath = Join-Path $repoRoot "frontend"
$pythonPath = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $backendPath)) {
    throw "Backend folder not found: $backendPath"
}
if (-not (Test-Path $frontendPath)) {
    throw "Frontend folder not found: $frontendPath"
}
if (-not (Test-Path $pythonPath)) {
    throw "Python executable not found: $pythonPath"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found in PATH. Install Node.js and retry."
}

$backendCommand = "Set-Location '$backendPath'; & '$pythonPath' -m uvicorn app.main:app --reload --port $BackendPort"
$frontendCommand = "Set-Location '$frontendPath'; npm run dev -- -p $FrontendPort"

Write-Host "Backend command:" -ForegroundColor Cyan
Write-Host $backendCommand
Write-Host "Frontend command:" -ForegroundColor Cyan
Write-Host $frontendCommand

if ($DryRun) {
    Write-Host "Dry-run mode enabled. No terminals launched." -ForegroundColor Yellow
    return
}

$backendProc = Start-Process -FilePath "powershell" -ArgumentList @("-NoExit", "-Command", $backendCommand) -PassThru
$frontendProc = Start-Process -FilePath "powershell" -ArgumentList @("-NoExit", "-Command", $frontendCommand) -PassThru

Write-Host "Started backend terminal (PID: $($backendProc.Id))." -ForegroundColor Green
Write-Host "Started frontend terminal (PID: $($frontendProc.Id))." -ForegroundColor Green
Write-Host "Backend URL: http://127.0.0.1:$BackendPort" -ForegroundColor Green
Write-Host "Frontend URL: http://127.0.0.1:$FrontendPort" -ForegroundColor Green
