# Validierung der Bonsai-Greedy-Implementierung

Stand: 7. September 2026

## Ziel

Die Validierung soll nicht nur zeigen, dass die Anwendung ausgeführt werden
kann. Sie prüft unabhängig, ob

1. die globale physische Kantenkonnektivität korrekt berechnet wird,
2. die Greedy-Dekomposition vollständige, gerichtete und arc-disjunkte
   Aboreszenzen erzeugt,
3. die Routing-Traces ausschließlich gültige und aktive Kanten verwenden und
4. physische Trennung und ein Scheitern der Bonsai-Strategie korrekt
   unterschieden werden.

Die permanenten Prüfungen befinden sich in
`tests/test_bonsai_validation.py`. Die Orakel- und Validierungsfunktionen dort
verwenden nicht die internen Max-Flow- oder Baumprüfungen aus
`backend/failover_core/bonsai.py`.

## Unabhängiges Orakel für die Kantenkonnektivität

Für kleine Graphen wird die erwartete Kantenkonnektivität durch vollständige
Enumeration bestimmt:

1. Alle Mengen aus einer physischen Kante werden entfernt.
2. Bleibt der Graph verbunden, werden alle Mengen aus zwei Kanten getestet.
3. Die Suche wird fortgesetzt, bis erstmals eine Menge den Graphen trennt.
4. Die Größe dieser kleinsten Menge ist das unabhängig bestimmte `k`.

Dieses Ergebnis wird mit der Max-Flow-basierten Produktivimplementierung
verglichen.

## Vollständig untersuchte Graphmenge

Der Test erzeugt alle beschrifteten, einfachen und verbundenen ungerichteten
Graphen mit zwei bis fünf Knoten. Mehrfachkanten werden in einem separaten
Unit-Test behandelt.

| Prüfung | Anzahl |
|---|---:|
| Verbundene einfache Graphen | 771 |
| Zielbezogene Greedy-Dekompositionen | 3.806 |
| Vollständig enumerierte Routingsimulationen | 384 |

Für jeden der 771 Graphen wird `k` mit dem unabhängigen Orakel verglichen.
Anschließend wird für jeden möglichen Zielknoten eine neue
Greedy-Dekomposition erzeugt und validiert.

## Validierte Eigenschaften jeder Aboreszenz

Für jeden erzeugten Baum gelten folgende Invarianten:

- Der Baum enthält genau `|V| - 1` gerichtete Bögen.
- Der Zielknoten besitzt keinen nächsten Hop.
- Jeder andere Knoten besitzt genau einen nächsten Hop und eine zugehörige
  physische Kante.
- Die gespeicherte physische Kante verbindet tatsächlich den aktuellen und
  den nächsten Knoten.
- Von jedem Nicht-Zielknoten wird das Ziel ohne Zyklus erreicht.
- Die gespeicherte Baumtiefe entspricht der unabhängig ermittelten maximalen
  Pfadlänge.
- Derselbe gerichtete Bogen wird nicht in zwei Aboreszenzen verwendet.
- Die Anzahl der vollständigen Aboreszenzen entspricht `k`.

## Vollständige Routingprüfung

Für einen Zyklus, einen vollständigen Graphen mit vier Knoten und einen
Graphen mit einem strukturellen Engpass werden alle Teilmengen der physischen
Kanten als Ausfallzustände getestet. Für jeden Zustand werden alle
Startknoten simuliert.

Jeder Trace wird Schritt für Schritt unabhängig kontrolliert:

- `forward` folgt dem nächsten Hop des aktuell angegebenen Baums.
- Die verwendete physische Kante gehört zum Baum und ist nicht ausgefallen.
- `switch` tritt nur auf, wenn die benötigte physische Kante ausgefallen ist.
- Nach einem Wechsel wird der nächste Baum in zirkulärer Reihenfolge benutzt.
- Die gemeldete Wechselanzahl entspricht den `switch`-Schritten.
- Knoten- und Kantenfolge stimmen mit allen `forward`-Schritten überein.
- Eine als zugestellt gemeldete Route endet am Ziel.
- `physically_unreachable` tritt genau dann auf, wenn eine unabhängige
  Breitensuche keinen physischen Weg findet.
- `loop` und `dead_end` werden als Routingfehler trotz physischer
  Erreichbarkeit klassifiziert.

Damit wird insbesondere die unmögliche Kombination ausgeschlossen, dass eine
Route als zugestellt gilt, obwohl sie eine ausgefallene physische Kante benutzt.

## Weitere gezielte Unit- und Integrationstests

Die bestehende Testsuite prüft zusätzlich:

- parallele physische Verbindungen,
- deterministische Ergebnisse bei vertauschter Eingabereihenfolge,
- erfolgreichen Wechsel von `T1` zu `T2`,
- Bonsai-Schleifen bei weiterhin vorhandenem physischem Weg,
- echte physische Trennung,
- automatische Suche nach routingkritischen Ausfallmengen,
- Szenarioexport und erneuten Import,
- API-Sessions und ungültige Eingaben.

## Reproduktion

Im Projektverzeichnis:

```bash
python -m pytest -q
npm run lint
npm run build
```

Ergebnis des dokumentierten Laufs vom 7. September 2026:

| Prüfung | Ergebnis |
|---|---|
| Python-Testfälle | 45 bestanden |
| Unabhängige `k`-Vergleiche | 771 bestanden |
| Validierte Greedy-Dekompositionen | 3.806 bestanden |
| Vollständig validierte Routingläufe | 384 bestanden |
| Frontend-Lint | bestanden |
| Vite-Produktions-Build | bestanden |

## Aussage und Grenzen

Die vollständige Enumeration liefert einen starken Regressions- und
Plausibilitätsnachweis für kleine Graphen. Sie ist jedoch kein mathematischer
Beweis für alle beliebig großen Graphen. Außerdem vergleicht sie die
Implementierung derzeit nicht mit einer zweiten, externen Bonsai-
Referenzimplementierung.

Für die Bachelorarbeit sollte deshalb präzise formuliert werden:

> Die Implementierung wurde für alle verbundenen einfachen Graphen mit bis zu
> fünf Knoten exhaustiv gegen ein unabhängiges Kantenschnitt-Orakel getestet.
> Zusätzlich wurden Baum- und Routinginvarianten sowie alle Ausfallmengen
> ausgewählter Referenzgraphen automatisch validiert.

Als fachliche Ergänzung sollten die drei anschaulichen Referenzfälle
"Zustellung ohne Ausfall", "erfolgreicher Baumwechsel" und "Routingfehler bei
physischer Erreichbarkeit" mit dem Betreuer besprochen werden.
