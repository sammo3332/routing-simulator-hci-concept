# Offene Punkte und Abschlussplan

Stand: 14. September 2026

Dieses Dokument trennt Arbeiten, die ohne neue fachliche Entscheidung erledigt
werden können, von Punkten, die eine Betreuerentscheidung oder eine reale
Benutzerstudie benötigen.

## Bereits abgeschlossen

- aktueller React/FastAPI-/Domänenkern technisch implementiert
- deterministischer kürzester Pfad und Bonsai-Greedy integriert
- TopoHub-JSON- und SNDlib-XML-Import getestet
- physische Trennung, Sackgasse und Schleife getrennt klassifiziert
- automatische Suche nach kritischen Ausfallkombinationen integriert
- Anforderungen als Soll-/Ist-Matrix konsolidiert
- aktuelles System- und Sequenzdiagramm erstellt
- wissenschaftliche Kernquellen korrigiert und vervollständigt
- PoC-Handout als historische, bytegleich geprüfte Archivkopie eingeordnet
- vorhandene Screenshots als formative Entwicklungsnachweise registriert
- private PDF-Autorenmetadaten aus dem öffentlichen Register entfernt

## Vor der Betreuerabnahme zu entscheiden

| ID | Entscheidung | Aktueller Vorschlag | Auswirkung |
|---|---|---|---|
| E-01 | Muss GML zusätzlich zu TopoHub-JSON und SNDlib-XML unterstützt werden? | Nur implementieren, wenn GML ausdrücklich verpflichtend bleibt. | zusätzlicher Parser, Fixtures, Tests und UI-Hinweis |
| E-02 | Muss der vollständige schrittweise Bonsai-Trace im Frontend sichtbar sein? | Nur ergänzen, wenn er für Forschungsfrage oder Erklärung benötigt wird. | neue Detailansicht und HCI-Aufgabe |
| E-03 | Sind Greedy-Konstruktion, vollständige Aboreszenzen und zirkuläre Baumreihenfolge die akzeptierte Bonsai-Abgrenzung? | Aktuelle deterministische Referenzdefinition beibehalten. | entscheidet über fachliche Endabnahme |
| E-04 | Sind Delivery Rate und Stretch verpflichtende Ergebnisgrößen? | Nicht implementieren, solange ihre Berechnung und Relevanz nicht bestätigt sind. | zusätzliche Metrikdefinition, Tests und UI |
| E-05 | Reicht eine formative Studie mit fünf bis acht Personen? | Im Betreuergespräch bestätigen. | Rekrutierung und Auswertungsumfang |

## Technisch noch auszuführen

| Priorität | ID | Aufgabe | Abschlusskriterium |
|---|---|---|---|
| hoch | T-01 | finale manuelle Browserabnahme durchführen | alle Punkte in `docs/hci/SPRINT_ACCEPTANCE.md` ausgefüllt; keine neuen Browserfehler |
| hoch | T-02 | sechs finale Screenshots F-01 bis F-06 aufnehmen | vollständige Metadaten nach `docs/hci/SCREENSHOT_REGISTER.md` |
| hoch | T-03 | Benutzerstudie durchführen | Einwilligung, anonymisierte Rohdaten und vollständig ausgefüllte Aufgabenbögen |
| hoch | T-04 | Benutzerstudie auswerten | Erfolgsanteile, Medianzeiten, Fehlhandlungen, Schwierigkeit und qualitative Muster berichtet |
| mittel | T-05 | tatsächliche Topologiedateien versionieren | Quelle, Abrufdatum, SHA-256 und dauerhafte URL für jeden verwendeten Datensatz |
| mittel | T-06 | Python-Abhängigkeiten vollständig sperren | reproduzierbarer Versionsstand zusätzlich zu `requirements-core.txt` |
| mittel | T-07 | finale Literaturausgabe erzeugen | einheitlicher Zitierstil und Übereinstimmung zwischen Text und Literaturverzeichnis |
| niedrig | T-08 | historische Streamlit-/NetworkX-Artefakte klar archivieren | keine Verwechslung mit aktueller Ist-Architektur |
| abhängig | T-09 | bestätigte Punkte E-01 bis E-04 umsetzen | Code, Tests, Dokumentation und Abnahme gemeinsam aktualisiert |

## Empfohlene Reihenfolge

1. Entscheidungen E-01 bis E-05 in einem Betreuergespräch klären.
2. Nur bestätigte fachliche Änderungen implementieren und automatisiert testen.
3. Einen unveränderlichen Release-/Abnahme-Commit festlegen.
4. Manuelle Browserabnahme T-01 auf genau diesem Commit durchführen.
5. Finale Screenshots T-02 auf demselben Commit aufnehmen.
6. Benutzerstudie T-03 durchführen und T-04 auswerten.
7. Datensatz- und Literaturprovenienz T-05 bis T-07 abschließen.
8. Historische Artefakte T-08 archivieren und Abschlussstand markieren.

## Nicht ohne neue Entscheidung beginnen

- GML-Parser
- Delivery Rate oder Stretch
- vollständige Trace-Detailansicht
- Round-Robin oder RR-Swapping
- Knotenausfälle
- SQLite, dauerhafte Persistenz oder Mehrbenutzerbetrieb
- simulierte oder garantierte Konvergenzzeiten

Diese Begrenzung verhindert, dass historische Mockup-Annahmen unbemerkt wieder
zum Pflichtumfang werden.
