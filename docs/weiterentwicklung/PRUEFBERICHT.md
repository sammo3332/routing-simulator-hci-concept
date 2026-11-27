# Prüfbericht zum integrierten Stand

Stand: 26. November 2026 (ergänzt um Paket 5)

Dieser Bericht ordnet alle genannten Testzahlen einem genauen Commit und
einem ausführbaren Skript zu und hält fest, was die unabhängige Prüfung
gefunden hat und wie mit jedem Befund umgegangen wurde.

Alle Angaben sind Ergebnisse automatischer Prüfungen. Es gab keine Prüfung
mit Nutzenden. Eine verbesserte Gebrauchstauglichkeit ist damit nicht belegt.

## 1. Testzahlen je Zweig

Jeder Zweig wurde an genau dem genannten Commit in einem eigenen
Arbeitsverzeichnis geprüft. Spätere Commits auf einem Zweig ändern nur
Dokumentation; das lässt sich mit
`git diff --stat <geprüfter Commit> <Zweig> -- . ':!docs' ':!*.md'` nachprüfen
(leere Ausgabe).

| Zweig | Geprüfter Commit | Frontend-Tests | Backend-Tests | Browserprüfungen |
|---|---|---|---|---|
| `claude/basis-fehlerbehebungen` | `8bb68232249738203e4af1ebe1a1912279518ff5` | 27 | 52 | 5 von 5 |
| `claude/paket-1-kantenlesbarkeit` | `62e88d90f92b4f5e0566572465bb2898459cd71f` | 29 | 52 | 12 von 12 |
| `claude/paket-2-knotenverschieben` | `bc116ac107d494af0d8c0a0f890823bf033ac789` | 35 | 52 | 38 von 38 |
| `claude/paket-3-szenarien-ohne-ansicht` | `f17fb2ef2cfcda9e12b62d34e6212d4aac1d0eb2` | 30 | 89 | 28 von 28 |
| `claude/paket-3-szenarien` | `4e21d7d94c1b123c83dca775442e6a19879f48e9` | 31 | 96 | 37 von 37 |
| `claude/paket-4-windows-app` | `095a2426c9efbe586b64684239d8d815e2789c65` | 27 | 76 | 5 von 5 |
| `claude/integration-gesamtvorschlag` | `439da19a2fbd81dcfd18ae763b04dc64e7f3fa1f` | 41 | 120 | 77 von 77 |
| `claude/paket-5-bildexport` | `7cf416607d83453f856b6e3ba5299f3f47f04241` | 58 | 128 | 113 von 113 |

Auf jedem dieser Stände sind außerdem `npm run lint` und `npm run build`
bestanden. Kein Test ist fehlgeschlagen oder übersprungen.

Zuordnung zu den Skripten:

| Zahl | Befehl | Dateien |
|---|---|---|
| Frontend-Tests | `npm run test:frontend` | `tests/frontend/*.test.js` |
| Backend-Tests | `python -m pytest -q` | `tests/test_*.py` |
| Browserprüfungen | `node tests/browser/run-checks.cjs <Adresse>` | `tests/browser/checks/*.cjs` |

Die Browserprüfungen liefen in Chromium 158 (headless, 1440 × 900) gegen den
Produktions-Build (`npm run build`), den das Backend selbst ausliefert
(`python -m uvicorn backend.api:app --port <Port>`).

Zusammensetzung der Browserprüfungen:

| Prüfgruppe | Datei | Prüfungen | Enthalten in |
|---|---|---|---|
| Basis | `10-basis.cjs` | 5 | allen Zweigen |
| Paket 1 | `20-kanten.cjs` | 7 | Paket 1, Integration |
| Paket 2 | `30-knoten.cjs` | 33 | Paket 2, Integration |
| Paket 3 | `40-szenario.cjs` | 23 | Paket 3 (beide Varianten), Integration |
| Paket 3, Ansichtszustand | `45-szenario-ansicht.cjs` | 9 | Paket 3, Integration |
| Paket 5, Bildexport | `50-bildexport.cjs` | 35 | Paket 5 |

Auf dem Zweig von Paket 5 enthält `40-szenario.cjs` zusätzlich S-3b (24 statt 23
Prüfungen, Meldungskorrektur); 77 + 1 + 35 = 113.

Zusammensetzung der Backend-Tests: 52 aus dem Ausgangsstand, 37 in
`tests/test_scenario_api.py`, 7 in `tests/test_scenario_view_state.py`, 24 in
`tests/test_desktop_launcher.py`. Auf dem Zweig von Paket 5 sind es 32 Tests im
Launcher-Test (8 neu für die Prüfung des Bildexports im Fenster), insgesamt 128.
Frontend-Tests: 58, davon 17 neu in `tests/frontend/imageExport.test.js`.

### Umgebung

Die Zahlen oben entstanden unter Linux mit Python 3.13.18 und Node.js 22.23.5.

### Gegenprobe unter den Bedingungen der vorhandenen CI

Die vorhandene CI (`.github/workflows/ci.yml`) startet nur bei Pull Requests
und auf `main`. Für die Zweige dieser Weiterentwicklung ist sie nicht
gelaufen, weil kein Pull Request angelegt wurde. Ihre Schritte wurden am
26. November 2026 lokal nachgestellt:

