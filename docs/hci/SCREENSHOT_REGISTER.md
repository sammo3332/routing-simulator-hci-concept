# Screenshot-Register

Stand: 24. September 2026

Dieses Register ordnet die vorhandenen Screenshots einem reproduzierbaren
Repository-Stand und ihrer Rolle in der formativen HCI-Evaluation zu. Die Bilder
wurden gemeinsam mit Commit
[`94f947a`](https://github.com/sammo3332/routing-simulator-hci-concept/commit/94f947a54ea491bbe198723ca580f4e9dbe5af28)
am 9. September 2026 in das Repository aufgenommen.

Die Aufnahme in denselben Commit belegt ihre Veröffentlichung, nicht zwingend
den exakten Code-Commit, mit dem jeder einzelne Screenshot erzeugt wurde. Weil
diese Zuordnung damals nicht separat protokolliert wurde, werden die Bilder als
**formative Entwicklungsnachweise** und nicht als reproduzierbare finale
Abnahmenachweise behandelt.

## Vorhandene Screenshots

| ID | Datei | Git-Blob-SHA | Größe | Dokumentierter Zustand | Rolle | Für finale Arbeit? |
|---|---|---|---:|---|---|---|
| S-01 | [01_baseline_failover.png](screenshots/01_baseline_failover.png) | `36651e3442441cf66f174e67504d75119db63ee7` | 676.105 B | Shortest-Path-Ausgangszustand mit zwei ausgefallenen Kanten | zeigt den Vertikalschnitt vor sichtbarer Bonsai-Auswahl | **nur historisch** |
| S-02 | [02_algorithm_selection.png](screenshots/02_algorithm_selection.png) | `743864d4b8bce227e84df4a3e911778f5c721408` | 188.460 B | Auswahl zwischen kürzestem Pfad und Bonsai-Greedy | dokumentiert die sichtbare Strategiewahl | **bedingt**, besser neu aufnehmen |
| S-03 | [03_bonsai_arborescence.png](screenshots/03_bonsai_arborescence.png) | `8cd45394294748b123f1559da7bbd9d66a1904ca` | 220.562 B | Bonsai-Modus mit ausgewählter gerichteter Aboreszenz | Funktions- und Erklärungsnachweis | **bedingt**, besser neu aufnehmen |
| S-04 | [04_large_graph_initial.png](screenshots/04_large_graph_initial.png) | `22a5d21484fb9bae3f51ff5560e187649c31229a` | 280.476 B | Germany50 vor verbessertem Auto-Fit und Kürzeln | belegt das ursprüngliche Darstellungsproblem | **nur historisch** |
| S-05 | [05_large_graph_auto_fit.png](screenshots/05_large_graph_auto_fit.png) | `2a35df35faf3d07cc9917fd2692a6192e5cbfda7` | 292.386 B | Germany50 nach Auto-Fit, aber mit zu starker Informationsreduktion | belegt eine verworfene Zwischenlösung | **nur historisch** |
| S-06 | [06_large_graph_abbreviations.png](screenshots/06_large_graph_abbreviations.png) | `9d231032c4340a1e89f6f735b3c025e2a7a5af01` | 380.965 B | Germany50 mit eindeutigen Kürzeln und Tooltip-Konzept | formativer Nachweis der aktuellen Standardidee | **bedingt**, final reproduzierbar neu aufnehmen |
| S-07 | [07_large_graph_all_names.png](screenshots/07_large_graph_all_names.png) | `94af9b4ccff7323c4c54595424f475403709d66e` | 465.489 B | Germany50 mit eingeblendeten vollständigen Namen | dokumentiert die optionale Detailansicht und Überlagerungsgrenze | **ergänzend**, nicht als Standardansicht |

## Fehlende finale Nachweise

Für die Bachelorarbeit sind kontrollierte Neuaufnahmen erforderlich:

| ID | Pflichtaufnahme | Reproduzierbarer Zustand | Zweck |
|---|---|---|---|
| F-01 | Shortest-Path-Normalzustand | Atlanta, festgelegter Zielknoten, keine Ausfälle | Ausgangszustand und visuelle Kodierung |
| F-02 | manueller Ausfall mit Umleitung | Atlanta, dokumentierte Kante, Shortest Path | Reversibilität und Statusänderung |
| F-03 | Bonsai mit ausgewählter Aboreszenz | festgelegte Topologie, Ziel und Baum | Vergleich der Strategie und gerichtete Baumstruktur |
| F-04 | Bonsai-Schleife trotz physischer Verbindung | `tests/fixtures/bonsai_routing_failure.json`, Ziel `T`, automatisch gefundener Einzelausfall | Trennung von physischer Erreichbarkeit und Routingfehler |
| F-05 | Germany50-Standardübersicht | Germany50, Auto-Fit, Kürzel, Details eingeklappt | Skalierbarkeit und Übersicht |
| F-06 | Germany50-Einzelroute | gleicher Zustand wie F-05, festgelegter Startknoten | Details auf Anfrage |

## Aufnahmeprotokoll für finale Screenshots

Für jede neue Aufnahme müssen folgende Angaben zusammen mit der Bilddatei
festgehalten werden:

| Feld | Vorgabe |
|---|---|
| Screenshot-ID | fortlaufend `F-01` bis `F-06` |
| Dateiname | `F-XX_kurzer-zustand.png` |
| Git-Commit | vollständige 40-stellige SHA des ausgeführten Codes |
| Aufnahmedatum | ISO-Format `YYYY-MM-DD` |
| Betriebssystem | Name und Version |
| Browser | Name und Version |
| Fenstergröße | CSS-Pixel, zum Beispiel `1440 × 900` |
| Skalierung | Browserzoom und Betriebssystem-Skalierung |
| Topologie | Quelldatei, Herkunft, Version/Commit und eigener SHA-256 |
| Konfiguration | Ziel, Strategie, Metrik und ausgewählte Aboreszenz |
| Ausfälle | exakte Kanten-IDs in stabiler Reihenfolge |
| Ergebnis | Status, erreichbare Knoten und gegebenenfalls Fehlerklasse |
| Datenschutz | keine Profile, Erweiterungen oder personenbezogenen Inhalte sichtbar |
| Bearbeitung | nur verlustfreier Zuschnitt; keine inhaltliche Retusche |

## Benennungs- und Ablageregel

- Historische Bilder bleiben unter `docs/hci/screenshots/`.
- Finale Abbildungen werden unter `docs/hci/screenshots/final/` abgelegt.
- Eine finale Aufnahme ersetzt keinen historischen Screenshot; beide besitzen
  unterschiedliche Belegfunktionen.
- Bilddatei und Tabellenzeile werden im selben Commit hinzugefügt.
- Nach jeder Neuaufnahme werden Git-Blob-SHA, Dateigröße und vollständige
  Aufnahmeparameter in diesem Register ergänzt.
- Ein Bild darf erst als „final“ bezeichnet werden, wenn die zugehörige
  Browserprüfung auf dem dokumentierten Studienstand bestanden ist.

## Aktueller Befund

Die sieben vorhandenen Bilder dokumentieren die formative Designhistorie.
Für Abbildungen in der Bachelorarbeit werden neue Aufnahmen des festgelegten
Studienstands mit Commit, Browser, Fenstergröße, Topologie und Konfiguration
protokolliert. Die vorhandenen Entwicklungsbilder werden nicht als empirischer
Nachweis der Gebrauchstauglichkeit verwendet.
