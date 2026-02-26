# Einfaches Start-Skript für den Server
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Starte az-handy.berlin Server" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📁 Verzeichnis: $scriptPath" -ForegroundColor Gray
Write-Host ""

# Prüfe ob .env existiert
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env Datei nicht gefunden!" -ForegroundColor Yellow
    Write-Host "   Erstelle .env aus .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "   ✅ .env erstellt" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "🔍 Prüfe Konfiguration..." -ForegroundColor Cyan
$envContent = Get-Content ".env" -ErrorAction SilentlyContinue
if ($envContent -match 'USE_MEMORY_DB=true') {
    Write-Host "   ✅ In-Memory Modus aktiviert (kein MongoDB nötig)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MongoDB Modus - MongoDB wird benötigt" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "🚀 Starte Server..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Tipp: Drücken Sie Ctrl+C zum Beenden" -ForegroundColor Yellow
Write-Host ""

# Starte den Server direkt mit node (nodemon hat Probleme mit UNC-Pfaden)
node index.js