| Schritt der CI | Nachgestellt | Ergebnis |
|---|---|---|
| Backend-Tests mit Python 3.12 und den Paketen aus `requirements-lock.txt`, vor dem Build der Oberfläche | alle sieben Stände der Tabelle oben; Python 3.12.3; Pakete mit Hash-Prüfung installiert (mit `uv` statt `pip`); jeweils in einem frischen Export des Commits ohne `dist/` | dieselben Zahlen: 52, 52, 52, 89, 96, 76 und 120; kein Fehlschlag |
| Frontend-Tests, Lint und Build mit Node.js 22 | durch die Prüfung oben abgedeckt (Node.js 22.23.5) | bestanden |
| Container-Image bauen | **nicht ausgeführt**: In der Entwicklungsumgebung läuft kein Docker. | – |

Ersatzweise für den Container-Build wurde der Integrationsstand `439da19` so
ausgeführt, wie das `Dockerfile` ihn zusammensetzt:

- Die Oberfläche wurde nur aus den Dateien gebaut, die das `Dockerfile`
  kopiert (`package.json`, `package-lock.json`, `index.html`,
  `vite.config.js`, `public/`, `src/`): erfolgreich.
- Das Backend lief in einem Verzeichnis, das wie das Image nur `backend/` und
  `dist/` enthält, mit Python 3.12.3 und den Paketen der Lock-Datei:
  77 von 77 Browserprüfungen bestanden.
- `Dockerfile`, `requirements-lock.txt`, `package.json`, `package-lock.json`,
  `vite.config.js` und `index.html` sind gegenüber `main` unverändert.

Das ist kein Nachweis für den Container-Build selbst und keiner für das
Deployment. Beides zeigt erst die CI eines Pull Requests.

## 2. Kombinationen der Pakete

Jede Kombination wurde ab `claude/basis-fehlerbehebungen` neu zusammengeführt
(`git merge --no-ff`) und danach mit Lint, Frontend-Tests, Backend-Tests und
Build geprüft. Browserprüfungen liefen für die Kombinationen nicht, nur für
die einzelnen Pakete und den Gesamtstand.

| Pakete | Zusammenführen | Frontend-Tests | Backend-Tests |
|---|---|---|---|
| 1 + 2 | ohne Konflikt | 37 | 52 |
| 1 + 3 | ohne Konflikt | 33 | 96 |
| 1 + 4 | ohne Konflikt | 29 | 76 |
| 2 + 3 | ohne Konflikt | 39 | 96 |
| 2 + 4 | ohne Konflikt | 35 | 76 |
| 3 + 4 | ohne Konflikt | 31 | 120 |
| 1 + 2 + 3 | ohne Konflikt | 41 | 96 |
| 1 + 2 + 4 | ohne Konflikt | 37 | 76 |
| 1 + 3 + 4 | ohne Konflikt | 33 | 120 |
| 2 + 3 + 4 | ohne Konflikt | 39 | 120 |
| 1 + 2 + 3 + 4 (Integrationszweig) | ohne Konflikt | 41 | 120 |

Verwendete Stände: Paket 1 `62e88d9`, Paket 2 `bc116ac`, Paket 3 `4e21d7d`,
Paket 4 `095a242`. Lint und Build sind in allen Kombinationen bestanden.

Der Commit zu den Pfeilspitzen in Paket 2 (`a4f3f07`) lässt sich auf dem
Zweig mit `git revert a4f3f07` ohne Konflikt zurücknehmen; danach bestehen
Lint und 33 Frontend-Tests. Die Browserprüfungen wurden für diese Variante
nicht ausgeführt.

## 3. Prüfung ohne Internet

### 3.1 Linux, ohne Netzwerkschnittstelle

Der Integrationsstand `439da19` wurde in einem Netzwerk-Namespace ausgeführt,
der nur die Loopback-Schnittstelle besitzt. Verbindungen nach außen scheitern
dort mit „Network is unreachable“.

| Prüfung | Ergebnis |
|---|---|
| Browserprüfungen (Dateiimport, Routing, Knotenverschieben, Szenario speichern und laden) | 77 von 77 |
| Selbsttest des Launchers (`python -m desktop.launcher --smoke-test --probe-internet`) | bestanden, 11 Einzelprüfungen; öffentlicher Host nicht erreichbar |

Nachvollziehen (als `root`, nach `npm run build`):

```bash
unshare -n bash -c '
python3 -c "import fcntl,socket,struct;s=socket.socket();f=struct.unpack(\"16sH\",fcntl.ioctl(s,0x8913,struct.pack(\"16sH\",b\"lo\",0)))[1];fcntl.ioctl(s,0x8914,struct.pack(\"16sH\",b\"lo\",f|1))"
python3 -m uvicorn backend.api:app --host 127.0.0.1 --port 8300 &
sleep 3
node tests/browser/run-checks.cjs http://127.0.0.1:8300/
kill %1'
```

Das belegt die Nutzung ohne Internet für Oberfläche und Backend unter Linux
in Chromium. Es ist kein Nachweis für das Windows-Programm.

