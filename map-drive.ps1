# PowerShell script to map network drive to a local drive letter
# Run this script as Administrator

$ErrorActionPreference = "Stop"

$networkPath = "\\SRV-FILE\Downloads\ali.almani\Downloads\AZ-handy.berlin\az-handy.berlin"
$driveLetter = "Z"

Write-Host "Mapping network drive..." -ForegroundColor Cyan
Write-Host "Network path: $networkPath" -ForegroundColor Gray
Write-Host "Drive letter: ${driveLetter}:" -ForegroundColor Gray
Write-Host ""

# Check if drive already exists
if (Test-Path "${driveLetter}:") {
    Write-Host "Drive ${driveLetter}: already exists. Removing it first..." -ForegroundColor Yellow
    Remove-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
    net use "${driveLetter}:" /delete /y 2>$null
}

# Map the drive
try {
    New-PSDrive -Name $driveLetter -PSProvider FileSystem -Root $networkPath -Persist -Scope Global
    Write-Host "✓ Drive ${driveLetter}: mapped successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use ${driveLetter}:\ instead of the UNC path" -ForegroundColor Cyan
    Write-Host "Example: cd ${driveLetter}:\client" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed to map drive: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running PowerShell as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
}
