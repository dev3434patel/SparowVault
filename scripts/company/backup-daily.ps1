# SparowVault company — Windows Task Scheduler / PowerShell daily backup (PHASE_10)
# Schedule: daily 03:15 local. Requires BACKUP_DIR absolute outside the repo.

$ErrorActionPreference = "Stop"
$AppRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path (Join-Path $AppRoot "package.json"))) { $AppRoot = (Get-Location).Path }
Set-Location $AppRoot

if (-not $env:BACKUP_DIR) {
  Write-Error "Set BACKUP_DIR to an absolute path outside the web root"
}
New-Item -ItemType Directory -Force -Path $env:BACKUP_DIR | Out-Null

Write-Host "[$(Get-Date -Format o)] backup:db start"
php scripts/backup_db.php
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[$(Get-Date -Format o)] backup:db ok"

$keepDays = if ($env:KEEP_DAYS) { [int]$env:KEEP_DAYS } else { 14 }
Get-ChildItem $env:BACKUP_DIR -Filter "db_*.sql" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$keepDays) } |
  Remove-Item -Force
Get-ChildItem $env:BACKUP_DIR -Filter "db_*.json" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$keepDays) } |
  Remove-Item -Force

if ($env:BACKUP_OFFSITE_DIR) {
  New-Item -ItemType Directory -Force -Path $env:BACKUP_OFFSITE_DIR | Out-Null
  $newest = Get-ChildItem $env:BACKUP_DIR -Filter "db_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($newest) {
    Copy-Item $newest.FullName $env:BACKUP_OFFSITE_DIR -Force
    $man = [IO.Path]::ChangeExtension($newest.FullName, ".json")
    if (Test-Path $man) { Copy-Item $man $env:BACKUP_OFFSITE_DIR -Force }
    Write-Host "[$(Get-Date -Format o)] offsite copy $($newest.Name)"
  }
}

Write-Host "[$(Get-Date -Format o)] backup-daily done"
