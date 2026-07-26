# Failover Routing Visualizer

HCI-orientierter Prototyp zur nachvollziehbaren Visualisierung von
Failover-Routingzuständen. Das System verwendet eine bewusst einfache,
deterministische Referenzstrategie; es entwickelt keine neue Routingheuristik.

## Implementierter Vertikalschnitt

- Import von TopoHub-Node-Link-JSON und SNDlib-XML
- validiertes, UI-unabhängiges Graph- und Szenariomodell
- deterministische kürzeste Pfade zum gewählten Ziel
- Baseline- und Fehlerzustand
- Ausfall und Wiederherstellung einzelner Kanten
- Erkennung betroffener und umgeleiteter Knoten
- In-Memory-Sessions in einer Python-API
- React-Visualisierung mit echten API-Ergebnissen
- versionierter Szenarioexport im Domänenkern

Bonsai, Greedy-Vergleiche, simulierte Konvergenzzeiten und SQLite gehören
nicht zum aktuellen Pflichtumfang.

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
