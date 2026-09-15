# Implementierter Anforderungsumfang

Stand: 15. September 2026

Dieses Dokument beschreibt ausschließlich den im aktuellen Repository
implementierten und überprüften Funktionsumfang des Failover Routing
Visualizers. Maßgeblich sind der Code auf `main`, die automatisierten Tests und
die aktuelle [Architekturdokumentation](ARCHITECTURE.md).

## Produktziel

Der Prototyp unterstützt die interaktive Untersuchung von
Failover-Routingzuständen. Nutzende können eine Netzwerktopologie importieren,
ein Ziel und ein Routingverfahren wählen, physische Kanten ausfallen lassen und
die daraus entstehenden Pfade und Fehlerzustände nachvollziehen.

Das System stellt zwei deterministische Referenzverfahren gegenüber:

1. Neuberechnung kürzester Pfade nach einer Zustandsänderung.
2. Vorberechnetes lokales Failover mit einer Greedy-Konstruktion nach dem
   Bonsai-Prinzip.

## Funktionale Anforderungen

| ID | Implementierte Anforderung | Umsetzung und sichtbares Verhalten |
|---|---|---|
| FA-1 | Topologieimport | TopoHub-Node-Link-JSON, SNDlib-XML und GraphML werden über das Backend eingelesen, validiert und in ein gemeinsames Topologiemodell überführt. Unterstützt wird bei GraphML ein einzelner einfacher Knoten-/Kanten-Graph; gemischte Kantenrichtungen und Hyperkanten werden abgewiesen. |
| FA-2 | Zielknotenauswahl | Der Zielknoten beziehungsweise die Wurzel kann im React-Frontend gewählt werden. Nach einer Änderung wird der Routingzustand über die API neu berechnet. |
| FA-3 | Ausfallsimulation | Einzelne physische Kanten können über den Graphen oder die Kantenauswahl deaktiviert werden. Mehrere gleichzeitige Kantenausfälle werden als gemeinsamer Fehlerzustand verwaltet. |
| FA-4 | Routingverfahren | Nutzende können zwischen `deterministic_shortest_path` und `bonsai_greedy` wechseln. |
| FA-5 | Routingmetrik | Das Shortest-Path-Verfahren unterstützt `hop_count` und `edge_weight`. Die Bonsai-Simulation verwendet Hop-Anzahl. |
| FA-6 | Kürzeste Pfade | Für jeden Knoten wird ein deterministischer Pfad zum Ziel berechnet. Gleiche Kosten werden durch eine stabile Sortierung von Knoten- und Kantenfolgen aufgelöst. |
| FA-7 | Bonsai-Aboreszenzen | Für eine zusammenhängende ungerichtete Topologie werden die Kantenkonnektivität und entsprechend viele vollständige gerichtete Aboreszenzen zum Ziel berechnet. |
| FA-8 | Bonsai-Failover | Trifft ein Paket im aktiven Baum auf eine ausgefallene Kante, wechselt die Simulation am aktuellen Knoten zyklisch zur nächsten Aboreszenz. |
| FA-9 | Fehlerklassifikation | Zustellung, physische Unerreichbarkeit, Bonsai-Schleife und Bonsai-Sackgasse werden getrennt erkannt und ausgegeben. |
| FA-10 | Ergebnisdarstellung | Baseline- und aktuelle Pfade, geänderte und betroffene Knoten, ausgefallene Kanten, Baumwechsel und Fehlerklassen werden im Frontend dargestellt. |
| FA-11 | Netzwerkreparatur | Eine ausgewählte Kante oder alle ausgefallenen Kanten können wiederhergestellt werden. Anschließend wird der Routingzustand neu berechnet. |
| FA-12 | Kritische Ausfallsuche | Ausfallkombinationen werden ab Größe eins bis zu einer gewählten Grenze systematisch geprüft. Für Shortest Path wird physische Unerreichbarkeit gesucht; für Bonsai werden Routingfehler trotz vorhandener physischer Verbindung gesucht. |
| FA-13 | Routenerklärung | Das Backend liefert für jede Bonsai-Route Knoten, Kanten, Anzahl der Baumwechsel und einen schrittweisen Trace mit `forward`, `switch`, `delivered`, `dead_end`, `loop` oder `physically_unreachable`. |
| FA-14 | Szenarioserialisierung im Domänenkern | Szenarien können im UI-unabhängigen Domänenkern anhand eines versionierten JSON-Schemas importiert und exportiert sowie erneut berechnet werden. |

