# Formative HCI-Evaluation des Failover Routing Visualizers

Aktualisiert: 14. Oktober 2026

## 1. Zweck und Status

Dieses Dokument enthält eine entwicklungsbegleitende Einschätzung der
Oberfläche und einen Vergleich dokumentierter Entwicklungsstände.
Die Bewertungen in Abschnitt 3 und 4 sind Einschätzungen aus der
Entwicklung. Eine unabhängig durchgeführte Expertenprüfung mit dokumentiertem
Prüfverfahren wird damit nicht nachgewiesen. Aussagen wie „gut“ bezeichnen
die Einschätzung des Entwurfs, keine empirisch gemessene Gebrauchstauglichkeit.

Die Benutzerstudie wird davon getrennt ausgewertet. Für sie liegen 11
auswertbare Fragebögen aus LimeSurvey 736933 vor. Die tatsächlich erhobenen
Daten und die Grenzen der Durchführung sind in Abschnitt 6 und im
[Studienprotokoll](USER_STUDY_PROTOCOL.md) zusammengefasst.

Die folgenden Evaluationsfragen und Szenarien beschreiben die Ziele der
Untersuchung. Sie wurden nicht alle durch objektive Einzelmessungen geprüft.
Die Screenshots dokumentieren sichtbare Entwicklungsstände. Sie belegen
allein weder eine Verbesserung der Gebrauchstauglichkeit noch, dass eine
bestimmte Änderung durch ein bestimmtes Nutzungsergebnis verursacht wurde.

## 2. Evaluationsfragen

Die Evaluation untersucht folgende Fragen:

| ID | Frage |
|---|---|
| EF-1 | Verstehen Nutzende, welches Routingverfahren aktiv ist? |
| EF-2 | Können Nutzende einen Kantenausfall auslösen, seine Folgen erkennen und ihn rückgängig machen? |
| EF-3 | Können sie physische Trennung, Bonsai-Schleife und Sackgasse unterscheiden? |
| EF-4 | Bleibt die Topologie bei 15 und bei 50 Knoten übersichtlich und navigierbar? |
| EF-5 | Sind Ziel, aktuelle Route, Baseline, ausgefallene Kanten und Aboreszenz visuell unterscheidbar? |
| EF-6 | Unterstützt die Oberfläche eine Erklärung des Ergebnisses gegenüber Dritten? |

## 3. Formative Bewertung der Entwicklungsstufen

### 3.1 Ausgangszustand: Failover ohne Bonsai-Auswahl

![Ausgangszustand mit zwei ausgefallenen Kanten](screenshots/01_baseline_failover.png)

**Beobachtung:** Der ursprüngliche Vertikalschnitt konnte Topologien laden,
Kanten deaktivieren, Routen neu berechnen und betroffene Knoten anzeigen. Die
Darstellung erklärte jedoch nur das Verhalten einer einzigen
Shortest-Path-Strategie. Ein Vergleich mit vorbereitetem lokalem Failover war
nicht möglich.

**HCI-Bedeutung:** Systemstatus und Reversibilität waren bereits vorhanden.
Das mentale Modell blieb aber unvollständig, weil die verwendete Strategie nur
über die Routingmetrik und nicht als bewusst gewähltes Verfahren sichtbar war.

### 3.2 Sichtbare Auswahl des Routingverfahrens

![Auswahl zwischen kürzestem Pfad und Bonsai](screenshots/02_algorithm_selection.png)

**Änderung:** Die Oberfläche trennt nun klar zwischen `Kürzester Pfad` und
`Bonsai (Greedy)`. Kurze Untertitel erklären den Unterschied zwischen
Neuberechnung nach einem Ausfall und vorbereitetem lokalem Failover.

**Bewertung:** Diese Auswahl verbessert Sichtbarkeit und Vergleichbarkeit. Die
Nutzenden müssen die technische Bezeichnung nicht aus einem Metrikfeld
ableiten. Die Entscheidung befindet sich dort, wo Ziel und Routingmetrik
konfiguriert werden, und folgt damit dem Ablauf Import → Ziel → Verfahren →
Fehlerzustand.

### 3.3 Bonsai-Modus und ausgewählte Aboreszenz

![Bonsai-Modus mit gerichteter Aboreszenz](screenshots/03_bonsai_arborescence.png)

