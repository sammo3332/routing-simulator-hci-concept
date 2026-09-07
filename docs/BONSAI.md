# Bonsai-Referenzstrategie

## Umfang

Die Implementierung bildet die im Projekt abgestimmte, einfache Bonsai-Version
ab:

- ungerichtete physische Topologie,
- zwei gerichtete Bögen je physischer Kante,
- globale Kantenkonnektivität `k`,
- `k` vollständige arc-disjunkte Aboreszenzen,
- sequentielle Greedy-Konstruktion,
- zirkuläre Baumreihenfolge ab `T1`,
- physischer Linkausfall deaktiviert beide Richtungen,
- separate Bewertung von physischer Erreichbarkeit und Routingerfolg.

Referenz: [Bonsai: Efficient Fast Failover Routing Using Small Arborescences](https://schmiste.github.io/dsn19.pdf)

## Module

| Datei | Aufgabe |
|---|---|
| `backend/failover_core/bonsai.py` | Connectivity, Greedy-Builder, Routingsimulation und Gesamtergebnis |
| `backend/failover_core/models.py` | Aboreszenzen, gerichtete Bögen, Routingtrace und Statusmodelle |
| `backend/failover_core/search.py` | Strategieabhängige Suche nach minimalen kritischen Ausfallkombinationen |
| `backend/api.py` | Sessionauswahl und serialisierte Bonsai-Ergebnisse |

## Konstruktion

Die globale Kantenkonnektivität wird mit Unit-Capacity-Max-Flow bestimmt. Da ein
ungerichteter Link als zwei Gegenbögen modelliert wird, entspricht der minimale
gerichtete Schnitt dem physischen Kantenschnitt. Parallele Kanten behalten
separate Kapazität.

Für `i = 1, ..., k` wächst `Ti` vom Ziel nach außen. Ein Kandidat `(u, v)` ist
zulässig, wenn `u` noch nicht zum Baum gehört, `v` bereits dazugehört und der
Bogen noch unbenutzt ist. Kandidaten werden zuerst nach der resultierenden
Baumtiefe, anschließend nach Knoten- und Kanten-ID sortiert. Zusätzlich müssen
im verbleibenden Arc-Graphen ohne den Kandidaten noch mindestens `k-i`
bogendisjunkte Wege von `u` zum Ziel existieren.

Jeder fertige Baum enthält für jeden Nicht-Zielknoten genau einen nächsten Hop.
Ein gerichteter Bogen wird höchstens einem Baum zugeordnet; sein Gegenbogen darf
in einem anderen Baum liegen.

## Routing und Ergebnisse

Das Paket beginnt auf `T1` und folgt dessen eindeutigem nächsten Hop. Ist der
zugehörige physische Link ausgefallen, bleibt das Paket am Knoten und wechselt
zum nächsten Baum. Nach `Tk` folgt wieder `T1`.

Ein Trace protokolliert `forward`, `switch`, `delivered`,
`physically_unreachable`, `dead_end` und `loop`.
Für die Schleifenerkennung wird der Zustand `(Knoten, Baum, Eingangsknoten)`
gespeichert. Wiederholt sich dieser Zustand bei unveränderten Ausfällen, ist die
Weiterleitung deterministisch in einer Schleife.

Vor der Routingsimulation wird die physische Erreichbarkeit im Restgraphen
bestimmt. Daraus entstehen vier Statuswerte:

| Status | Bedeutung |
|---|---|
| `delivered` | Bonsai erreicht das Ziel. |
| `physically_unreachable` | Im Restgraphen existiert kein Weg. |
| `dead_end` | Ein Weg existiert, aber die Bonsai-Struktur kann nicht fortsetzen. |
| `loop` | Ein Weg existiert, aber ein Routingzustand wiederholt sich. |

## Automatische Suche

Die bestehende Kombinationserzeugung bleibt erhalten. Im Shortest-Path-Modus
sucht sie weiterhin physische Trennungen. Im Bonsai-Modus meldet sie dagegen nur
Kombinationen, für die mindestens ein Startknoten `dead_end` oder `loop`
erreicht, obwohl er physisch mit dem Ziel verbunden bleibt.

Die Bäume werden für eine Suche einmal ohne Fehler konstruiert und anschließend
für alle Ausfallkombinationen wiederverwendet. Das entspricht statisch
vorberechnetem Fast Failover und vermeidet unnötige Neuberechnungen.

## Bewusste Grenzen

- Bonsai nutzt Hop-Anzahl; importierte Kantengewichte beeinflussen den Builder
  nicht.
- Gerichtete Eingabetopologien werden im Bonsai-Modus verständlich abgewiesen.
- Round-Robin und RR-Swapping sind nicht implementiert.
- Die Kombinationssuche wächst kombinatorisch; die UI begrenzt sie derzeit auf
  höchstens drei gleichzeitige Ausfälle.
- Die klassischen Resilienzaussagen für einzelne gerichtete Arc-Ausfälle lassen
  sich nicht unverändert auf bidirektionale physische Linkausfälle übertragen,
  weil beide Gegenbögen gleichzeitig ausfallen können.

## Reproduzierbarer Demonstrationsfall

`tests/fixtures/bonsai_routing_failure.json` besitzt wegen des Knotens `X` die
globale Kantenkonnektivität `k = 1`. Nach Ausfall der Kante `a` bleibt für `A`
der physische Weg `A-B-T` erhalten. Die einzige vorberechnete Aboreszenz wollte
jedoch `A-T` verwenden. Das zirkuläre Routing kehrt auf denselben Zustand zurück
und meldet deshalb eine Bonsai-Schleife statt einer physischen Trennung.
