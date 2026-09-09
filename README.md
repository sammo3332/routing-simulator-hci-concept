# Failover Routing Visualizer

HCI-orientierter Prototyp zur nachvollziehbaren Visualisierung von
Failover-Routingzuständen. Das System verwendet eine bewusst einfache,
deterministische Referenzstrategie; es entwickelt keine neue Routingheuristik.

## Implementierter Vertikalschnitt

- Import von TopoHub-Node-Link-JSON und SNDlib-XML
- validiertes, UI-unabhängiges Graph- und Szenariomodell
- deterministische kürzeste Pfade zum gewählten Ziel
- Bonsai-Modus mit globaler Kantenkonnektivität und deterministischer
  Greedy-Dekomposition
- zirkuläres Routing über vollständige, arc-disjunkte Aboreszenzen
- getrennte Erkennung physischer Trennung, Bonsai-Schleife und Sackgasse
- Baseline- und Fehlerzustand
- Ausfall und Wiederherstellung einzelner Kanten
- Erkennung betroffener und umgeleiteter Knoten
- In-Memory-Sessions in einer Python-API
- React-Visualisierung mit echten API-Ergebnissen
- Auswahl und gerichtete Darstellung einzelner Aboreszenzen
- präziser, mauszentrierter SVG-Zoom mit Pan- und Fit-Funktion
- automatisches Einpassen neuer Topologien und reduzierte Beschriftungen in der Übersicht
- ein- und ausklappbarer, vertikal verstellbarer Ergebnisbereich
- versionierter Szenarioexport im Domänenkern

Round-Robin, RR-Swapping, simulierte Konvergenzzeiten und SQLite gehören nicht
zum aktuellen Pflichtumfang.

## Voraussetzungen

- Python 3.12 oder kompatibel
- Node.js und npm

## Installation

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-core.txt
npm install
```

Unter Windows wird die Umgebung mit `.venv\Scripts\activate` aktiviert.

## Entwicklung starten

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
npm run dev
```

Das Frontend ist anschließend unter `http://127.0.0.1:5173` erreichbar. Vite
leitet `/api` während der Entwicklung an die Python-API auf Port 8000 weiter.

## Verifikation

```bash
npm run test:backend
npm run test:frontend
npm run lint
npm run build
```

Die Test-Fixtures liegen unter `tests/fixtures`. Zusätzlich wurde der
SNDlib-XML-Import mit den Legacy-Dateien Abilene, Atlanta und Germany50
geprüft.

Die unabhängige und exhaustive Validierung kleiner Graphen ist in
[docs/BONSAI_VALIDATION.md](docs/BONSAI_VALIDATION.md) dokumentiert.
Die formative Entwicklungsevaluation, Nutzungsszenarien und das Protokoll für
eine kleine Benutzerstudie stehen in
[docs/hci/HCI_EVALUATION.md](docs/hci/HCI_EVALUATION.md).
Der technische und fachliche Abnahmestand ist in
[docs/hci/SPRINT_ACCEPTANCE.md](docs/hci/SPRINT_ACCEPTANCE.md) zusammengefasst.

## Graphansicht bedienen

- Mit dem Mausrad wird am Mauszeiger zwischen 50 % und 600 % gezoomt.
- `+` und `−` verändern den Zoom in reproduzierbaren Schritten.
- `Einpassen` zentriert die gesamte Topologie mit Rand im sichtbaren Bereich.
- Eine neu geladene Topologie wird automatisch eingepasst.
- Durch Ziehen auf einer freien Graphfläche wird die Ansicht verschoben.
- Die Tasten `+` und `−` steuern den Zoom, wenn der Graph fokussiert ist;
  `F` passt die gesamte Topologie wieder ein.

Bei weniger als 125 % Zoom zeigt die Übersicht nur die Namen wichtiger Knoten
(Ziel, hervorgehobene Quelle, Umleitung oder Fehler). Eindeutige Kürzel bleiben
in allen Knoten sichtbar. Ab 125 % oder über die Schaltfläche `Namen` erscheinen
alle Knotennamen. Der vollständige Name wird beim Zeigen auf einen Knoten sofort
in einem Tooltip eingeblendet. Über `Route hervorheben` lässt sich die Darstellung
auf die Route eines einzelnen Startknotens reduzieren.

Kanten bleiben unabhängig von der Zoomstufe direkt anklickbar. Ziehen ist nur
auf der freien Graphfläche aktiv, damit kein Kantenausfall versehentlich durch
eine Pan-Geste ausgelöst wird.

Die Trennleiste `Details` unter dem Graphen vergrößert oder verkleinert den
gemeinsamen Bereich für Routingzusammenfassung, Ereignisprotokoll und
Interpretation. `Einklappen` gibt dem Graphen den vollständigen vertikalen
Arbeitsbereich; die kompakte Statuszeile bleibt sichtbar. Ein Doppelklick oder
die Taste `Pos1` stellt die Standardgröße wieder her. Mit den Pfeiltasten nach
oben und unten kann die Trennleiste auch per Tastatur verschoben werden.

## Bonsai kurz ausprobieren

1. `tests/fixtures/bonsai_routing_failure.json` importieren.
2. Zielknoten `T` auswählen.
3. Routingstrategie `Bonsai (Greedy)` auswählen.
4. In der automatischen Prüfung nach maximal einem Ausfall suchen.
5. Das Ergebnis in die Simulation übernehmen.

Der Fall zeigt einen weiterhin vorhandenen physischen Pfad von `A` nach `T`,
während die vorberechnete Bonsai-Strategie in eine Schleife gerät. Technische
Details und Abgrenzungen stehen in [docs/BONSAI.md](docs/BONSAI.md).
