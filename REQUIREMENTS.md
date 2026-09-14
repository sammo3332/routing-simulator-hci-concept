# Anforderungen und Umsetzungsstand

Stand: 14. September 2026

Dieses Dokument konsolidiert die Anforderungen des historischen
[PoC-Handouts](docs/handout.pdf) mit dem tatsächlich implementierten Stand auf
`main`. Das Handout bleibt eine historische Anforderungsquelle; bei
Widersprüchen sind der aktuelle Code, die
[Architekturdokumentation](ARCHITECTURE.md) und die
[Sprint-Abnahme](docs/hci/SPRINT_ACCEPTANCE.md) maßgeblich.

## Statusdefinitionen

| Status | Bedeutung |
|---|---|
| **umgesetzt** | im aktuellen Code vorhanden und automatisiert oder dokumentiert geprüft |
| **teilweise umgesetzt** | Kernfunktion vorhanden, einzelne historische Akzeptanzkriterien fehlen |
| **offen** | fachliche Entscheidung oder Umsetzung steht noch aus |
| **ausgeschlossen** | bewusst nicht Teil des aktuellen Pflichtumfangs |

## Funktionale Anforderungen

| ID | Anforderung | Verbindlicher Umfang | Status | Nachweis / offene Abweichung |
|---|---|---|---|---|
| FA-1 | Topologieimport | TopoHub-Node-Link-JSON und SNDlib-XML über das Backend importieren, validieren und normalisieren | **teilweise umgesetzt** | JSON und XML sind implementiert und getestet. Das historisch geforderte GML-Format ist nicht implementiert; seine Pflicht ist mit dem Betreuer zu klären. |
| FA-2 | Zielknotenauswahl | Ziel beziehungsweise Wurzel zur Laufzeit wählen und den Zustand neu berechnen | **umgesetzt** | Auswahl im React-Frontend; Aktualisierung über `PATCH /api/sessions/{session_id}`. |
| FA-3 | Ausfallsimulation | Einzelne Kanten deaktivieren und wiederherstellen; Auswirkungen unmittelbar neu berechnen und darstellen | **umgesetzt** | direkter Kantenausfall, Wiederherstellung, Baseline-/Fehlerzustand und Ereignisprotokoll vorhanden |
| FA-4 | Routingberechnung | deterministischen kürzesten Pfad und eine klar abgegrenzte Bonsai-Greedy-Referenzstrategie vergleichen | **umgesetzt** | globale Kantenkonnektivität, vollständige arc-disjunkte Aboreszenzen, zirkulärer Baumwechsel sowie getrennte Erkennung von Zustellung, physischer Trennung, Sackgasse und Schleife |
| FA-5 | Ergebnis- und Metrikausgabe | Erreichbarkeit, Pfade, geänderte beziehungsweise betroffene Knoten, Fehlerklassen und Bonsai-Baumwechsel verständlich anzeigen | **teilweise umgesetzt** | aktuelle fachliche Ergebnisse werden angezeigt. Die historischen Größen **Delivery Rate** und **Stretch** sind nicht als eigenständige Kennzahlen implementiert. Ein 12-ms-Wert aus dem Mockup ist kein Messnachweis. |
| FA-6 | Netzwerkreparatur | simulierte Ausfälle rückgängig machen und den Ausgangszustand wiederherstellen | **umgesetzt** | einzelne Wiederherstellung und Zurücksetzen des Fehlerzustands sind Teil des Kernablaufs |
| FA-7 | Kritische Ausfallsuche | kleinste kritische Ausfallkombinationen für die aktive Strategie suchen | **umgesetzt** | `POST /api/sessions/{session_id}/critical-failure-search`; im Bonsai-Modus werden Routingfehler trotz physischer Verbindung getrennt bewertet |
| FA-8 | Szenarioaustausch | Simulationsszenarien in einem versionierten, UI-unabhängigen Format serialisieren | **teilweise umgesetzt** | Import-/Exportmodell und JSON-Schema sind im Domänenkern vorhanden; ein vollständiger nutzergeführter Export-/Importablauf im Frontend ist nicht als Pflichtfunktion belegt |

