# Sprint-Abnahme: Bonsai-Greedy und HCI-Erweiterungen

Stand: 15. September 2026

## 1. Abnahmegegenstand

Diese Abnahme bewertet den vollständigen Vertikalschnitt aus

- Topologieimport,
- kürzestem Pfad und Bonsai-Greedy,
- Aboreszenzkonstruktion und lokalem Failover,
- manuellen und automatisch gesuchten Kantenausfällen,
- getrennter Fehlerklassifikation,
- Graphvisualisierung sowie
- den Ergänzungen für große Topologien.

Der Implementierungsstand wurde mit Pull Request 2 in `main` integriert.
Die HCI-Evaluation und die anschließenden Dokumentationskorrekturen wurden
danach ebenfalls nach `main` übernommen. Der frühere Hinweis auf
`feature/bonsai-greedy-routing` beschreibt nur die Entstehungsgeschichte und
nicht mehr den Ablageort der Dokumentation.

## 2. Prüfumgebung

| Bestandteil | Version oder Stand |
|---|---|
| Betriebssystem der automatischen Abnahme | Linux |
| Python | 3.12.14 |
| Node.js | 24.19.0 |
| npm | 11.9.0 |
| Implementierung in `main` | `40669bb` |
| veröffentlichte HCI-Dokumentation | `94f947a` |
| geprüfter Dokumentationsstand vor Abschlussfortschreibung | `75223b8` |

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

Die späteren Commits bis einschließlich `75223b8` änderten ausschließlich
Dokumentation. Die oben genannten Testergebnisse bleiben der technische
Abnahmenachweis für `40669bb`; sie werden nicht als erneute Ausführung auf
einem späteren Dokumentationscommit ausgegeben.

### Verifikation der Python-Lockdatei

Am 15. September 2026 wurde `requirements-lock.txt` aus
`requirements-core.txt` für Python 3.12 vollständig transitiv erzeugt. Die
Datei sperrt 26 Pakete und enthält SHA-256-Prüfsummen. In einer neu angelegten
virtuellen Umgebung wurden ausschließlich diese gesperrten Pakete installiert.

| Prüfung | Ergebnis |
|---|---|
| Installation mit `--require-hashes` | bestanden |
| Konsistenzprüfung aller installierten Pakete | bestanden, keine Konflikte |
| Backend-Gesamtsuite | 45 von 45 bestanden |

Die Ausführung verwendete Python 3.12.14 auf dem Code- und
Dokumentationsstand `c56b4e0`. Es erschienen dieselben zwei bereits oben
eingeordneten Deprecation-Warnungen aus Testabhängigkeiten.

### Verifikation der Ist-Architektur

Am 15. September 2026 wurde die Architektur erneut gegen den vollständigen
Repository-Stand `11a67d9`, einen lokalen HTTP-Smoke-Test und das öffentliche
Deployment geprüft. Die dabei vorgenommenen Dokumentationskorrekturen ändern
keinen Laufzeitcode.

| Prüfung | Ergebnis |
|---|---|
| Backend-Gesamtsuite | 45 von 45 bestanden; zwei bekannte Deprecation-Warnungen |
| Frontend-Logiktests | 15 von 15 bestanden |
| Frontend-Linting | bestanden |
| Vite-Produktions-Build | bestanden; 48 Module transformiert |
| lokales `GET /api/health` | `200`, Antwort `{"status":"ok"}` |
| lokaler TopoHub-Binärimport | bestanden; Session und vollständiger Routingzustand erzeugt |
| öffentliches `GET /api/health` auf Vercel | `404_NOT_FOUND`; T-10 offen |

Damit sind Komponenten, lokale Kommunikationswege und Zustandsverantwortung
technisch belegt. Der offene Befund betrifft ausschließlich die noch fehlende
Produktionsanbindung des Backends.

### Verifikation des GraphML-Imports

Nach der Betreuerentscheidung vom 15. September 2026 wurde GraphML als drittes
Importformat ergänzt. Neben einer versionierten Test-Fixture wurde die originale
`Abilene.graphml` aus dem Langzeitarchiv des Internet Topology Zoo geprüft
(Git-Blob `330c97a349a80a8f3e1c825072e45ca503d0eab7`).

