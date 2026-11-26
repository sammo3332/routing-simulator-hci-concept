# Übergabe: Stand der Weiterentwicklung

Stand: 26. November 2026

Dieses Dokument fasst zusammen, was vorliegt, wie die Teile zusammenhängen
und was offen ist. Belege und Einzelheiten stehen im
[Prüfbericht](PRUEFBERICHT.md) und in den Paketdokumenten.

Eine kurze Übersicht für Erik (was sich geändert hat, wie es sich ausprobieren
lässt, was geprüft ist) steht in
[UEBERSICHT_FUER_ERIK.md](UEBERSICHT_FUER_ERIK.md).

**Dokumentation überarbeitet am 27. November 2026:** README, `ARCHITECTURE.md`,
`REQUIREMENTS.md`, die Windows-Anleitung und die Übersicht für Erik wurden auf
dem Zweig `claude/docs-weiterentwicklung` an den Stand von Paket 5 angepasst.
Der Code entspricht dort unverändert `7cf4166`.

**Ergänzt am 26. November 2026 (Paket 5):** Bildexport als SVG und PNG und
Korrektur der Speichermeldung nach „Szenario speichern“. Beides liegt auf dem
Zweig `claude/paket-5-bildexport` (Abschnitte 1, 2 und 5). Die Zweige und
Aussagen zu den Paketen 1 bis 4 gelten unverändert.

`main`, das Deployment und die Referenzstände der Bachelorarbeit sind
unverändert. Nichts wurde nach `main` übernommen. Die Evaluationsergebnisse
der Arbeit beziehen sich weiterhin auf den damals untersuchten Stand; keines
der Pakete wurde mit Nutzenden geprüft.

## 1. Zweige

Alle Zweige liegen auf GitHub unter
`https://github.com/sammo3332/routing-simulator-hci-concept/tree/<Zweig>`.

| Zweig | Inhalt | Geprüfter Commit |
|---|---|---|
| `claude/referenz-bachelorarbeit-ed3b68c` | technischer Referenzstand der Arbeit | `ed3b68c` (unverändert) |
| `claude/referenz-vor-weiterentwicklung-99c2962` | letzter Stand vor der Weiterentwicklung | `99c2962` (unverändert) |
| `claude/ausgangsstand-main-ba4c99a` | `main` zu Beginn dieser Arbeit | `ba4c99a` (unverändert) |
| `claude/basis-fehlerbehebungen` | gemeinsame Fehlerbehebungen und Prüfwerkzeug | `8bb6823` |
| `claude/paket-1-kantenlesbarkeit` | Basis + Paket 1 | `62e88d9` |
| `claude/paket-2-knotenverschieben` | Basis + Paket 2 | `bc116ac` |
| `claude/paket-3-szenarien` | Basis + Paket 3 einschließlich Ansichtszustand | `4e21d7d` |
| `claude/paket-3-szenarien-ohne-ansicht` | Basis + Paket 3 ohne Ansichtszustand | `f17fb2e` |
| `claude/paket-4-windows-app` | Basis + Paket 4 | `095a242`, danach nur Dokumentation |
| `claude/integration-gesamtvorschlag` | Basis + alle vier Pakete + Prüfskripte der unabhängigen Prüfung | `439da19`, danach nur Dokumentation |
| `claude/paket-5-bildexport` | Integrationsstand + Korrektur der Speichermeldung + Bildexport + Erweiterung des Fenstertests | Code `7cf4166`, danach nur Dokumentation |
| `claude/docs-weiterentwicklung` | Stand von `claude/paket-5-bildexport` mit überarbeiteter Dokumentation | Code wie `7cf4166`; nur Dokumentation geändert |
| `claude/gallant-fermat-h4hdmg` | Sitzungszweig: Integrationsstand per Merge; zusätzlich aus der ersten Sitzung das frühere Änderungsprotokoll mit seinen Bildschirmfotos und das frühere Prüfskript `tests/browser/interaction-checks.cjs` | Anwendung und Tests wie Integrationszweig; der Unterschied besteht nur aus den genannten Dateien |

Die vollständigen Commit-Kennungen und alle Testzahlen stehen im
[Prüfbericht](PRUEFBERICHT.md), Abschnitt 1.

