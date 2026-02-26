# PowerShell script to start both server and client
# This script handles UNC paths correctly by opening separate windows

# Get the script directory - try multiple methods to handle UNC paths
$scriptPath = $null

# Method 1: Use INIT_CWD if available (set by npm)
if ($env:INIT_CWD) {
    $scriptPath = $env:INIT_CWD
    Write-Host "Using INIT_CWD: $scriptPath" -ForegroundColor Gray
}

# Method 2: Try to get from MyInvocation
if (-not $scriptPath -and $MyInvocation.MyCommand.Path) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    Write-Host "Using MyInvocation: $scriptPath" -ForegroundColor Gray
}

# Method 3: Try to get from PSScriptRoot (if script is executed directly)
if (-not $scriptPath -and $PSScriptRoot) {
    $scriptPath = $PSScriptRoot
    Write-Host "Using PSScriptRoot: $scriptPath" -ForegroundColor Gray
}

# Method 4: Try to find package.json in current directory
if (-not $scriptPath) {
    $currentPath = (Get-Location).Path
    $packageJsonPath = Join-Path $currentPath "package.json"
    
    if (Test-Path $packageJsonPath) {
        $scriptPath = $currentPath
        Write-Host "Using current directory with package.json: $scriptPath" -ForegroundColor Gray
    }
}

# Fallback: use current directory
if (-not $scriptPath) {
    $scriptPath = (Get-Location).Path
    Write-Host "Warning: Could not determine script path, using current directory: $scriptPath" -ForegroundColor Yellow
}

$serverPath = Join-Path $scriptPath "server"
$clientPath = Join-Path $scriptPath "client"

Write-Host "Starting development servers in separate windows..." -ForegroundColor Green
Write-Host "Project path: $scriptPath" -ForegroundColor Cyan
Write-Host "Server path: $serverPath" -ForegroundColor Cyan
Write-Host "Client path: $clientPath" -ForegroundColor Cyan
Write-Host ""

# Verify paths exist
if (-not (Test-Path $serverPath)) {
    Write-Host "Error: Server path does not exist: $serverPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $clientPath)) {
    Write-Host "Error: Client path does not exist: $clientPath" -ForegroundColor Red
    exit 1
}

# Create a temporary script file for server (to handle UNC paths)
$serverScript = Join-Path $env:TEMP "start-server-$(Get-Random).ps1"
@"
Set-Location '$serverPath'
Write-Host 'Starting Server...' -ForegroundColor Green
npm run dev
"@ | Out-File -FilePath $serverScript -Encoding UTF8

# Create a temporary script file for client (to handle UNC paths)
$clientScript = Join-Path $env:TEMP "start-client-$(Get-Random).ps1"
@"
Set-Location '$clientPath'
Write-Host 'Starting Client...' -ForegroundColor Green
npm start
"@ | Out-File -FilePath $clientScript -Encoding UTF8

# Start server in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $serverScript

# Wait a moment before starting client
Start-Sleep -Seconds 2

# Start client in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $clientScript

Write-Host "Both servers are starting in separate windows." -ForegroundColor Yellow
Write-Host "Server script: $serverScript" -ForegroundColor Gray
Write-Host "Client script: $clientScript" -ForegroundColor Gray
Write-Host "Close the windows to stop the servers." -ForegroundColor Yellow
