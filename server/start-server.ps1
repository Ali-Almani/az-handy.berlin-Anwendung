# PowerShell script to start the server with PostgreSQL check
$scriptPath = if ($env:INIT_CWD) { $env:INIT_CWD } elseif ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Starting az-handy.berlin Server" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Set-Location $scriptPath

# Check if .env file exists
$envFile = Join-Path $scriptPath ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "   Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item (Join-Path $scriptPath ".env.example") $envFile -ErrorAction SilentlyContinue
    Write-Host "   Please check and update .env file if needed!" -ForegroundColor Yellow
    Write-Host ""
}

# Load environment variables
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check PostgreSQL if not using memory mode
$useMemory = $env:USE_MEMORY_DB -eq "true"
$hasPostgres = $env:DATABASE_URL -or $env:PG_DATABASE -or $env:PG_USER

if (-not $useMemory -and $hasPostgres) {
    Write-Host "🔍 Checking PostgreSQL connection..." -ForegroundColor Cyan
    $pgHost = if ($env:PG_HOST) { $env:PG_HOST } else { "localhost" }
    $pgPort = if ($env:PG_PORT) { $env:PG_PORT } else { 5432 }
    Write-Host "   Host: $pgHost`:$pgPort" -ForegroundColor Gray

    try {
        $pgTest = Test-NetConnection -ComputerName $pgHost -Port $pgPort -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if (-not $pgTest) {
            Write-Host ""
            Write-Host "⚠️  WARNING: PostgreSQL does not appear to be running!" -ForegroundColor Yellow
            Write-Host "   The server will try to connect, but may fail." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "💡 To start PostgreSQL:" -ForegroundColor Cyan
            Write-Host "   1. Start PostgreSQL service" -ForegroundColor White
            Write-Host "   2. Or set USE_MEMORY_DB=true in .env for in-memory mode" -ForegroundColor White
            Write-Host ""
            $continue = Read-Host "Continue anyway? (y/n)"
            if ($continue -ne "y") {
                Write-Host "Exiting..." -ForegroundColor Red
                exit 1
            }
            Write-Host ""
        } else {
            Write-Host "✅ PostgreSQL connection available" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Could not check PostgreSQL status" -ForegroundColor Yellow
    }
} elseif ($useMemory) {
    Write-Host "📦 In-Memory mode (no database)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📦 Starting server..." -ForegroundColor Cyan
Write-Host ""

# Start the server
$nodemonPath = Join-Path $scriptPath "node_modules\.bin\nodemon.cmd"
if (Test-Path $nodemonPath) {
    Write-Host "Using nodemon for auto-reload..." -ForegroundColor Gray
    & $nodemonPath index.js
} else {
    Write-Host "Using node (nodemon not found)..." -ForegroundColor Gray
    node index.js
}
