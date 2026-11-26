# Bedient den Speichern-Dialog des Programmfensters fuer den Fenstertest:
# traegt einen Zielpfad ein und betaetigt "Speichern". Laeuft mit Windows
# PowerShell 5.1 (UI-Automation). Diese Datei enthaelt bewusst nur ASCII.
#
# Vorgehen: zuerst ueber UI-Automation (Wert des Dateinamenfelds setzen,
# Schaltflaeche ausloesen); gelingt das nicht, ueber Tastatureingabe in den
# Dialog. Der Aufbau des Dialogs wird einmal ins Protokoll geschrieben.
param(
    [Parameter(Mandatory = $true)][string]$ProcessName,
    [Parameter(Mandatory = $true)][string]$TargetPath,
    [string]$LogFile = "",
    [int]$TimeoutSeconds = 100
)
$ErrorActionPreference = "Continue"

function Write-Log([string]$Message) {
    $Line = "{0} {1}" -f (Get-Date -Format "HH:mm:ss.fff"), $Message
    if ($LogFile) { Add-Content -Path $LogFile -Value $Line -Encoding UTF8 }
}

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -Namespace FrvNative -Name Window -MemberDefinition @'
[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(System.IntPtr window, out uint processId);
'@
$Automation = [System.Windows.Automation.AutomationElement]
$Scope = [System.Windows.Automation.TreeScope]
$AnyElement = [System.Windows.Automation.Condition]::TrueCondition
$EditId = [System.Windows.Automation.ControlType]::Edit.Id
$ButtonId = [System.Windows.Automation.ControlType]::Button.Id
$DialogCondition = New-Object System.Windows.Automation.PropertyCondition(
    $Automation::ClassNameProperty, "#32770")

function Find-Dialog([int[]]$ProcessIds) {
    $Windows = $Automation::RootElement.FindAll($Scope::Children, $AnyElement)
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

function Get-Info($Item) {
    try {
        return [pscustomobject]@{
            Element = $Item
            TypeId = $Item.Current.ControlType.Id
            TypeName = $Item.Current.ControlType.ProgrammaticName
            Id = [string]$Item.Current.AutomationId
            Name = [string]$Item.Current.Name
            Class = [string]$Item.Current.ClassName
        }
    } catch { return $null }
}

function Get-Items($Dialog) {
    $List = New-Object System.Collections.ArrayList
    try {
        foreach ($Item in $Dialog.FindAll($Scope::Descendants, $AnyElement)) {
            $Info = Get-Info $Item
            if ($null -ne $Info) { [void]$List.Add($Info) }
        }
    } catch { Write-Log ("Aufzaehlung fehlgeschlagen: " + $_.Exception.Message) }
    return , $List
}

function Find-FileNameField($Items) {
    $Edits = @($Items | Where-Object { $_.TypeId -eq $EditId })
    foreach ($Id in @("1001", "1152")) {
        $Hit = $Edits | Where-Object { $_.Id -eq $Id } | Select-Object -First 1
        if ($Hit) { return $Hit }
    }
    $Hit = $Edits | Where-Object { $_.Name -match "^(File name|Dateiname)" } | Select-Object -First 1
    if ($Hit) { return $Hit }
    $Hit = $Items | Where-Object { $_.Id -eq "FileNameControlHost" -or $_.Id -eq "1148" } | Select-Object -First 1
    if ($Hit) { return $Hit }
    return ($Edits | Select-Object -First 1)
}

function Find-SaveButton($Items) {
    $Buttons = @($Items | Where-Object { $_.TypeId -eq $ButtonId })
    $Hit = $Buttons | Where-Object { $_.Id -eq "1" } | Select-Object -First 1
    if ($Hit) { return $Hit }
    return ($Buttons | Where-Object { $_.Name -match "^&?(Save|Speichern)$" } | Select-Object -First 1)
}

function Set-Text($Element, [string]$Text) {
    $Pattern = $null
    if ($Element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$Pattern)) {
        $Pattern.SetValue($Text)
        return $true
    }
    return $false
}

# Tastatureingaben nur, wenn das Vordergrundfenster zum Programm gehoert.
# Sonst landete der Pfad in einem fremden Fenster.
function Test-ForegroundIsProgram([int[]]$ProcessIds) {
    [uint32]$ForegroundProcess = 0
    $Handle = [FrvNative.Window]::GetForegroundWindow()
    [void][FrvNative.Window]::GetWindowThreadProcessId($Handle, [ref]$ForegroundProcess)
    return ($ProcessIds -contains [int]$ForegroundProcess)
}

function Wait-File([int]$Seconds) {
    $Until = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $Until) {
        if (Test-Path $TargetPath) { return $true }
        Start-Sleep -Milliseconds 400
    }
    return (Test-Path $TargetPath)
}

