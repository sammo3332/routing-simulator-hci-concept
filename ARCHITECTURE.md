# Architekturübersicht

## Ziel und Abgrenzung

Das System ist ein HCI-orientierter Prototyp zur interaktiven Visualisierung von
Failover-Routingzuständen. Der fachliche Schwerpunkt liegt auf der verständlichen
Darstellung von Normalbetrieb, Umleitung und Unerreichbarkeit. Es wird keine neue
Routingheuristik entwickelt.

Als Referenzstrategien dienen eine deterministische Kürzeste-Pfad-Berechnung und
eine deterministische Greedy-Dekomposition nach dem Bonsai-Prinzip. SQLite,
Round-Robin-Vergleiche und simulierte Konvergenzzeiten sind nicht Bestandteil
der implementierten Kernarchitektur.

## Systemkontext

Stand des Diagramms: 15. September 2026.

```mermaid
flowchart TB
    U["Nutzer:in"] -->|"Import, Konfiguration, Ausfall"| F["React-Frontend"]

    subgraph Browser["Präsentationsschicht"]
        F --> V["SVG-Graph, Status, Tabellen und Ereignisprotokoll"]
        F --> B["Flüchtiger React-Zustand: Session-ID und letzte API-Antwort"]
    end

    T["Vite: Entwicklungsserver und Produktions-Build"] -.->|"stellt bereit bzw. erzeugt"| F
    F -->|"HTTP /api: Datei-Bytes oder JSON"| A["FastAPI"]

    subgraph Backend["Anwendungs- und Domänenschicht"]
        A --> S["In-Memory SessionStore"]
        A --> C["UI-unabhängiger Failover-Domänenkern"]
        C --> I["JSON-, SNDlib-XML- und GraphML-Parser"]
        C --> R["Shortest Path und Bonsai-Greedy"]
        C --> X["Ausfallsuche, Validierung und Serialisierung"]
    end

    A -->|"vollständiger konsistenter Zustand"| F
```

Das Diagramm ersetzt die ältere Streamlit-/`st.session_state`-Darstellung in
`docs/system_architecture.png`. Diese bleibt ausschließlich als historischer
Entwurfsstand erhalten.

Das Frontend wird während der Entwicklung durch Vite bereitgestellt; für die
Produktion erzeugt Vite statische Dateien. Vite ist damit ein Entwicklungs- und
Build-Werkzeug und kein fachliches Laufzeitmodul. Der lokale Vite-Server leitet
Requests an `/api` an die FastAPI-Anwendung auf `127.0.0.1:8000` weiter.

Die Kommunikation erfolgt über HTTP. Konfigurationsänderungen und Suchanfragen
verwenden JSON. Beim Topologieimport sendet das Frontend dagegen die Datei als
`application/octet-stream`; der Dateiname steht im Queryparameter. Sämtliche
API-Antworten sind JSON.

### Deploymentstatus

Der frühere Vercel-Stand stellte nur den statischen Vite-Build bereit; eine
Prüfung am 15. September 2026 ergab für `/api/health` deshalb `404 NOT_FOUND`.
Dieser Stand ist keine vollständige Testumgebung.

Das Repository enthält nun einen Multi-Stage-`Dockerfile` für das Gesamtsystem.
In der Build-Stufe erzeugt Vite die statischen Dateien. In der Laufzeitstufe
liefert ein einzelner FastAPI-/Uvicorn-Prozess zuerst die API-Routen und danach
den eingebundenen `dist`-Ordner aus. Damit besitzen Browser und API dieselbe
Origin und benötigen weder Vite-Proxy noch CORS-Konfiguration.

`render.yaml` beschreibt einen einzelnen Docker-Web-Service in Frankfurt mit
`/api/health` als Healthcheck. Die öffentliche Render-Instanz muss noch über das
Hostingkonto mit dem Repository verbunden und danach Ende zu Ende geprüft
werden. Wegen des prozesslokalen `SessionStore` darf der Prototyp nicht auf
mehrere Instanzen oder Worker skaliert werden.