Derselbe Ablauf mit dem Stand von Paket 5 (`7cf4166`, am 26. November 2026):
113 von 113 Browserprüfungen, darunter Export als SVG und PNG, und Selbsttest
des Launchers bestanden (11 Prüfungen, öffentlicher Host nicht erreichbar).

### 3.2 Windows, ausgehender Verkehr gesperrt

Siehe Abschnitt 4. Auf dem Windows-Runner wird der ausgehende Verkehr der
Programmdatei und der WebView2-Laufzeit per Firewall gesperrt; danach laufen
Selbsttest und Fenstertest erneut.

### 3.3 Nicht geprüft

Ein Windows-Rechner ganz ohne Netzwerkverbindung (Flugmodus, gezogenes Kabel)
wurde nicht geprüft.

## 4. Windows-Programm

Geprüft wurde auf einem Windows-Runner von GitHub (`windows-latest`), nicht
auf einem Arbeitsplatzrechner. Alle Angaben stammen aus dem Protokoll des
Laufs. Die Artefakte ließen sich aus der Entwicklungsumgebung nicht
herunterladen; das Bildschirmfoto des Fensters wurde deshalb nicht gesichtet,
und die Programmdatei wurde nicht von Hand gestartet.

### 4.1 Lauf am integrierten Stand

| Angabe | Wert |
|---|---|
| Lauf | [Windows-App Nr. 6](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723785015), 25. November 2026 (23:45 UTC), Ergebnis: erfolgreich |
| Geprüfter Commit | `439da19a2fbd81dcfd18ae763b04dc64e7f3fa1f` (`claude/integration-gesamtvorschlag`, alle vier Pakete) |
| Betriebssystem | Microsoft Windows Server 2025 Datacenter, Version 10.0.26100 |
| WebView2 | 157.0.4341.46 |
| Werkzeuge im Lauf | Python 3.12.10, Node.js 22.23.5, PyInstaller 6.22.3, pywebview 6.2.1, FastAPI 0.141.1, Uvicorn 0.53.0, Vite 5.4.21 |
| Programmdatei | Artefakt [`FailoverRoutingVisualizer-windows`](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723785015/artifacts/15073317724) |
| SHA-256 der Programmdatei | `2C6B62586D59ECBCCE447135C5BB7658D74A527AC4D7B1241352CE76F785C0B5` |
| Nachweise | Artefakt [`windows-pruefnachweise`](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723785015/artifacts/15072763935) |
| Skripte | `desktop/build_windows.ps1`, `desktop/test_windows_window.ps1`, `desktop/test_windows_offline.ps1`, `tests/test_desktop_launcher.py` |

Ablauf des Laufs:

| Schritt | Was geprüft wird | Ergebnis |
|---|---|---|
| Build | Oberfläche bauen, Programm mit PyInstaller packen | erfolgreich |
| Selbsttest der gepackten Datei (`--smoke-test`) | ohne Fenster, über die lokale API; 12 Einzelprüfungen, siehe 4.2 | bestanden |
| Launcher-Tests | `tests/test_desktop_launcher.py` unter Windows | 24 bestanden (Ausgabe von pytest: 24 Punkte und `[100%]`; eine Zeile mit der Summe gibt pytest in dieser Einstellung nicht aus) |
| Fenstertest Teil 1 | Oberfläche im WebView2-Fenster bedienen, siehe 4.2; danach läuft kein Prozess des Programms mehr | bestanden |
| Fenstertest Teil 2 | Start per Programmdatei: Programm meldet seine Adresse, API antwortet, lauscht nur auf `127.0.0.1`, Fenster mit Titel „Failover Routing Visualizer“ vorhanden, WebView2 läuft; nach dem Schließen des Fensters kein Prozess, Port frei, API aus | bestanden |
| Fenstertest Teil 3 | Ausweichweg `--browser`: startet, API antwortet, Fenster zum Beenden vorhanden; nach dessen Schließen kein Prozess, Port frei | bestanden |
| Fenstertest Teil 4 (nicht blockierend) | „Szenario speichern“ über den Windows-Dialog | **nicht bestanden**, siehe 4.3 |
| Prüfung ohne Internetzugang | Selbsttest und Fenstertest Teil 1 mit gesperrtem ausgehendem Verkehr, siehe 4.4 | bestanden |

Die Teile 1 bis 3 des Fenstertests umfassen 16 blockierende
Einzelprüfungen; alle sind bestanden. Der nicht blockierende vierte Teil steht
im Ergebnis unter `nicht_blockierend` und ist dort mit `false` vermerkt.

### 4.2 Dateiimport, Routing, Szenario speichern und laden

