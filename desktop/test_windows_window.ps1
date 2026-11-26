# Prüft das gepackte Programm unter Windows mit echtem Anwendungsfenster.
#   powershell -ExecutionPolicy Bypass -File desktop\test_windows_window.ps1
#
# Teil 1: Das Programm bedient seine Oberfläche im eigenen Fenster selbst
#         (Dateiimport, Routing, Szenario speichern und laden).
# Teil 2: Normaler Start, API nur auf 127.0.0.1, Beenden über das Fenster.
# Teil 3: Ausweichweg über den Browser mit kleinem Fenster zum Beenden.
# Teil 4: „Szenario speichern“ über den echten Speichern-Dialog
#         (nur wenn die Oberfläche Szenarien anbietet; nicht blockierend).
#
# Achtung: Das Skript beendet laufende Instanzen des Programms und öffnet in
# Teil 3 eine Seite im Standardbrowser.
param(
    [string]$Exe = (Join-Path (Split-Path -Parent $PSScriptRoot) "build\desktop\FailoverRoutingVisualizer.exe"),
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) "build\desktop")
)
$ErrorActionPreference = "Stop"
$Exe = (Resolve-Path $Exe).Path
$Name = [IO.Path]::GetFileNameWithoutExtension($Exe)
$ResultFile = Join-Path $OutputDirectory "fenstertest.json"
Remove-Item $ResultFile -ErrorAction SilentlyContinue
$Checks = [ordered]@{}
$Additional = [ordered]@{}
$Details = [ordered]@{}

# Anfragen an den lokalen Server nie über einen Proxy leiten. Den Schalter
# kennt erst PowerShell 7; Windows PowerShell 5.1 kommt ohne ihn aus.
$NoProxy = @{}
if ((Get-Command Invoke-RestMethod).Parameters.ContainsKey("NoProxy")) { $NoProxy["NoProxy"] = $true }

