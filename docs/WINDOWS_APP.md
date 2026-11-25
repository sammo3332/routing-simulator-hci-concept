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
| Windows 10 oder 11, 64 Bit | geprüft wurde nur der Windows-Runner von GitHub, siehe [Paket 4](weiterentwicklung/PAKET_4_WINDOWS_APP.md) |
| Microsoft Edge WebView2 Runtime | unter Windows 11 vorinstalliert; unter Windows 10 in der Regel über Edge vorhanden |
| .NET Framework 4.6.2 oder neuer | Bestandteil von Windows 10 und 11 |

Python und Node.js werden zum Ausführen **nicht** benötigt.

Fehlt die WebView2-Laufzeit, öffnet das Programm die Oberfläche im
Standardbrowser und zeigt ein kleines Fenster mit der Schaltfläche „Beenden“.
Dasselbe Verhalten lässt sich mit `--browser` erzwingen.

Eine Internetverbindung ist für die Kernfunktion nicht nötig. Die Oberfläche
lädt keine Schriften, Skripte oder Bilder aus dem Netz; alle Ressourcen liegen
in der Programmdatei.

## Lokaler Server

- Das Programm startet die vorhandene FastAPI-Anwendung im selben Prozess.
  Es gibt keinen zweiten Hintergrundprozess, der übrig bleiben könnte.
- Der Server lauscht ausschließlich auf `127.0.0.1` und ist von anderen
  Rechnern aus nicht erreichbar.
- Der Port wird bei jedem Start frei gewählt. Mehrere Instanzen stören sich
  nicht; jede hat ihre eigenen Sitzungen.
- Sitzungen liegen wie bisher nur im Arbeitsspeicher. Nach dem Schließen ist
  der Zustand weg. Zum Aufbewahren dient „Szenario speichern“ (Paket 3).
- Protokoll: `%LOCALAPPDATA%\FailoverRoutingVisualizer\app.log`.

Andere Programme auf demselben Rechner können die lokale Adresse aufrufen,
solange das Programm läuft. Eine Anmeldung gibt es nicht.

## Aufrufoptionen

| Option | Wirkung |
|---|---|
| `--browser` | Standardbrowser statt eines eigenen Fensters |
| `--port 8765` | fester Port statt eines freien Ports |
| `--smoke-test --result-file ergebnis.json` | ohne Fenster starten, Kernfunktionen prüfen, Ergebnis schreiben, beenden |
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

Derselbe Ablauf läuft im Workflow `.github/workflows/windows-app.yml` auf
`windows-latest`. Er stellt die Programmdatei als Artefakt
`FailoverRoutingVisualizer-windows` bereit (auf GitHub unter „Actions“ →
Lauf auswählen → „Artifacts“; Anmeldung nötig, Aufbewahrung 90 Tage).

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