| Funktion | Wie geprüft | Ergebnis |
|---|---|---|
| Dateiimport | im Fenster: Topologie über das Dateifeld der Oberfläche geladen, 4 Knoten gezeichnet. Im Selbsttest: Import über die API. | bestanden |
| Routing | im Fenster: Bonsai gewählt, eine Kante ausfallen lassen; Anzeige „Failover aktiv“, Erreichbarkeit 4/4, 1 Ausfall, 0 Routingfehler. Im Selbsttest: kürzester Pfad und Bonsai, jeweils mit Ausfall. | bestanden |
| Szenario speichern | im Fenster: „Szenario speichern“ angeklickt; die erzeugte Datei (`szenario-smoke-test-20261125-2348.json`) wurde in der Seite abgefangen. Im Selbsttest: Speichern über die API. | bestanden |
| Szenario laden | im Fenster: Ausfall repariert (0 Ausfälle), die abgefangene Datei über „Szenario laden“ geladen; danach wieder Zielknoten A, Bonsai, 1 Ausfall, „Failover aktiv“, Erreichbarkeit 4/4. Im Selbsttest: gespeichertes Szenario erneut geladen. | bestanden |
| Schutz beim Laden | im Selbsttest: eine nur vom Schema erkennbare Abweichung wird abgewiesen; eine nicht unterstützte Formatversion wird abgewiesen | bestanden |
| Szenario speichern über den Windows-Dialog | siehe 4.3 | **nicht belegt** |
| Bildexport | nicht vorhanden, siehe [PLAN_BILDEXPORT.md](PLAN_BILDEXPORT.md) | nicht prüfbar |

Die 12 Einzelprüfungen des Selbsttests heißen im Ergebnis `health`, `index`,
`assets_local`, `index_without_external_references`, `import`,
`shortest_path`, `bonsai`, `scenario_roundtrip`, `scenario_schema_enforced`,
`scenario_version_checked`, `bound_to_loopback` und
`not_reachable_from_network`.

„Abgefangen“ heißt: Der Fenstertest fängt die Datei ab, die die Oberfläche
beim Klick auf „Szenario speichern“ zum Herunterladen erzeugt, und verwendet
genau diesen Inhalt für „Szenario laden“. Das belegt den Weg durch Oberfläche
und Backend im Programmfenster. Den Weg über den Windows-Dialog auf den
Datenträger belegt es nicht.

### 4.3 Speichern über den Windows-Dialog: nicht belegt

Der vierte Teil des Fenstertests klickt „Szenario speichern“ ohne Abfangen.
Ein Hilfsskript (`desktop/windows_save_dialog_helper.ps1`) soll den Dialog
bedienen. Beobachtet im Lauf Nr. 6:

- Der Dialog „Save As“ des Programms öffnete sich; das Hilfsskript fand ihn.
- Er stand im Ordner `C:\Users\runneradmin\Downloads`. Im Namensfeld stand
  `szenario-smoke-test-20261125-2348`, also der vorgeschlagene Dateiname ohne
  sichtbare Endung.
- Das Hilfsskript konnte weder den Dateinamen setzen noch „Save“ auslösen.
  Namensfeld und Schaltfläche erschienen für die Windows-UI-Automation auf dem
  Runner nur als einfache Fensterflächen (`ControlType.Pane`). Das Protokoll
  des Hilfsskripts meldet in fünf Versuchen „Dateinamenfeld nimmt keinen Wert
  an“ und „Target element cannot receive focus“.
- Der Dialog wurde nicht bestätigt. Es wurde keine Datei geschrieben.

Damit ist belegt, dass der Klick im Programmfenster den Windows-Dialog
öffnet. **Nicht belegt** ist, dass die Datei nach dem Bestätigen mit der
Endung `.json` am gewählten Ort liegt und sich wieder laden lässt. Das sollte
auf einem Arbeitsplatzrechner einmal von Hand geprüft werden. Der Prüfteil ist
im Skript als nicht blockierend gekennzeichnet und ändert das Gesamtergebnis
des Laufs nicht.

Nachtrag vom 26. November 2026: Der Auftraggeber meldete aus einer manuellen
Prüfung des bisherigen Windows-Pakets, dass Start, Szenariospeicherung,
Wiederherstellung nach Neustart sowie Laden und Neuberechnung ohne Internet beim
getesteten Ablauf funktioniert hätten. Das ist eine Angabe ohne Protokoll;
Rechner, Windows-Version und Programmstand sind nicht genannt. Die
automatisierte Prüfung des Dialogs bleibt „nicht belegt“. Für den Bildexport
enthielt diese Rückmeldung nichts; siehe den zweiten Nachtrag.

Zweiter Nachtrag vom 26. November 2026: Eine weitere manuelle Rückmeldung (siehe
[UEBERSICHT_FUER_ERIK.md](UEBERSICHT_FUER_ERIK.md)) meldet für den eigenen
Windows-Rechner: Start, Szenariospeicherung und Wiederherstellung nach Neustart
funktionierten, Laden und Neuberechnung funktionierten ohne Internet, SVG und PNG
ließen sich speichern und öffnen, auch ohne Internet. Das sind Prüfungen der
ausprobierten Abläufe, keine umfassende Abnahme und keine Benutzerstudie. Auch
hier gibt es kein Protokoll; Windows-Version, genaue Programmdatei, die Art der
Internettrennung und was am geöffneten Bild kontrolliert wurde sind nicht
festgehalten. Damit liegt für das Speichern der Bilder erstmals eine Rückmeldung
von Hand vor, und es liegt eine Rückmeldung von einem Windows-Rechner außerhalb
des Runners vor; Windows 10 und 11 sind wegen der fehlenden Versionsangabe nicht
einzeln belegt. Die automatisierte Prüfung des Dialogs bleibt „nicht belegt“.

