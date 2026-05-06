param(
    [switch]$ResetNwCache
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

if (-not (Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue)) {
    throw "pnpm.cmd was not found. Run tools/windows/setup-dev.ps1 first."
}

if ($ResetNwCache) {
    $cachePath = Join-Path $repoRoot "nwjs_cache"
    if (Test-Path $cachePath) {
        Write-Host "Removing nwjs_cache..."
        Remove-Item -Recurse -Force $cachePath
    }
}

Write-Host "Starting dev stack..."
& pnpm.cmd start