## Schichten und Verantwortlichkeiten

### 1. Präsentationsschicht: React und Vite

Die Präsentationsschicht befindet sich unter `src/`. Sie übernimmt:

- Importauswahl für TopoHub-JSON, SNDlib-XML und GraphML,
- Auswahl von Zielknoten und Routingmetrik,
- Ausfall und Wiederherstellung von Kanten,
- Darstellung von Topologie, Baseline und aktuellem Routingzustand,
- Kennzeichnung umgeleiteter und unerreichbarer Knoten,
- Anzeige von Systemzustand, Erreichbarkeit und Ereignisprotokoll,
- verständliche Interpretation der Auswirkungen eines Fehlers.

React hält die für die Interaktion benötigte Session-ID, die jeweils aktuelle
API-Antwort sowie reine Darstellungszustände in `useState`. Dieser Zustand ist
nicht in `localStorage`, `sessionStorage` oder einer Browserdatenbank
persistiert und geht beim Neuladen verloren. Die fachliche Routingberechnung
findet nicht im Frontend statt.

### 2. Anwendungsschicht: FastAPI

Die API wird in `backend/api.py` definiert und stellt derzeit folgende Endpunkte
bereit:

| Methode | Endpunkt | Aufgabe |
| --- | --- | --- |
| `GET` | `/api/health` | Verfügbarkeitsprüfung |
| `POST` | `/api/sessions/import` | Topologie importieren, Session anlegen und Ausgangszustand berechnen |
| `PATCH` | `/api/sessions/{session_id}` | Ziel, Metrik oder ausgefallene Kanten ändern und Routing neu berechnen |
| `POST` | `/api/sessions/{session_id}/critical-failure-search` | Im Shortest-Path-Modus kleinste physisch trennende, im Bonsai-Modus kleinste routingkritische Ausfallkombination suchen |

Die API validiert Eingaben, koordiniert Sessionzustand und Domänenkern und
liefert eine für das Frontend normalisierte Antwort.

### 3. Sessionzustand: In-Memory `SessionStore`

Jeder Topologieimport erzeugt eine `SimulationSession` mit:

- UUID als Session-ID,
- normalisierter Topologie,
- Routingkonfiguration,
- Menge ausgefallener Kanten.

Der `SessionStore` speichert Sessions in einem prozesslokalen Dictionary. Ein
`RLock` synchronisiert Zugriffe; unveränderliche Dataclasses und
`dataclasses.replace` unterstützen atomare Zustandswechsel.

Diese Entscheidung passt zum interaktiven Prototyp: Zustandsänderungen benötigen
keine Datenbankzugriffe und können unmittelbar neu ausgewertet werden. Daraus
folgen bewusst akzeptierte Grenzen:

- Sessions gehen bei einem Backend-Neustart verloren,
- Sessions werden nicht zwischen mehreren Backend-Prozessen geteilt,
- es gibt derzeit keine Ablauf- oder Löschstrategie,
- die Session-ID muss im Browser verfügbar bleiben.

### 4. Domänenschicht: `backend/failover_core`

Der UI-unabhängige Domänenkern enthält:

- unveränderliche Modelle für Topologie, Routing, Fehler und Ergebnisse,
- Parser und Validierung für TopoHub-JSON, SNDlib-XML und GraphML,
- deterministische Routingberechnung,
- Szenarioimport und -export,
- minimale Ausfallsuche als vom UI unabhängige Kernfunktion.
- Kantenkonnektivität, Greedy-Aboreszenzen und zirkuläre Bonsai-Simulation.

Die Trennung ermöglicht automatisierte Tests ohne Browser und verhindert, dass
Darstellungslogik in die Routingberechnung einfließt.

## Referenzstrategie

Die implementierte Strategie heißt `deterministic_shortest_path`. Für jeden
Knoten wird ein Pfad zum gewählten Ziel berechnet.