Im vorherigen Lauf am Integrationsstand `340ea4a`
([Nr. 4](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45722169773))
fand das Hilfsskript das Namensfeld nicht. Die Fassung in `439da19` findet es
und protokolliert die Elemente des Dialogs, kann es aber nicht bedienen.

### 4.4 Prüfung mit gesperrtem Internetzugang

Der ausgehende Verkehr der Programmdatei und von `msedgewebview2.exe` wurde
mit Regeln der Windows-Firewall gesperrt. Zur Kontrolle melden Programm und
Seite, ob sie `github.com` erreichen.

| | Programm erreicht Internet | Seite erreicht Internet | Selbsttest (12 Prüfungen) | Fenstertest Teil 1 |
|---|---|---|---|---|
| ohne Sperre | ja | ja | bestanden | bestanden |
| mit Sperre | nein | nein | bestanden | bestanden |

Mit Sperre liefen im Fenster erneut Dateiimport, Routing, „Szenario
speichern“ (abgefangen) und „Szenario laden“ mit denselben Ergebnissen wie in
4.2.

Damit ist für diesen Runner belegt: Die genannten Funktionen arbeiten in der
gepackten Datei, während weder das Programm noch die Seite das Internet
erreichen. Nicht belegt ist der Betrieb auf einem Rechner ganz ohne
Netzwerkverbindung (Abschnitt 3.3).

### 4.5 Weitere Läufe

| Lauf | Zweig und Commit | Ergebnis | SHA-256 der Programmdatei |
|---|---|---|---|
| [Nr. 5](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723755291) | `claude/paket-4-windows-app`, `095a242` (nur Paket 4) | erfolgreich | `45C5A7241B83DA06C6AD5B4F57A34579B46120813E8D619AABB7464B3E471E26` |
| [Nr. 4](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45722169773) | `claude/integration-gesamtvorschlag`, `340ea4a` (früherer Integrationsstand) | erfolgreich | `677682D99217B82928755A312BB8FAE8E565DDDC2C7812DC78EED28B2A142926` |

Die Läufe Nr. 1 bis 3 gehören zur Entstehung von Paket 4 und sind in
[PAKET_4_WINDOWS_APP.md](PAKET_4_WINDOWS_APP.md) beschrieben.

### 4.6 Beobachtungen im Protokoll des Laufs

- PyInstaller meldete drei nicht gefundene optionale Module
  (`pycparser.lextab`, `pycparser.yacctab`, `tzdata`). Selbsttest und
  Fenstertest der gepackten Datei sind danach bestanden.
- `npm ci` meldete „7 vulnerabilities (2 moderate, 5 high)“ in den
  Abhängigkeiten der Oberfläche. `package.json` und `package-lock.json` sind
  gegenüber `main` unverändert; der Hinweis betrifft den Ausgangsstand und
  wurde nicht untersucht.
- GitHub meldete, dass die verwendeten Actions für Node.js 20 gebaut sind und
  mit Node.js 24 ausgeführt wurden. Fehler traten nicht auf.

### 4.7 Grenzen dieser Prüfung

- Ein Runner mit Windows Server 2025. Windows 10 und Windows 11 auf einem
  Arbeitsplatzrechner wurden nicht geprüft, ebenso wenig SmartScreen und
  Virenscanner.
- Die Oberfläche wurde im Fenster durch eingeschleuste Skripte bedient, nicht
  durch Maus und Tastatur einer Person.
- Die Testtopologie des Fenstertests hat 4 Knoten.
- Speichern über den Windows-Dialog: nicht belegt (4.3).
- Rechner ohne Netzwerkverbindung: nicht geprüft (3.3).
- Die Programmdatei ist nicht signiert.

### 4.8 Lauf am Stand von Paket 5

| Angabe | Wert |
|---|---|
| Lauf | [Windows-App Nr. 8](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45839046074), 26. November 2026, von Hand ausgelöst, Ergebnis: erfolgreich |
| Geprüfter Commit | `7cf416607d83453f856b6e3ba5299f3f47f04241` (`claude/paket-5-bildexport`) |
| Betriebssystem, WebView2 | Microsoft Windows Server 2025 Datacenter (10.0.26100), WebView2 157.0.4341.46 |
| Programmdatei | Artefakt [`FailoverRoutingVisualizer-windows`](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45839046074/artifacts/15126998436) |
| SHA-256 der Programmdatei | `3DF15124A54865705C50DFDE1FC9342F39BA7A70B78C0E367BE64E79F456BBD1` |
| Nachweise | Artefakt [`windows-pruefnachweise`](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45839046074/artifacts/15128145313) |

