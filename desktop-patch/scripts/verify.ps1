[CmdletBinding()]
param(
  [string]$InstallDir = ''
)

$ErrorActionPreference = 'Continue'

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

try { $InstallDir = Resolve-InstallDir $InstallDir } catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 2
}
$exe = Join-Path $InstallDir 'DeepSeek Harness.exe'
$resources = Join-Path $InstallDir 'resources'
$asar = Join-Path $resources 'app.asar'
$stock = Join-Path $resources 'app.asar.liquid-glass-stock'
$appDir = Join-Path $resources 'app'
$metaPath = Join-Path $appDir '.liquid-glass-patch.json'
$mainPath = Join-Path $appDir 'lib\main.js'
$preloadPath = Join-Path $appDir 'lib\preload-app.cjs'
$logPath = Join-Path $resources 'liquid-glass-apply.log'
$profilePlugin = $null
$profilesDir = Join-Path $env:USERPROFILE '.dsh\profiles'
if (Test-Path -LiteralPath $profilesDir) {
  $profilePlugin = Get-ChildItem -LiteralPath $profilesDir -Directory -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName 'node_modules\@local\liquid-glass\package.json' } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  installDir = $InstallDir
  checks = [ordered]@{}
  ok = $true
}

function Check([string]$Name, [bool]$Pass, [string]$Detail) {
  $script:report.checks[$Name] = [ordered]@{ pass = $Pass; detail = $Detail }
  if (-not $Pass) { $script:report.ok = $false }
  $color = if ($Pass) { 'Green' } else { 'Red' }
  Write-Host ("[{0}] {1}: {2}" -f ($(if ($Pass) { 'PASS' } else { 'FAIL' })), $Name, $Detail) -ForegroundColor $color
}

Check 'exe' (Test-Path -LiteralPath $exe) $exe
Check 'app.asar absent' (-not (Test-Path -LiteralPath $asar)) $asar
Check 'stock backup present' (Test-Path -LiteralPath $stock) $stock
Check 'resources\app present' (Test-Path -LiteralPath $appDir) $appDir
Check 'patch metadata present' (Test-Path -LiteralPath $metaPath) $metaPath
Check 'lib\main.js present' (Test-Path -LiteralPath $mainPath) $mainPath
Check 'lib\preload-app.cjs present' (Test-Path -LiteralPath $preloadPath) $preloadPath
Check 'runtime dsh dir present' (Test-Path -LiteralPath (Join-Path $appDir 'dsh')) (Join-Path $appDir 'dsh')
$pluginPresent = $false
if (-not [string]::IsNullOrWhiteSpace($profilePlugin)) { $pluginPresent = Test-Path -LiteralPath $profilePlugin }
Check 'plugin installed' $pluginPresent ([string]$profilePlugin)

if (Test-Path -LiteralPath $metaPath) {
  try {
    $meta = Get-Content -LiteralPath $metaPath -Raw -Encoding UTF8 | ConvertFrom-Json
    Check 'metadata patch' ($meta.patch -eq 'liquid-glass-b') ([string]$meta.patch)
    Check 'metadata version' ($meta.source.version -eq '0.2.2-rc.1') ([string]$meta.source.version)
    if (Test-Path -LiteralPath $mainPath) {
      $mainHash = (Get-FileHash -LiteralPath $mainPath -Algorithm SHA256).Hash.ToLowerInvariant()
      $expectedMain = ([string]$meta.expected.'lib/main.js').ToLowerInvariant()
      Check 'main.js hash' ($mainHash -eq $expectedMain) $mainHash
    }
    if (Test-Path -LiteralPath $preloadPath) {
      $preloadHash = (Get-FileHash -LiteralPath $preloadPath -Algorithm SHA256).Hash.ToLowerInvariant()
      $expectedPreload = ([string]$meta.expected.'lib/preload-app.cjs').ToLowerInvariant()
      Check 'preload hash' ($preloadHash -eq $expectedPreload) $preloadHash
    }
    if (Test-Path -LiteralPath $stock) {
      $stockHash = (Get-FileHash -LiteralPath $stock -Algorithm SHA256).Hash.ToLowerInvariant()
      $expectedStock = ([string]$meta.source.sha256).ToLowerInvariant()
      Check 'stock asar hash' ($stockHash -eq $expectedStock) $stockHash
    }
  } catch {
    Check 'metadata readable' $false $_.Exception.Message
  }
}

if (Test-Path -LiteralPath $mainPath) {
  $main = Get-Content -LiteralPath $mainPath -Raw
  Check 'main.js IPC marker' ($main.Contains('dsh-desktop:window-material')) 'window-material IPC'
  Check 'main.js acrylic marker' ($main.Contains('backgroundMaterial: "acrylic"')) 'backgroundMaterial acrylic'
  Check 'main.js material state' ($main.Contains('mainWindowMaterial')) 'mainWindowMaterial'
  Check 'main.js transparent overlay' ($main.Contains('color: "#00000000"')) 'transparent titlebar overlay'
}
if (Test-Path -LiteralPath $preloadPath) {
  $preload = Get-Content -LiteralPath $preloadPath -Raw
  Check 'preload window API' ($preload.Contains('dsh-desktop:window-material')) 'getMaterial/setMaterial'
}

if ($pluginPresent) {
  try {
    $pkg = Get-Content -LiteralPath $profilePlugin -Raw -Encoding UTF8 | ConvertFrom-Json
    Check 'plugin name' ($pkg.name -eq '@local/liquid-glass') ([string]$pkg.name)
    Check 'plugin version' ([bool]$pkg.version) ([string]$pkg.version)
    Check 'plugin client entry' (Test-Path -LiteralPath (Join-Path (Split-Path -Parent $profilePlugin) 'client.js')) 'client.js'
  } catch {
    Check 'plugin package readable' $false $_.Exception.Message
  }
}

$running = Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue
Check 'app running' ($null -ne $running) (($running | Select-Object -ExpandProperty Id) -join ', ')
if ($running) {
  $paths = $running | Select-Object -ExpandProperty Path -Unique
  Check 'app exe path' (($paths | Where-Object { $_ -and ($_ -ieq $exe) }).Count -gt 0) (($paths) -join '; ')
}

if (Test-Path -LiteralPath $logPath) {
  Write-Host ''
  Write-Host '--- apply log tail ---' -ForegroundColor DarkGray
  Get-Content -LiteralPath $logPath -Tail 20 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
}

Write-Host ''
Write-Host ("RESULT: " + $(if ($report.ok) { 'OK' } else { 'NOT READY' })) -ForegroundColor $(if ($report.ok) { 'Green' } else { 'Red' })
$report | ConvertTo-Json -Depth 6
if (-not $report.ok) { exit 1 }
exit 0
