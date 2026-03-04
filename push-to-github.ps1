# Push AZ-handy.berlin zu GitHub
# Dieses Skript im Projektordner ausfuehren

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$remoteUrl = "https://github.com/Ali-Almani/az-handy.berlin-Anwendung.git"
if (-not (git remote get-url origin 2>$null)) {
    Write-Host "=== Git: Remote hinzufuegen ===" -ForegroundColor Cyan
    git remote add origin $remoteUrl
}

Write-Host "=== Git: Dateien hinzufuegen ===" -ForegroundColor Cyan
git add -A
if ($LASTEXITCODE -ne 0) { exit 1 }

$status = git status --porcelain
if ($status) {
    Write-Host "`n=== Git: Commit ===" -ForegroundColor Cyan
    git commit -m "Update: News-Popup, IMEI-Sync, E-Mail-Berechtigungen, Benutzerverwaltung"
    if ($LASTEXITCODE -ne 0) { exit 1 }
} else {
    Write-Host "`nKeine Aenderungen zum Committen." -ForegroundColor Yellow
}

Write-Host "`n=== Git: Push zu GitHub ===" -ForegroundColor Cyan
$branch = (git branch --show-current)
git push -u origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nPush fehlgeschlagen. Pruefen Sie:" -ForegroundColor Red
    Write-Host "  - GitHub-Anmeldung (Token oder SSH-Key)" -ForegroundColor Red
    Write-Host "  - Internetverbindung" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Fertig! Projekt wurde zu GitHub hochgeladen. ===" -ForegroundColor Green
