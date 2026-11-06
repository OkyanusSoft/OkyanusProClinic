[CmdletBinding()]
param(
  [string]$Message = "System updates",
  [int]$Threshold = 5,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$status = @(git status --porcelain)
$changedCount = $status.Count

if ($changedCount -eq 0) {
  Write-Host "No updates to publish." -ForegroundColor Green
  exit 0
}

Write-Host "Current updates: $changedCount file(s)" -ForegroundColor Cyan
git status --short

if (-not $Force -and $changedCount -lt $Threshold) {
  Write-Host "Updates are below the alert threshold ($Threshold). Use -Force when needed." -ForegroundColor Yellow
  exit 0
}

if (-not $Force) {
  $answer = Read-Host "Many updates found. Review and publish them to GitHub? (y/N)"
  if ($answer -notmatch "^(y|yes)$") {
    Write-Host "Publish cancelled without changing files." -ForegroundColor Yellow
    exit 0
  }
}

Write-Host "Running TypeScript check..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed; publish stopped." }

Write-Host "Running production build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Production build failed; publish stopped." }

$branch = (git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) { throw "Could not determine the current Git branch." }

Write-Host "Change summary:" -ForegroundColor Cyan
git diff --stat

$confirm = Read-Host "Create commit '$Message' and push '$branch' to origin? Type PUSH to confirm"
if ($confirm -ne "PUSH") {
  Write-Host "Publish cancelled before commit." -ForegroundColor Yellow
  exit 0
}

git add -A
git commit -m $Message
git push origin $branch

if ($LASTEXITCODE -ne 0) { throw "GitHub push failed." }
Write-Host "Updates published successfully to origin/$branch." -ForegroundColor Green