$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$Attempts = 0
$Dumped = $false
Write-Log "warte auf den Speichern-Dialog von $ProcessName"
while (-not (Test-Path $TargetPath) -and (Get-Date) -lt $Deadline -and $Attempts -lt 5) {
    Start-Sleep -Milliseconds 800
    $Ids = @(Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    if ($Ids.Count -eq 0) { continue }
    $Dialog = $null
    try { $Dialog = Find-Dialog $Ids } catch { Write-Log ("Suche fehlgeschlagen: " + $_.Exception.Message); continue }
    if ($null -eq $Dialog) { continue }
    $Attempts += 1
    Write-Log ("Dialog gefunden: " + $Dialog.Current.Name + " (Versuch $Attempts)")
    $Items = Get-Items $Dialog
    Write-Log ("Elemente im Dialog: " + $Items.Count)
    if (-not $Dumped) {
        $Dumped = $true
        foreach ($Info in ($Items | Select-Object -First 60)) {
            Write-Log ("  {0} | id={1} | name={2} | class={3}" -f $Info.TypeName, $Info.Id, $Info.Name, $Info.Class)
        }
    }
    $Triggered = $false
    try {
        $Field = Find-FileNameField $Items
        if ($Field) {
            Write-Log ("Dateinamenfeld: {0} | id={1} | name={2}" -f $Field.TypeName, $Field.Id, $Field.Name)
            if (Set-Text $Field.Element $TargetPath) {
                Start-Sleep -Milliseconds 500
                $Button = Find-SaveButton $Items
                if ($Button) {
                    $Invoke = $Button.Element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                    $Invoke.Invoke()
                    Write-Log "Speichern ueber UI-Automation ausgeloest"
                    $Triggered = $true
                } else {
                    Write-Log "Schaltflaeche zum Speichern nicht gefunden"
                }
            } else {
                Write-Log "Dateinamenfeld nimmt keinen Wert an"
            }
        } else {
            Write-Log "Dateinamenfeld nicht gefunden"
        }
    } catch {
        Write-Log ("UI-Automation fehlgeschlagen: " + $_.Exception.Message)
    }
    if ($Triggered -and (Wait-File 8)) { break }
    if (-not (Test-Path $TargetPath)) {
        # Ersatzweg: Der Dialog hat den Tastaturfokus im Dateinamenfeld.
        try {
            $Dialog.SetFocus()
            Start-Sleep -Milliseconds 500
            if (Test-ForegroundIsProgram $Ids) {
                $Escaped = [regex]::Replace($TargetPath, '([+^%~(){}\[\]])', '{$1}')
                [System.Windows.Forms.SendKeys]::SendWait($Escaped)
                Start-Sleep -Milliseconds 300
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                Write-Log "Speichern ueber Tastatureingabe versucht"
            } else {
                Write-Log "Dialog nicht im Vordergrund; keine Tastatureingabe"
            }
        } catch {
            Write-Log ("Tastatureingabe fehlgeschlagen: " + $_.Exception.Message)
        }
        [void](Wait-File 8)
    }
}
if (Test-Path $TargetPath) {
    Write-Log "Datei vorhanden"
    exit 0
}
Write-Log "Datei nicht entstanden"
exit 1
