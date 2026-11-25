# Paket 3: Szenarien über die Oberfläche speichern und laden

Stand: 26. November 2026 · Zweig `claude/paket-3-szenarien`
Baut auf: `claude/basis-fehlerbehebungen` · Abhängigkeit von anderen Paketen: keine

## Problem

Anwendungsfall aus dem Auftrag: eine Konfiguration exportieren, weitergeben
und auf einem anderen Rechner mit denselben fachlichen Einstellungen und
Ausfällen wieder öffnen. Der Anwendungsfall selbst ist im Repository nicht
beschrieben; er stammt aus der Aufgabenstellung für diese Weiterentwicklung.

Der Ausgangsstand konnte Szenarien nur im Domänenkern serialisieren (FA-14).
Es gab keine API-Anbindung und kein Bedienelement. Sitzungen liegen nur im
Arbeitsspeicher des Backends und gehen bei jedem Neustart verloren.

## Umsetzung

### Dateiformat

Verwendet wird unverändert das vorhandene Schema
`backend/schemas/failover-scenario.schema.json` mit `format_version` „1.0“.
Eine gespeicherte Datei enthält:

| Feld | Inhalt |
|---|---|
| `topology` | Knoten, Kanten, Gewichte und die importierten Koordinaten |
| `routing` | Zielknoten, Routingverfahren, Routingmetrik |
| `failures` | ausgefallene Kanten |
| `routing_snapshot` | Pfade zum Zeitpunkt des Speicherns, nur zum Vergleich |
| `scenario_id`, `name`, `created_at`, `metadata` | Verwaltungsangaben |

### API

| Methode und Pfad | Funktion |
|---|---|
| `GET /api/sessions/{session_id}/scenario` | aktuellen Zustand als Szenario ausgeben |
| `POST /api/sessions/import-scenario` | Szenario prüfen, neu berechnen und als neue Sitzung anlegen |

Beim Laden gilt:

1. Formatversion prüfen, dann Schema, dann fachliche Gültigkeit
   (Zielknoten vorhanden, ausgefallene Kanten bekannt, Verfahren unterstützt).
2. Das Routingergebnis wird **immer im Domänenkern neu berechnet**. Der
   gespeicherte `routing_snapshot` wird nur verglichen. Weicht er ab, zeigt
   die Oberfläche die Neuberechnung und einen Hinweis.
3. Erst danach wird eine Sitzung angelegt. Eine abgewiesene Datei verändert
   weder den Sitzungsspeicher noch den Zustand der Oberfläche.

Fehlermeldungen für die Oberfläche:

| Fall | Code | Meldung |
|---|---|---|
| keine Formatversion (z. B. Topologiedatei) | `missing_format_version` | „Die Datei enthält keine Formatversion („format_version“) und ist daher kein Szenario dieser Anwendung. Eine Topologiedatei laden Sie über „Topologie laden“.“ |
| andere Formatversion | `unsupported_format_version` | „Die Formatversion „2.0“ wird nicht unterstützt. Unterstützt wird: 1.0.“ |
| kein JSON | `invalid_json` | „Die Datei ist kein gültiges JSON und kann nicht als Szenario gelesen werden. …“ |
| inhaltlich ungültig | `invalid_scenario` | „Das Szenario ist ungültig und wurde nicht geladen: …“ mit bis zu drei Einzelgründen |
| größer als 10 MiB | `file_too_large` | „Die Szenariodatei ist größer als 10 MiB.“ |

Die Einzelgründe bei `invalid_scenario` stammen aus der vorhandenen Validierung
und sind englisch.

### Änderungen am Domänenkern

- `check_format_version` und `ScenarioFormatVersionError` unterscheiden
  fehlende und nicht unterstützte Versionen.
- `import_scenario_json` weist `NaN` und `Infinity` ab und meldet einen nicht
  berechenbaren Zustand (z. B. Bonsai auf einer nicht zusammenhängenden
  Topologie) als ungültiges Szenario.
- `scenario_to_dict` behält die Reihenfolge der Knoten und Kanten bei, statt
  nach ID zu sortieren. Grund: Die Oberfläche listet Knoten und Kanten in
  dieser Reihenfolge und leitet die Knotenkürzel daraus ab. Das Routing
  sortiert selbst und hängt nicht davon ab.

Es gibt keine zweite Routingimplementierung.

### Oberfläche

Die Seitenleiste erhält unter „Topologie laden“ den Bereich „Szenario“ mit
zwei Schaltflächen im vorhandenen Stil der Schaltfläche „Alle Kanten
wiederherstellen“:

- **Szenario laden** öffnet eine gespeicherte JSON-Datei.
- **Szenario speichern** lädt den aktuellen Zustand als
  `szenario-<Topologie>-<Datum>-<Uhrzeit>.json` herunter.