| Schritt | Ergebnis |
|---|---|
| Build, Selbsttest der gepackten Datei (12 Einzelprüfungen) | bestanden |
| Launcher-Tests unter Windows | 32 bestanden |
| Fenstertest, Teile 1 bis 3 (16 blockierende Prüfungen) | bestanden |
| Bildexport im Fenster: SVG als XML geprüft, PNG im Fenster dekodiert (1760 × 1104, Rand sauber), Zustand unverändert, 0 Anfragen an die API | bestanden |
| Szenario speichern und laden im Fenster (abgefangener Download) | bestanden |
| Prüfung ohne Internetzugang: Selbsttest und Fenstertest mit gesperrtem ausgehendem Verkehr; Programm und Seite erreichen `github.com` nicht (ohne Sperre ja) | bestanden |
| Fenstertest, Teil 4 (nicht blockierend): Windows-Dialog für das Szenario | **nicht bestanden**, unverändert gegenüber 4.3 |

Der Bildexport wird im Fenster mit abgefangenen Downloads geprüft. Der
Windows-Dialog „Speichern unter“ ist für Bilder wie für Szenarien nicht
automatisiert belegt (4.3). Einzelheiten und Werte stehen in
[PAKET_5_BILDEXPORT.md](PAKET_5_BILDEXPORT.md), Abschnitt „Windows“.

## 5. Unabhängige Prüfung

Stand der Befunde nach Paket 5: unverändert. Paket 5 (Bildexport,
Meldungskorrektur) hat A2b, A6, A7, A7b und B12 auftragsgemäß nicht bearbeitet;
sie sind weiterhin offen. Der Bildexport wurde nicht von einem eigenen
Prüflauf untersucht; seine Gegenproben stehen in
[PAKET_5_BILDEXPORT.md](PAKET_5_BILDEXPORT.md).

### 5.1 Vorgehen

Ein getrennter Prüflauf hat am 25. November 2026 den damaligen
Integrationsstand (`1b49ece`, lokal, vor den Korrekturen) untersucht. Er
durfte nichts am Repository verändern und sollte gezielt nach Schwächen
suchen, die die vorhandenen Tests nicht abdecken. Er meldete keinen
kritischen, drei größere und mehrere kleinere Befunde. Seine Skripte liegen
unter [`tests/review/`](../../tests/review/README.md).

Der Prüflauf konnte nichts unter Windows ausführen. Die Windows-Punkte in
Abschnitt 5.3 stammen aus dem Lesen des Codes.

### 5.2 Befunde aus der Ausführung

| Nr. | Befund | Schwere | Paket | Stand | Nachweis |
|---|---|---|---|---|---|
| A1 | Eine verspätete Antwort ersetzte ein inzwischen geladenes Szenario; die Anzeige „Geladenes Szenario“ blieb stehen, und „Szenario speichern“ schrieb die falsche Topologie. | größer | 3 | **behoben** in `3d3ce76` | `tests/review/p3_race.cjs` (Zeilen R1), Browserprüfung S-19b |
| A2 | Das Laden eines Szenarios blockierte den gesamten Server. | größer | 3 | **behoben** in `3d3ce76`: Prüfung und Neuberechnung laufen außerhalb der Ereignisschleife | während eines Ladevorgangs von 3,4 s antwortete `/api/health` in 0,07 s |
| A2b | Die Grenze von 10 MiB begrenzt nicht die Rechenzeit; eine gültige Datei mit 2500 Knoten brauchte rund 40 s. | größer | 3 und Ausgangsstand | **offen** | `tests/review/gen_big.py`; gilt ebenso für den vorhandenen Topologieimport |
| A3 | Der Launcher startete nicht, wenn ein Proxy ohne Ausnahme für `127.0.0.1` eingestellt war. | größer | 4 | **behoben** in `9c25bc5` | `test_local_requests_ignore_a_configured_proxy` |
| A4 | Serverfehler 500 bei Zahlen mit 400 Stellen, bei übertiefer Verschachtelung und bei nicht darstellbaren Zeichen; im letzten Fall wurde trotz Fehler eine Sitzung angelegt. | kleiner | 3 | **behoben** in `3d3ce76` | drei Tests in `tests/test_scenario_api.py`; `tests/review/api_fuzz.py` meldet keinen Fall mehr |
| A5 | `1e400` wurde als unendliche Zahl angenommen; die danach gespeicherte Datei ließ sich nicht mehr laden. | kleiner | 3 | **behoben** in `3d3ce76` | `test_numbers_outside_the_finite_range_are_rejected` |
| A6 | Nicht endliche Zahlen im Rumpf einer JSON-Anfrage (`POST …/scenario`, auch das vorhandene `PATCH`) führen zu Serverfehler 500 statt 422. | kleiner | 3 und Ausgangsstand | **offen** | am 25. November erneut nachgestellt; die Oberfläche kann solche Werte nicht senden |
| A7 | Gespeicherte Ansichtspositionen umgehen die Begrenzung aus Paket 2; extreme Werte führten zu Darstellungsfehlern. | kleiner | 2 und 3 | **teilweise behoben** in `4e21d7d`: Positionen jenseits von ±100 000 werden abgewiesen | `tests/review/p3_ui.cjs`: `ui_vis_far.json` und `ui_vis_pos_huge.json` werden abgewiesen. **Offen:** Positionen innerhalb der Grenze können außerhalb des sichtbaren Bereichs liegen. |
| A7b | Topologiekoordinaten um ±1e308 erzeugen ungültige Zeichenwerte und einen leeren Graphen. | kleiner | Ausgangsstand | **offen** | `tests/review/p3_ui.cjs`: `ui_pos_1e308_spread.json` |
| A8 | Stark hineingezoomt am Rand gegriffen, ließ sich ein Knoten größtenteils aus der Fläche ziehen. | kleiner | 2 | **behoben** in `bc116ac` | Browserprüfung N-9e; `tests/review/p2_drag.cjs` (Zeile D) |
| A9 | Uneinheitliche Anrede, fehlender Hinweis bei einer Szenariodatei unter „Topologie laden“, missverständliche Meldung bei der Zahl 1.0 als Formatversion, ungekürzte Fehlertexte. | kleiner | 3 | **behoben** in `3d3ce76` | Tests in `tests/test_scenario_api.py`, Browserprüfung S-19 |
| A10 | Dokumentation: Verweis auf ein nicht vorhandenes Dokument zu Paket 4, widersprüchliche Aussage zum Schema, falsches Datum. | kleiner | 3, 4 | **behoben** (`f17fb2e`, `f52ce23`, Datumskorrekturen) | – |
| A10b | `ARCHITECTURE.md` und `REQUIREMENTS.md` nennen die neuen Schnittstellen nicht. | kleiner | 3 | **ergänzt** auf `claude/docs-weiterentwicklung`: beide Dokumente haben einen gekennzeichneten Abschnitt „Ergänzungen nach der Bachelorarbeit“; die Teile zum Stand der Arbeit sind unverändert | Dokumentationsänderung, kein Testlauf |
| A11 | Die Seite ist 16 Pixel höher als das Fenster; ein Ziehen, das auf der Werkzeugleiste beginnt, scrollt die Seite. | Hinweis | Ausgangsstand | **offen** | `tests/review/scroll_check.cjs` |
| A12 | Doppelte JSON-Schlüssel, ein ungültiges Datum in `created_at` und parallele Kanten bei `multigraph: false` werden angenommen. | Hinweis | 3 | **offen** | `tests/review/api_fuzz.py` |
| A13 | Bei Kanten unter 38 Einheiten Länge endet der Aboreszenzpfeil in der Kantenmitte; die Spitze bleibt verdeckt. | Hinweis | 2 | **offen**, in der Paketdokumentation als Grenze genannt | `tests/review/p2_arrows.cjs` |