## Nicht-funktionale Anforderungen mit HCI-Fokus

| ID | Qualitätsziel | Konkretisierung | Status |
|---|---|---|---|
| NFA-1 | Kognitive Entlastung | Ziel, aktuelle Route, Baseline, ausgefallene Kanten und ausgewählte Aboreszenz visuell unterscheiden; große Topologien standardmäßig mit eindeutigen Kürzeln darstellen | **umgesetzt** |
| NFA-2 | Sichtbarkeit des Systemstatus | Normalzustand, Failover, physische Trennung und Routingfehler konsistent in Statusbereich, Graph, Ergebnisdarstellung und Ereignisprotokoll zeigen | **umgesetzt**; ein separates Toast-System aus dem historischen Handout ist im aktuellen Stand nicht als Pflichtnachweis erforderlich |
| NFA-3 | Kontrolle und Reversibilität | Ausfälle gezielt auslösen und rückgängig machen; Zoom, Pan, Einpassen, Routenhervorhebung und Ergebnisbereich kontrollieren | **umgesetzt** |
| NFA-4 | Verständliche Fehlerdiagnose | Validierungsfehler sowie `physically_unreachable`, `dead_end` und `loop` unterscheidbar erklären | **umgesetzt** |
| NFA-5 | Reproduzierbarkeit | identische Eingaben durch deterministisches Tie-Breaking und unveränderte Strategieparameter gleich auswerten | **umgesetzt** |
| NFA-6 | Skalierbare Darstellung | Topologien bis zum dokumentierten Germany50-Szenario einpassen und über Kürzel, Tooltip, Zoom und Einzelroute untersuchbar machen | **umgesetzt**, finale manuelle Browserabnahme bleibt offen |
| NFA-7 | Bedienbarkeit und Tastaturunterstützung | zentrale Graph- und Panelaktionen auch per Tastatur anbieten | **teilweise umgesetzt**; Zoom, Einpassen und Detailpanel besitzen Tastatursteuerung, eine vollständige Barrierefreiheitsprüfung liegt nicht vor |
| NFA-8 | Reaktionsverhalten | Zustandsänderungen ohne erfundene oder simulierte Leistungswerte konsistent beantworten | **umgesetzt für den Prototypablauf**; keine garantierte Latenz, keine Hintergrund-Worker und kein 12-ms-Zielwert |
| NFA-9 | Sicherheit beim Import | Dateigröße begrenzen, IDs und Endpunkte validieren sowie DTD-/Entity-Deklarationen in XML ablehnen | **umgesetzt** |

