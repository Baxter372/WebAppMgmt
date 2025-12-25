# Finance Companion Tool - Full Backup Script
# This script backs up both source code and provides instructions for data backup

param(
    [string]$BackupPath = "$env:USERPROFILE\Documents\FinanceCompanionBackups"
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFolder = Join-Path $BackupPath "backup-$timestamp"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Finance Companion Tool - Full Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory
if (!(Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
}

$sourceCodeFolder = Join-Path $backupFolder "source-code"
New-Item -ItemType Directory -Path $sourceCodeFolder -Force | Out-Null

Write-Host "Backup Location: $backupFolder" -ForegroundColor Yellow
Write-Host ""

# Get the script's directory (where the WAMS project is)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/4] Backing up source code files..." -ForegroundColor Green

# List of source files to backup
$sourceFiles = @(
    "src\App.tsx",
    "src\App.css",
    "src\main.tsx",
    "src\index.css",
    "src\LandingPage.tsx",
    "src\LandingPage.css",
    "src\vite-env.d.ts",
    "index.html",
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json"
)

# Create src folder in backup
$srcBackup = Join-Path $sourceCodeFolder "src"
New-Item -ItemType Directory -Path $srcBackup -Force | Out-Null

foreach ($file in $sourceFiles) {
    $sourcePath = Join-Path $scriptDir $file
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $sourceCodeFolder $file
        $destDir = Split-Path -Parent $destPath
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $sourcePath $destPath -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ $file (not found)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "[2/4] Backing up public assets..." -ForegroundColor Green

$publicFolder = Join-Path $scriptDir "public"
$publicBackup = Join-Path $sourceCodeFolder "public"
if (Test-Path $publicFolder) {
    Copy-Item $publicFolder $publicBackup -Recurse -Force
    $assetCount = (Get-ChildItem $publicBackup -Recurse -File).Count
    Write-Host "  ✓ $assetCount files copied from public folder" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[3/4] Backing up GitHub workflows..." -ForegroundColor Green

$githubFolder = Join-Path $scriptDir ".github"
$githubBackup = Join-Path $sourceCodeFolder ".github"
if (Test-Path $githubFolder) {
    Copy-Item $githubFolder $githubBackup -Recurse -Force
    Write-Host "  ✓ .github folder copied" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4/4] Creating backup info file..." -ForegroundColor Green

$backupInfo = @"
Finance Companion Tool Backup
=============================
Backup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Backup Type: Source Code
Source Path: $scriptDir

Contents:
- source-code/src/ - React source files
- source-code/public/ - Static assets
- source-code/.github/ - GitHub Actions workflows
- source-code/*.json - Configuration files
- source-code/*.html - HTML templates
- source-code/*.ts - TypeScript config

To restore:
1. Copy contents of source-code folder to your project directory
2. Run: npm install
3. Run: npm run dev

For DATA backup:
1. Open the app in your browser
2. Click the 💾 (Backup) button in the top right
3. Save the JSON file to this backup folder

GitHub Repository: https://github.com/Baxter372/WebAppMgmt
"@

$backupInfo | Out-File (Join-Path $backupFolder "BACKUP-INFO.txt") -Encoding UTF8
Write-Host "  ✓ Backup info file created" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Source code backed up to:" -ForegroundColor Yellow
Write-Host "  $backupFolder" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: To backup your DATA (tiles, settings, etc.):" -ForegroundColor Magenta
Write-Host "  1. Open the app in your browser" -ForegroundColor White
Write-Host "  2. Click the 💾 (Backup) button" -ForegroundColor White
Write-Host "  3. Save the JSON file to: $backupFolder" -ForegroundColor White
Write-Host ""

# Open backup folder in Explorer
Start-Process explorer.exe $backupFolder

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

