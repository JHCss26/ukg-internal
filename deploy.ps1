param(
  [string]$ServiceName = "UKGInternalApi",
  [string]$RepoDir     = "C:\sites\ukg-internal",
  # Point this to IIS URL if you’re testing via reverse proxy, e.g. https://server/api/v1/status
  [string]$HealthUrl   = "http://localhost:9090/api/v1/status",
  [int]$HealthRetries  = 10,     # 10 x 3s = 30s max
  [int]$HealthDelaySec = 3
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$distPath  = Join-Path $RepoDir "dist"
$backupDir = Join-Path $RepoDir "backup\dist_$timestamp"
$logFile   = Join-Path $RepoDir ("logs\deploy_{0}.log" -f $timestamp)

# --- helper ---
function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
  Write-Host $line
  Add-Content -Path $logFile -Value $line
}

New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null
Log "Deploy start. Service=$ServiceName RepoDir=$RepoDir HealthUrl=$HealthUrl"

try {
  Log "Stopping service..."
  Stop-Service $ServiceName -ErrorAction SilentlyContinue

  if (Test-Path $distPath) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Log "Backing up dist -> $backupDir"
    robocopy $distPath $backupDir /E | Out-Null
  } else {
    Log "No existing dist to back up."
  }

  Push-Location $RepoDir
  Log "Fetching latest source..."
  git fetch --all --prune
  Log "Pulling..."
  git pull --rebase
  Log "Installing deps (npm ci)..."
  npm ci --no-fund --no-audit
  Log "Building..."
  npm run build
  Pop-Location

  Log "Starting service..."
  Start-Service $ServiceName
  Start-Sleep -Seconds 2

  # Health check with retries
  $ok = $false
  for ($i=1; $i -le $HealthRetries; $i++) {
    try {
      Log "Health check attempt $i/$HealthRetries -> $HealthUrl"
      $res = Invoke-WebRequest $HealthUrl -UseBasicParsing -TimeoutSec 10
      if ($res.StatusCode -eq 200) { $ok = $true; break }
      Log "Health returned HTTP $($res.StatusCode)"
    } catch {
      Log "Health exception: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds $HealthDelaySec
  }

  if (-not $ok) {
    throw "Healthcheck failed after $HealthRetries attempts."
  }

  Log "✅ Deploy OK."
  exit 0
}
catch {
  Log "❌ Deploy FAILED: $($_.Exception.Message)"
  Log "Attempting rollback..."

  try {
    Stop-Service $ServiceName -ErrorAction SilentlyContinue
    if (Test-Path $backupDir) {
      if (Test-Path $distPath) {
        Log "Clearing broken dist..."
        Remove-Item -Recurse -Force "$distPath\*" -ErrorAction SilentlyContinue
      } else {
        New-Item -ItemType Directory -Force -Path $distPath | Out-Null
      }
      Log "Restoring dist from $backupDir"
      robocopy $backupDir $distPath /E | Out-Null
    } else {
      Log "No backup folder present; rollback skipped."
    }

    Log "Starting service after rollback..."
    Start-Service $ServiceName
  } catch {
    Log "Rollback error: $($_.Exception.Message)"
  }

  exit 1
}
finally {
  Log "Deploy finished."
}
