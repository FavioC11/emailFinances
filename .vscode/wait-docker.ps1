# Arranca Docker Desktop si esta cerrado y espera a que el daemon responda.
$exe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
    if (Test-Path $exe) {
        Start-Process $exe
    } else {
        Write-Host 'No encontre Docker Desktop.exe; abrelo manualmente.'
    }
}
Write-Host 'Esperando a que Docker arranque (puede tardar varios minutos en frio)...'
$n = 0
do {
    Start-Sleep -Seconds 3
    docker info *> $null
    $ok = ($LASTEXITCODE -eq 0)
    $n++
    if (-not $ok) { Write-Host "  ...aun arrancando ($($n*3)s)" }
} until ($ok -or $n -ge 100)
if ($ok) {
    Write-Host 'Docker listo.'
} else {
    Write-Host 'Docker no respondio a tiempo.'
    exit 1
}