| Prüfung | Ergebnis |
|---|---|
| Backend-Gesamtsuite | 51 von 51 bestanden; zwei bekannte Deprecation-Warnungen |
| Frontend-Logiktests | 15 von 15 bestanden |
| Frontend-Linting | bestanden |
| Vite-Produktions-Build | bestanden; 48 Module transformiert |
| originale `Abilene.graphml` | 11 Knoten, 14 Kanten, Labels und Koordinaten importiert; 11 Knoten im Referenzrouting erreichbar |

Dieser spätere Lauf ergänzt die historischen Abnahmeläufe, ersetzt aber nicht
deren jeweilige Commit- und Umgebungsangaben.

### Verifikation des gemeinsamen Produktionsprozesses

Am 15. September 2026 wurde der Vite-Build in FastAPI eingebunden und der
vorgesehene Ein-Prozess-Betrieb lokal über HTTP geprüft.

| Prüfung | Ergebnis |
|---|---|
| Backend-Gesamtsuite | 52 von 52 bestanden |
| Frontend-Logiktests | 15 von 15 bestanden |
| Frontend-Linting und Vite-Build | bestanden |
| `GET /` über Uvicorn | `200`, `text/html` |
| `GET /api/health` über dieselbe Origin | `200`, `{"status":"ok"}` |
| GraphML-Import über dieselbe Origin | Session erzeugt; 3 von 3 Fixture-Knoten erreichbar |

Die Containerbeschreibung und Render-Blueprint-Konfiguration sind vorhanden.
Der öffentliche Hosting-Smoke-Test bleibt bis zur Verbindung des Render-Kontos
offen.

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

„Offen“ bedeutet hier nicht, dass die Funktion im lokalen Gesamtsystem fehlt.
Die Code- und Integrationstests sind bestanden. Für die HCI-Aussage muss jedoch
noch eine Person die Oberfläche in der festgelegten Zielumgebung anhand des
vorgegebenen Ablaufs bedienen. Ein historischer Screenshot ersetzt keine
Beobachtung der finalen Version.

Die öffentliche Vercel-URL lieferte am 15. September 2026 für
`GET /api/health` den Status `404 NOT_FOUND`; das Repository enthält keine
Produktionsweiterleitung an FastAPI. Sie ist daher aktuell nur als
Frontend-Vorschau und nicht als abnahmefähiges Gesamtsystem zu behandeln. Die
manuelle Abnahme muss entweder mit lokal gestartetem Backend erfolgen oder nach
Behebung von T-10 im vollständigen Deployment wiederholt werden.

## 6. Manuelle Abnahmecheckliste

Die Bildprovenienz und das Aufnahmeprotokoll für die finale Abnahme stehen im
[Screenshot-Register](SCREENSHOT_REGISTER.md). Der priorisierte weitere Ablauf
steht in [OPEN_ITEMS.md](../OPEN_ITEMS.md).

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

1. GraphML wurde nach dem Betreuertermin vom 15. September ergänzt; die
   tatsächliche Internet-Topology-Zoo-Datei ist noch in der Browserabnahme zu
   prüfen.
2. Reichen Paketpfad, Status und Wechselanzahl oder soll der vollständige
   schrittweise Bonsai-Trace im Frontend geöffnet werden können?
3. Werden Greedy, vollständige Aboreszenzen und die zirkuläre Wechselreihenfolge
   als verbindliche Abgrenzung akzeptiert?

Round-Robin, RR-Swapping, Knotenausfälle und eine Datenbank gehören nicht zum
abgenommenen Sprintumfang.

## 8. Abnahmeurteil

Der technische Sprint ist im lokalen Zwei-Prozess-Betrieb **unter Vorbehalt der
manuellen Browserprüfung und der drei fachlichen Betreuerentscheidungen
abnahmefähig**. Es gibt derzeit keinen automatisierten Testfehler und keine
bekannte Blockade im lokalen Kernablauf. Das öffentliche Gesamtsystem ist bis
zur Behebung oder bewussten Abgrenzung von T-10 nicht abnahmefähig.

Neue größere Funktionen sollten erst begonnen werden, nachdem die manuelle
Checkliste ausgefüllt und die offenen Entscheidungen mit dem Betreuer geklärt
wurden. Die eigentliche Benutzerstudie folgt anschließend mit dem Protokoll aus
[`HCI_EVALUATION.md`](HCI_EVALUATION.md).
