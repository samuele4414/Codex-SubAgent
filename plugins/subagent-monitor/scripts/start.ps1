[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$health = 'http://127.0.0.1:43119/api/health'
try { Invoke-WebRequest -UseBasicParsing -Uri $health -TimeoutSec 1 | Out-Null }
catch {
    $node = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $node -ArgumentList (Join-Path $PSScriptRoot 'server.mjs') -WorkingDirectory $root -WindowStyle Hidden
    Start-Sleep -Milliseconds 350
}
Write-Output 'http://127.0.0.1:43119/'
