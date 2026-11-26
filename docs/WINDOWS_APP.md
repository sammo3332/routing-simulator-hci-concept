# Windows-Programm

Der Failover Routing Visualizer lässt sich als einzelne Programmdatei
`FailoverRoutingVisualizer.exe` starten. Sie enthält die bestehende Oberfläche
und das bestehende Python-Backend. Es müssen keine zwei Terminals geöffnet
werden.

## Starten und Beenden

1. `FailoverRoutingVisualizer.exe` per Doppelklick starten.
2. Nach einigen Sekunden öffnet sich das Fenster „Failover Routing
   Visualizer“ mit der bekannten Oberfläche.
3. Das Fenster schließen. Damit endet auch der lokale Server.

Beim ersten Start einer nicht signierten Datei zeigt Windows SmartScreen
unter Umständen „Der Computer wurde durch Windows geschützt“. Über „Weitere
Informationen“ → „Trotzdem ausführen“ startet das Programm. Die Datei ist
nicht signiert.

Der Start dauert einige Sekunden, weil sich das Programm zunächst in einen
temporären Ordner entpackt.

## Voraussetzungen zur Laufzeit

| Voraussetzung | Hinweis |
|---|---|
| Windows 10 oder 11, 64 Bit | geprüft wurde nur der Windows-Runner von GitHub (Windows Server 2025), siehe [Paket 4](weiterentwicklung/PAKET_4_WINDOWS_APP.md) |
| Microsoft Edge WebView2 Runtime | unter Windows 11 vorinstalliert; unter Windows 10 in der Regel über Edge vorhanden |
| .NET Framework 4.6.2 oder neuer | Bestandteil von Windows 10 und 11 |

Python und Node.js werden zum Ausführen **nicht** benötigt.

Fehlt die WebView2-Laufzeit, öffnet das Programm die Oberfläche im
Standardbrowser und zeigt ein kleines Fenster mit der Schaltfläche „Beenden“.
Dasselbe Verhalten lässt sich mit `--browser` erzwingen.

Alle Dateien der Oberfläche liegen in der Programmdatei; die Startseite
verweist auf keine externe Adresse. Geprüft ist: Auf dem Windows-Runner liefen
Dateiimport und Routing vollständig, während der ausgehende Internetverkehr
des Programms und der WebView2-Laufzeit per Firewall gesperrt war. Auf einem
Rechner ganz ohne Netzwerkverbindung wurde nicht geprüft. Einzelheiten stehen
in [Paket 4](weiterentwicklung/PAKET_4_WINDOWS_APP.md).

## Lokaler Server

- Das Programm startet die vorhandene FastAPI-Anwendung als Thread in sich
  selbst; es startet keinen eigenen Hintergrundprozess. Im Task-Manager
  erscheinen zwei Einträge mit dem Programmnamen, weil sich die gepackte
  Datei beim Entpacken einmal selbst startet. Beide enden mit dem Schließen
  des Fensters.
- Der Server lauscht ausschließlich auf `127.0.0.1` und ist von anderen
  Rechnern aus nicht erreichbar.
- Der Port wird bei jedem Start frei gewählt. Mehrere Instanzen stören sich
  nicht; jede hat ihre eigenen Sitzungen.
- Sitzungen liegen wie bisher nur im Arbeitsspeicher. Nach dem Schließen ist
  der Zustand weg. Zum Aufbewahren dient „Szenario speichern“ (Paket 3).
- Protokoll: `%LOCALAPPDATA%\FailoverRoutingVisualizer\app.log` (wird
  fortgeschrieben, ab 1 MB einmal rotiert).
- Ein in Windows eingestellter Proxy stört den Start nicht.

Andere Programme auf demselben Rechner und Webseiten im Browser desselben
Rechners können die lokale Adresse aufrufen, solange das Programm läuft. Eine
Anmeldung gibt es nicht.

