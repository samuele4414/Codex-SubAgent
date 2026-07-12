[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' })
)

$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$agentsSource = Join-Path $source 'agents'
$agentsTarget = Join-Path $CodexHome 'agents'
$routingTarget = Join-Path $CodexHome 'ChatSubAgent.ROUTING.md'
$agentsFile = Join-Path $CodexHome 'AGENTS.md'
$begin = '<!-- ChatSubAgent:begin -->'
$end = '<!-- ChatSubAgent:end -->'
$managedBlock = "$begin`n@$(($routingTarget -replace '\\', '/'))`n$end"

function Backup-File([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        Copy-Item -LiteralPath $Path -Destination "$Path.$stamp.bak"
    }
}

if ($PSCmdlet.ShouldProcess($CodexHome, 'Install ChatSubAgent roles and routing rules')) {
    New-Item -ItemType Directory -Force -Path $agentsTarget | Out-Null
    Get-ChildItem -LiteralPath $agentsSource -Filter '*.toml' | ForEach-Object {
        $destination = Join-Path $agentsTarget $_.Name
        Backup-File $destination
        Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
    }

    Backup-File $routingTarget
    Copy-Item -LiteralPath (Join-Path $source 'rules/ROUTING.md') -Destination $routingTarget -Force

    $existing = if (Test-Path -LiteralPath $agentsFile) { Get-Content -LiteralPath $agentsFile -Raw } else { '' }
    $pattern = '(?s)\r?\n?<!-- ChatSubAgent:begin -->.*?<!-- ChatSubAgent:end -->'
    $updated = [regex]::Replace($existing, $pattern, '').TrimEnd()
    if ($updated) { $updated += "`n`n" }
    $updated += "$managedBlock`n"
    Backup-File $agentsFile
    Set-Content -LiteralPath $agentsFile -Value $updated -NoNewline
    Write-Host "ChatSubAgent installed in $CodexHome"
} else {
    Write-Host "ChatSubAgent installation simulated for $CodexHome"
}