function Wait-Until([scriptblock]$Condition, [int]$Seconds) {
    $Deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $Deadline) {
        if (& $Condition) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Stop-App {
    Get-Process -Name $Name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Test-NoProcess([int]$Seconds) {
    return (Wait-Until { @(Get-Process -Name $Name -ErrorAction SilentlyContinue).Count -eq 0 } $Seconds)
}

function Invoke-SelfTest([string[]]$Arguments, [string]$Target, [int]$TimeoutMs = 240000) {
    Remove-Item $Target -ErrorAction SilentlyContinue
    $All = @($Arguments) + @("--result-file", "`"$Target`"")
    $Process = Start-Process -FilePath $Exe -ArgumentList $All -PassThru
    $Exited = $Process.WaitForExit($TimeoutMs)
    if (-not $Exited) { Stop-App }
    $Result = $null
    if (Test-Path $Target) { $Result = Get-Content $Target -Raw -Encoding UTF8 | ConvertFrom-Json }
    return [pscustomobject]@{ Exited = $Exited; Result = $Result }
}

function Test-Passed($Run) {
    return ($Run.Exited -and ($null -ne $Run.Result) -and [bool]$Run.Result.passed)
}

try {
    # ---------------------------------------------------------------- Teil 1
    $Ui = Invoke-SelfTest @("--window-test") (Join-Path $OutputDirectory "fenstertest-oberflaeche.json")
    $Checks["oberflaeche_im_fenster_geprueft"] = Test-Passed $Ui
    $Details["oberflaeche"] = $Ui.Result
    $Checks["nach_fenstertest_kein_prozess"] = Test-NoProcess 30
    $HasScenario = ($null -ne $Ui.Result) -and [bool]$Ui.Result.details.scenario_controls_present

    # ---------------------------------------------------------------- Teil 2
    $UrlFile = Join-Path $OutputDirectory "url.txt"
    Remove-Item $UrlFile -ErrorAction SilentlyContinue
    $null = Start-Process -FilePath $Exe -ArgumentList "--url-file", "`"$UrlFile`"" -PassThru
    $Checks["startet_und_meldet_adresse"] = Wait-Until { Test-Path $UrlFile } 90
    $Url = if (Test-Path $UrlFile) { (Get-Content $UrlFile -Raw).Trim() } else { "" }
    $Details["url"] = $Url
    $Port = if ($Url) { ([Uri]$Url).Port } else { 0 }

    $Health = $null
    try { $Health = Invoke-RestMethod -Uri "${Url}api/health" -TimeoutSec 10 @NoProxy } catch {}
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
    $Details["programmprozesse"] = @(Get-Process -Name $Name -ErrorAction SilentlyContinue).Count
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
    } catch { $Details["bildschirmfoto"] = "nicht erstellt: $($_.Exception.Message)" }

    # Beenden wie durch Schließen des Fensters.
    if ($Window) { [void]$Window.CloseMainWindow() }
    $Checks["prozesse_enden_nach_schliessen"] = Test-NoProcess 60
    $Checks["port_nach_schliessen_frei"] = Wait-Until {
        @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue).Count -eq 0
    } 20
    $StillAnswers = $true
    try { Invoke-RestMethod -Uri "${Url}api/health" -TimeoutSec 3 @NoProxy | Out-Null } catch { $StillAnswers = $false }
    $Checks["api_nach_schliessen_aus"] = -not $StillAnswers
    Stop-App

    # ---------------------------------------------------------------- Teil 3
    $BrowserNames = @("msedge", "chrome", "firefox")
    $BrowsersBefore = @(Get-Process -Name $BrowserNames -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    $BrowserUrlFile = Join-Path $OutputDirectory "url-browser.txt"
    Remove-Item $BrowserUrlFile -ErrorAction SilentlyContinue
    $null = Start-Process -FilePath $Exe -ArgumentList "--browser", "--url-file", "`"$BrowserUrlFile`"" -PassThru
    $Checks["browsermodus_startet"] = Wait-Until { Test-Path $BrowserUrlFile } 90
    $BrowserUrl = if (Test-Path $BrowserUrlFile) { (Get-Content $BrowserUrlFile -Raw).Trim() } else { "" }
    $BrowserPort = if ($BrowserUrl) { ([Uri]$BrowserUrl).Port } else { 0 }
    $BrowserHealth = $null
    try { $BrowserHealth = Invoke-RestMethod -Uri "${BrowserUrl}api/health" -TimeoutSec 10 @NoProxy } catch {}
    $Checks["browsermodus_api_antwortet"] = ($BrowserHealth.status -eq "ok")
    $QuitWindow = $null
    $Checks["browsermodus_fenster_zum_beenden"] = Wait-Until {
        $script:QuitWindow = Get-Process -Name $Name -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        $null -ne $script:QuitWindow
    } 60
    $Details["browsermodus_fenstertitel"] = if ($QuitWindow) { $QuitWindow.MainWindowTitle } else { "" }
    $Details["browsermodus_webview2_prozesse"] = @(Get-Process -Name "msedgewebview2" -ErrorAction SilentlyContinue).Count
    if ($QuitWindow) { [void]$QuitWindow.CloseMainWindow() }
    $Checks["browsermodus_endet_nach_schliessen"] = Test-NoProcess 60
    $Checks["browsermodus_port_frei"] = Wait-Until {
        @(Get-NetTCPConnection -State Listen -LocalPort $BrowserPort -ErrorAction SilentlyContinue).Count -eq 0
    } 20
    Stop-App
    # Den dabei geöffneten Browser nur auf dem Build-Rechner der CI schließen.
    # Auf einem Arbeitsplatzrechner könnten sonst Fenster der eigenen
    # Browsersitzung beendet werden; dort bleibt die Seite einfach offen.
    if ($env:GITHUB_ACTIONS -eq "true") {
        Get-Process -Name $BrowserNames -ErrorAction SilentlyContinue |
            Where-Object { $BrowsersBefore -notcontains $_.Id } |
            Stop-Process -Force -ErrorAction SilentlyContinue
    }

    # ---------------------------------------------------------------- Teil 4
    if ($HasScenario) {
        $SavePath = Join-Path $OutputDirectory "gespeichertes-szenario.json"
        $HelperLog = Join-Path $OutputDirectory "speichern-dialog.log"
        Remove-Item $SavePath, $HelperLog -ErrorAction SilentlyContinue
        $HelperScript = Join-Path $PSScriptRoot "windows_save_dialog_helper.ps1"
        $Helper = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -PassThru -ArgumentList @(
            "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$HelperScript`"",
            "-ProcessName", $Name, "-TargetPath", "`"$SavePath`"", "-LogFile", "`"$HelperLog`"",
            "-TimeoutSeconds", "100")
        $Native = Invoke-SelfTest @("--window-test", "--native-save-file", "`"$SavePath`"") `
            (Join-Path $OutputDirectory "fenstertest-speichern-dialog.json") 150000
        if (-not $Helper.HasExited) { $Helper | Stop-Process -Force -ErrorAction SilentlyContinue }
        $Additional["szenario_ueber_speichern_dialog"] = (Test-Passed $Native) -and (Test-Path $SavePath)
        $Details["speichern_dialog_datei_vorhanden"] = (Test-Path $SavePath)
        $Details["speichern_dialog"] = $Native.Result
        $Details["speichern_dialog_protokoll"] = if (Test-Path $HelperLog) { @(Get-Content $HelperLog -Encoding UTF8) } else { @() }
        Stop-App
    } else {
        $Details["speichern_dialog"] = "nicht geprueft: Oberflaeche ohne Szenario-Bedienelemente"
    }
}
finally {
    Stop-App
}

$Passed = @($Checks.Values | Where-Object { -not $_ }).Count -eq 0
$Result = [ordered]@{
    passed = $Passed
    os = (Get-CimInstance Win32_OperatingSystem).Caption
    os_version = (Get-CimInstance Win32_OperatingSystem).Version
    exe_sha256 = (Get-FileHash -Algorithm SHA256 $Exe).Hash
    checks = $Checks
    nicht_blockierend = $Additional
    details = $Details
}
$Result | ConvertTo-Json -Depth 10 | Set-Content -Path $ResultFile -Encoding UTF8
Get-Content $ResultFile -Encoding UTF8
if (-not $Passed) { exit 1 }
