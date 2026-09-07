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
npm run lint
npm run build
```

Die Test-Fixtures liegen unter `tests/fixtures`. Zusätzlich wurde der
SNDlib-XML-Import mit den Legacy-Dateien Abilene, Atlanta und Germany50
geprüft.

## Bonsai kurz ausprobieren

1. `tests/fixtures/bonsai_routing_failure.json` importieren.
2. Zielknoten `T` auswählen.
3. Routingstrategie `Bonsai (Greedy)` auswählen.
4. In der automatischen Prüfung nach maximal einem Ausfall suchen.
5. Das Ergebnis in die Simulation übernehmen.

Der Fall zeigt einen weiterhin vorhandenen physischen Pfad von `A` nach `T`,
während die vorberechnete Bonsai-Strategie in eine Schleife gerät. Technische
Details und Abgrenzungen stehen in [docs/BONSAI.md](docs/BONSAI.md).