### 5.3 Befunde aus dem Lesen des Codes

| Nr. | Befund | Paket | Stand |
|---|---|---|---|
| B1 | Ohne tkinter lief der Browsermodus als unsichtbarer Prozess weiter. | 4 | **behoben** in `9c25bc5`; Test `test_browser_mode_without_tk_never_waits_silently`. Auf dem Windows-Runner öffnet sich das Fenster zum Beenden (Abschnitt 4). |
| B2 | Ein Fehler beim Start des Fensters zum Beenden wurde nicht protokolliert. | 4 | **behoben** in `9c25bc5` |
| B3 | Ein Fehler nach dem Öffnen des Programmfensters öffnete zusätzlich den Browser. | 4 | **behoben** in `9c25bc5`; Test `test_error_after_the_window_was_shown_does_not_open_the_browser` |
| B4 | Eine zweite Instanz überschrieb das Protokoll der ersten. | 4 | **behoben** in `9c25bc5`; Test `test_second_start_appends_to_the_log_instead_of_truncating_it` |
| B5 | Die Aussage „kein zweiter Hintergrundprozess“ war ungenau: Die gepackte Datei läuft als zwei Prozesse. | 4 | **berichtigt** in der Dokumentation; auf dem Runner wurden zwei Programmprozesse gezählt, beide enden mit dem Schließen des Fensters |
| B6 | Der Selbsttest prüfte externe Verweise nur in der Startseite. | 4 | Prüfung umbenannt; die Aussage zur Nutzung ohne Internet stützt sich auf Abschnitt 3 und 4 |
| B7 | PowerShell-Skripte ohne Byte-Order-Mark: falsche Umlaute in Windows PowerShell 5.1. | 4 | **behoben** in `4377d5b` |
| B8 | `build_windows.ps1` meldete einen Pfadfehler, wenn der Selbsttest kein Ergebnis schrieb. | 4 | **behoben** in `4377d5b` |
| B9 | Der Fenstertest nutzte einen festen Diagnose-Port. | 4 | **entfallen**: Der Fenstertest prüft die Oberfläche jetzt im Programm selbst |
| B10 | Die Programmdatei wird bereitgestellt, bevor Fenster- und Offline-Prüfung gelaufen sind. | 4 | **unverändert, dokumentiert**: maßgeblich ist die Datei eines vollständig erfolgreichen Laufs |
| B11 | Der Workflow läuft nach einer Übernahme in `main` nicht automatisch. | 4 | **offen**, Entscheidung bei der Übernahme |
| B12 | Der lokale Server prüft weder `Origin` noch `Host`. Eine Webseite im Browser desselben Rechners kann Anfragen an den lokalen Port schicken. | 4 | **offen**; Port wechselt bei jedem Start, Daten sind nicht vertraulich |
| B13 | Fehlt das Paket `jsonschema`, entfällt die Schemaprüfung stillschweigend (Verhalten des Ausgangsstands). | 3 | Code **unverändert**. Für das gepackte Programm prüft der Selbsttest, dass eine nur vom Schema erkennbare Abweichung abgewiesen wird (Abschnitt 4). |
| B14 | Eine Datei mit leerem Feld `visualization` schaltet die Namensanzeige ein, eine Datei ohne das Feld nicht. | 3 | **offen**, in der Paketdokumentation genannt |
| B15 | Beim Laden und erneuten Speichern gehen `name`, `scenario_id`, `created_at`, `metadata` und `search_configuration` einer fremden Datei verloren. | 3 | **dokumentiert** als Grenze |
| B16 | Sitzungen werden nie aus dem Arbeitsspeicher entfernt (Verhalten des Ausgangsstands). | 3 | **offen** |
| B17 | Die Datendateien im gepackten Programm (Schema, Oberfläche) werden gefunden. | 4 | kein Fehler gefunden; durch den Selbsttest auf Windows bestätigt |