Unterstützte Metriken:

- `hop_count`: jede Kante besitzt Kosten von 1,
- `edge_weight`: das importierte Kantengewicht wird verwendet.

Bei gleichwertigen Pfaden erfolgt ein lexikografisches Tie-Breaking anhand von
Knoten- und Kanten-IDs. Dadurch liefert derselbe Eingabezustand reproduzierbare
Ergebnisse. Die Strategie dient als verständliche Grundlage zur Untersuchung der
Visualisierung und ist kein Forschungsbeitrag zu Routingalgorithmen.

## Bonsai-Strategie

Die Strategie `bonsai_greedy` arbeitet ausschließlich auf ungerichteten
physischen Topologien. Jede physische Kante wird intern als zwei gerichtete
Bögen behandelt. Die globale Kantenkonnektivität `k` bestimmt die Zahl der
vollständigen, paarweise arc-disjunkten Aboreszenzen.

Die Bäume werden nacheinander vom Ziel aus aufgebaut. Kandidaten werden nach
der resultierenden Tiefe und danach lexikografisch sortiert. Beim Bau von `Ti`
wird ein Bogen `(u, v)` nur übernommen, wenn im unbenutzten Arc-Graphen ohne
diesen Bogen noch mindestens `k-i` bogendisjunkte Wege von `u` zum Ziel
existieren.

Pakete starten auf `T1`. Ist der benötigte physische Link ausgefallen, wird am
aktuellen Knoten zirkulär zum nächsten Baum gewechselt. Der Trace enthält jeden
Weiterleitungsschritt und jeden Baumwechsel. Ein wiederholter Zustand aus
Knoten, Baum und Eingangsrichtung wird als Schleife erkannt.

Die physische Erreichbarkeit wird unabhängig geprüft. Dadurch unterscheidet die
API `delivered`, `physically_unreachable`, `dead_end` und `loop`. Die
automatische Suche bewertet im Bonsai-Modus nur `dead_end` und `loop` bei
weiterhin bestehender physischer Verbindung als routingkritisch. Weitere
Details stehen in [docs/BONSAI.md](docs/BONSAI.md).

## Baseline, Fehlerzustand und Ergebnissemantik

Für jede Auswertung berechnet der Domänenkern:

- `baseline_paths`: Pfade ohne Kantenausfälle,
- `current_paths`: Pfade unter den aktuell ausgewählten Ausfällen,
- `changed_node_ids`: Knoten, deren aktueller Pfad von der Baseline abweicht,
- `affected_node_ids`: zuvor erreichbare Knoten, die das Ziel nicht mehr erreichen.

Im Shortest-Path-Modus leitet die Oberfläche unerreichbare Knoten aus
`affected_node_ids` ab. Im Bonsai-Modus verwendet sie die getrennten Mengen
`physically_unreachable_node_ids` und `routing_failure_node_ids`. Umgeleitete
Knoten sind die verbleibenden Einträge aus `changed_node_ids`. Dadurch entstehen
vier fachliche UI-Zustände:

| Zustand | Bedingung |
| --- | --- |
| Normalbetrieb | keine Kante ausgefallen |
| Failover aktiv | mindestens eine Kante ausgefallen, aber weder physische Trennung noch Bonsai-Routingfehler |
| Physisch getrennt | mindestens ein Knoten ist im verbleibenden physischen Graphen vom Ziel getrennt |
| Bonsai-Routingfehler | mindestens ein physisch erreichbarer Knoten endet mit `dead_end` oder `loop`; dieser Zustand besitzt in der Statusanzeige Vorrang |

## Datenfluss

Stand des Diagramms: 15. September 2026.