**Änderung:** Der Bonsai-Modus zeigt die Anzahl der Aboreszenzen, den gewählten
Baum, gerichtete violette Pfeile, den tatsächlichen Paketpfad sowie die Anzahl
der Baumwechsel. Physische Trennungen und Routingfehler werden getrennt
ausgewiesen.

**Bewertung:** Das System macht den internen Zustand sichtbar. Besonders
wichtig ist die Trennung zwischen „kein physischer Weg vorhanden“ und „ein Weg
ist vorhanden, Bonsai erreicht das Ziel aber nicht“. Diese Unterscheidung ist
der fachliche Kern des neuen Modus.

**Verbleibende Detailfrage:** Die Routingzusammenfassung zeigt Pfad, Status und
Wechselanzahl. Der vollständige schrittweise Trace mit dem genauen Wechselknoten
ist im Backend vorhanden, aber noch nicht als eigene Detailansicht im Frontend.
Diese Erweiterung ist nur erforderlich, wenn sie für die Forschungsfrage oder
Betreuerabnahme ausdrücklich benötigt wird.

### 3.4 Erste Großgraph-Darstellung

![Germany50 vor der verbesserten Übersicht](screenshots/04_large_graph_initial.png)

**Problem:** Bei 50 Knoten blieb die Topologie klein in der Mitte der großen
Zeichenfläche. Gleichzeitig überlagerten sich lange Ortsnamen. Die zusätzliche
Fläche durch das Einklappen der Detailbereiche wurde nicht wirksam genutzt.

**HCI-Folge:** Die Oberfläche bot zwar Kontrolle über Zoom und Panelgröße, die
Ausgangsdarstellung erhöhte aber Suchaufwand und visuelle Unruhe.

### 3.5 Automatisches Einpassen mit zu starker Informationsreduktion

![Automatisch eingepasster Großgraph mit zunächst leeren Knoten](screenshots/05_large_graph_auto_fit.png)

**Änderung:** Neue Topologien wurden automatisch eingepasst und lange
Beschriftungen in der Übersicht ausgeblendet.

**Problem:** Die Fläche wurde besser genutzt, viele Knoten wirkten jedoch wie
leere Kreise. Die Reduktion entfernte damit auch Information, die für die
Orientierung notwendig ist.

**Lernpunkt:** Kognitive Entlastung darf nicht zu fehlender Identifizierbarkeit
führen. Eine gute Übersicht benötigt stabile Kurzbezeichnungen und Details auf
Anfrage.

### 3.6 Aktuelle Standardübersicht mit eindeutigen Kürzeln

![Aktuelle Übersicht mit Knotenkürzeln](screenshots/06_large_graph_abbreviations.png)

**Änderung:** Jeder Knoten besitzt ein deterministisches, eindeutiges Kürzel.
Der vollständige Name erscheint per Tooltip. Ziel-, Fehler-, Umleitungs- und
ausgewählte Startknoten bleiben beschriftet. Zusätzlich kann die Darstellung
auf die Route eines Startknotens reduziert werden.

**Bewertung:** Dieser Zustand eignet sich als Standard für große Graphen. Er
unterstützt das Prinzip „Übersicht zuerst, Details auf Anfrage“: Struktur und
Routingmuster bleiben sichtbar, während einzelne Knoten weiterhin eindeutig
identifizierbar sind.

### 3.7 Optionale Anzeige aller Namen

![Großgraph mit allen eingeblendeten Namen](screenshots/07_large_graph_all_names.png)

**Beobachtung:** Die Option `Namen` stellt alle vollständigen Bezeichnungen dar.
In dichten Regionen entstehen erwartbar Überlagerungen.

**Bewertung:** Diese Ansicht sollte nicht der Standard sein. Sie ist eine
bewusste Detailoption und eignet sich eher nach dem Hineinzoomen oder zusammen
mit einer hervorgehobenen Einzelroute. Für die Standardnutzung sind Kürzel und
Tooltip vorzuziehen.

## 4. Entwicklungsbegleitende heuristische Einschätzung

