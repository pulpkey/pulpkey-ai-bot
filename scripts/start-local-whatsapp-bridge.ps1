$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$node24 = 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe'

if (-not (Test-Path -LiteralPath $node24)) {
    throw "Node 24 was not found at the Codex runtime path. Install Node.js 24 LTS, then update `$node24 in this script."
}

$env:EVE_URL = 'http://127.0.0.1:3917'
$env:WHATSAPP_BRIDGE_SECRET = 'local-testing-only'
$env:AUTH_DIR = '.\\.local-auth'
$env:DATA_DIR = '.\\.local-data'
$env:ALLOW_ALL_GROUPS = 'true'
$env:TRIGGER_MODE = 'mention'
$env:PORT = '8091'

Set-Location (Join-Path $projectRoot 'bridge')
Write-Host 'Starting the local WhatsApp bridge. Scan the QR code in WhatsApp Business > Linked devices.' -ForegroundColor Cyan
& $node24 --import tsx index.ts
