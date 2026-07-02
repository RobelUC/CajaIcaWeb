# Seed 30 casos — CajaIca
Set-Location (Split-Path $PSScriptRoot -Parent)
Write-Host "Cargando 30 casos en Firebase cajaica..." -ForegroundColor Cyan
node scripts/seed-casos30.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Completado." -ForegroundColor Green
