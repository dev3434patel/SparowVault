# PHASE_09 certification runner — sequential, stop on first red
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path (Join-Path $root "package.json"))) { $root = (Get-Location).Path }
Set-Location $root

$stampFile = "docs/company/audit/raw/PHASE_09_stamp.txt"
if (-not (Test-Path $stampFile)) {
  (Get-Date -Format "yyyyMMdd-HHmmss") | Set-Content $stampFile
}
$stamp = (Get-Content $stampFile -Raw).Trim()
$env:COMPANY_CERT_RUN = $stamp
$env:COMPANY_E2E_USER = if ($env:COMPANY_E2E_USER) { $env:COMPANY_E2E_USER } else { "cert_211549" }
$env:COMPANY_E2E_PIN = if ($env:COMPANY_E2E_PIN) { $env:COMPANY_E2E_PIN } else { "583921" }
$env:COMPANY_E2E_BASEURL = if ($env:COMPANY_E2E_BASEURL) { $env:COMPANY_E2E_BASEURL } else { "http://localhost:5173" }

$log = "docs/company/audit/raw/PHASE_09_certification_run.log"
New-Item -ItemType Directory -Force -Path "docs/company/audit/raw" | Out-Null

$startFrom = 1
if ($args.Count -ge 1) { [int]$startFrom = $args[0] }

if ($startFrom -eq 1) {
  "PHASE_09 CERTIFICATION RUN stamp=$stamp $(Get-Date -Format o)" | Set-Content $log -Encoding utf8
  Add-Content $log "USER=$($env:COMPANY_E2E_USER) BASEURL=$($env:COMPANY_E2E_BASEURL)"
} else {
  Add-Content $log "`nRESUME from step $startFrom $(Get-Date -Format o)"
}

function Run-Step {
  param([int]$Num, [string]$Name, [string]$OutFile, [string]$Cmd)
  if ($Num -lt $script:startFrom) {
    Write-Host "SKIP step $Num ($Name) — resume from $script:startFrom"
    return $true
  }
  $banner = "===== STEP ${Num}: ${Name} ====="
  Add-Content $log "`n$banner"
  Add-Content $log "START $(Get-Date -Format o)"
  Add-Content $log "CMD $Cmd"
  Write-Host $banner
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  cmd /c "$Cmd" > $OutFile 2>&1
  $code = $LASTEXITCODE
  $sw.Stop()
  Add-Content $log "END $(Get-Date -Format o) EXIT=$code elapsedMs=$($sw.ElapsedMilliseconds) raw=$OutFile"
  if ($code -ne 0) {
    Add-Content $log "STEP ${Num} FAIL"
    Write-Host "STEP ${Num} FAIL EXIT=$code"
    Get-Content $OutFile -Tail 40 | ForEach-Object { Write-Host $_ }
    return $false
  }
  Add-Content $log "STEP ${Num} PASS"
  $secs = [math]::Round($sw.ElapsedMilliseconds / 1000, 1)
  Write-Host ("STEP {0} PASS ({1} sec)" -f $Num, $secs)
  return $true
}

$steps = @(
  @{ n=1;  name="company:test";              out="docs/company/audit/raw/PHASE_09_01_vitest.txt";           cmd="npm run company:test" },
  @{ n=2;  name="company:test:php";          out="docs/company/audit/raw/PHASE_09_02_php.txt";              cmd="npm run company:test:php" },
  @{ n=3;  name="company:test:http";         out="docs/company/audit/raw/PHASE_09_03_http.txt";             cmd="npm run company:test:http" },
  @{ n=4;  name="company:test:idor";         out="docs/company/audit/raw/PHASE_09_04_idor.txt";             cmd="npm run company:test:idor" },
  @{ n=5;  name="security-matrix";           out="docs/company/audit/raw/PHASE_09_05_security.txt";         cmd="php scripts/company/security-matrix.php" },
  @{ n=6;  name="company:test:hydrate";      out="docs/company/audit/raw/PHASE_09_06_hydrate.txt";          cmd="npm run company:test:hydrate" },
  @{ n=7;  name="company:gate:all";          out="docs/company/audit/raw/PHASE_09_07_gate_all.txt";         cmd="npm run company:gate:all" },
  @{ n=8;  name="company:test:backup";       out="docs/company/audit/raw/PHASE_09_08_backup.txt";           cmd="npm run company:test:backup" },
  @{ n=9;  name="company:test:export:fidelity"; out="docs/company/audit/raw/PHASE_09_09_export_fidelity.txt"; cmd="npm run company:test:export:fidelity" },
  @{ n=10; name="company:test:latency";      out="docs/company/audit/raw/PHASE_09_10_latency.txt";          cmd="npm run company:test:latency" },
  @{ n=11; name="company:test:browser:auth"; out="docs/company/audit/raw/PHASE_09_11_browser_auth.txt";     cmd="npm run company:test:browser:auth" },
  @{ n=12; name="company:test:product:browser"; out="docs/company/audit/raw/PHASE_09_12_product_browser.txt"; cmd="npm run company:test:product:browser" },
  @{ n=13; name="viewport-matrix";           out="docs/company/audit/raw/PHASE_09_13_viewport.txt";         cmd="node scripts/company/viewport-matrix.mjs" },
  @{ n=14; name="a11y-keyboard";             out="docs/company/audit/raw/PHASE_09_14_a11y_keyboard.txt";    cmd="node scripts/company/a11y-keyboard.mjs" },
  @{ n=15; name="i18n-audit";                out="docs/company/audit/raw/PHASE_09_15_i18n_audit.txt";       cmd="node scripts/company/i18n-audit.mjs" },
  @{ n=16; name="perf-100k-matrix";          out="docs/company/audit/raw/PHASE_09_16_perf_100k.txt";        cmd="php scripts/company/perf-100k-matrix.php" },
  @{ n=17; name="finance:gate:all";          out="docs/company/audit/raw/PHASE_09_17_finance_gate.txt";     cmd="npm run finance:gate:all" },
  @{ n=18; name="company:certify:product";   out="docs/company/audit/raw/PHASE_09_18_certify_product.txt";  cmd="npm run company:certify:product" },
  @{ n=19; name="company:certify:final";     out="docs/company/audit/raw/PHASE_09_19_certify_final.txt";    cmd="npm run company:certify:final" }
)

foreach ($s in $steps) {
  $ok = Run-Step -Num $s.n -Name $s.name -OutFile $s.out -Cmd $s.cmd
  if (-not $ok) {
    Add-Content $log "HALT at step $($s.n) — fix red before continuing"
    exit $s.n
  }
}

Add-Content $log "`nPHASE_09 OVERALL: PASS $(Get-Date -Format o)"
Write-Host "PHASE_09 OVERALL: PASS"
exit 0
