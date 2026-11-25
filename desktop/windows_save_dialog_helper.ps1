# Bedient den Speichern-Dialog des Programmfensters fuer den Fenstertest:
# traegt einen Zielpfad ein und betaetigt "Speichern". Laeuft mit Windows
# PowerShell 5.1 (UI-Automation). Diese Datei enthaelt bewusst nur ASCII.
param(
    [Parameter(Mandatory = $true)][string]$ProcessName,
    [Parameter(Mandatory = $true)][string]$TargetPath,
    [string]$LogFile = "",
    [int]$TimeoutSeconds = 200
)
$ErrorActionPreference = "Continue"

function Write-Log([string]$Message) {
    $Line = "{0} {1}" -f (Get-Date -Format "HH:mm:ss.fff"), $Message
    if ($LogFile) { Add-Content -Path $LogFile -Value $Line -Encoding UTF8 }
    Write-Output $Line
}

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$Automation = [System.Windows.Automation.AutomationElement]
$Scope = [System.Windows.Automation.TreeScope]
$DialogCondition = New-Object System.Windows.Automation.PropertyCondition(
    $Automation::ClassNameProperty, "#32770")

function Find-Dialog([int[]]$ProcessIds) {
    $Windows = $Automation::RootElement.FindAll(
        $Scope::Children, [System.Windows.Automation.Condition]::TrueCondition)
    foreach ($Window in $Windows) {
        $ProcessId = 0
        try { $ProcessId = $Window.Current.ProcessId } catch { continue }
        if ($ProcessIds -notcontains $ProcessId) { continue }
        if ($Window.Current.ClassName -eq "#32770") { return $Window }
        $Nested = $Window.FindFirst($Scope::Descendants, $DialogCondition)
        if ($null -ne $Nested) { return $Nested }
    }
    return $null
}

function Find-ById($Parent, [string]$Id, $ControlType) {
    $Parts = [System.Windows.Automation.Condition[]]@(
        (New-Object System.Windows.Automation.PropertyCondition(
            $Automation::AutomationIdProperty, $Id)),
        (New-Object System.Windows.Automation.PropertyCondition(
            $Automation::ControlTypeProperty, $ControlType)))
    $Both = New-Object System.Windows.Automation.AndCondition -ArgumentList (, $Parts)
    return $Parent.FindFirst($Scope::Descendants, $Both)
}

$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$Done = $false
Write-Log "warte auf den Speichern-Dialog von $ProcessName"
while (-not $Done -and (Get-Date) -lt $Deadline) {
    Start-Sleep -Milliseconds 700
    $Ids = @(Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    if ($Ids.Count -eq 0) { continue }
    $Dialog = $null
    try { $Dialog = Find-Dialog $Ids } catch { Write-Log ("Suche fehlgeschlagen: " + $_.Exception.Message); continue }
    if ($null -eq $Dialog) { continue }
    Write-Log ("Dialog gefunden: " + $Dialog.Current.Name)
    try {
        $Edit = Find-ById $Dialog "1001" ([System.Windows.Automation.ControlType]::Edit)
        if ($null -eq $Edit) { Write-Log "Dateinamenfeld nicht gefunden"; continue }
        $Value = $Edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $Value.SetValue($TargetPath)
        Write-Log "Dateiname gesetzt"
        Start-Sleep -Milliseconds 500
        $Button = Find-ById $Dialog "1" ([System.Windows.Automation.ControlType]::Button)
        if ($null -eq $Button) { Write-Log "Schaltflaeche zum Speichern nicht gefunden"; continue }
        $Invoke = $Button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $Invoke.Invoke()
        Write-Log "Speichern ausgeloest"
        $Done = $true
    } catch {
        Write-Log ("Bedienung fehlgeschlagen: " + $_.Exception.Message)
    }
}
if (-not $Done) {
    Write-Log "kein Dialog bedient"
    exit 1
}
exit 0
