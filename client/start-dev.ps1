# PowerShell script to start the client with vite
# This handles UNC paths by mapping to a local drive

$ErrorActionPreference = "Continue"

# Get the script directory - handle UNC paths
$scriptPath = $null

# Method 1: Use INIT_CWD if available (set by npm)
if ($env:INIT_CWD) {
    $scriptPath = $env:INIT_CWD
    Write-Host "Using INIT_CWD: $scriptPath" -ForegroundColor Gray
}

# Method 2: Use PSScriptRoot (if script is executed directly)
if (-not $scriptPath -and $PSScriptRoot) {
    $scriptPath = $PSScriptRoot
    Write-Host "Using PSScriptRoot: $scriptPath" -ForegroundColor Gray
}

# Method 3: Try to get from MyInvocation
if (-not $scriptPath -and $MyInvocation.MyCommand.Path) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    Write-Host "Using MyInvocation: $scriptPath" -ForegroundColor Gray
}

# Method 4: Use current directory
if (-not $scriptPath) {
    $scriptPath = (Get-Location).Path
    Write-Host "Using current directory: $scriptPath" -ForegroundColor Gray
}

Write-Host "Starting client in: $scriptPath" -ForegroundColor Cyan

# Check if path is a UNC path
$isUncPath = $scriptPath -match '^\\\\'
$mappedDrive = $null

if ($isUncPath) {
    Write-Host "Detected UNC path. Mapping to local drive..." -ForegroundColor Yellow
    
    # Find an available drive letter (Z: down to V:)
    $availableDrives = Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Name
    $driveLetter = $null
    
    for ($letter = 90; $letter -ge 86; $letter--) {
        $testDrive = [char]$letter + ":"
        if ($availableDrives -notcontains $testDrive) {
            $driveLetter = $testDrive
            break
        }
    }
    
    if (-not $driveLetter) {
        Write-Host "Error: Could not find an available drive letter" -ForegroundColor Red
        exit 1
    }
    
    # Extract the UNC server and share path
    # Format: \\SERVER\Share\path\to\file
    # We need to map \\SERVER\Share to a drive letter
    $uncPath = $scriptPath
    $parts = ($uncPath -replace '^\\\\', '') -split '\\', 3
    $serverName = $parts[0]
    $shareName = $parts[1]
    $subPath = if ($parts.Length -gt 2) { $parts[2] } else { "" }
    
    # Build the server\share path (first two parts)
    $serverShare = "\\$serverName\$shareName"
    
    # Map the drive
    try {
        Write-Host "Mapping $serverShare to $driveLetter" -ForegroundColor Cyan
        
        # Use net.exe to map the drive
        $result = net use "${driveLetter}:" "$serverShare" /persistent:no 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $mappedDrive = $driveLetter
            # Build the new path with the mapped drive
            if ($subPath) {
                $scriptPath = "${driveLetter}:\$subPath"
            } else {
                $scriptPath = "${driveLetter}:\"
            }
            Write-Host "Successfully mapped to $scriptPath" -ForegroundColor Green
        } else {
            Write-Host "Warning: Could not map drive (exit code: $LASTEXITCODE), continuing with UNC path..." -ForegroundColor Yellow
            Write-Host "Output: $result" -ForegroundColor Gray
        }
    } catch {
        Write-Host "Warning: Could not map drive: $_" -ForegroundColor Yellow
    }
}

# Set NODE_ENV
$env:NODE_ENV = 'development'

# Set explicit cache directory to avoid Vite trying to create cache in C:\Windows
$cacheDir = Join-Path $scriptPath "node_modules\.vite"
$env:VITE_CACHE_DIR = $cacheDir

# Also set VITE_ROOT to help Vite find the correct directory
$env:VITE_ROOT = $scriptPath

# Set process working directory (helps Node.js understand the correct directory)
# This is critical for UNC paths
$env:PWD = $scriptPath

Write-Host "Cache directory: $cacheDir" -ForegroundColor Gray
Write-Host "VITE_ROOT: $env:VITE_ROOT" -ForegroundColor Gray

# Try to change directory
try {
    Set-Location $scriptPath -ErrorAction Stop
    Write-Host "Changed to directory: $scriptPath" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not change directory: $_" -ForegroundColor Yellow
}

# Try to use vite.cmd first (works better with UNC paths)
$viteCmd = Join-Path $scriptPath "node_modules\.bin\vite.cmd"
if (Test-Path $viteCmd) {
    Write-Host "Starting Vite using vite.cmd..." -ForegroundColor Green
    Write-Host "Port: 3000, Host: 0.0.0.0" -ForegroundColor Cyan
    try {
        & $viteCmd --port 3000 --host 0.0.0.0
    } finally {
        # Cleanup: Unmap drive if we mapped it
        if ($mappedDrive) {
            Write-Host "Unmapping drive $mappedDrive..." -ForegroundColor Gray
            net use $mappedDrive /delete /yes 2>$null
        }
    }
} else {
    # Try vite.js
    $viteJs = Join-Path $scriptPath "node_modules\vite\bin\vite.js"
    if (Test-Path $viteJs) {
        Write-Host "Starting Vite using vite.js..." -ForegroundColor Green
        Write-Host "Port: 3000, Host: 0.0.0.0" -ForegroundColor Cyan
        try {
            node $viteJs --port 3000 --host 0.0.0.0
        } finally {
            # Cleanup: Unmap drive if we mapped it
            if ($mappedDrive) {
                Write-Host "Unmapping drive $mappedDrive..." -ForegroundColor Gray
                net use $mappedDrive /delete /yes 2>$null
            }
        }
    } else {
        Write-Host "Vite not found in node_modules. Trying npx..." -ForegroundColor Yellow
        Write-Host "Port: 3000, Host: 0.0.0.0" -ForegroundColor Cyan
        try {
            npx vite --port 3000 --host 0.0.0.0
        } finally {
            # Cleanup: Unmap drive if we mapped it
            if ($mappedDrive) {
                Write-Host "Unmapping drive $mappedDrive..." -ForegroundColor Gray
                net use $mappedDrive /delete /yes 2>$null
            }
        }
    }
}