Die Schaltflächen „SVG“ und „PNG“ in der Werkzeugleiste über dem Graphen (Paket 5)
laden ein Bild der gesamten Topologie herunter; im Programmfenster öffnet sich
dafür wie beim Szenario der Windows-Dialog „Speichern unter“. Der Fenstertest
prüft den Export mit abgefangenen Downloads; das Öffnen und Bestätigen des
Dialogs für Bilder wurde nicht automatisiert geprüft.

„Szenario speichern“ (Paket 3) öffnet im Programmfenster den Windows-Dialog
„Speichern unter“. Vorgeschlagen werden der Ordner „Downloads“ und der
Dateiname des Szenarios. Das Öffnen des Dialogs wurde auf dem Windows-Runner
beobachtet. Dass die Datei nach dem Bestätigen mit der Endung `.json` am
gewählten Ort liegt, wurde nicht automatisiert geprüft; bitte beim ersten
Einsatz einmal von Hand prüfen.

## Aufrufoptionen

| Option | Wirkung |
|---|---|
| `--browser` | Standardbrowser statt eines eigenen Fensters |
| `--port 8765` | fester Port statt eines freien Ports |
| `--smoke-test --result-file ergebnis.json` | ohne Fenster starten, Kernfunktionen prüfen, Ergebnis schreiben, beenden |
| `--window-test --result-file ergebnis.json` | Fenster öffnen, Oberfläche darin bedienen und prüfen (Dateiimport, Routing, Bildexport, Szenario speichern und laden, soweit vorhanden), beenden |
| `--probe-internet` | mit einem der beiden Tests: zusätzlich melden, ob `github.com` erreichbar ist (für Prüfungen ohne Internetzugang) |
| `--url-file adresse.txt` | Adresse des lokalen Servers in eine Datei schreiben |

## Selbst bauen

Voraussetzungen auf dem Build-Rechner: Windows, Python 3.12 und Node.js 22 im
`PATH`.

```powershell
powershell -ExecutionPolicy Bypass -File desktop\build_windows.ps1
```

Das Skript baut die Oberfläche (`npm ci`, `npm run build`), legt die
Umgebung `.venv-desktop` an, installiert die Pakete aus
`requirements-desktop.txt` mit den Versionen aus `requirements-lock.txt`,
packt das Programm mit PyInstaller und führt den Selbsttest aus. Ergebnis:
`build\desktop\FailoverRoutingVisualizer.exe`.

Der Fenstertest lässt sich anschließend so ausführen:

```powershell
powershell -ExecutionPolicy Bypass -File desktop\test_windows_window.ps1
```

Die Prüfung ohne Internetzugang braucht Administratorrechte, weil sie
vorübergehend Firewall-Regeln anlegt und wieder entfernt:

```powershell
powershell -ExecutionPolicy Bypass -File desktop\test_windows_offline.ps1
```

Derselbe Ablauf läuft im Workflow `.github/workflows/windows-app.yml` auf
`windows-latest`. Er stellt die Programmdatei als Artefakt
`FailoverRoutingVisualizer-windows` bereit (auf GitHub unter „Actions“ →
Lauf auswählen → „Artifacts“; Anmeldung nötig, Aufbewahrung 90 Tage). Das
Artefakt enthält außerdem die SHA-256-Prüfsumme, das Ergebnis des Selbsttests
und die Liste der installierten Paketversionen. Maßgeblich ist die
Programmdatei eines vollständig erfolgreichen Laufs.

### Hinweise zur Reproduzierbarkeit

- `pywebview` und `pyinstaller` sind fest versioniert.
- Gemeinsame Pakete folgen den Versionen der Lock-Datei. Die Lock-Datei
  wurde unter Linux erzeugt; ihre Hashes werden für den Windows-Build nicht
  verwendet, weil unter Windows zusätzliche Pakete nötig sind
  (zum Beispiel `colorama`, `pythonnet`). Diese löst `pip` beim Build auf.
- Zwei Builds sind daher funktional gleich, aber nicht bitgleich.

## Ohne Packen starten (Entwicklung)

```bash
npm run build
```

```bash
python -m desktop.launcher
```

Unter Linux und macOS steht dabei in der Regel kein eingebettetes Fenster zur
Verfügung; das Programm verwendet dann den Browser.
