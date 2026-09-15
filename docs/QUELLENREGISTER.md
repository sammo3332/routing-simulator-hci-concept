# Quellen- und Versionsregister

Stand: 14. September 2026  
Repository: `sammo3332/routing-simulator-hci-concept`  
Geprüfter Branch: `main`  
Geprüfter Stand: `73a2acdcecff5496b3e750ba1734fa65f75f080e` (9. September 2026)

## Zweck

Dieses Register trennt wissenschaftliche Quellen, interne Projektquellen,
Implementierungsnachweise und historische Artefakte. Interne Gesprächs-,
Chat- und Arbeitsdateien werden im öffentlichen Repository aus
Vertraulichkeitsgründen nicht namentlich aufgeführt.

Status:

- **kanonisch**: für den aktuellen Projektstand maßgeblich
- **ergänzend**: relevant, aber nicht allein maßgeblich
- **historisch**: nur für Design- oder Entscheidungsverlauf
- **veraltet**: widerspricht dem aktuellen Implementierungsstand
- **Prüfung offen**: Metadaten oder binäre Identität noch zu bestätigen

## Wissenschaftliche und externe Quellen

| ID | Quelle | Verwendung | Status |
|---|---|---|---|
| W-01 | Foerster, K.-T.; Kamisiński, A.; Pignolet, Y.-A.; Schmid, S.; Trédan, G. (2019): **Bonsai: Efficient Fast Failover Routing Using Small Arborescences**. In: *49th Annual IEEE/IFIP International Conference on Dependable Systems and Networks (DSN)*, S. 276–288. DOI: [10.1109/DSN.2019.00039](https://doi.org/10.1109/DSN.2019.00039). Autoren-PDF: https://schmiste.github.io/dsn19.pdf | Bonsai, kleine Aboreszenzen und Fast-Failover-Kontext | **kanonische wissenschaftliche Primärquelle** |
| W-02 | Orlowski, S.; Wessäly, R.; Pióro, M.; Tomaszewski, A. (2010): **SNDlib 1.0—Survivable Network Design Library**. *Networks*, 55(3), S. 276–286. DOI: [10.1002/net.20371](https://doi.org/10.1002/net.20371). Datensammlung: https://sndlib.zib.de/ | Herkunft und Semantik der SNDlib-XML-Topologien, u. a. Abilene, Atlanta und Germany50 | **kanonische Datensatz-/Formatquelle**; konkrete verwendete Dateien und Abrufdatum zusätzlich dokumentieren |
| W-03 | Jurkiewicz, P. (2023): **TopoHub: A repository of reference Gabriel graph and real-world topologies for networking research**. *SoftwareX*, 24, Art. 101540. DOI: [10.1016/j.softx.2023.101540](https://doi.org/10.1016/j.softx.2023.101540). Daten/Software: https://www.topohub.org/ und https://github.com/piotrjurkiewicz/topohub | Herkunft und Struktur importierter Node-Link-JSON-Topologien | **kanonische Datensatz-/Softwarequelle**; konkrete Topologie, Version/Commit und Abrufdatum zusätzlich dokumentieren |
| W-04 | React-Dokumentation, https://react.dev/ | aktuelles Frontend | **aktuell**; 19.2.x gemäß `package.json` |
| W-05 | FastAPI-Dokumentation, https://fastapi.tiangolo.com/ | aktuelle HTTP-API | **aktuell**; exakte installierte Version aus reproduzierbarer Umgebung ergänzen |
| W-06 | Vite-Dokumentation, https://vite.dev/ | Build- und Entwicklungsumgebung | **aktuell**; 5.4.x gemäß `package.json` |
| W-07 | Python-Dokumentation, https://docs.python.org/3/ | Backend-Laufzeit | **aktuell**; Abnahmeumgebung nennt Python 3.12.14 |
| W-08 | Nielsen, J. (1994): **Enhancing the Explanatory Power of Usability Heuristics**. In: *Proceedings of CHI ’94*, S. 152–158. DOI: [10.1145/191666.191729](https://doi.org/10.1145/191666.191729). Aktuelle Übersicht: https://www.nngroup.com/articles/ten-usability-heuristics/ | heuristische Evaluation, insbesondere Sichtbarkeit des Systemstatus, Kontrolle, Konsistenz, Fehlervermeidung und Fehlerdiagnose | **kanonischer HCI-Beleg** |
| W-09 | Shneiderman, B. (1996): **The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations**. In: *Proceedings of the 1996 IEEE Symposium on Visual Languages*, S. 336–343. DOI: [10.1109/VL.1996.545307](https://doi.org/10.1109/VL.1996.545307). Autoren-PDF: https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf | „Overview first, zoom and filter, then details-on-demand“ als Grundlage für Großgraph-Übersicht, Kürzel, Tooltip und Detailansicht | **kanonischer Visualisierungsbeleg** |
| W-10 | JSON-, XML- und gegebenenfalls GML-Spezifikation | formale Importformate | **optional**; GML ist derzeit offen und nicht implementiert |

Eine lokale Erläuterung des Bonsai-Papers ist eine abgeleitete Verständnishilfe
und darf W-01 nicht als zitierte Primärquelle ersetzen.

## Interne Projektquellen

Die nicht veröffentlichten Arbeitsunterlagen umfassen:

| ID | Quellengruppe | Rolle | Rang |
|---|---|---|---|
| P-01 | aktueller ausführlicher Anforderungsstand | Soll-Anforderungen | nach expliziten, datierten Betreuerentscheidungen maßgeblich |
| P-02 | PoC-Handout-Familie | Anforderungen, Architektur und HCI-Übergabestand | historischer bzw. zu vergleichender Stand |
| P-03 | datierte Meetingtranskripte und Besprechungsnotizen | Betreuerentscheidungen | höchste Priorität bei eindeutiger, datierter Entscheidung |
| P-04 | Entwurfs- und Chatverläufe | Prozess- und Designprovenienz | ergänzend, nicht als wissenschaftlicher Beleg |
| P-05 | Legacy-Tool- und Alt-GUI-Unterlagen | Ausgangslage und Designhistorie | historisch |
| P-06 | Architektur-, Sequenz- und UI-Mockups | visuelle Entwurfsstände | historisch; nicht automatisch Implementierungsnachweis |

Für die lokale Ablage sollte ein vertrauliches Begleitregister Dateiname,
SHA-256, Dateigröße, Seitenzahl/Bildabmessungen, Datum, Verfasser, Status und
Beziehungen zu Nachfolgeversionen enthalten.

## Aktuelle Repository-Dokumentation

| ID | Datei | Rolle | Status |
|---|---|---|---|
| D-01 | [README.md](../README.md) | Funktionsumfang und Abgrenzung | **kanonisch für implementierten Umfang** |
| D-02 | [ARCHITECTURE.md](../ARCHITECTURE.md) | React/FastAPI-/Domänenkernarchitektur mit aktuellem System- und Sequenzdiagramm | **kanonisch für Ist-Architektur und Ablauf**, Diagrammstand 14. September 2026 |
| D-03 | [REQUIREMENTS.md](../REQUIREMENTS.md) | konsolidierte Soll-/Ist-Matrix mit Status, Abgrenzung und offenen Entscheidungen | **kanonisch für den dokumentierten Anforderungsstand**; am 14. September 2026 mit Code, Architektur und Sprint-Abnahme abgeglichen |
| D-04 | [docs/BONSAI.md](BONSAI.md) | projektspezifische Bonsai-Greedy-Umsetzung und Grenzen | **kanonisch für Implementierungssemantik**, nicht Ersatz für W-01 |
| D-05 | [docs/BONSAI_VALIDATION.md](BONSAI_VALIDATION.md) | unabhängige und exhaustive Validierung kleiner Graphen | **kanonischer Validierungsnachweis** |
| D-06 | [docs/hci/HCI_EVALUATION.md](hci/HCI_EVALUATION.md) | formative Evaluation, Nutzungsszenarien und Studienprotokoll | **kanonisch**; empirische Studie noch offen |
| D-07 | [docs/hci/SPRINT_ACCEPTANCE.md](hci/SPRINT_ACCEPTANCE.md) | technischer Abnahmezustand vom 9. September 2026 | **aktuell mit Einschränkung**; genannte SHAs sind Zwischenstände |
| D-08 | [docs/handout.pdf](handout.pdf) | historisches PoC-Handout zu Anforderungen, Architektur und HCI | **kanonische öffentliche Archivkopie, fachlich historisch/veraltet** |
| D-09 | [docs/system_architecture.png](system_architecture.png) | früher Streamlit-/NetworkX-Architekturentwurf, Blob `64b2adc4d06c51e963ebb4f29401409dcf019a1a` | **historisch und durch die Mermaid-Diagramme in `ARCHITECTURE.md` ersetzt**; zuletzt am 9. Juli 2026 geändert |
| D-10 | [docs/hci/SCREENSHOT_REGISTER.md](hci/SCREENSHOT_REGISTER.md) | Git-Blob-SHAs, Dateigrößen, Entwicklungsrollen und Protokoll für finale Screenshots | **kanonisch für Bildprovenienz und Reproduzierbarkeit** |
| D-11 | [docs/OPEN_ITEMS.md](OPEN_ITEMS.md) | priorisierte Restarbeiten, Betreuerentscheidungen und Abschlussreihenfolge | **kanonisch für die weitere Projektplanung** |
| D-12 | [docs/references.bib](references.bib) | elf geprüfte BibTeX-Einträge mit stabilen Zitationsschlüsseln | **kanonische maschinenlesbare Literaturbasis**; Datensatz-Commit und Datei-Hash bleiben je verwendeter Topologie zu ergänzen |

## Bild- und Evaluationsnachweise

| ID | Datei | Aussage | Status |
|---|---|---|---|
| A-01 | [01_baseline_failover.png](hci/screenshots/01_baseline_failover.png) | früher Failover-Vertikalschnitt | historischer Entwicklungsnachweis |
| A-02 | [02_algorithm_selection.png](hci/screenshots/02_algorithm_selection.png) | sichtbare Strategiewahl | Entwicklungsnachweis |
| A-03 | [03_bonsai_arborescence.png](hci/screenshots/03_bonsai_arborescence.png) | Bonsai mit gerichteter Aboreszenz | aktuellerer Funktionsnachweis |
| A-04 | [04_large_graph_initial.png](hci/screenshots/04_large_graph_initial.png) | Großgraph vor UI-Verbesserung | historisch |
| A-05 | [05_large_graph_auto_fit.png](hci/screenshots/05_large_graph_auto_fit.png) | Auto-Fit mit zu starker Informationsreduktion | historisch |
| A-06 | [06_large_graph_abbreviations.png](hci/screenshots/06_large_graph_abbreviations.png) | aktuelle Standardübersicht mit Kürzeln | kanonischer formativer Nachweis |
| A-07 | [07_large_graph_all_names.png](hci/screenshots/07_large_graph_all_names.png) | optionale Anzeige aller Namen | ergänzend |

Historische Bilder mit Browserrahmen oder Erweiterungen sollten nicht als finale
Abbildungen verwendet werden. Finale Screenshots benötigen identische
Darstellungsbedingungen sowie Commit-ID, Datum, Topologie, Ziel, Strategie und
Ausfälle.

## Implementierungs- und Reproduzierbarkeitsquellen

| ID | Repositorybereich | Beleg |
|---|---|---|
| R-01 | `backend/api.py` | FastAPI-Endpunkte, Sessionkoordination und API-Semantik |
| R-02 | `backend/failover_core/bonsai.py` | Greedy-Aboreszenzen, Konnektivität und Routingsimulation |
| R-03 | `backend/failover_core/routing.py` | deterministisches Shortest-Path-Referenzrouting |
| R-04 | `backend/failover_core/topology_import.py` | TopoHub-JSON- und SNDlib-XML-Import |
| R-05 | `backend/failover_core/models.py` | Domänen- und Ergebnisobjekte |
| R-06 | `backend/failover_core/search.py` | Suche nach kritischen Ausfallkombinationen |
| R-07 | `backend/schemas/failover-scenario.schema.json` | versioniertes Szenarioformat |
| R-08 | `src/App.jsx`, `src/components/` und `src/hooks/` | aktuelle React-Oberfläche und UI-Zustände |
| R-09 | `tests/test_bonsai.py`, `tests/test_bonsai_validation.py` | Bonsai- und Orakeltests |
| R-10 | `tests/test_api.py`, `tests/test_failover_core.py`, `tests/test_topology_import.py` | API-, Routing- und Importnachweise |
| R-11 | `tests/frontend/` | Frontend-Logiktests |
| R-12 | `package.json`, `package-lock.json`, `requirements-core.txt` | Abhängigkeiten; Python-Versionen sind nicht vollständig gelockt |

## Versions- und Duplikatvergleich

| Familie | Urteil | Maßnahme |
|---|---|---|
| PoC-Handouts | `docs/handout.pdf` ist die kanonische öffentliche Archivkopie; private Kopien und deren Metadaten werden nicht im öffentlichen Register dokumentiert. Das Handout ist gegenüber dem aktuellen Code fachlich veraltet. | Öffentliche Archivkopie behalten; private Dubletten ausschließlich lokal verwalten. |
| Bonsai-Paper | Lokale Kopie und Link in `docs/BONSAI.md` bezeichnen sehr wahrscheinlich dieselbe Primärpublikation. | Hash der lokalen Kopie gegen das archivierte Original prüfen. |
| Paper-Erläuterung | Kein Duplikat des Papers, sondern abgeleitete Erklärung. | Getrennt führen und W-01 beim Zitieren priorisieren. |
| Sequenzdiagramme | Zwei sichtbar unterschiedliche historische Streamlit-Fassungen; keine identischen Duplikate. Eine Fassung enthält Bonsai-/Greedy-Aufrufe explizit, die andere ist verkürzt. | Beide archivieren; keines als aktuelle Ist-Architektur verwenden. |
| Architekturdiagramme | Lokale Altentwürfe und `docs/system_architecture.png` gehören zur Streamlit-/`st.session_state`-/NetworkX-Familie. Die Mermaid-Diagramme in `ARCHITECTURE.md` dokumentieren seit 14. September 2026 den aktuellen React/FastAPI-Datenfluss. | Mermaid-System- und Sequenzdiagramme als kanonisch verwenden; Altbilder nur als historische Designprovenienz führen. |
| UI-Mockup und Repo-Screenshots | Kein Duplikat: Mockup ist Designinput, Screenshots sind ausgeführte Entwicklungszustände. | Getrennte Provenienz beibehalten. |
| Anforderungen | Ausführlicher Soll-Stand, Handout und `REQUIREMENTS.md` überlappen, besitzen aber verschiedene Rollen. | Soll, Übergabestand und Ist-Abgleich ausdrücklich kennzeichnen. |
| Gespräche/Chats | Thematische Wiederholungen, aber keine anzunehmenden binären Duplikate. | Entscheidungen nach Datum und Quelle in einem vertraulichen Decision-Log normalisieren. |

Dateinamenszusätze wie `(2)`, `(3)` oder `(5)` gelten nicht als belastbare
Versionsnummern.


## Veraltete oder widersprüchliche Aussagen

1. **Streamlit und `st.session_state`** sind für die aktuelle Implementierung
   veraltet. Der Ist-Stand verwendet React, FastAPI und einen prozesslokalen
   Python-`SessionStore`.
2. **NetworkX als aktuelles Kernmodell** ist nicht durch den heutigen
   Domänenkern belegt; die aktuelle Architektur dokumentiert eigene Modelle.
3. **GML-Upload** ist keine implementierte Ist-Funktion. Der Code akzeptiert
   TopoHub-JSON und SNDlib-XML; die GML-Pflicht ist laut Sprint-Abnahme offen.
4. **Konkrete Failover-Zeitangaben aus Mockups**, etwa 12 ms, sind kein
   Messnachweis. Simulierte Konvergenzzeiten sind ausdrücklich abgegrenzt.
5. **Round-Robin und RR-Swapping** sind nicht Teil des aktuellen Pflichtumfangs.
6. **SQLite/Persistenz** gehört nicht zur aktuellen Architektur; Sessions sind
   flüchtig und prozesslokal.
7. **`SPRINT_ACCEPTANCE.md` nennt `40669bb` und `94f947a`** als
   Abnahmegrundlagen. Der aktuelle `main`-Stand ist neuer; die genannten SHAs
   bleiben als historische Abnahmebasis gültig.
8. **Empirische Gebrauchstauglichkeit** ist noch nicht nachgewiesen. Das
   Studienprotokoll ist vorhanden, die Benutzerstudie aber noch offen.

## Kanonische Hierarchie bei Widersprüchen

1. Datierte, eindeutige Betreuerentscheidung im vertraulichen Decision-Log
2. Aktueller ausführlicher Soll-Anforderungsstand
3. Ausgeführter Code und Tests am dokumentierten Commit
4. Aktuelle Ist-Dokumentation D-01 bis D-07
5. PoC-Handouts
6. Mockups, alte Diagramme und Legacy-Unterlagen
7. Chatbasierte Erläuterungen

Wissenschaftliche Aussagen müssen unabhängig davon auf W-01 oder weiteren
wissenschaftlichen Primärquellen beruhen. Interne Unterlagen belegen
Projektentscheidungen, nicht allgemeine fachliche Aussagen.

## Git-Historie als Versionsnachweis

| Commit | Bedeutung |
|---|---|
| `2e4007b…` | initiales monolithisches React-UI-Mockup |
| `53e404e…` | Handout und frühe Repository-Dokumentation |
| `10b42cd…` | früher Architekturstand |
| `40669bb…` | Merge des Bonsai-Greedy-Vertikalschnitts |
| `94f947a…` | formative HCI-Dokumentation |
| `73a2acd…` | aktueller geprüfter Merge auf `main` |

## Offene Bereinigungsschritte

- Im vertraulichen Begleitregister Hashes und technische Metadaten aller lokalen
  Dateien erfassen.
- `docs/handout.pdf` als öffentliche Archivkopie verwenden; private Kopien ausschließlich im vertraulichen Begleitregister verwalten.
- Streamlit-/NetworkX-Material in einen Archivbereich verschieben.
- Für die tatsächlich verwendeten Topologie-Dateien Version beziehungsweise Commit, Abrufdatum und dauerhafte URL ergänzen.
- Finale Screenshots F-01 bis F-06 nach dem verbindlichen Protokoll in `docs/hci/SCREENSHOT_REGISTER.md` aufnehmen und die offene Browserabnahme abschließen.
- Nach Betreuerentscheidung die offene GML-Anforderung schließen.
- Nach der Benutzerstudie Rohprotokoll, anonymisierte Auswertung und finale
  Ergebnisquelle ergänzen.

## Kurzfazit

Die wissenschaftliche Kernquelle ist das DSN-2019-Bonsai-Paper. Die aktuelle
Implementierungswahrheit liegt im Repository-Stand `73a2acd…`, insbesondere
in `ARCHITECTURE.md`, `docs/BONSAI.md`, den Tests und dem React/FastAPI-Code.
Streamlit-/`st.session_state`-/NetworkX-Diagramme und das Repository-Handout
vom Juli 2026 sind historische Artefakte. `docs/handout.pdf` ist die kanonische
öffentliche Archivkopie; private Kopien werden nur vertraulich verwaltet. Die
Sequenzdiagramme sind nach sichtbarem Inhalt keine Duplikate.
