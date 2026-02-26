# PowerShell script to start the server with nodemon
# This handles UNC paths correctly

$scriptPath = if ($env:INIT_CWD) { $env:INIT_CWD } elseif ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

Write-Host "Starting server in: $scriptPath" -ForegroundColor Cyan
Set-Location $scriptPath

# Use node directly instead of nodemon to avoid UNC path issues
Write-Host "Starting server with node (nodemon has issues with UNC paths)..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start node directly
node index.js