```mermaid
sequenceDiagram
    actor U as Nutzer:in
    participant F as React-Frontend
    participant A as FastAPI
    participant S as SessionStore
    participant C as Domänenkern

    alt Topologie importieren
        U->>F: JSON, SNDlib-XML oder GraphML wählen
        F->>A: POST /api/sessions/import mit Datei-Bytes
        A->>C: Datei parsen und validieren
        C-->>A: normalisierte Topologie
        A->>S: neue Session anlegen
        A->>C: Baseline und aktuellen Zustand berechnen
        C-->>A: Routing- und Fehlerergebnis
        A-->>F: Session-ID und vollständiger Zustand
    else Ziel, Metrik, Strategie oder Ausfälle ändern
        U->>F: Konfiguration ändern oder Kante schalten
        F->>A: PATCH /api/sessions/{session_id} mit JSON
        A->>S: Session lesen, validieren und atomar ersetzen
        S-->>A: aktualisierte Session
        A->>C: Shortest Path oder Bonsai-Greedy auswerten
        C-->>A: Pfade, Status, Änderungen und Bonsai-Trace
        A-->>F: vollständiger aktualisierter Zustand
    end

    opt Kritischen Ausfall suchen
        U->>F: automatische Prüfung starten
        F->>A: POST /api/sessions/{session_id}/critical-failure-search mit JSON
        A->>S: aktive Session lesen
        A->>C: minimale Ausfallkombinationen prüfen
        C-->>A: erster kritischer Fall oder kein Treffer
        A-->>F: Suchergebnis
    end

    F->>F: Graph, Status, Tabellen und Ereignisprotokoll rendern
    F-->>U: Normalzustand, Failover oder Fehlerklasse erklären
```

Der Ablauf ist synchron auf Request-Ebene. Er enthält weder Streamlit-Reruns
noch eine garantierte Hintergrundverarbeitung oder einen festen
12-ms-Leistungswert.

Die API liefert nach jeder Änderung einen vollständigen konsistenten Zustand.
Damit benötigt das Frontend keine eigene Rekonstruktion fachlicher
Zwischenergebnisse.

## Import und Validierung

Unterstützte Eingabeformate:

- TopoHub Node-Link JSON (`.json`),
- SNDlib XML (`.xml`),
- GraphML (`.graphml`) als einzelner einfacher Knoten-/Kanten-Graph.

Der Import normalisiert Knoten, Kanten, Positionen und Gewichte in das gemeinsame
Domänenmodell. Validiert werden unter anderem eindeutige IDs, gültige
Kantenendpunkte, endliche nichtnegative Gewichte und ein Dateigrößenlimit von
10 MiB. DTD- und Entity-Deklarationen in XML werden abgewiesen.

## Qualitätsabsicherung

Die Backendtests decken unter anderem Import, Validierung, Sessionupdates,
direktes Routing, Failover, Unerreichbarkeit, gerichtete und parallele Kanten,
beide Metriken sowie deterministisches Tie-Breaking ab. Der Frontend-Build
prüft die Produktionskompilierung. Die HCI-Zustände werden zusätzlich anhand
reproduzierbarer Szenarien visuell geprüft.

## Bewusste Architekturentscheidungen

| Entscheidung | Begründung |
| --- | --- |
| React statt Streamlit | gezielte interaktive Visualisierung und klare Kontrolle über UI-Zustände |
| FastAPI als Schnittstelle | Trennung von Darstellung und Python-Domänenlogik |
| In-Memory statt SQLite | kurzlebiger interaktiver Simulationszustand ohne Persistenzanforderung |
| deterministische Referenzstrategie | reproduzierbare Grundlage für Visualisierung und HCI-Evaluation |
| vollständige Antworten nach Updates | konsistente UI ohne verteilte fachliche Zustandsrekonstruktion |

## Aktuelle Grenzen

Nicht Teil des gegenwärtigen Prototyps sind insbesondere dauerhafte Persistenz,
verteilte Sessions, Mehrbenutzerbetrieb, eine neue Routingheuristik und eine
vollständige mobile Optimierung. Diese Punkte sind mögliche Erweiterungen, aber
keine Voraussetzung für die Untersuchung der HCI-orientierten
Failover-Visualisierung.