Der Zweig `claude/pushtest-probe` entstand beim Prüfen der Schreibrechte. Er
zeigt auf einen Commit des Sitzungszweigs, enthält nichts Eigenes und ließ
sich aus der Entwicklungsumgebung nicht löschen. Er kann auf GitHub gelöscht
werden.

## 2. Übersicht je Paket

### Basis (Voraussetzung für alle Pakete)

| | |
|---|---|
| Funktion | drei Fehlerbehebungen: dieselbe Datei erneut importieren, Mausrad scrollt die Seite nicht mehr mit, Schreibfehler im Interpretationstext; dazu das Browser-Prüfwerkzeug und eine Testtopologie mit 50 Knoten |
| Zweig | `claude/basis-fehlerbehebungen` |
| Commits | `c325f7f` Fehlerbehebungen · `0f7cecb`, `32f59cd`, `affe3f1` Prüfwerkzeug · `a860922`, `8bb6823` Dokumentation |
| Abhängigkeiten | baut auf `main` (`ba4c99a`) |
| Ausgeführte Tests | 27 Frontend-Tests, 52 Backend-Tests, 5 von 5 Browserprüfungen, Lint, Build |
| Offene Punkte | keine |
| Dokument | [BASIS.md](BASIS.md) |

### Paket 1: Kantenlesbarkeit

| | |
|---|---|
| Funktion | Kanten ohne Route im vorhandenen Grauton `#64708a`, deckend (Kontrast 3,61:1 statt 1,14:1); Legendeneintrag „Kante ohne Route“ |
| Zweig | `claude/paket-1-kantenlesbarkeit` |
| Commits | `e06c35e` Umsetzung und Tests · `fbe9468`, `62e88d9` Dokumentation |
| Abhängigkeiten | Basis; kein anderes Paket |
| Ausgeführte Tests | 29 Frontend-Tests, 52 Backend-Tests, 12 von 12 Browserprüfungen (davon 7 für dieses Paket), Lint, Build |
| Offene Punkte | nur künstliche große Topologien geprüft (Atlanta und Germany50 liegen nicht im Repository); Farbfehlsichtigkeit nicht gesondert geprüft |
| Dokument | [PAKET_1_KANTENLESBARKEIT.md](PAKET_1_KANTENLESBARKEIT.md) |

### Paket 2: Knotenverschieben

| | |
|---|---|
| Funktion | Prüfung und Stabilisierung des bereits in `main` enthaltenen Knotenverschiebens: Knoten bleiben in der sichtbaren Fläche, Tooltip erscheint am verschobenen Knoten, Pfeilspitzen der Aboreszenz sind sichtbar |
| Zweig | `claude/paket-2-knotenverschieben` |
| Commits | `ee8f3ba` Stabilisierung · `a4f3f07` Pfeilspitzen (sichtbare Änderung, getrennt) · `bc116ac` Korrektur aus der unabhängigen Prüfung · `246a177` Dokumentation |
| Abhängigkeiten | Basis; kein anderes Paket |
| Ausgeführte Tests | 35 Frontend-Tests, 52 Backend-Tests, 38 von 38 Browserprüfungen (davon 33 für dieses Paket), Lint, Build |
| Offene Punkte | Knoten lassen sich nicht per Tastatur verschieben; bei sehr kurzen Kanten bleibt die Pfeilspitze verdeckt; ein Knoten kann unter der Werkzeugleiste liegen; Touch nicht geprüft |
| Dokument | [PAKET_2_KNOTENVERSCHIEBEN.md](PAKET_2_KNOTENVERSCHIEBEN.md) |

### Paket 3: Szenarien speichern und laden

