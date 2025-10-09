param(
  [string]$ServiceName = "UKGInternalApi",
  [string]$RepoDir     = "C:\sites\ukg-internal",
  [string]$Branch      = "main",
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

function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
  Write-Host $line
  Add-Content -Path $logFile -Value $line
}

New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null
Log "Deploy start. Service=$ServiceName RepoDir=$RepoDir Branch=$Branch HealthUrl=$HealthUrl"

try {
  Push-Location $RepoDir

  # --- Check for updates first (do NOT stop service yet) ---
  Log "Fetching latest refs..."
  git fetch origin $Branch --prune
  $localSha  = (git rev-parse $Branch) 2>$null
  $remoteSha = (git rev-parse origin/$Branch) 2>$null
  Log "Local:  $localSha"
  Log "Remote: $remoteSha"

  if (-not $remoteSha) {
    throw "Cannot read origin/$Branch. Check remote connectivity/permissions."
  }

  if ($localSha -and ($localSha -eq $remoteSha)) {
    Log "No changes on origin/$Branch. Skipping deploy."
    exit 0
  }

  # --- Changes exist -> proceed with deploy ---
  Log "Changes detected. Proceeding with deploy."

  # Create backup BEFORE modifying working tree
  if (Test-Path $distPath) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Log "Backing up dist -> $backupDir"
    robocopy $distPath $backupDir /E | Out-Null
  } else {
    Log "No existing dist to back up."
  }

  Log "Stopping service..."
  Stop-Service $ServiceName -ErrorAction SilentlyContinue

  Log "Rebasing to origin/$Branch..."
  # Ensure the local branch exists/tracks origin
  if (-not $localSha) {
    git checkout -B $Branch origin/$Branch
  } else {
    git checkout $Branch
    git rebase origin/$Branch
  }

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
      Log "Health check $i/$HealthRetries -> $HealthUrl"
      $res = Invoke-WebRequest $HealthUrl -UseBasicParsing -TimeoutSec 10
      if ($res.StatusCode -eq 200) { $ok = $true; break }
      Log "Health returned HTTP $($res.StatusCode)"
    } catch {
      Log "Health exception: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds $HealthDelaySec
  }
  if (-not $ok) { throw "Healthcheck failed after $HealthRetries attempts." }

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
