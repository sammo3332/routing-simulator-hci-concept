# Offene Punkte und Abschlussplan

Stand: 15. September 2026

Dieses Dokument trennt Arbeiten, die ohne neue fachliche Entscheidung erledigt
werden können, von Punkten, die eine Betreuerentscheidung oder eine reale
Benutzerstudie benötigen.

## Bereits abgeschlossen

- aktueller React/FastAPI-/Domänenkern technisch implementiert
- deterministischer kürzester Pfad und Bonsai-Greedy integriert
- TopoHub-JSON-, SNDlib-XML- und GraphML-Import getestet
- physische Trennung, Sackgasse und Schleife getrennt klassifiziert
- automatische Suche nach kritischen Ausfallkombinationen integriert
- implementierten und geprüften Anforderungsumfang konsolidiert
- aktuelles System- und Sequenzdiagramm erstellt
- wissenschaftliche Kernquellen korrigiert und vervollständigt
- kanonische maschinenlesbare BibTeX-Datei mit stabilen Zitationsschlüsseln angelegt
- PoC-Handout als historische, bytegleich geprüfte Archivkopie eingeordnet
- vorhandene Screenshots als formative Entwicklungsnachweise registriert
- private PDF-Autorenmetadaten aus dem öffentlichen Register entfernt
- Python-3.12-Abhängigkeiten vollständig mit SHA-256-Prüfsummen gesperrt und
  durch eine isolierte Neuinstallation und die Backend-Suite verifiziert
- Ist-Architektur gegen Code, lokalen HTTP-Ablauf und öffentliches Deployment
  geprüft; Datenformate, Vite-Rolle, React-Zustand und Deploymentgrenze korrigiert

## Vor der Betreuerabnahme zu entscheiden

| ID | Entscheidung | Aktueller Vorschlag | Auswirkung |
|---|---|---|---|
| E-02 | Muss der vollständige schrittweise Bonsai-Trace im Frontend sichtbar sein? | Nur ergänzen, wenn er für Forschungsfrage oder Erklärung benötigt wird. | neue Detailansicht und HCI-Aufgabe |
| E-03 | Sind Greedy-Konstruktion, vollständige Aboreszenzen und zirkuläre Baumreihenfolge die akzeptierte Bonsai-Abgrenzung? | Aktuelle deterministische Referenzdefinition beibehalten. | entscheidet über fachliche Endabnahme |
| E-04 | Sind Delivery Rate und Stretch verpflichtende Ergebnisgrößen? | Nicht implementieren, solange ihre Berechnung und Relevanz nicht bestätigt sind. | zusätzliche Metrikdefinition, Tests und UI |

## Technisch noch auszuführen

| Priorität | ID | Aufgabe | Abschlusskriterium |
|---|---|---|---|
| hoch | T-01 | finale manuelle Browserabnahme durchführen | alle Punkte in `docs/hci/SPRINT_ACCEPTANCE.md` ausgefüllt; keine neuen Browserfehler |
| hoch | T-02 | sechs finale Screenshots F-01 bis F-06 aufnehmen | vollständige Metadaten nach `docs/hci/SCREENSHOT_REGISTER.md` |
| hoch | T-03 | Benutzerstudie durchführen | Einwilligung, anonymisierte Rohdaten und vollständig ausgefüllte Aufgabenbögen |
| hoch | T-04 | Benutzerstudie auswerten | Erfolgsanteile, Medianzeiten, Fehlhandlungen, Schwierigkeit und qualitative Muster berichtet |
| hoch | T-10 | Produktionsdeployment für die FastAPI-Endpunkte bereitstellen oder Vercel ausdrücklich als reine Frontend-Vorschau kennzeichnen | `GET /api/health` liefert im vorgesehenen Gesamtsystem `200`; Topologieimport und Sessionupdate funktionieren über dieselbe öffentliche Basis-URL |
| hoch | T-11 | LimeSurvey-Fragebogen nach `docs/hci/USER_STUDY_PROTOCOL.md` anlegen und dem Betreuer zur Prüfung senden | Vorschau geprüft; fünf Aufgaben, zehn SUS-Items und fünf fokussierte Rückfragen vollständig |
| mittel | T-05 | tatsächliche Topologiedateien versionieren | Quelle, Abrufdatum, SHA-256 und dauerhafte URL für jeden verwendeten Datensatz |
| mittel | T-07 | BibTeX-Basis in den Zitierstil der Bachelorarbeit übernehmen | `docs/references.bib` eingebunden; alle im Text verwendeten Schlüssel und Seitenangaben stimmen mit dem finalen Literaturverzeichnis überein |
| niedrig | T-08 | historische Streamlit-/NetworkX-Artefakte klar archivieren | keine Verwechslung mit aktueller Ist-Architektur |
| abhängig | T-09 | bestätigte Punkte E-02 bis E-04 umsetzen | Code, Tests, Dokumentation und Abnahme gemeinsam aktualisiert |

## Empfohlene Reihenfolge

1. Produktionsdeployment T-10 herstellen oder den Abnahmeumfang ausdrücklich
   auf den lokalen Betrieb begrenzen.
2. LimeSurvey-Entwurf T-11 erstellen und vor Veröffentlichung vom Betreuer prüfen lassen.
3. Einen unveränderlichen Release-/Abnahme-Commit festlegen.
4. Manuelle Browserabnahme T-01 auf genau diesem Commit und in der festgelegten
   Zielumgebung durchführen.
5. Finale Screenshots T-02 auf demselben Commit aufnehmen.
6. Benutzerstudie T-03 durchführen und T-04 auswerten.
7. Datensatz- und Literaturprovenienz T-05 bis T-07 abschließen.
8. Historische Artefakte T-08 archivieren und Abschlussstand markieren.

## Nicht ohne neue Entscheidung beginnen

- Delivery Rate oder Stretch
- vollständige Trace-Detailansicht
- Round-Robin oder RR-Swapping
- Knotenausfälle
- SQLite, dauerhafte Persistenz oder Mehrbenutzerbetrieb
- simulierte oder garantierte Konvergenzzeiten

Diese Begrenzung verhindert, dass historische Mockup-Annahmen unbemerkt wieder
zum Pflichtumfang werden.
