$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "[build] Installing PyInstaller into venv..."
& .\.venv312\Scripts\pip install pyinstaller --quiet

Write-Host "[build] Bundling server into single executable..."
& .\.venv312\Scripts\pyinstaller server.spec --noconfirm

Write-Host "[build] Server exe ready at dist\server.exe"