### 5.4 Erneute Ausführung der Prüfskripte am Endstand

Am Integrationsstand `340ea4a`, Backend und Oberfläche lokal gestartet.
Oberfläche und Backend (`src/`, `backend/`) sind zwischen `340ea4a` und dem
zuletzt geprüften Stand `439da19` unverändert; geändert wurden dort nur das
Windows-Paket und dessen Tests.

| Skript | Ergebnis |
|---|---|
| `api_fuzz.py` | 104 Fälle: 31 angenommen (200), 73 abgewiesen (422); Liste `PROBLEMS` leer. Der Prüflauf nannte 105 Fälle; das Skript enthält 104. |
| `roundtrip.py` | `bad 0`: Speichern, Laden und erneutes Speichern stimmen für alle geprüften Kombinationen überein. Bonsai auf der gerichteten GraphML-Topologie wird wie vorgesehen mit 422 abgelehnt. |
| `p3_race.cjs` | Während des Ladens sind Zielknoten, Routingmetrik, „Szenario laden“ und „Szenario speichern“ gesperrt; nach der verspäteten Antwort bleibt das geladene Szenario bestehen; die gespeicherte Datei gehört zur Topologie des Szenarios. „Szenario laden“ ist mit Eingabe- und Leertaste bedienbar. Ein Doppelklick auf „Szenario speichern“ erzeugt eine Datei. |
| `p3_ui.cjs` | 29 Dateien: keine weiße Seite; 7 abgewiesen bei unverändertem Zustand, 22 geladen; Darstellungsfehler nur bei `ui_pos_1e308_spread.json` (Befund A7b). |
| `p2_drag.cjs` | Bei 600 % Zoom am Rand gegriffen bleibt die Knotenmitte 14 Pixel innerhalb. Rechte und mittlere Maustaste verschieben nichts. Kein API-Aufruf während aller Verschiebungen; Routingzusammenfassung unverändert. Zu den Zeilen „bottom“ und „F“ siehe den Hinweis in `tests/review/README.md`. |

### 5.5 Vom Prüflauf geprüft und ohne Befund

- Paket 3, API: Abgesehen von A4 bis A6 antworteten alle Fälle mit 200, 413
  oder 422. Jede angenommene Sitzung ließ sich danach bearbeiten, durchsuchen
  und erneut speichern. Ein gespeicherter `routing_snapshot` wurde nie
  anstelle der Neuberechnung angezeigt.
- Paket 3, Oberfläche: Fehlgeschlagene Ladevorgänge ließen den Zustand und
  die Dateianzeigen unverändert. Die Abfolge Szenario, Topologie, falsche
  Datei, Szenario zeigte jeweils den richtigen Dateinamen im richtigen
  Bereich.
- Paket 2: Verschieben löste keine API-Anfrage aus und änderte kein Ergebnis.
  Pfeilspitzen waren bei 50 %, 102 % und 338 % sichtbar und richtig
  ausgerichtet (Bildschirmfotos gesichtet).
- Paket 1: In der dichten Topologie mit vier Ausfällen waren Grün, Violett,
  Rot gestrichelt mit Kreuz und Grau in allen Anzeigearten unterscheidbar;
  die Legende entsprach der Zeichnung. Die hellblaue Auswahlmarkierung hat
  wie im Ausgangsstand keinen Legendeneintrag.
- Paket 4 unter Linux: Selbsttest bestanden; `SIGINT` und `SIGTERM` beenden
  den Server und geben den Port frei.

### 5.6 Weiterhin nicht geprüft

- Windows 10 und Windows 11 auf einem Arbeitsplatzrechner, SmartScreen,
  Virenscanner.
- Ein Windows-Rechner ohne Netzwerkverbindung.
- Touch-Bedienung, andere Browser als Chromium, Bildschirmleser.
- Nutzung durch Personen.
- Bildexport: Firefox und Safari; Speichern-Dialog von Windows für Bilder
  (automatisiert; nur eine Rückmeldung von Hand ohne Protokoll, 4.3);
  Windows-Arbeitsplatzrechner.
