# Kopiert die Bild1–Bild7-Screenshots aus dem Cursor-Workspace nach client/public/photo.
# Ausführen (PowerShell):  cd client/public/photo  ;  .\copy-screenshots.ps1
$here = $PSScriptRoot
$assets = Join-Path $env:USERPROFILE '.cursor\projects\srv-file-Downloads-ali-almani-Downloads-AZ-handy-berlin-az-handy-berlin\assets'
if (-not (Test-Path $assets)) {
  Write-Host "Ordner nicht gefunden: $assets"
  Write-Host "PNG-Dateien manuell als bild1.png … bild7.png nach $here legen."
  exit 1
}
$map = @(
  @{ Pattern = '*Bild1*.png'; Out = 'bild1.png' }
  @{ Pattern = '*Bild2*.png'; Out = 'bild2.png' }
  @{ Pattern = '*Bild3*.png'; Out = 'bild3.png' }
  @{ Pattern = '*Bild4*.png'; Out = 'bild4.png' }
  @{ Pattern = '*Bild5*.png'; Out = 'bild5.png' }
  @{ Pattern = '*Bild6*.png'; Out = 'bild6.png' }
  @{ Pattern = '*Bild7*.png'; Out = 'bild7.png' }
)
foreach ($m in $map) {
  $f = Get-ChildItem -LiteralPath $assets -Filter $m.Pattern -File -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($f) {
    Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $here $m.Out) -Force
    Write-Host "OK $($m.Out) <- $($f.Name)"
  } else {
    Write-Warning "Nicht gefunden: $($m.Pattern)"
  }
}
