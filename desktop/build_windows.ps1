# Baut FailoverRoutingVisualizer.exe. Aufruf im Repository-Ordner:
#   powershell -ExecutionPolicy Bypass -File desktop\build_windows.ps1
# Voraussetzungen: Python 3.12 und Node.js 22 im PATH.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Invoke-Step([string]$Name, [scriptblock]$Command) {
    Write-Host "== $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Name ist fehlgeschlagen (Exit-Code $LASTEXITCODE)." }
}

Invoke-Step "Oberfläche bauen" { npm ci; if ($LASTEXITCODE -eq 0) { npm run build } }
Invoke-Step "Python-Umgebung anlegen" { python -m venv .venv-desktop }
$Python = Join-Path (Get-Location) ".venv-desktop\Scripts\python.exe"
Invoke-Step "Versionsvorgaben ableiten" { & $Python desktop\make_constraints.py }
Invoke-Step "Pakete installieren" {
    & $Python -m pip install --upgrade pip
    if ($LASTEXITCODE -eq 0) {
        & $Python -m pip install -r requirements-desktop.txt -c build\constraints-desktop.txt
    }
}
Invoke-Step "Installierte Paketversionen festhalten" {
    New-Item -ItemType Directory -Force -Path build\desktop | Out-Null
    & $Python -m pip freeze | Set-Content -Path build\desktop\paketversionen.txt -Encoding UTF8
}
Invoke-Step "Programm packen" {
    & $Python -m PyInstaller --noconfirm --clean `
        --distpath build\desktop --workpath build\pyinstaller `
        desktop\failover_routing_visualizer.spec
}
$Exe = Join-Path (Get-Location) "build\desktop\FailoverRoutingVisualizer.exe"
Invoke-Step "Selbsttest des gepackten Programms" {
    $Result = Join-Path (Get-Location) "build\desktop\selbsttest.json"
    Remove-Item $Result -ErrorAction SilentlyContinue
    $Process = Start-Process -FilePath $Exe -ArgumentList "--smoke-test", "--result-file", "`"$Result`"" -Wait -PassThru
    if (Test-Path $Result) {
        Get-Content $Result -Encoding UTF8
    } else {
        Write-Host "Der Selbsttest hat kein Ergebnis geschrieben."
    }
    $global:LASTEXITCODE = $Process.ExitCode
}
$Hash = (Get-FileHash -Algorithm SHA256 $Exe).Hash
"$Hash  FailoverRoutingVisualizer.exe" | Set-Content -Path build\desktop\FailoverRoutingVisualizer.exe.sha256 -Encoding ASCII
Write-Host "Fertig: $Exe"
Write-Host "SHA-256: $Hash"