| | |
|---|---|
| Funktion | „Szenario speichern“ und „Szenario laden“ in der Seitenleiste; API dazu; Ergebnisse werden beim Laden immer neu berechnet; verständliche Fehler bei fehlender oder nicht unterstützter Formatversion und bei ungültigen Dateien; optional Namensanzeige und verschobene Knoten als Ansichtszustand |
| Zweige | `claude/paket-3-szenarien` (vollständig) · `claude/paket-3-szenarien-ohne-ansicht` (ohne Ansichtszustand) |
| Commits | `8b883fc` API · `a0496c0` Oberfläche · `3d3ce76` Korrekturen aus der unabhängigen Prüfung · `aa84a79`, `f17fb2e` Dokumentation · `45873d9`, `4e21d7d` Ansichtszustand (optional) |
| Abhängigkeiten | Basis; kein anderes Paket. Der Ansichtszustand nutzt das Knotenverschieben aus `main`, nicht Paket 2. |
| Ausgeführte Tests | vollständig: 31 Frontend-Tests, 96 Backend-Tests, 37 von 37 Browserprüfungen · ohne Ansichtszustand: 30, 89, 28 von 28 · jeweils Lint und Build · vollständiger Ablauf mit neu gestartetem Backend für beide Verfahren |
| Offene Punkte | Rechenzeit sehr großer Topologien ist nicht begrenzt; nicht endliche Zahlen im Rumpf einer Anfrage führen zu Serverfehler 500; nur Formatversion 1.0; nicht auf zwei verschiedenen Rechnern geprüft. Die neuen Schnittstellen stehen inzwischen in `ARCHITECTURE.md` und `REQUIREMENTS.md` (Zweig `claude/docs-weiterentwicklung`). |
| Dokument | [PAKET_3_SZENARIEN.md](PAKET_3_SZENARIEN.md) |

### Paket 4: Windows-App

| | |
|---|---|
| Funktion | `FailoverRoutingVisualizer.exe`: startet das vorhandene Backend und die vorhandene Oberfläche in einem eigenen Fenster; Server nur auf `127.0.0.1`; endet mit dem Schließen des Fensters; Ausweichweg über den Browser |
| Zweig | `claude/paket-4-windows-app` |
| Commits | `cd78b4e` Launcher · `533952a`, `7b7346d`, `4377d5b`, `095a242` Build und Prüfung unter Windows · `9c25bc5` Korrekturen aus der unabhängigen Prüfung · `121d17f`, `f52ce23` und folgende Dokumentation |
| Abhängigkeiten | Basis (nur durch den Zweig; der Code des Pakets berührt ausschließlich neue Dateien und `.gitignore`); kein anderes Paket |
| Ausgeführte Tests | Linux: 27 Frontend-Tests, 76 Backend-Tests (davon 24 für den Launcher), 5 von 5 Browserprüfungen, Lint, Build · Windows-Runner: Build, Selbsttest der gepackten Datei, 24 Launcher-Tests, Fenstertest, Prüfung ohne Internetzugang – siehe Abschnitt 4 |
| Offene Punkte | nur auf Windows Server 2025 geprüft; Speichern über den Windows-Dialog nicht belegt (Abschnitt 4); nicht signiert; kein Installationsprogramm; Workflow läuft nach Übernahme in `main` nicht automatisch; keine Prüfung der Herkunft von Anfragen an den lokalen Port |
| Dokumente | [PAKET_4_WINDOWS_APP.md](PAKET_4_WINDOWS_APP.md) · [WINDOWS_APP.md](../WINDOWS_APP.md) |

### Paket 5: Bildexport und Korrektur der Speichermeldung

| | |
|---|---|
| Funktion | Schaltflächen „SVG“ und „PNG“ in der Werkzeugleiste der Graphansicht: Bild der gesamten Topologie im aktuellen Zustand (verschobene Knoten, gewählte Routen- und Aboreszenzanzeige, Ausfälle) mit Kopfzeile und Legende, unabhängig von Zoom und Ausschnitt. Dazu die Meldung „Download der Szenariodatei gestartet“ statt „Szenario gespeichert“, denn die Seite kann nur den Download anstoßen. |
| Zweig | `claude/paket-5-bildexport` |
| Commits | `598946d` Meldungskorrektur · `6b67840` Bildexport · `fe3e356` Fenstertest · `7cf4166` lange Namen · danach Dokumentation |
| Abhängigkeiten | baut auf dem Integrationsstand auf. Meldungskorrektur: Paket 3. Bildexport: funktional Paket 1 (Legende), im Text Pakete 2 und 3; nur auf dem Integrationsstand ohne Konflikt übertragbar. Beide Commits hängen nicht voneinander ab. |
| Ausgeführte Tests | 58 Frontend-Tests, 128 Backend-Tests, 113 von 113 Browserprüfungen (auch ohne Netzwerkschnittstelle), Vergleich der Oberfläche vor und nach der Änderung (8 von 8 Zuständen identisch), Windows-Runner (Abschnitt 4), Lint, Build |
| Offene Punkte | Speichern-Dialog von Windows für Bilder nicht automatisiert geprüft (Rückmeldung von Hand ohne Protokoll, Abschnitt 4); nur Chromium und WebView2; nur dunkle Darstellung; die in Paket 3 und 4 genannten Befunde bleiben offen |
| Dokumente | [PAKET_5_BILDEXPORT.md](PAKET_5_BILDEXPORT.md) · [KORREKTUR_SPEICHERMELDUNG.md](KORREKTUR_SPEICHERMELDUNG.md) · [PLAN_BILDEXPORT.md](PLAN_BILDEXPORT.md) |

