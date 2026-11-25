# Paket 4: Windows-App

Stand: 25. November 2026 · Zweig `claude/paket-4-windows-app`
Baut auf: `claude/basis-fehlerbehebungen` · Abhängigkeit von anderen Paketen: keine

Bedienung, Voraussetzungen und Buildanleitung stehen in
[WINDOWS_APP.md](../WINDOWS_APP.md). Dieses Dokument beschreibt Problem,
Umsetzung, Prüfung und Grenzen.

## Problem

Zum lokalen Arbeiten mussten Backend und Frontend bisher in zwei Terminals
gestartet werden (`npm run dev:api`, `npm run dev`), oder es wurde Docker
benötigt. Für die Nutzung auf einem Windows-Rechner ohne Entwicklungsumgebung
gab es keinen Weg.

## Umsetzung

- `desktop/launcher.py` startet die **vorhandene** FastAPI-Anwendung
  (`backend.api.create_app`) zusammen mit der gebauten Oberfläche (`dist/`).
  Es gibt keine zweite Routingimplementierung und keine zweite Oberfläche.
- Der Server läuft als Thread **im Programm selbst**. Der Launcher startet
  keinen eigenen Hintergrundprozess. Im Task-Manager erscheinen dennoch zwei
  Einträge mit dem Programmnamen: Die gepackte Datei entpackt sich und startet
  sich dabei einmal selbst (Verhalten von PyInstaller). Beide enden mit dem
  Schließen des Fensters.
- Er lauscht nur auf `127.0.0.1`. Der Port wird vom Betriebssystem frei
  vergeben; der gebundene Socket wird direkt an Uvicorn übergeben.
- Die Oberfläche erscheint in einem eigenen Fenster (pywebview mit Microsoft
  Edge WebView2). Schließen des Fensters beendet Server und Programm.
- Fehlt WebView2, öffnet sich der Standardbrowser mit einem kleinen Fenster
  zum Beenden. pywebview würde sonst stillschweigend die veraltete
  MSHTML-Engine verwenden, in der die Oberfläche nicht läuft; deshalb prüft
  der Launcher die Laufzeit selbst.
- Anfragen des Launchers an den eigenen Server umgehen einen eingestellten
  Proxy.
- Downloads sind im Fenster zugelassen, damit „Szenario speichern“ aus
  Paket 3 einen Speichern-Dialog öffnen kann.
- PyInstaller packt alles in eine Datei `FailoverRoutingVisualizer.exe`
  (`desktop/failover_routing_visualizer.spec`), einschließlich `dist/` und
  des Szenario-Schemas.
- `desktop/build_windows.ps1` ist der reproduzierbare Buildweg;
  `.github/workflows/windows-app.yml` führt ihn auf `windows-latest` aus und
  stellt die Programmdatei als Artefakt bereit.

Eingebaute Prüfungen (laufen nur mit der jeweiligen Option):

| Option | Was geprüft wird |
|---|---|
| `--smoke-test` | ohne Fenster: Oberfläche und ihre Dateien werden ausgeliefert, Dateiimport, kürzester Pfad mit Ausfall, Bonsai mit Ausfall, Bindung an `127.0.0.1`, Port über die Netzwerkadresse des Rechners nicht erreichbar. Mit Paket 3 zusätzlich: Szenario speichern und laden, Schemaprüfung aktiv, Formatversion wird geprüft. |
| `--window-test` | im echten Fenster: Oberfläche gezeichnet, Topologie über das Dateifeld importiert und dargestellt, Bonsai gewählt und eine Kante ausfallen lassen. Mit Paket 3 zusätzlich: „Szenario speichern“, Zustand verändern, Szenario wieder laden, Zustand vergleichen. |
| `--native-save-file <Pfad>` | wie `--window-test`, aber „Szenario speichern“ läuft über den echten Speichern-Dialog, den ein Hilfsskript bedient. |
| `--probe-internet` | zusätzlich melden, ob Programm und Seite einen öffentlichen Host (`github.com`) erreichen. Nur für die Prüfung ohne Internetzugang; im normalen Betrieb baut das Programm keine Verbindung nach außen auf. |

## Tatsächliche Prüfung

### Auf Windows (GitHub-Runner `windows-latest`)

