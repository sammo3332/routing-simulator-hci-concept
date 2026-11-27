# Prüft das gepackte Programm ohne Internetzugang.
#   powershell -ExecutionPolicy Bypass -File desktop\test_windows_offline.ps1
#
# Der ausgehende Verkehr des Programms und der WebView2-Laufzeit wird mit
# Regeln der Windows-Firewall gesperrt (Administratorrechte nötig). Danach
# laufen Selbsttest und Fenstertest erneut. Beide melden zusätzlich, ob sie
# einen öffentlichen Host erreichen; nur wenn das nicht gelingt, gilt die
# Prüfung als aussagekräftig. Die Verbindung zwischen Fenster und lokalem
# Server (127.0.0.1) ist von den Regeln nicht betroffen.
param(
    [string]$Exe = (Join-Path (Split-Path -Parent $PSScriptRoot) "build\desktop\FailoverRoutingVisualizer.exe"),
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) "build\desktop")
)
$ErrorActionPreference = "Stop"
$Exe = (Resolve-Path $Exe).Path
$Name = [IO.Path]::GetFileNameWithoutExtension($Exe)
$ResultFile = Join-Path $OutputDirectory "offline-pruefung.json"
Remove-Item $ResultFile -ErrorAction SilentlyContinue

function Stop-App {
    Get-Process -Name $Name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Invoke-SelfTest([string[]]$Arguments, [string]$Target, [int]$TimeoutMs = 240000) {
    Remove-Item $Target -ErrorAction SilentlyContinue
    $All = @($Arguments) + @("--result-file", "`"$Target`"")
    $Process = Start-Process -FilePath $Exe -ArgumentList $All -PassThru
    $Exited = $Process.WaitForExit($TimeoutMs)
    if (-not $Exited) { Stop-App }
    Start-Sleep -Seconds 2
    $Result = $null
    if (Test-Path $Target) { $Result = Get-Content $Target -Raw -Encoding UTF8 | ConvertFrom-Json }
    return [pscustomobject]@{ Exited = $Exited; Result = $Result }
}

function Test-Passed($Run) {
    return ($Run.Exited -and ($null -ne $Run.Result) -and [bool]$Run.Result.passed)
}

$WebViewRoots = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
    "$env:ProgramFiles\Microsoft\EdgeWebView\Application",
    "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application")
$WebViewPaths = @($WebViewRoots | Where-Object { $_ -and (Test-Path $_) } |
    ForEach-Object { Get-ChildItem $_ -Recurse -Filter "msedgewebview2.exe" -ErrorAction SilentlyContinue } |
    ForEach-Object { $_.FullName } | Select-Object -Unique)

# Vergleichslauf ohne Sperre: zeigt, ob der Rechner überhaupt Internet hat.
$BaseSmoke = Invoke-SelfTest @("--smoke-test", "--probe-internet") (Join-Path $OutputDirectory "offline-vergleich-selbsttest.json")
$BaseWindow = Invoke-SelfTest @("--window-test", "--probe-internet") (Join-Path $OutputDirectory "offline-vergleich-fenstertest.json")

$EnabledProfiles = @()
$RuleNames = @()
$BlockedSmoke = $null
$BlockedWindow = $null
$FirewallError = ""
try {
    foreach ($FirewallProfile in @(Get-NetFirewallProfile)) {
        if ([string]$FirewallProfile.Enabled -ne "True") {
            Set-NetFirewallProfile -Name $FirewallProfile.Name -Enabled True
            $EnabledProfiles += $FirewallProfile.Name
        }
    }
    $Index = 0
    foreach ($Program in @($Exe) + $WebViewPaths) {
        $Index += 1
        $RuleName = "FRV-Offline-Pruefung-$Index"
        Remove-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue
        $null = New-NetFirewallRule -Name $RuleName -DisplayName $RuleName -Direction Outbound `
            -Program $Program -Action Block -Profile Any
        $RuleNames += $RuleName
    }
    $BlockedSmoke = Invoke-SelfTest @("--smoke-test", "--probe-internet") (Join-Path $OutputDirectory "offline-selbsttest.json")
    $BlockedWindow = Invoke-SelfTest @("--window-test", "--probe-internet") (Join-Path $OutputDirectory "offline-fenstertest.json")
}
catch {
    $FirewallError = $_.Exception.Message
}
finally {
    foreach ($RuleName in $RuleNames) { Remove-NetFirewallRule -Name $RuleName -ErrorAction SilentlyContinue }
    foreach ($ProfileName in $EnabledProfiles) { Set-NetFirewallProfile -Name $ProfileName -Enabled False }
    Stop-App
}

$Functional = ($null -ne $BlockedSmoke) -and ($null -ne $BlockedWindow) -and
    (Test-Passed $BlockedSmoke) -and (Test-Passed $BlockedWindow)
$ProgramBlocked = $Functional -and
    ($BlockedSmoke.Result.internet.python_reachable -eq $false) -and
    ($BlockedWindow.Result.internet.python_reachable -eq $false)
$PageBlocked = $Functional -and ($BlockedWindow.Result.internet.page_reachable -eq $false)
if ($FirewallError) { $Verdict = "nicht durchgefuehrt" }
elseif (-not $Functional) { $Verdict = "nicht bestanden" }
elseif ($ProgramBlocked -and $PageBlocked) { $Verdict = "bestanden" }
else { $Verdict = "nicht aussagekraeftig" }

$Result = [ordered]@{
    ergebnis = $Verdict
    bedeutung = "bestanden = Selbsttest und Fenstertest liefen vollstaendig, waehrend Programm und Seite keinen oeffentlichen Host erreichen konnten"
    os = (Get-CimInstance Win32_OperatingSystem).Caption
    exe_sha256 = (Get-FileHash -Algorithm SHA256 $Exe).Hash
    firewall_fehler = $FirewallError
    firewall_profile_voruebergehend_eingeschaltet = $EnabledProfiles
    gesperrte_programme = @($Exe) + $WebViewPaths
    ohne_sperre = [ordered]@{
        selbsttest_bestanden = (Test-Passed $BaseSmoke)
        fenstertest_bestanden = (Test-Passed $BaseWindow)
        programm_erreicht_internet = $BaseSmoke.Result.internet.python_reachable
        seite_erreicht_internet = $BaseWindow.Result.internet.page_reachable
    }
    mit_sperre = [ordered]@{
        selbsttest_bestanden = if ($null -ne $BlockedSmoke) { Test-Passed $BlockedSmoke } else { $null }
        fenstertest_bestanden = if ($null -ne $BlockedWindow) { Test-Passed $BlockedWindow } else { $null }
        programm_erreicht_internet_selbsttest = if ($null -ne $BlockedSmoke) { $BlockedSmoke.Result.internet.python_reachable } else { $null }
        programm_erreicht_internet_fenstertest = if ($null -ne $BlockedWindow) { $BlockedWindow.Result.internet.python_reachable } else { $null }
        seite_erreicht_internet = if ($null -ne $BlockedWindow) { $BlockedWindow.Result.internet.page_reachable } else { $null }
        selbsttest = if ($null -ne $BlockedSmoke) { $BlockedSmoke.Result } else { $null }
        fenstertest = if ($null -ne $BlockedWindow) { $BlockedWindow.Result } else { $null }
    }
}
$Result | ConvertTo-Json -Depth 10 | Set-Content -Path $ResultFile -Encoding UTF8
Get-Content $ResultFile -Encoding UTF8
# Nur ein Funktionsfehler ohne Internet lässt den Lauf scheitern. Greift die
# Sperre auf diesem Rechner nicht, ist das Ergebnis lediglich nicht aussagekräftig.
if ($Verdict -eq "nicht bestanden") { exit 1 }