## 3. Was lässt sich einzeln übernehmen?

Jeder Paketzweig besteht aus `main`, der Basis und genau einem Paket. In
diesem Zustand wurde er geprüft (Abschnitt 2). Damit gilt:

| Auswahl | Einzeln übernehmbar? | Beleg |
|---|---|---|
| Basis allein | ja | Zweig geprüft |
| Paket 1 | ja, zusammen mit der Basis | Zweig geprüft |
| Paket 2 | ja, zusammen mit der Basis | Zweig geprüft |
| Paket 2 ohne die Pfeilspitzen | ja, mit `git revert a4f3f07` | Lint und 33 Frontend-Tests bestanden; Browserprüfungen dafür nicht ausgeführt |
| Paket 3 | ja, zusammen mit der Basis | Zweig geprüft |
| Paket 3 ohne Ansichtszustand | ja, eigener Zweig | Zweig geprüft |
| Paket 4 | ja, zusammen mit der Basis | Zweig geprüft, zusätzlich auf dem Windows-Runner |
| jede Kombination aus zwei oder drei Paketen | ja | ohne Konflikt zusammengeführt; Lint, Frontend- und Backend-Tests, Build bestanden; Browserprüfungen dafür nicht ausgeführt |
| alle vier Pakete | ja | Integrationszweig vollständig geprüft |
| Meldungskorrektur (Paket 5) | ja, zusammen mit Paket 3 | ohne Konflikt auf Paket 3 (beide Varianten) und Integration; auf den übrigen Zweigen nicht anwendbar |
| Bildexport (Paket 5) | **nur auf dem Integrationsstand** | dort ohne Konflikt und geprüft; auf Zweigen mit einzelnen Paketen Konflikte in `src/App.jsx`, nicht gelöst und nicht geprüft; funktional von Paket 1 abhängig |

Kein Paket lässt sich ohne die Basis über seinen Zweig übernehmen. Paket 4
hängt technisch nicht von den Korrekturen der Basis ab.

Die vorhandene CI ist für diese Zweige nicht gelaufen: Sie startet nur bei
Pull Requests und auf `main`, und ein Pull Request wurde nicht angelegt. Ihre
Schritte wurden lokal nachgestellt, bis auf den Bau des Container-Images
([Prüfbericht](PRUEFBERICHT.md), Abschnitt 1).

Inhaltliche Berührungspunkte, die keine Abhängigkeit sind:

- Paket 4 erlaubt Downloads im Fenster, damit „Szenario speichern“ aus
  Paket 3 dort einen Speichern-Dialog öffnet. Ohne Paket 3 ist das
  wirkungslos.
- Die Selbsttests von Paket 4 prüfen Szenarien nur, wenn Paket 3 enthalten
  ist.
- Positionen aus einer Szenariodatei (Paket 3) unterliegen nicht der
  Begrenzung, die Paket 2 beim Ziehen anwendet.

Übernehmen, ausgehend von `main` (Beispiel Paket 1):

```bash
git checkout -b auswahl main
```

```bash
git merge --no-ff origin/claude/paket-1-kantenlesbarkeit
```

Weitere Pakete folgen mit je einem weiteren `git merge --no-ff`. Für den
Gesamtvorschlag genügt `origin/claude/integration-gesamtvorschlag`.

## 4. Windows-Programm

### Programmdatei mit Bildexport (Paket 5)

`FailoverRoutingVisualizer.exe` mit allen vier Paketen und Paket 5, gebaut und
geprüft im vollständig erfolgreichen Lauf am Code-Stand von Paket 5:

