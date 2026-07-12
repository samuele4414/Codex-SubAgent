[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$CodexHome = $(if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' })
)

$ErrorActionPreference = 'Stop'
$agentsFile = Join-Path $CodexHome 'AGENTS.md'
$begin = '<!-- ChatSubAgent:begin -->'
$end = '<!-- ChatSubAgent:end -->'

if ($PSCmdlet.ShouldProcess($CodexHome, 'Remove ChatSubAgent roles and routing rules')) {
    foreach ($name in 'scout.toml', 'builder.toml', 'reviewer.toml', 'publisher.toml') {
        Remove-Item -LiteralPath (Join-Path $CodexHome "agents/$name") -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath (Join-Path $CodexHome 'ChatSubAgent.ROUTING.md') -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $agentsFile) {
        $existing = Get-Content -LiteralPath $agentsFile -Raw
        $pattern = '(?s)\r?\n?<!-- ChatSubAgent:begin -->.*?<!-- ChatSubAgent:end -->\r?\n?'
        $updated = [regex]::Replace($existing, $pattern, '')
        Set-Content -LiteralPath $agentsFile -Value $updated -NoNewline
    }
    Write-Host "ChatSubAgent removed from $CodexHome"
} else {
    Write-Host "ChatSubAgent removal simulated for $CodexHome"
}
