[CmdletBinding()]
param(
  [string]$InstallDir = '',
  [int]$WaitSeconds = 20,
  [switch]$AllowInsideDsh
)

$ErrorActionPreference = 'Stop'

function Resolve-InstallDir([string]$Requested) {
  if (-not [string]::IsNullOrWhiteSpace($Requested)) {
    return (Resolve-Path -LiteralPath $Requested -ErrorAction Stop).Path.TrimEnd('\')
  }
  $proc = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $proc -and $proc.Path) {
    return (Split-Path -Parent $proc.Path).TrimEnd('\')
  }
  $candidates = @($env:DSH_DESKTOP_DIR, 'D:\dsh')
  if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness') }
  $candidates += 'C:\Program Files\DeepSeek Harness'
  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    if (Test-Path -LiteralPath (Join-Path $candidate 'DeepSeek Harness.exe')) {
      return $candidate.TrimEnd('\')
    }
  }
  throw 'Could not locate DeepSeek Harness. Pass -InstallDir "D:\path\to\app".'
}

$InstallDir = Resolve-InstallDir $InstallDir
$exe = Join-Path $InstallDir 'DeepSeek Harness.exe'
$resources = Join-Path $InstallDir 'resources'
$asar = Join-Path $resources 'app.asar'
$stock = Join-Path $resources 'app.asar.liquid-glass-stock'
$appDir = Join-Path $resources 'app'
$logPath = Join-Path $resources 'liquid-glass-apply.log'

function Write-Log([string]$Message) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  try {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $logPath) | Out-Null
    Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
  } catch { }
  Write-Host $line
}

function Test-InsideDsh {
  try {
    $id = $PID
    for ($i = 0; $i -lt 7; $i++) {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction Stop
      if ($null -eq $proc) { return $false }
      if ($proc.Name -match 'DeepSeek Harness') { return $true }
      $id = [int]$proc.ParentProcessId
      if ($id -le 0) { return $false }
    }
  } catch { return $false }
  return $false
}

if (-not (Test-Path -LiteralPath $exe)) {
  throw "DeepSeek Harness.exe not found: $exe"
}
if ((Test-InsideDsh) -and -not $AllowInsideDsh) {
  Write-Host ''
  Write-Host 'This process is running under DeepSeek Harness. It would be killed together with the app.' -ForegroundColor Yellow
  Write-Host 'Run revert.cmd from Explorer or an external terminal instead (double-click revert.cmd).' -ForegroundColor Yellow
  exit 2
}

Write-Log '=== liquid-glass revert requested ==='
if ($WaitSeconds -gt 0) {
  Write-Log "waiting $WaitSeconds second(s) before closing the app"
  Start-Sleep -Seconds $WaitSeconds
}

Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
Remove-Item Env:ELECTRON_NO_ATTACH_CONSOLE -ErrorAction SilentlyContinue

$restored = $false
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
  Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | ForEach-Object {
    try { $_.Kill() } catch { }
  }

  if (Test-Path -LiteralPath $asar) {
    $restored = $true
    break
  }
  if (Test-Path -LiteralPath $stock) {
    try {
      Move-Item -LiteralPath $stock -Destination $asar -ErrorAction Stop
      Write-Log 'restored app.asar from app.asar.liquid-glass-stock'
      $restored = $true
      break
    } catch { }
  }
  Start-Sleep -Milliseconds 100
}

if (-not $restored) {
  Write-Log 'ERROR: neither app.asar nor app.asar.liquid-glass-stock is available'
  exit 1
}

if (Test-Path -LiteralPath $appDir) {
  $target = "$appDir.liquid-glass-unpacked-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  $moved = $false
  for ($i = 0; $i -lt 20; $i++) {
    try {
      Move-Item -LiteralPath $appDir -Destination $target -ErrorAction Stop
      Write-Log "moved resources\\app -> $target"
      $moved = $true
      break
    } catch {
      Start-Sleep -Milliseconds 250
    }
  }
  if (-not $moved) {
    Write-Log 'WARNING: could not move resources\\app; the stock asar will still be loaded because app.asar exists'
  }
}

Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | ForEach-Object {
  try { $_.Kill() } catch { }
}
Start-Sleep -Milliseconds 300

Write-Log 'starting the stock app'
$started = $false
try {
  Start-Process -FilePath $exe -WorkingDirectory $InstallDir | Out-Null
  $started = $true
} catch {
  Write-Log ("Start-Process failed: " + $_.Exception.Message)
}
if (-not $started) {
  try {
    & cmd.exe /c start "" "$exe"
    $started = $true
  } catch { }
}
if (-not $started) {
  Write-Log 'ERROR: could not start the app'
  exit 1
}
Write-Log 'revert complete'
exit 0