| | |
|---|---|
| Lauf | [Windows-App Nr. 8](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45839046074), Commit `7cf4166`, 26. November 2026, von Hand ausgelöst, Ergebnis: erfolgreich |
| Herunterladen | Artefakt [`FailoverRoutingVisualizer-windows`](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45839046074/artifacts/15126998436) (ZIP, rund 20 MB); Anmeldung bei GitHub nötig; GitHub löscht das Artefakt am 24. Februar 2027 |
| SHA-256 der Programmdatei | `3DF15124A54865705C50DFDE1FC9342F39BA7A70B78C0E367BE64E79F456BBD1` |

Die Programmdatei ließ sich aus der Entwicklungsumgebung nicht herunterladen und
wurde nicht von Hand gestartet. Kurzanleitung und Voraussetzungen: siehe unten
(unverändert). Was an dieser Datei geprüft ist:

| Funktion | Ergebnis |
|---|---|
| Start, eigenes Fenster, nur `127.0.0.1`, Beenden mit dem Fenster, Ausweichweg über den Browser | bestanden |
| Dateiimport, Routing (Bonsai mit Ausfall) im Programmfenster | bestanden |
| **Bildexport im Programmfenster:** SVG (als XML geprüft) und PNG (1760 × 1104 Pixel, im Fenster dekodiert, Rand sauber), Zustand unverändert, 0 Anfragen an die API; Downloads in der Seite abgefangen | bestanden |
| „Szenario speichern“ und „Szenario laden“ im Programmfenster (abgefangener Download) | bestanden |
| dieselben Funktionen einschließlich Bildexport, während Programm und WebView2 per Firewall vom Internet getrennt sind | bestanden |
| Windows-Dialog „Speichern unter“ bis zur Datei auf dem Datenträger (Szenario und Bilder) | **nicht automatisiert belegt**; für Szenarien und für Bilder liegt je eine Rückmeldung von Hand vor (26. November 2026, ohne Protokoll, siehe unten) |

Grenzen wie bisher: Windows Server 2025 auf dem Runner, kein Arbeitsplatzrechner,
kein Windows-Rechner ganz ohne Netzwerkverbindung, nicht signiert. Das
Bildschirmfoto des Laufs wurde nicht gesichtet.

Rückmeldung von Hand (26. November 2026, eigener Windows-Rechner, ohne
Protokoll): Start, Szenariospeicherung und Wiederherstellung nach Neustart
funktionierten; Laden und Neuberechnung funktionierten ohne Internet; SVG und
PNG ließen sich speichern und öffnen, auch ohne Internet. Windows-Version,
genaue Programmdatei und die Art der Internettrennung sind nicht festgehalten.
Das sind Prüfungen der ausprobierten Abläufe, keine umfassende Abnahme und keine
Benutzerstudie ([Prüfbericht](PRUEFBERICHT.md), 4.3).

### Programmdatei ohne Bildexport (Integrationsstand)

`FailoverRoutingVisualizer.exe` mit den vier Paketen 1 bis 4, gebaut und geprüft
im vollständig erfolgreichen Lauf am integrierten Stand:

| | |
|---|---|
| Lauf | [Windows-App Nr. 6](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723785015), Commit `439da19` |
| Herunterladen | Artefakt [`FailoverRoutingVisualizer-windows`](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723785015/artifacts/15073317724) (ZIP, rund 20 MB), auch über die Seite des Laufs unter „Artifacts“ |
| Bedingungen | Anmeldung bei GitHub nötig; GitHub löscht das Artefakt am 23. Februar 2027 |
| SHA-256 der Programmdatei | `2C6B62586D59ECBCCE447135C5BB7658D74A527AC4D7B1241352CE76F785C0B5` |

Das ZIP enthält die Programmdatei, ihre Prüfsumme, das Ergebnis des
Selbsttests und die Liste der installierten Paketversionen. Die Programmdatei
ließ sich aus der Entwicklungsumgebung nicht herunterladen und wurde deshalb
nicht von Hand gestartet. Ein Release wurde nicht angelegt.

