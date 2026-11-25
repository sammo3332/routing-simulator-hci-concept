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

# Erlaubt, die geladene Seite über die Diagnoseschnittstelle von WebView2 abzufragen.
$DebugPort = 9333
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$DebugPort"

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

    $Pages = $null
    $Checks["oberflaeche_im_fenster_geladen"] = Wait-Until {
        try {
            $script:Pages = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json" -TimeoutSec 5
            @($script:Pages | Where-Object { $_.url -eq $Url -and $_.title -eq "Failover Routing Visualizer" }).Count -gt 0
        } catch { $false }
    } 60
    $Details["geladene_seiten"] = @($Pages | ForEach-Object { "$($_.title) | $($_.url)" })

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
$Result | ConvertTo-Json -Depth 5 | Set-Content -Path $ResultFile -Encoding UTF8
Get-Content $ResultFile
if (-not $Passed) { exit 1 }
