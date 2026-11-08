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
$metaPath = Join-Path $appDir '.liquid-glass-patch.json'
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
if (-not (Test-Path -LiteralPath $metaPath)) {
  throw "Patched app not prepared: $metaPath is missing. Run extract-and-patch.mjs first."
}
if (-not (Test-Path -LiteralPath $appDir)) {
  throw "Patched app directory missing: $appDir"
}

if ((Test-InsideDsh) -and -not $AllowInsideDsh) {
  Write-Host ''
  Write-Host 'This process is running under DeepSeek Harness. It would be killed together with the app.' -ForegroundColor Yellow
  Write-Host 'Run apply.cmd from Explorer or an external terminal instead (double-click apply.cmd).' -ForegroundColor Yellow
  exit 2
}

Write-Log '=== liquid-glass apply requested ==='
Write-Log "exe: $exe"
Write-Log "app: $appDir"
Write-Log "stock: $stock"
if ($WaitSeconds -gt 0) {
  Write-Log "waiting $WaitSeconds second(s) before closing the app"
  Start-Sleep -Seconds $WaitSeconds
}

# Clear variables that would make the Electron exe behave like plain Node.
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
Remove-Item Env:ELECTRON_NO_ATTACH_CONSOLE -ErrorAction SilentlyContinue

$renamed = $false
$alreadyApplied = (-not (Test-Path -LiteralPath $asar)) -and (Test-Path -LiteralPath $stock)

if ($alreadyApplied) {
  Write-Log 'app.asar is already absent and the stock backup exists; no rename needed'
  $renamed = $true
} else {
  if ((Test-Path -LiteralPath $asar) -and (Test-Path -LiteralPath $stock)) {
    $previous = "$stock.previous-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Log "an older stock backup exists; keeping it as $previous"
    Move-Item -LiteralPath $stock -Destination $previous -Force
  }

  Write-Log 'force-closing DeepSeek Harness and renaming app.asar in a tight loop'
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | ForEach-Object {
      try { $_.Kill() } catch { }
    }
    if (Test-Path -LiteralPath $asar) {
      try {
        Move-Item -LiteralPath $asar -Destination $stock -ErrorAction Stop
        Write-Log 'renamed app.asar -> app.asar.liquid-glass-stock'
        $renamed = $true
        break
      } catch { }
    } elseif (Test-Path -LiteralPath $stock) {
      Write-Log 'another process already completed the rename'
      $renamed = $true
      break
    }
    Start-Sleep -Milliseconds 100
  }
}

if (-not $renamed) {
  Write-Log 'ERROR: could not rename app.asar while the app is running; starting the stock app'
  try { Start-Process -FilePath $exe -WorkingDirectory $InstallDir | Out-Null } catch { }
  exit 1
}

# Make sure an auto-restarted process is gone; after the rename any new process
# loads resources\app, so a stray one is harmless but we want one clean window.
Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | ForEach-Object {
  try { $_.Kill() } catch { }
}
Start-Sleep -Milliseconds 300

Write-Log 'starting the patched app from resources\app'
$started = $null
try {
  $started = Start-Process -FilePath $exe -WorkingDirectory $InstallDir -PassThru
} catch {
  Write-Log ("Start-Process failed: " + $_.Exception.Message)
}
if ($null -eq $started) {
  try {
    & cmd.exe /c start "" "$exe"
    $started = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | Select-Object -First 1
  } catch { }
}

if ($null -eq $started) {
  Write-Log 'ERROR: could not start the app'
  exit 1
}

# Safety net: if the patched app dies immediately, restore stock automatically
# instead of leaving the user with no working window.
Start-Sleep -Seconds 15
$alive = $false
try { $alive = -not $started.HasExited } catch { $alive = $false }
if (-not $alive) {
  Write-Log 'patched app exited during startup; rolling back to stock'
  Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | ForEach-Object {
    try { $_.Kill() } catch { }
  }
  Start-Sleep -Milliseconds 300
  if (Test-Path -LiteralPath $stock) {
    try {
      Move-Item -LiteralPath $stock -Destination $asar -Force -ErrorAction Stop
      Write-Log 'auto-rollback restored app.asar'
    } catch {
      Write-Log ('auto-rollback could not restore app.asar: ' + $_.Exception.Message)
    }
  }
  if (Test-Path -LiteralPath $appDir) {
    $failed = "$appDir.liquid-glass-failed-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    try {
      Move-Item -LiteralPath $appDir -Destination $failed -ErrorAction Stop
      Write-Log "auto-rollback moved resources\\app -> $failed"
    } catch { }
  }
  try { Start-Process -FilePath $exe -WorkingDirectory $InstallDir | Out-Null } catch { }
  Write-Log 'auto-rollback complete; stock app started'
  exit 1
}

# Record which bundle the live renderer/host actually loaded.
try {
  $hostProc = Get-CimInstance Win32_Process -Filter "Name='DeepSeek Harness.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*dsh-desktop-host*' } | Select-Object -First 1
  if ($null -ne $hostProc) {
    if ($hostProc.CommandLine -match 'resources\\app\\dsh') {
      Write-Log 'verified: host runtime loaded from resources\\app\\dsh'
    } elseif ($hostProc.CommandLine -match 'resources\\app\.asar') {
      Write-Log 'WARNING: host runtime still loaded from resources\\app.asar'
    } else {
      Write-Log ('host runtime command line: ' + $hostProc.CommandLine)
    }
  }
  $renderer = Get-CimInstance Win32_Process -Filter "Name='DeepSeek Harness.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*--type=renderer*' -and $_.CommandLine -like '*--app-path=*' } | Select-Object -First 1
  if ($null -ne $renderer) {
    Write-Log ('renderer command line: ' + $renderer.CommandLine)
  }
} catch { }
try { schtasks.exe /Delete /TN "DSH-LiquidGlass-Apply" /F 2>$null | Out-Null } catch { }
Write-Log 'apply complete'
exit 0