| Kriterium | Aktueller Stand | Bewertung |
|---|---|---|
| Sichtbarkeit des Systemstatus | Statusleiste, Kennzahlen, Interpretation und Ereignisprotokoll | gut |
| Übereinstimmung mit dem Fachmodell | Ziel, Kanten, Routen, Bäume und Fehlerarten sind fachlich benannt | gut |
| Kontrolle und Freiheit | Ausfälle sind direkt umkehrbar; Panels, Zoom und Pan sind kontrollierbar | gut |
| Konsistenz | Farben und Statusbegriffe werden in Graph, Legende und Tabellen wiederverwendet | gut |
| Fehlervermeidung | Auswahlzustand und separate Ausfallaktion reduzieren versehentliche Änderungen | gut |
| Wiedererkennen statt Erinnern | Algorithmuskarten, Legende, Kürzel und Tooltip unterstützen Orientierung | gut |
| Flexibilität | Einpassen, Zoom, einklappbare Details und Einzelroute skalieren auf verschiedene Aufgaben | gut |
| Minimalistisches Design | Standardübersicht ist reduziert; „alle Namen“ kann bei großen Graphen überladen | teilweise offen |
| Verständliche Fehlerdiagnose | physische Trennung, Schleife und Sackgasse werden unterschieden | gut |
| Hilfe und Dokumentation | README und Bonsai-Dokumentation vorhanden | gut |

## 5. Nutzungsszenarien für die Evaluation

```mermaid
flowchart TB
    A["A · Normalzustand verstehen"]
    B["B · Kantenausfall untersuchen"]
    C["C · Routingverfahren vergleichen"]
    D["D · Bonsai-Routingfehler erkennen"]
    E["E · Große Topologie navigieren"]

    A --> B --> C --> D --> E
```

Die Reihenfolge führt vom einfachen Ablesen des Systemzustands über eine
reversible Störung bis zur fachlich anspruchsvollen Fehlerdiagnose und zur
Navigation einer großen Topologie.

### Szenario A: Normalzustand verstehen

**Ausgangslage:** `atlanta.xml`, keine Ausfälle, kürzester Pfad.

**Aufgabe:** Ziel `N1` wählen und erklären, wie viele Knoten das Ziel erreichen
und welche Farbe die aktuelle Route besitzt.

**Erfolg:** Die Person nennt Ziel, Erreichbarkeit und aktuelle Route korrekt,
ohne Unterstützung durch die Testleitung.

### Szenario B: Manuellen Kantenausfall untersuchen

**Ausgangslage:** Atlanta, kürzester Pfad.

**Aufgabe:** Eine Kante im Graphen ausfallen lassen, die Folgen erklären und die
Kante anschließend wiederherstellen.

**Erfolg:** Ausfall und Reparatur gelingen; die Person erkennt umgeleitete oder
unerreichbare Knoten und kann die Statusänderung erklären.

### Szenario C: Routingverfahren vergleichen

**Ausgangslage:** Atlanta ohne Ausfall.

**Aufgabe:** Von `Kürzester Pfad` zu `Bonsai (Greedy)` wechseln, eine
Aboreszenz auswählen und den Unterschied der Verfahren mit eigenen Worten
erklären.

**Erfolg:** Die Person unterscheidet Neuberechnung nach Ausfall von vorbereitetem
lokalem Failover und erkennt die gerichteten Baumkanten.

### Szenario D: Routingfehler trotz physischer Verbindung

**Ausgangslage:** `tests/fixtures/bonsai_routing_failure.json`, Ziel `T`, Bonsai.

**Aufgabe:** Mit der automatischen Prüfung einen kritischen Einzelausfall finden,
ihn übernehmen und beurteilen, ob eine physische Trennung oder ein Routingfehler
vorliegt.

**Erfolg:** Die Person identifiziert die Schleife als Routingfehler bei weiterhin
vorhandenem physischem Weg.

### Szenario E: Große Topologie navigieren

**Ausgangslage:** `germany50.xml`.

**Aufgabe:** Ziel `Aachen` wählen, die Topologie einpassen, einen unbekannten
Knoten per Tooltip identifizieren, eine einzelne Startknotenroute hervorheben und
bei Bedarf alle Namen einblenden.

**Erfolg:** Die Person findet und erklärt alle Funktionen, ohne die Orientierung
im Graphen zu verlieren.

## 6. Tatsächliche Benutzerstudie

Die Erhebung verwendete LimeSurvey 736933 mit Einwilligung, Vorkenntnissen,
fünf Aufgaben, zehn SUS-Aussagen, vier geschlossenen Rückfragen und einem
optionalen Freitextfeld. Ausgewertet wurden 11 Fragebögen. Die abgeschlossenen
Antworten stammen vom 20. September bis 4. Oktober 2026.

