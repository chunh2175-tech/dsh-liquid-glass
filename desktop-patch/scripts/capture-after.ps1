param(
  [string]$InstallDir = '',
  [int]$DelaySeconds = 90,
  [string]$OutDir = ''
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
  Write-Output $_.Exception.Message
  exit 2
}
if ([string]::IsNullOrWhiteSpace($OutDir)) { $OutDir = Join-Path $InstallDir 'resources' }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Start-Sleep -Seconds $DelaySeconds
try {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $target = Join-Path $OutDir 'liquid-glass-after.png'
  $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  Write-Output "captured $target"
} catch {
  Write-Output ("capture failed: " + $_.Exception.Message)
}
try {
  $verify = Join-Path $PSScriptRoot 'verify.ps1'
  $log = Join-Path $OutDir 'liquid-glass-verify.log'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verify -InstallDir $InstallDir *> $log
  Write-Output "verify written to $log"
} catch {
  Write-Output ("verify failed: " + $_.Exception.Message)
}
try { schtasks.exe /Delete /TN "DSH-LiquidGlass-Capture" /F 2>$null | Out-Null } catch { }
