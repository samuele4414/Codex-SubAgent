[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('started','completed','failed')][string]$Status,
    [Parameter(Mandatory)][string]$Role,
    [Parameter(Mandatory)][string]$Id,
    [string]$Task = '', [string]$Model = '', [string]$Reasoning = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$roles = Get-Content -LiteralPath (Join-Path $root 'roles.json') -Raw | ConvertFrom-Json
$configured = $roles.$Role
if (-not $Model) { $Model = $configured.model }
if (-not $Reasoning) { $Reasoning = $configured.reasoning }
if (-not $Model -or -not $Reasoning) { throw "Unknown role '$Role'. Pass -Model and -Reasoning explicitly." }
$event = [ordered]@{ id = $Id; role = $Role; model = $Model; reasoning = $Reasoning; status = $Status }
if ($Task) { $event.task = $Task }
if ($Status -eq 'started') { $event.startedAt = (Get-Date).ToUniversalTime().ToString('o') }
else { $event.finishedAt = (Get-Date).ToUniversalTime().ToString('o') }
$json = $event | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:43119/api/events' -ContentType 'application/json' -Body $json | Out-Null