Die HCI-Ziele orientieren sich an Nielsens Heuristiken, insbesondere
Sichtbarkeit des Systemstatus, Kontrolle, Konsistenz, Fehlervermeidung und
Fehlerdiagnose ([Nielsen 1994](https://doi.org/10.1145/191666.191729)).
Für große Graphen folgt die Darstellung Shneidermans Prinzip „Overview first,
zoom and filter, then details-on-demand“
([Shneiderman 1996](https://doi.org/10.1109/VL.1996.545307)).
Die vollständigen Angaben stehen im
[Quellenregister](docs/QUELLENREGISTER.md) unter W-08 und W-09.

## Verbindliche Abgrenzung von FA-4

Die Implementierung entwickelt keine neue Routingheuristik. Sie stellt zwei
deterministische Referenzverfahren gegenüber:

1. `deterministic_shortest_path`: Neuberechnung kürzester Pfade nach einer
   Zustandsänderung; Metriken `hop_count` und `edge_weight`.
2. `bonsai_greedy`: vorberechnete, vollständige und paarweise
   arc-disjunkte Aboreszenzen auf ungerichteten physischen Topologien;
   zirkulärer Wechsel zum nächsten Baum bei ausgefallenem physischem Link.

Bonsai verwendet derzeit Hop-Anzahl. Importierte Kantengewichte beeinflussen den
Greedy-Builder nicht. Gerichtete Eingabetopologien werden für Bonsai
verständlich abgewiesen. Details und Validierungsgrenzen stehen in
[docs/BONSAI.md](docs/BONSAI.md) und
[docs/BONSAI_VALIDATION.md](docs/BONSAI_VALIDATION.md).

## Soll-/Ist-Entscheidungsmatrix

| Thema | Historisches Soll | Aktueller Ist-Stand | Entscheidung |
|---|---|---|---|
| Frontend | Streamlit und `st.session_state` | React und Vite | **React ist verbindlich** |
| Backend | Python-/NetworkX-orientierter Entwurf | FastAPI plus eigener UI-unabhängiger Domänenkern | **aktuelle Architektur ist verbindlich** |
| Sessionzustand | Streamlit Session State, teilweise SQLite erwogen | prozesslokaler In-Memory-`SessionStore` | **In-Memory ist für den Prototyp verbindlich** |
| Import | GML und JSON | TopoHub-JSON und SNDlib-XML | **GML offen** |
| Routing | Bonsai-Heuristik und Baseline | deterministischer kürzester Pfad plus Bonsai-Greedy | **umgesetzt; fachliche Bonsai-Abgrenzung bestätigen** |
| Metriken | Delivery Rate und Stretch | Erreichbarkeit, Pfade, Änderungen und Fehlerklassen | **Delivery Rate/Stretch offen, nicht stillschweigend behaupten** |
| Berechnung | entkoppelte Hintergrundberechnung | synchrone API-Neuberechnung | **kein aktueller Pflichtbestandteil** |
| Leistungswert | beispielhafte 12 ms im Mockup | kein reproduzierbarer Latenznachweis | **nicht verwenden** |
| Bonsai-Trace | interner Ablauf | Trace im Backend, im Frontend nur Pfad, Status und Wechselanzahl | **vollständige Detailansicht offen** |
| Evaluation | formative Entwurfsbewertung | Protokoll und Nutzungsszenarien vorhanden | **Benutzerstudie und finale Browserabnahme offen** |

## Offene fachliche Entscheidungen

Vor der endgültigen Betreuerabnahme müssen drei Fragen entschieden werden:

1. Sind TopoHub-JSON und SNDlib-XML ausreichend oder bleibt GML verpflichtend?
2. Genügen Paketpfad, Status und Wechselanzahl oder muss der vollständige
   schrittweise Bonsai-Trace im Frontend sichtbar sein?
3. Werden Greedy-Konstruktion, vollständige Aboreszenzen und zirkuläre
   Wechselreihenfolge als verbindliche Bonsai-Abgrenzung akzeptiert?

Zusätzlich ist zu entscheiden, ob Delivery Rate und Stretch für die
Forschungsfrage wirklich erforderlich sind. Bis dahin bleiben sie offen und
dürfen nicht als implementiert oder gemessen beschrieben werden.

## Ausgeschlossen aus dem aktuellen Pflichtumfang

- Entwicklung einer neuen Routingheuristik
- Round-Robin und RR-Swapping
- Knotenausfälle
- SQLite oder andere dauerhafte Persistenz
- verteilte Sessions und Mehrbenutzerbetrieb
- simulierte oder garantierte Konvergenzzeiten
- vollständige mobile Optimierung
- statistischer Wirksamkeitsnachweis ohne durchgeführte Benutzerstudie

## Abnahme und Nachweise

Der technische Vertikalschnitt ist gemäß
[docs/hci/SPRINT_ACCEPTANCE.md](docs/hci/SPRINT_ACCEPTANCE.md) unter Vorbehalt
der manuellen Browserprüfung und der offenen fachlichen Entscheidungen
abnahmefähig. Automatische Nachweise umfassen Backend-, API-, Import-, Bonsai-,
Orakel- und Frontend-Logiktests. Die HCI-Evaluation und das Studienprotokoll
stehen in [docs/hci/HCI_EVALUATION.md](docs/hci/HCI_EVALUATION.md).

Das historische [PoC-Handout](docs/handout.pdf) wird nicht gelöscht. Es bleibt
als datierter Entwurfs- und Übergabestand erhalten, ist aber keine Beschreibung
der aktuellen Ist-Architektur.