Unterscheidung zum Laden einer Topologie:

- Ein kurzer Text nennt, was ein Szenario enthält.
- Nach dem Laden steht dort „Geladenes Szenario: <Datei>“. Der Bereich
  „Topologie laden“ zeigt dann keine Datei als geladen an.
- Der Bereich „Topologie laden“ nennt nur noch eine Datei, die tatsächlich
  geladen wurde. Bisher zeigte er auch den Namen einer abgewiesenen Datei.
- Fehlermeldungen erscheinen in dem Bereich, in dem die Datei gewählt wurde.
- Das Ereignisprotokoll nennt Datei, Ziel, Verfahren, Metrik und Zahl der
  Ausfälle.

![Seitenleiste ohne geladenen Zustand](screenshots/paket-3/seitenleiste_leer.png)

Geladenes Bonsai-Szenario mit einem Ausfall:

![Geladenes Szenario](screenshots/paket-3/szenario_geladen.png)

Abgewiesene Datei mit nicht unterstützter Formatversion; der vorherige Zustand
bleibt bestehen:

![Fehlermeldung zur Formatversion](screenshots/paket-3/fehler_formatversion.png)

Datei mit manipulierten gespeicherten Ergebnissen:

![Hinweis auf abweichende Ergebnisse](screenshots/paket-3/abweichende_ergebnisse.png)

## Tatsächliche Prüfung

### Vollständiger Ablauf mit Neustart

Am 26. November 2026 im Browser (Chromium 158, headless) durchgeführt:
konfigurieren, Ausfälle setzen, „Szenario speichern“, **Backend-Prozess
beenden und neu starten**, neue Browsersitzung, „Szenario laden“, sichtbaren
fachlichen Zustand vergleichen (Ziel, Metrik, Verfahren, aktive Ausfälle,
Kennzahlen im Kopfbereich, vollständige Routingzusammenfassung).

| Fall | Topologie | Einstellungen | Ergebnis |
|---|---|---|---|
| Bonsai | `bonsai_routing_failure.json` | Ziel T, Bonsai, 1 Ausfall (Routingfehler durch Schleife) | Zustand identisch |
| Kürzester Pfad | `synthetic_50_nodes.json` | Ziel 12, Kantengewicht, 3 Ausfälle | Zustand identisch |

### Browserprüfung

`tests/browser/checks/40-szenario.cjs`: 22 von 22 bestanden. Geprüft werden
unter anderem Speichern und Laden für beide Verfahren nach einem Neuladen der
Seite (S-6 bis S-11), Weiterbearbeiten (S-12), erneutes Laden derselben Datei
(S-13), fünf Fehlerfälle mit unverändertem Zustand (S-14 bis S-18), eine
Szenariodatei über „Topologie laden“ (S-19), manipulierte Ergebnisse (S-20)
und die getrennte Anzeige beider Ladewege (S-9, S-10, S-21).

### Automatische Tests

`tests/test_scenario_api.py` (27 Tests) arbeitet mit jeweils frischen
Anwendungsinstanzen, also wie nach einem Neustart:

- Export ist schemagültig und vollständig; Koordinaten bleiben unverändert.
- Kürzester Pfad und Bonsai: Topologie, Routing, Ausfälle und Ergebnis sind
  nach Export und Import identisch, bei Bonsai einschließlich Bäumen, Routen
  und Fehlerklassen.
- Manipulierte Ergebnisse werden nicht übernommen.
- Fehlende und nicht unterstützte Version, ungültige Inhalte, Nicht-JSON,
  Topologiedatei, zu große Datei.
- Ein fehlgeschlagener Import lässt den Sitzungsspeicher unverändert.

`tests/frontend/scenarioFile.test.js` (3 Tests): Dateiname und Beschreibung.

## Grenzen

- Geprüft wurde auf einem Rechner mit neu gestartetem Backend, nicht auf zwei
  verschiedenen Rechnern oder Betriebssystemen. Die Datei enthält keine
  rechnerabhängigen Angaben.
- Zielversionen: Nur „1.0“ wird gelesen. Eine Migration älterer oder neuerer
  Formate gibt es nicht.
- Nicht gespeichert werden: die Auswahl „Route hervorheben“, die gewählte
  Aboreszenz, die Suchgrenze und das Ergebnis der automatischen Prüfung sowie
  das Ereignisprotokoll.
- Der Vergleich mit `routing_snapshot` umfasst Pfade sowie betroffene und
  geänderte Knoten, nicht die Bonsai-Einzelschritte.
- Das Speichern nutzt den Download des Browsers. Wohin die Datei gelegt wird,
  bestimmt der Browser.
- Die Datei ist nicht signiert. Sie kann von Hand verändert werden; geprüft
  wird ihre Gültigkeit, nicht ihre Herkunft.
