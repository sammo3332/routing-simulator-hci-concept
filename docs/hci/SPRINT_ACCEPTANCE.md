# Sprint-Abnahme: Bonsai-Greedy und HCI-Erweiterungen

Stand: 9. September 2026

## 1. Abnahmegegenstand

Diese Abnahme bewertet den vollständigen Vertikalschnitt aus

- Topologieimport,
- kürzestem Pfad und Bonsai-Greedy,
- Aboreszenzkonstruktion und lokalem Failover,
- manuellen und automatisch gesuchten Kantenausfällen,
- getrennter Fehlerklassifikation,
- Graphvisualisierung sowie
- den Ergänzungen für große Topologien.

Der Implementierungsstand wurde mit Pull Request 2 in `main` integriert. Die
HCI-Evaluation mit Entwicklungsbildern liegt anschließend auf dem Branch
`feature/bonsai-greedy-routing`.

## 2. Prüfumgebung

| Bestandteil | Version oder Stand |
|---|---|
| Betriebssystem der automatischen Abnahme | Linux |
| Python | 3.12.14 |
| Node.js | 24.19.0 |
| npm | 11.9.0 |
| Implementierung in `main` | `40669bb` |
| veröffentlichte HCI-Dokumentation | `94f947a` |

## 3. Automatische Abnahme

| Prüfung | Ergebnis |
|---|---|
| Backend-Gesamtsuite | 45 von 45 bestanden |
| Frontend-Logiktests | 14 von 14 bestanden |
| Frontend-Linting | bestanden |
| Vite-Produktions-Build | bestanden |
| Format- und Whitespace-Prüfung | bestanden |

Die beiden ausgegebenen Python-Warnungen betreffen angekündigte
Deprecations in Testabhängigkeiten (`Starlette/httpx` und `anyio`). Sie sind
keine fehlgeschlagenen Produktfunktionen.

## 4. Fachliche Referenzprüfungen

Die wichtigsten fachlichen Eigenschaften wurden zusätzlich als gezielte
Abnahmemenge ausgeführt:

| Referenzprüfung | Automatischer Beleg | Ergebnis |
|---|---|---|
| Import erzeugt eine Session mit realem Routingresultat | `test_import_creates_in_memory_session_and_returns_real_routing` | bestanden |
| Physischer Kantenausfall erzeugt eine korrekte Umleitung | `test_edge_failure_reroutes_and_marks_route_as_changed` | bestanden |
| Bonsai wechselt nach Linkausfall den Baum und stellt zu | `test_bonsai_switches_tree_and_delivers_after_physical_link_failure` | bestanden |
| Physische Trennung und Routingfehler werden unterschieden | `test_result_distinguishes_physical_disconnection_from_routing_failure` | bestanden |
| Automatische Suche meldet nur routingkritische Bonsai-Fälle | `test_bonsai_api_search_returns_only_routing_critical_failure` | bestanden |
| Greedy-Konnektivität stimmt für alle kleinen Referenzgraphen mit unabhängigem Orakel überein | `test_all_connected_simple_graphs_up_to_five_nodes_match_independent_oracle` | bestanden |

Die vollständige unabhängige Bonsai-Validierung ist in
[`../BONSAI_VALIDATION.md`](../BONSAI_VALIDATION.md) beschrieben.

## 5. Abgleich mit den fünf Nutzungsszenarien

| Szenario | Automatisch belegt | Historischer Bildbeleg | Finale manuelle Browserabnahme |
|---|---:|---:|---:|
| A: Normalzustand verstehen | ja | ja | offen |
| B: Kantenausfall und Reparatur | ja | ja | offen |
| C: Routingverfahren und Aboreszenz vergleichen | ja | ja | offen |
| D: Bonsai-Fehler trotz physischer Verbindung | ja | teilweise | offen |
| E: Germany50 navigieren | Logik ja | ja | offen |

„Offen“ bedeutet hier nicht, dass die Funktion fehlt. Die Code- und
Integrationstests sind bestanden. Für die HCI-Aussage muss jedoch noch eine
Person die aktuelle veröffentlichte Oberfläche im Browser anhand des
vorgegebenen Ablaufs bedienen. Ein historischer Screenshot ersetzt keine
Beobachtung der finalen Version.

## 6. Manuelle Abnahmecheckliste

Die folgenden Punkte sind auf einem sauberen lokalen Start auszuführen:

```text
[ ] Backend und Frontend starten ohne Fehlermeldung.
[ ] atlanta.xml wird importiert und vollständig eingepasst.
[ ] Zielknoten und Routingverfahren lassen sich wechseln.
[ ] Eine Kante kann im Graphen deaktiviert und wiederhergestellt werden.
[ ] Statusleiste, Graph, Tabelle und Interpretation zeigen denselben Zustand.
[ ] Bonsai zeigt die gewählte Aboreszenz gerichtet an.
[ ] Ein erfolgreicher Baumwechsel ist in Pfad und Wechselanzahl erkennbar.
[ ] Der Bonsai-Fehlerfall wird als Schleife und nicht als physische Trennung erklärt.
[ ] germany50.xml bleibt mit Kürzeln, Tooltip, Zoom und Einzelroute bedienbar.
[ ] Details lassen sich ein-/ausklappen und vertikal verstellen.
[ ] Einpassen, Mausradzoom, Plus, Minus und Taste F funktionieren.
[ ] Im Browser-Entwicklerwerkzeug erscheinen keine neuen Fehler.
```

## 7. Fachlich offene Entscheidungen

Vor einer endgültigen Betreuerabnahme sind nur noch folgende Punkte zu
bestätigen:

1. Reichen TopoHub-JSON und SNDlib-XML oder ist GML weiterhin verpflichtend?
2. Reichen Paketpfad, Status und Wechselanzahl oder soll der vollständige
   schrittweise Bonsai-Trace im Frontend geöffnet werden können?
3. Werden Greedy, vollständige Aboreszenzen und die zirkuläre Wechselreihenfolge
   als verbindliche Abgrenzung akzeptiert?

Round-Robin, RR-Swapping, Knotenausfälle und eine Datenbank gehören nicht zum
abgenommenen Sprintumfang.

## 8. Abnahmeurteil

Der technische Sprint ist **unter Vorbehalt der manuellen Browserprüfung und
der drei fachlichen Betreuerentscheidungen abnahmefähig**. Es gibt derzeit
keinen automatisierten Testfehler und keine bekannte Blockade im Kernablauf.

Neue größere Funktionen sollten erst begonnen werden, nachdem die manuelle
Checkliste ausgefüllt und die offenen Entscheidungen mit dem Betreuer geklärt
wurden. Die eigentliche Benutzerstudie folgt anschließend mit dem Protokoll aus
[`HCI_EVALUATION.md`](HCI_EVALUATION.md).