## Benutzeroberfläche und HCI-Anforderungen

| ID | Implementiertes Qualitätsziel | Umsetzung |
|---|---|---|
| HCI-1 | Sichtbarkeit des Systemstatus | Kopfbereich, Kennzahlen, Graph, Routentabelle und Ereignisprotokoll zeigen den aktuellen Zustand konsistent an. |
| HCI-2 | Visuelle Unterscheidbarkeit | Ziel, aktuelle Route, Baseline, ausgewählte Aboreszenz und ausgefallene Kanten besitzen unterscheidbare Farben, Linienarten und Beschriftungen. |
| HCI-3 | Kontrolle und Reversibilität | Ausfälle können gezielt ausgelöst und rückgängig gemacht werden. Ziel, Strategie, Metrik, Baum und hervorgehobene Route sind direkt wählbar. |
| HCI-4 | Verständliche Fehlerdiagnose | Physische Trennung, Schleife und Sackgasse werden fachlich getrennt benannt und in den Ergebnisdaten ausgewiesen. |
| HCI-5 | Navigation großer Graphen | Zoom, Pan, automatisches Einpassen, einklappbare Detailbereiche und Hervorhebung einer einzelnen Route unterstützen die Untersuchung größerer Topologien. |
| HCI-6 | Identifizierbare Knoten | Deterministische eindeutige Kürzel reduzieren Überlagerungen. Vollständige Knotennamen stehen per Tooltip und über eine optionale Namensanzeige zur Verfügung. |
| HCI-7 | Tastaturbedienbare Graphsteuerung | Zoom-, Einpass- und Detailpanel-Steuerungen sind als beschriftete Bedienelemente ausgeführt und per Tastatur erreichbar. |
| HCI-8 | Nachvollziehbare Interaktion | Import, Konfigurationsänderungen, Ausfälle, Reparaturen und Suchergebnisse werden im Ereignisprotokoll dokumentiert. |

