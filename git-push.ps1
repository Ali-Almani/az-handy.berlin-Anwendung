# ============================================
# GitHub Upload - az-handy.berlin
# Komplettes Hochladen zu GitHub (PowerShell)
# ============================================
# Verwendung:
#   .\git-push.ps1                    # Mit Standard-Commit-Nachricht
#   .\git-push.ps1 "Meine Aenderungen"  # Mit eigener Nachricht
# ============================================

param(
    [string]$CommitMessage = "Update: Aenderungen hochgeladen"
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

Set-Location $projectRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GitHub Upload - az-handy.berlin" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git-Status pruefen
Write-Host "[1/4] Git-Status pruefen..." -ForegroundColor Yellow
$status = git status --short
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Keine Aenderungen zum Hochladen." -ForegroundColor Green
    exit 0
}
git status
Write-Host ""

# 2. Alle Aenderungen hinzufuegen
Write-Host "[2/4] Aenderungen hinzufuegen (git add .)..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Fehler beim git add" -ForegroundColor Red
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# 3. Commit erstellen
Write-Host "[3/4] Commit erstellen..." -ForegroundColor Yellow
git commit -m "$CommitMessage"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Hinweis: Kein neuer Commit (evtl. nichts zu committen)" -ForegroundColor Yellow
}
Write-Host ""

# 4. Zu GitHub pushen
Write-Host "[4/4] Zu GitHub pushen..." -ForegroundColor Yellow
$branch = git branch --show-current 2>$null
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = "main"
}
git push -u origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Fehler beim Push. Moegliche Ursachen:" -ForegroundColor Red
    Write-Host "  - Kein Remote 'origin' konfiguriert: git remote add origin https://github.com/USER/REPO.git" -ForegroundColor White
    Write-Host "  - Keine Berechtigung (Login erforderlich)" -ForegroundColor White
    Write-Host "  - Branch existiert nicht auf GitHub: git push -u origin $branch" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Erfolgreich zu GitHub hochgeladen!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
