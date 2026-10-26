param([ValidateSet('start','status','stop')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path 'supabase/.temp/project-ref') { throw 'Este proyecto está vinculado a la nube. Se bloquea la operación.' }
if ((Get-Content 'supabase/config.toml' -Raw) -notmatch 'project_id = "uzta-local"') { throw 'Identidad local incorrecta.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker no está instalado o no está en PATH. No se ha iniciado ninguna base de datos.' }
$env:SUPABASE_HOME = Join-Path (Get-Location) '.local/supabase-cli'
$env:SUPABASE_TELEMETRY_DISABLED = '1'
$env:SUPABASE_NO_UPDATE_NOTIFIER = '1'
if ($Action -eq 'start') {
 docker info --format '{{.ServerVersion}}'
 if ($LASTEXITCODE -ne 0) { throw 'Docker no está disponible.' }
 docker network inspect uzta-local-network *> $null
 if ($LASTEXITCODE -ne 0) {
  docker network create -o 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' uzta-local-network
  if ($LASTEXITCODE -ne 0) { throw 'No se ha podido crear la red local.' }
 }
 & './node_modules/.bin/supabase.cmd' start --network-id uzta-local-network
} else { & './node_modules/.bin/supabase.cmd' $Action }
if ($LASTEXITCODE -ne 0) { throw 'La operación local de Supabase ha fallado.' }