Die HCI-Gestaltung orientiert sich insbesondere an der Sichtbarkeit des
Systemstatus, Kontrolle, Konsistenz, Fehlervermeidung und Fehlerdiagnose
([Nielsen 1994](https://doi.org/10.1145/191666.191729)). Für große Graphen wird
das Prinzip „Overview first, zoom and filter, then details-on-demand“ verwendet
([Shneiderman 1996](https://doi.org/10.1109/VL.1996.545307)). Die vollständigen
Literaturangaben stehen im [Quellenregister](docs/QUELLENREGISTER.md).

## Bonsai-Berechnung

Die Bonsai-Implementierung arbeitet auf einer zusammenhängenden ungerichteten
physischen Topologie und führt folgende Schritte aus:

1. Jede ungerichtete Kante wird in zwei gerichtete Bögen überführt.
2. Die globale Kantenkonnektivität `k` wird mit einer
   Unit-Capacity-Max-Flow-Berechnung bestimmt.
3. Der Greedy-Builder erzeugt nacheinander `k` vollständige Aboreszenzen mit
   jeweils genau einem nächsten Hop pro Nicht-Zielknoten.
4. Bei der Auswahl früher Baumkanten wird geprüft, ob genügend gerichtete
   Restpfade für die folgenden Bäume erhalten bleiben.
5. Für jeden Startknoten wird der Paketweg schrittweise simuliert.
6. Bei einer ausgefallenen Baumkante wird am aktuellen Knoten zur nächsten
   Aboreszenz gewechselt.
7. Wiederholte Simulationszustände werden als Schleife erkannt; ein fehlender
   nächster Hop wird als Sackgasse erkannt.
8. Die physische Erreichbarkeit wird unabhängig vom Ergebnis des
   Bonsai-Routings geprüft.

Eine berechnete Bonsai-Zerlegung wird in der Sitzung wiederverwendet, solange
Topologie und Zielknoten unverändert bleiben. Details stehen in
[docs/BONSAI.md](docs/BONSAI.md) und
[docs/BONSAI_VALIDATION.md](docs/BONSAI_VALIDATION.md).

## Systemarchitektur

| Baustein | Implementierte Aufgabe |
|---|---|
| React | Darstellung und Interaktionssteuerung im Browser |
| Vite | Entwicklungsserver, Produktions-Build und lokale Weiterleitung von `/api` an FastAPI |
| FastAPI | HTTP-Schnittstelle für Import, Sitzungsänderungen und kritische Ausfallsuche |
| `SessionStore` | Thread-sichere, prozesslokale Speicherung unveränderlicher Simulationssitzungen |
| Failover-Domänenkern | Parser, Validierung, Shortest Path, Bonsai-Greedy, Failover-Simulation, Suche und Serialisierung |
| JSON über HTTP | Austausch vollständig konsistenter Simulationszustände zwischen Frontend und Backend |

Frontend und Routingkern sind über die API voneinander getrennt. Das Frontend
berechnet keine Routingpfade, sondern bildet die vom Backend gelieferten
Topologie-, Pfad- und Statusdaten ab.

## HTTP-Schnittstellen

| Methode und Pfad | Implementierte Funktion |
|---|---|
| `GET /api/health` | Erreichbarkeit der FastAPI-Anwendung prüfen |
| `POST /api/sessions/import` | Topologiedatei einlesen, eine Sitzung erzeugen und den ersten Routingzustand berechnen |
| `PATCH /api/sessions/{session_id}` | Ziel, Routingstrategie, Metrik oder ausgefallene Kanten aktualisieren und das Ergebnis neu berechnen |
| `POST /api/sessions/{session_id}/critical-failure-search` | Kleinste kritische Ausfallkombination bis zur angegebenen Suchgrenze ermitteln |

## Validierung und Reproduzierbarkeit

- Importdateien sind auf 10 MiB begrenzt.
- Topologie-, Knoten- und Kantenstrukturen werden vor der Berechnung validiert.
- Unbekannte Zielknoten und Kanten-IDs werden abgewiesen.
- XML-Dateien mit DTD- oder Entity-Deklarationen werden abgewiesen.
- Sitzungsänderungen werden vor der Speicherung vollständig geprüft.
- Topologieelemente, Kandidaten und Gleichstände werden deterministisch
  sortiert.
- Die Bonsai-Zerlegung wird bei reinen Fehlerzustandsänderungen aus der Sitzung
  wiederverwendet.
- Die automatische Ausfallsuche verändert den aktiven Sitzungszustand nicht.

## Automatisierte Nachweise

Der dokumentierte Stand wurde am 15. September 2026 mit folgenden Prüfungen
verifiziert:

| Prüfung | Ergebnis |
|---|---:|
| Python-/Backend-/API-/Routingtests | 52 bestanden |
| Frontend-Logiktests | 15 bestanden |
| JavaScript-Linting mit Oxlint | bestanden |
| Produktions-Build mit Vite | bestanden |

Die Tests decken insbesondere Topologieimport, Shortest Path, Bonsai-Aufbau,
Routing-Trace, Fehlerklassifikation, kritische Ausfallsuche,
Szenarioserialisierung, API-Verhalten, Graph-Viewport und Knotendarstellung ab.

Weitere Nachweise befinden sich in der
[Sprint-Abnahme](docs/hci/SPRINT_ACCEPTANCE.md), der
[HCI-Evaluation](docs/hci/HCI_EVALUATION.md) und der
[Architekturdokumentation](ARCHITECTURE.md).