| Angabe | Wert |
|---|---|
| Lauf | [Windows-App Nr. 5](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723755291), 25. November 2026, Ergebnis: erfolgreich |
| Geprüfter Commit | `095a2426c9efbe586b64684239d8d815e2789c65` (dieser Zweig ohne die nachfolgenden reinen Dokumentations-Commits) |
| Betriebssystem | Microsoft Windows Server 2025 Datacenter, Version 10.0.26100 |
| WebView2 | 157.0.4341.46 |
| SHA-256 der Programmdatei | `45C5A7241B83DA06C6AD5B4F57A34579B46120813E8D619AABB7464B3E471E26` |
| Skripte | `desktop/build_windows.ps1`, `desktop/test_windows_window.ps1`, `desktop/test_windows_offline.ps1`, `tests/test_desktop_launcher.py` |

| Prüfung | Ergebnis |
|---|---|
| Build mit PyInstaller | erfolgreich |
| Selbsttest der gepackten Datei (`--smoke-test`): 9 Einzelprüfungen | bestanden |
| `tests/test_desktop_launcher.py` unter Windows | 24 bestanden |
| Fenstertest Teil 1, im WebView2-Fenster: Oberfläche gezeichnet, Dateiimport (4 Knoten dargestellt), Routing (Bonsai, 1 Ausfall, „Failover aktiv“, Erreichbarkeit 4/4) | bestanden |
| Fenstertest Teil 2: Start per Programmdatei, Fenster mit Titel „Failover Routing Visualizer“, API antwortet, lauscht nur auf `127.0.0.1`, nach Schließen des Fensters kein Prozess, Port frei, API aus | bestanden |
| Fenstertest Teil 3: Ausweichweg `--browser` mit Fenster zum Beenden; nach dessen Schließen kein Prozess, Port frei | bestanden |
| Prüfung ohne Internetzugang (siehe unten) | bestanden |

Die Szenario-Prüfungen entfallen auf diesem Zweig, weil er Paket 3 nicht
enthält. Sie laufen auf dem Integrationszweig.

**Prüfung ohne Internetzugang.** Der ausgehende Verkehr der Programmdatei
und von `msedgewebview2.exe` wurde mit Regeln der Windows-Firewall gesperrt.
Zur Kontrolle melden Programm und Seite, ob sie `github.com` erreichen:

| | Programm erreicht Internet | Seite erreicht Internet | Selbsttest | Fenstertest |
|---|---|---|---|---|
| ohne Sperre | ja | ja | bestanden | bestanden |
| mit Sperre | nein | nein | bestanden | bestanden |

Damit ist für diesen Runner belegt: Dateiimport und Routing funktionieren in
der gepackten Datei, während weder das Programm noch die Seite das Internet
erreichen. Nicht belegt ist der Betrieb auf einem Rechner ganz ohne
Netzwerkverbindung; siehe Grenzen.

Die Nachweise des Laufs (Ergebnisdateien und ein Bildschirmfoto) liegen im
Artefakt `windows-pruefnachweise`. Aus der Entwicklungsumgebung ließen sich
die Artefakte nicht herunterladen; die Angaben oben stammen aus dem Protokoll
des Laufs. Das Bildschirmfoto wurde deshalb nicht gesichtet.

Frühere Läufe dieses Zweigs gehören zur Entstehung: Lauf Nr. 1 scheiterte an
einem ungeeigneten Nachweis (Diagnoseschnittstelle von WebView2 nicht
erreichbar), Lauf Nr. 2 bestand mit dem ersten eingebauten Fenstertest,
Lauf Nr. 3 bestand mit denselben Prüfungen wie Lauf Nr. 5 am Stand `4377d5b`.
Die Läufe Nr. 4 und Nr. 6 gehören zum Integrationszweig.

### Auf Linux (kein Windows-Nachweis)

Diese Prüfungen belegen die Logik des Launchers und der Paketbeschreibung,
**nicht** das Verhalten unter Windows:

- `tests/test_desktop_launcher.py` (24 Tests): Server startet auf
  `127.0.0.1`, liefert Oberfläche und API, endet vollständig und gibt den Port
  frei; zwei Instanzen erhalten verschiedene Ports; Selbsttest; Start trotz
  eingestelltem, nicht antwortendem Proxy; Protokoll wird angehängt;
  Fehlerpfade; Ausweichen auf den Browser; Ablauf des Fenstertests gegen eine
  nachgebildete Seite.
