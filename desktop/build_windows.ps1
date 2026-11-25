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
Invoke-Step "Programm packen" {
    & $Python -m PyInstaller --noconfirm --clean `
        --distpath build\desktop --workpath build\pyinstaller `
        desktop\failover_routing_visualizer.spec
}
$Exe = Join-Path (Get-Location) "build\desktop\FailoverRoutingVisualizer.exe"
Invoke-Step "Selbsttest des gepackten Programms" {
    $Result = Join-Path (Get-Location) "build\desktop\selbsttest.json"
    $Process = Start-Process -FilePath $Exe -ArgumentList "--smoke-test", "--result-file", "`"$Result`"" -Wait -PassThru
    Get-Content $Result
    $global:LASTEXITCODE = $Process.ExitCode
}
Write-Host "Fertig: $Exe"
