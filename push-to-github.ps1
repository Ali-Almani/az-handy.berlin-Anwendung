# Push AZ-handy.berlin zu GitHub
# Dieses Skript im Projektordner ausfuehren

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Git: Dateien hinzufuegen ===" -ForegroundColor Cyan
git add .
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n=== Git: Initialer Commit ===" -ForegroundColor Cyan
git commit -m "Initial commit: AZ-handy.berlin project"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n=== Git: Remote konfigurieren ===" -ForegroundColor Cyan
$remoteUrl = "https://github.com/Ali-Almani/az-handy.berlin-Anwendung.git"
if (git remote get-url origin 2>$null) {
    git remote set-url origin $remoteUrl
} else {
    git remote add origin $remoteUrl
}

Write-Host "`n=== Git: Push zu GitHub ===" -ForegroundColor Cyan
# Pushe master (oder main falls umbenannt)
$branch = (git branch --show-current)
git push -u origin $branch
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n=== Fertig! Projekt wurde zu GitHub hochgeladen. ===" -ForegroundColor Green