- Der Ablauf des Fenstertests wurde zusätzlich gegen die echte Oberfläche in
  Chromium ausgeführt (einmalig, über eine lokale Hilfsbrücke, die nicht im
  Repository liegt).
- PyInstaller-Build der Linux-Variante mit derselben Paketbeschreibung und
  Selbsttest der gepackten Datei: bestanden (9 Einzelprüfungen, Stand
  `4377d5b`).

### Befunde der unabhängigen Prüfung zu diesem Paket

| Befund | Umgang |
|---|---|
| Start scheitert nach 30 Sekunden, wenn ein Proxy ohne Ausnahme für `127.0.0.1` eingestellt ist | behoben; Test `test_local_requests_ignore_a_configured_proxy` |
| Ohne tkinter lief der Browsermodus unsichtbar weiter | behoben: Meldungsfenster, dessen „OK“ das Programm beendet |
| Fehler nach dem Öffnen des Fensters öffnete zusätzlich den Browser | behoben |
| Zweite Instanz überschrieb das Protokoll der ersten | behoben: Protokoll wird angehängt |
| Aussage „kein zweiter Hintergrundprozess“ ungenau | Dokumentation berichtigt (zwei Prozesseinträge durch PyInstaller) |
| Selbsttest prüfte externe Verweise nur in der Startseite | Prüfung umbenannt; die Aussage zur Nutzung ohne Internet stützt sich jetzt auf die Prüfung mit Firewall-Sperre |
| Skripte ohne Byte-Order-Mark: falsche Umlaute in Windows PowerShell 5.1 | behoben |
| Programmdatei wurde vor dem Fenstertest bereitgestellt | unverändert, aber dokumentiert: maßgeblich ist ein vollständig erfolgreicher Lauf |
| Workflow läuft nach einer Übernahme in `main` nicht automatisch | offen, siehe Grenzen |
| Kein Schutz gegen Anfragen anderer Webseiten des eigenen Browsers an den lokalen Port | offen, siehe Grenzen |

## Grenzen

- Geprüft wurde ausschließlich auf dem Windows-Runner von GitHub (Windows
  Server 2025). Windows 10 und Windows 11 auf einem Arbeitsplatzrechner wurden
  nicht geprüft.
- Die Prüfung ohne Internetzugang sperrt den Verkehr per Firewall. Ein Rechner
  ohne jede Netzwerkverbindung (Flugmodus, gezogenes Kabel) wurde nicht
  geprüft.
- Die Programmdatei ist nicht signiert. SmartScreen und Virenscanner können
  beim ersten Start warnen.
- Es gibt kein Installationsprogramm, keine Verknüpfung im Startmenü, kein
  eigenes Programmsymbol und keine automatische Aktualisierung.
- Das Artefakt des Workflows lässt sich nur angemeldet von GitHub laden und
  wird nach 90 Tagen gelöscht. Ein Release wurde nicht angelegt.
- Der Workflow läuft nur für `claude/paket-4-windows-app` und
  `claude/integration-gesamtvorschlag` sowie von Hand. Nach einer Übernahme in
  `main` muss der Auslöser angepasst werden.
- Der Build ist funktional reproduzierbar, aber nicht bitgleich: nur unter
  Windows benötigte Pakete (`pythonnet`, `colorama` und weitere) werden beim
  Build aufgelöst und sind nicht fest versioniert. Die tatsächlich
  installierten Versionen stehen in `paketversionen.txt` im Artefakt.
- Sitzungen liegen nur im Arbeitsspeicher. Nach dem Schließen ist der Zustand
  weg, sofern er nicht als Szenario gespeichert wurde.
- Andere Programme desselben Rechners können den lokalen Port ansprechen,
  solange das Programm läuft; ebenso Webseiten, die im Browser desselben
  Rechners geöffnet sind. Es gibt keine Anmeldung und keine Prüfung der
  Herkunft. Der Port wechselt bei jedem Start; die Daten sind nicht
  vertraulich.
- Wird das Programm hart beendet (Task-Manager), bleibt der von PyInstaller
  entpackte temporäre Ordner unter `%TEMP%` liegen.
- macOS und Linux sind nicht Ziel dieses Pakets.