Die Aufgabenbearbeitung wurde von den Befragten selbst als abgeschlossen,
versucht und nicht geschafft oder übersprungen angegeben. Daraus lässt sich
kein unabhängig geprüfter Aufgabenerfolg ohne Hilfe ableiten. Bei einigen
Bearbeitungen war der Entwickler anwesend und beantwortete Nachfragen.
Ein systematisches Hilfs- oder Beobachtungsprotokoll liegt nicht vor.

Zeitmessung, Schwierigkeitseinschätzungen von 1 bis 7 und Think-Aloud waren
Bestandteile früherer Planungen. Sie sind keine Datengrundlage der
vorliegenden Auswertung. Der historische Plan bleibt im
[Studienprotokoll](USER_STUDY_PROTOCOL.md) als solcher erhalten.

Die Auswertung berichtet Häufigkeiten und Kennwerte. Der SUS-Mittelwert
beträgt 67,7 bei einem Median von 72,5 und einer Spannweite von 30 bis 90.
Kapitel 6 der Bachelorarbeit beschreibt die Ergebnisse und Grenzen.
Für die abgeschlossenen Fragebögen wurde keine jeweilige Deployment-Version
erfasst; ein einheitlicher Versionsstand für alle Bearbeitungen ist damit
nicht nachgewiesen.

## 7. Screenshot-Protokoll für die Bachelorarbeit

Das separate [Screenshot-Register](SCREENSHOT_REGISTER.md) dokumentiert
Git-Blob-SHAs, Dateigrößen, Entwicklungsrollen, frühere Vorschläge für sechs zusätzliche Aufnahmen und ein Aufnahmeprotokoll.
Diese Vorschläge sind keine verbindlichen Vorgaben des Betreuers.

Die vorhandenen Bilder dokumentieren die Entwicklung, enthalten aber teilweise
Browserrahmen oder eingeblendete Browser-Erweiterungen. Für gegebenenfalls benötigte zusätzliche Aufnahmen gelten folgende Empfehlungen:

- identische Fenstergröße und Skalierung,
- Browser-Vollbild oder sauberer Zuschnitt auf die Anwendung,
- keine Profile, Erweiterungen oder personenbezogenen Inhalte,
- Topologie, Ziel, Verfahren und Ausfälle in der Bildunterschrift,
- Commit-ID und Datum in einer separaten Screenshot-Tabelle,
- keine nachträgliche inhaltliche Veränderung des dargestellten Ergebnisses.

Frühere Vorschläge für ergänzende Abbildungen:

1. Shortest-Path-Normalzustand,
2. manueller Ausfall mit Umleitung,
3. Bonsai mit ausgewählter Aboreszenz,
4. Bonsai-Schleife trotz physischer Verbindung,
5. Germany50 als Standardübersicht,
6. Germany50 mit hervorgehobener Einzelroute.

## 8. Aktueller Evaluationsstand

Der technische Funktionsumfang wurde mit dem Betreuer abgestimmt. GraphML wurde
am 15. September 2026 einschließlich Parser, API, Upload und Tests ergänzt. Der
vollständige schrittweise Bonsai-Trace, Round-Robin, RR-Swapping und weitere
Routingverfahren gehören nicht zum untersuchten Umfang.

Die Benutzerstudie ist in Kapitel 6 der Bachelorarbeit ausgewertet.
Nach Abschluss der Erhebung wurden die Option `Keine Route hervorheben`,
die Bezeichnung `Physisch getrennte Knoten` bei der Graphansicht und die
zunächst eingeklappten Ergebnisdetails ergänzt. Die untere Kennzahl
`Physisch getrennt` bestand bereits im technischen Referenzstand.
Diese späteren Änderungen wurden nicht erneut durch eine Benutzerstudie bewertet.

## 9. Technischer Stand

Der technische Vertikalschnitt umfasst Import, Strategiewahl,
Greedy-Aboreszenzen, zirkuläres Failover, getrennte Fehlerklassifikation,
automatische Suche und Visualisierung. Diese Funktionen sind integriert und
automatisch getestet.

Die Screenshots zeigen Unterschiede zwischen Entwicklungsständen. Die dazu
formulierten Einschätzungen bleiben von den Ergebnissen der Benutzerstudie
getrennt. Empirische Aussagen werden auf die tatsächlich erhobenen Antworten
und die Grenzen der Durchführung beschränkt.

Die technische Absicherung wird durch die automatisierten Tests, die
[Bonsai-Validierung](../BONSAI_VALIDATION.md) und die in
[REQUIREMENTS.md](../../REQUIREMENTS.md) dokumentierten Prüfergebnisse belegt.
