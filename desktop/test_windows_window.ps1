# Prüft das gepackte Programm unter Windows mit echtem Anwendungsfenster:
# Start per Programmdatei, Fenster vorhanden, Oberfläche geladen, API nur auf
# 127.0.0.1, Beenden über das Fenster, danach kein Prozess und kein Port mehr.
#   powershell -ExecutionPolicy Bypass -File desktop\test_windows_window.ps1
param(
    [string]$Exe = (Join-Path (Split-Path -Parent $PSScriptRoot) "build\desktop\FailoverRoutingVisualizer.exe"),
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) "build\desktop")
)
$ErrorActionPreference = "Stop"
$Name = [IO.Path]::GetFileNameWithoutExtension($Exe)
$UrlFile = Join-Path $OutputDirectory "url.txt"
$ResultFile = Join-Path $OutputDirectory "fenstertest.json"
Remove-Item $UrlFile, $ResultFile -ErrorAction SilentlyContinue
$Checks = [ordered]@{}
$Details = [ordered]@{}

function Wait-Until([scriptblock]$Condition, [int]$Seconds) {
    $Deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $Deadline) {
        if (& $Condition) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# Teil 1: Das Programm prüft seine Oberfläche im eigenen Fenster selbst
# (Seite geladen, Oberfläche gezeichnet, Topologie importiert und dargestellt)
# und schließt sich danach.
$UiResultFile = Join-Path $OutputDirectory "fenstertest-oberflaeche.json"
Remove-Item $UiResultFile -ErrorAction SilentlyContinue
$UiProcess = Start-Process -FilePath $Exe -ArgumentList "--window-test", "--result-file", "`"$UiResultFile`"" -PassThru
$UiExited = $UiProcess.WaitForExit(240000)
if (-not $UiExited) { Get-Process -Name $Name -ErrorAction SilentlyContinue | Stop-Process -Force }
$UiResult = if (Test-Path $UiResultFile) { Get-Content $UiResultFile -Raw | ConvertFrom-Json } else { $null }
$Checks["oberflaeche_im_fenster_geprueft"] = $UiExited -and ($null -ne $UiResult) -and [bool]$UiResult.passed
$Details["oberflaeche"] = $UiResult
$Checks["nach_fenstertest_kein_prozess"] = Wait-Until {
    @(Get-Process -Name $Name -ErrorAction SilentlyContinue).Count -eq 0
} 30

# Teil 2: normaler Start, Beenden über das Fenster.
$Started = Start-Process -FilePath $Exe -ArgumentList "--url-file", "`"$UrlFile`"" -PassThru
try {
    $Checks["startet_und_meldet_adresse"] = Wait-Until { Test-Path $UrlFile } 90
    $Url = if (Test-Path $UrlFile) { (Get-Content $UrlFile -Raw).Trim() } else { "" }
    $Details["url"] = $Url
    $Port = if ($Url) { ([Uri]$Url).Port } else { 0 }

    $Health = $null
    try { $Health = Invoke-RestMethod -Uri "${Url}api/health" -TimeoutSec 10 } catch {}
    $Checks["api_antwortet"] = ($Health.status -eq "ok")

    $Listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    $Details["lauschende_adressen"] = @($Listeners | ForEach-Object { $_.LocalAddress })
    $Checks["api_nur_auf_loopback"] = ($Listeners.Count -gt 0) -and
        (@($Listeners | Where-Object { $_.LocalAddress -ne "127.0.0.1" }).Count -eq 0)

    $Window = $null
    $Checks["anwendungsfenster_vorhanden"] = Wait-Until {
        $script:Window = Get-Process -Name $Name -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        $null -ne $script:Window
    } 90
    $Details["fenstertitel"] = if ($Window) { $Window.MainWindowTitle } else { "" }
    $Checks["fenstertitel_stimmt"] = ($Details["fenstertitel"] -eq "Failover Routing Visualizer")

    $Details["webview2_prozesse"] = @(Get-Process -Name "msedgewebview2" -ErrorAction SilentlyContinue).Count
    $Checks["webview2_laeuft"] = ($Details["webview2_prozesse"] -gt 0)

    Start-Sleep -Seconds 3
    try {
        Add-Type -AssemblyName System.Windows.Forms, System.Drawing
        $Bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $Bitmap = New-Object System.Drawing.Bitmap $Bounds.Width, $Bounds.Height
        $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
        $Graphics.CopyFromScreen($Bounds.Location, [System.Drawing.Point]::Empty, $Bounds.Size)
        $Bitmap.Save((Join-Path $OutputDirectory "fenstertest.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $Details["bildschirmfoto"] = "fenstertest.png"
    } catch { $Details["bildschirmfoto"] = "nicht möglich: $($_.Exception.Message)" }

    # Beenden wie durch Schließen des Fensters.
    if ($Window) { [void]$Window.CloseMainWindow() }
    $Checks["prozesse_enden_nach_schliessen"] = Wait-Until {
        @(Get-Process -Name $Name -ErrorAction SilentlyContinue).Count -eq 0
    } 60
    $Checks["port_nach_schliessen_frei"] = Wait-Until {
        @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue).Count -eq 0
    } 20
    $StillAnswers = $true
    try { Invoke-RestMethod -Uri "${Url}api/health" -TimeoutSec 3 | Out-Null } catch { $StillAnswers = $false }
    $Checks["api_nach_schliessen_aus"] = -not $StillAnswers
}
finally {
    Get-Process -Name $Name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

$Passed = @($Checks.Values | Where-Object { -not $_ }).Count -eq 0
$Result = [ordered]@{
    passed = $Passed
    os = (Get-CimInstance Win32_OperatingSystem).Caption
    checks = $Checks
    details = $Details
}
$Result | ConvertTo-Json -Depth 8 | Set-Content -Path $ResultFile -Encoding UTF8
Get-Content $ResultFile
if (-not $Passed) { exit 1 }
