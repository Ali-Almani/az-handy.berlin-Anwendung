# Kopiert Bild1–Bild7-Screenshots aus dem Cursor-Assets-Ordner nach client/src/photo (wie im Handbuch per Import eingebunden).
# Ausführen:  cd client/src/photo  ;  .\copy-screenshots.ps1
$here = $PSScriptRoot
$assets = Join-Path $env:USERPROFILE '.cursor\projects\srv-file-Downloads-ali-almani-Downloads-AZ-handy-berlin-az-handy-berlin\assets'
if (-not (Test-Path $assets)) {
  Write-Host "Ordner nicht gefunden: $assets"
  Write-Host "PNG-Dateien manuell als Bild1.png … Bild7.png in $here ablegen."
  exit 1
}
$map = @(
  @{ Pattern = '*Bild1*.png'; Out = 'Bild1.png' }
  @{ Pattern = '*Bild2*.png'; Out = 'Bild2.png' }
  @{ Pattern = '*Bild3*.png'; Out = 'Bild3.png' }
  @{ Pattern = '*Bild4*.png'; Out = 'Bild4.png' }
  @{ Pattern = '*Bild5*.png'; Out = 'Bild5.png' }
  @{ Pattern = '*Bild6*.png'; Out = 'Bild6.png' }
  @{ Pattern = '*Bild7*.png'; Out = 'Bild7.png' }
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
