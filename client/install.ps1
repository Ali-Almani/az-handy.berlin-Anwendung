# PowerShell script to install npm dependencies
# This handles UNC paths correctly

$ErrorActionPreference = "Stop"

# Get the script directory
$scriptPath = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

Write-Host "Installing dependencies in: $scriptPath" -ForegroundColor Cyan
Set-Location $scriptPath

# Set environment variable to help with UNC paths
$env:npm_config_cache = Join-Path $env:TEMP "npm-cache"

# Try to install with npm
Write-Host "Running npm install..." -ForegroundColor Green

# Use --no-optional to skip optional dependencies that might cause issues
npm install --no-optional --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed. Trying alternative method..." -ForegroundColor Yellow
    
    # Alternative: Install esbuild separately first
    Write-Host "Installing esbuild separately..." -ForegroundColor Yellow
    npm install esbuild --save-dev --legacy-peer-deps
    
    # Then install the rest
    Write-Host "Installing remaining dependencies..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

Write-Host "Installation complete!" -ForegroundColor Green
