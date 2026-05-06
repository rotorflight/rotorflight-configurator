$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

Require-Command "node.exe"
Require-Command "npm.cmd"

$nodeVersion = & node.exe -v
$nodeMajor = [int](($nodeVersion -replace "^v", "").Split(".")[0])
if ($nodeMajor -lt 24) {
    throw "Node.js 24+ is required. Found $nodeVersion"
}

if (-not (Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm globally via npm.cmd..."
    & npm.cmd install -g pnpm
}

$publicImagesPath = Join-Path $repoRoot "public\images"
$srcImagesPath = Join-Path $repoRoot "src\images"

if (Test-Path $publicImagesPath) {
    $item = Get-Item $publicImagesPath -Force
    if (-not $item.PSIsContainer -or -not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        Remove-Item $publicImagesPath -Recurse -Force
    }
}

if (-not (Test-Path $publicImagesPath)) {
    cmd /c "mklink /J `"$publicImagesPath`" `"$srcImagesPath`"" | Out-Null
}

Write-Host "Installing dependencies..."
& pnpm.cmd install --frozen-lockfile

Write-Host "Preparing Font Awesome assets..."
New-Item -ItemType Directory -Force -Path "public/fontawesome/css" | Out-Null
New-Item -ItemType Directory -Force -Path "public/fontawesome/webfonts" | Out-Null
Copy-Item -Force "node_modules/@fortawesome/fontawesome-free/css/all.min.css" "public/fontawesome/css/"
Copy-Item -Force "node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid*" "public/fontawesome/webfonts/"

Write-Host "Setup complete."
