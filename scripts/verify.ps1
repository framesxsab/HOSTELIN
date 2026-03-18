$ErrorActionPreference = "Stop"

Write-Host "[1/3] Frontend lint" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\frontend"
try {
    npm run lint
}
finally {
    Pop-Location
}

Write-Host "[2/3] Backend smoke tests" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\backend"
try {
    & "$PSScriptRoot\..\.venv\Scripts\python.exe" -m unittest discover -s tests -p "test_*.py"
}
finally {
    Pop-Location
}

Write-Host "[3/3] Backend compile check" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\backend"
try {
    & "$PSScriptRoot\..\.venv\Scripts\python.exe" -m compileall app
}
finally {
    Pop-Location
}

Write-Host "All checks passed." -ForegroundColor Green