Eine Programmdatei nur mit Paket 4, ohne die Pakete 1 bis 3, liegt im
[Lauf Nr. 5](https://github.com/sammo3332/routing-simulator-hci-concept/actions/runs/45723755291)
(Commit `095a242`).

### Kurzanleitung

1. ZIP herunterladen und entpacken.
2. `FailoverRoutingVisualizer.exe` per Doppelklick starten. Zeigt Windows
   „Der Computer wurde durch Windows geschützt“: „Weitere Informationen“ →
   „Trotzdem ausführen“. Die Datei ist nicht signiert.
3. Nach einigen Sekunden öffnet sich das Fenster „Failover Routing
   Visualizer“ mit der bekannten Oberfläche. Bedienung wie im Browser.
4. „Szenario speichern“ öffnet den Windows-Dialog „Speichern unter“, ebenso
   „SVG“ und „PNG“ in der Werkzeugleiste über dem Graphen (nur die
   Programmdatei mit Bildexport).
5. Fenster schließen. Damit endet auch der lokale Server.

Voraussetzungen: Windows 10 oder 11 (64 Bit) mit Microsoft Edge WebView2
Runtime; Python und Node.js sind nicht nötig. Fehlt WebView2, öffnet sich die
Oberfläche im Standardbrowser. Einzelheiten, Aufrufoptionen und Buildanleitung
stehen in [WINDOWS_APP.md](../WINDOWS_APP.md).

### Was an der Programmdatei ohne Bildexport geprüft ist (Integrationsstand)

Auf einem Windows-Runner von GitHub (Windows Server 2025), Einzelheiten im
[Prüfbericht](PRUEFBERICHT.md), Abschnitt 4:

| Funktion | Ergebnis |
|---|---|
| Start per Programmdatei, eigenes Fenster, Server nur auf `127.0.0.1`, vollständiges Beenden mit dem Schließen des Fensters | bestanden |
| Dateiimport über die Oberfläche im Programmfenster | bestanden |
| Routing im Programmfenster (Bonsai mit Ausfall) und über die API (kürzester Pfad und Bonsai mit Ausfall) | bestanden |
| „Szenario speichern“ und „Szenario laden“ im Programmfenster, mit in der Seite abgefangener Datei | bestanden |
| dieselben Funktionen, während Programm und WebView2 per Firewall vom Internet getrennt sind | bestanden |
| „Szenario speichern“ über den Windows-Dialog bis zur Datei auf dem Datenträger | **nicht belegt**: Der Dialog öffnet sich, ließ sich automatisiert aber nicht bestätigen |
| Bildexport | in dieser Programmdatei nicht enthalten (siehe Paket 5 oben) |

### Grenzen der Prüfung

- Kein Arbeitsplatzrechner: Windows 10 und 11, SmartScreen und Virenscanner
  wurden nicht geprüft.
- Die Nutzung ohne Internet ist für Linux ohne Netzwerkschnittstelle und für
  Windows mit Firewall-Sperre belegt. Ein Windows-Rechner ganz ohne
  Netzwerkverbindung wurde nicht geprüft.
- Die Oberfläche wurde im Fenster durch Skripte bedient, nicht von einer
  Person. Das Bildschirmfoto des Laufs wurde nicht gesichtet.
- Die Programmdatei ist nicht signiert; es gibt kein Installationsprogramm.

### Bitte beim ersten Start von Hand prüfen

1. Startet das Programm per Doppelklick, und erscheint das Fenster?
2. Topologie laden, Zielknoten wählen, eine Kante ausfallen lassen.
3. „Szenario speichern“: Liegt nach dem Bestätigen des Dialogs eine Datei mit
   der Endung `.json` im gewählten Ordner?
4. Programm schließen, neu starten, „Szenario laden“: Stimmen Topologie,
   Zielknoten, Verfahren und Ausfälle?
5. Nach dem Schließen: Ist im Task-Manager kein Eintrag
   „FailoverRoutingVisualizer“ mehr vorhanden?
6. Nur für die Programmdatei mit Bildexport (Paket 5): Auf „SVG“ und auf
   „PNG“ klicken und jeweils den Dialog bestätigen. Liegt danach eine Datei mit
   der Endung `.svg` beziehungsweise `.png` im gewählten Ordner? Zeigt sie beim
   Öffnen (Browser, Bildbetrachter) die gesamte Topologie mit Kopfzeile und
   Legende, auch wenn im Programm stark hineingezoomt war?

## 5. Bildexport als PNG oder SVG

**Umgesetzt in Paket 5** (Zweig `claude/paket-5-bildexport`), nachdem der
Prüfauftrag ihn als offen gemeldet hatte (Stand davor: in keinem Zweig, Issue
oder Pull Request vorhanden). Beschreibung, Beispiele, Prüfung und Grenzen:
[PAKET_5_BILDEXPORT.md](PAKET_5_BILDEXPORT.md); der ursprüngliche Plan mit den
Abweichungen: [PLAN_BILDEXPORT.md](PLAN_BILDEXPORT.md).

Offen beim Bildexport: die automatisierte Prüfung des Windows-Dialogs „Speichern
unter“ für Bilder (nur eine Rückmeldung von Hand ohne Protokoll, Abschnitt 4),
Firefox und Safari, eine helle Variante für den Druck.

## 6. Unabhängige Prüfung

Ein getrennter Prüflauf hat den integrierten Stand untersucht: kein
kritischer, drei größere und mehrere kleinere Befunde. Von den größeren sind
drei behoben; ein Teilaspekt ist offen (Rechenzeit sehr großer Topologien).
Die vollständige Liste mit Stand und Nachweis je Befund steht im
[Prüfbericht](PRUEFBERICHT.md), Abschnitt 5. Die Skripte des Prüflaufs liegen
unter [`tests/review/`](../../tests/review/README.md).

## 7. Starten

Entwicklung (zwei Terminals), auf jedem Zweig gleich. Die Python-Umgebung wird
vorher wie im [README](../../README.md#lokal-im-browser) eingerichtet.

```bash
npm ci
```

```bash
npm run dev:api
```

```bash
npm run dev
```

Danach `http://127.0.0.1:5173` öffnen.

Prüfungen:

```bash
npm run test:frontend
```

```bash
python -m pytest -q
```

```bash
node tests/browser/run-checks.cjs
```

Das Browser-Prüfskript braucht die laufende Anwendung und eine lokale
Playwright-Installation.

## 8. Offene Entscheidungen

1. Welche Pakete werden übernommen (jetzt einschließlich Paket 5), und wann
   nach `main`? Bis dahin bleibt das Deployment auf dem Stand von `main`.
2. Paket 2: mit oder ohne die sichtbar geänderten Pfeilspitzen?
3. Paket 3: mit oder ohne Ansichtszustand?
4. Paket 5 (Bildexport und Meldungskorrektur): übernehmen? Der Bildexport
   lässt sich ohne Konfliktlösung nur auf dem Integrationsstand übernehmen
   (Abschnitt 3); soll er auf einzelne Pakete übertragen werden? Soll zusätzlich
   eine helle Variante für den Druck folgen? Die Meldungskorrektur hängt nur von
   Paket 3 ab.
5. Windows-Programm: Soll der Build nach einer Übernahme auch für `main`
   laufen? Wird eine Signatur oder ein Installationsprogramm gewünscht? Soll
   ein Release angelegt werden, damit die Programmdatei ohne Ablaufdatum
   bereitsteht?
6. Windows-Programm: Das Speichern über den Windows-Dialog ist nicht
   automatisiert belegt (Abschnitt 4). Für Szenarien und für den Bildexport liegt
   je eine Rückmeldung von Hand vor (26. November 2026, ohne Protokoll). Genügt
   die Prüfung von Hand, oder soll das Hilfsskript des Fenstertests weiter
   angepasst werden?
   Solange es den Dialog nicht bedienen kann, meldet der nicht blockierende
   vierte Teil des Fenstertests in jedem Lauf „nicht bestanden“.
7. Welcher der beiden Referenz-Commits (`ed3b68c` oder `99c2962`) ist der
   abgegebene Stand der Arbeit? Beide sind gesichert.
8. Erledigt: `ARCHITECTURE.md` und `REQUIREMENTS.md` haben auf
   `claude/docs-weiterentwicklung` je einen gekennzeichneten Abschnitt
   „Ergänzungen nach der Bachelorarbeit“; die Teile zum Stand der Arbeit sind
   unverändert.
9. Sollen die offenen Befunde der unabhängigen Prüfung behoben werden
   (Prüfbericht, Abschnitt 5: A2b, A6, A7, A7b, A11, A12, A13, B11, B12, B14,
   B16)? Paket 5 hat A2b, A6, A7, A7b und B12 auftragsgemäß nicht bearbeitet.
10. Aus der ersten Sitzung weiterhin offen: weißer Seitenrand von 8 Pixeln
    mit 16 Pixeln Überlauf (A11).
11. Soll der Zweig `claude/pushtest-probe` gelöscht werden (Abschnitt 1)?
