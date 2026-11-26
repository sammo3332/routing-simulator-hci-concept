# Prüfskripte der unabhängigen Prüfung

Diese Skripte stammen aus der unabhängigen Prüfung des integrierten Stands
vom 25. November 2026. Ein getrennter Prüflauf (ohne Schreibzugriff auf das
Repository) hat sie geschrieben, um Schwächen zu finden, die die übrigen
Tests nicht abdecken. Ergebnisse und der Umgang mit den Befunden stehen in
[PRUEFBERICHT.md](../../docs/weiterentwicklung/PRUEFBERICHT.md).

Die Skripte sind **Sonden, keine Tests mit Bestanden/Nicht-bestanden**: Sie
geben Beobachtungen aus, die gelesen werden müssen. Sie sind nicht Teil von
`npm test`, `pytest` oder der CI.

Gegenüber der ursprünglichen Fassung wurden nur Pfade angepasst (Fixtures und
Testdateien relativ zum Skript, Bildschirmfotos in einen temporären Ordner).
`p3_race.cjs` wurde zusätzlich an das korrigierte Verhalten angepasst: Das
Feld „Zielknoten“ ist während des Ladens gesperrt, der frühere Wechsel des
Ziels wird deshalb nur noch versucht.

## Voraussetzungen

Laufende Anwendung, zum Beispiel mit `npm run dev:api` und `npm run dev`.
Die Browser-Skripte brauchen eine lokale Playwright-Installation mit Chromium.

| Variable | Bedeutung | Vorgabe |
|---|---|---|
| erstes Argument (Python) | Adresse des Backends | `http://127.0.0.1:8011` |
| `BASE` (Browser-Skripte) | Adresse der Oberfläche | `http://127.0.0.1:5173` |
| `SHOTS` | Ordner für Bildschirmfotos | temporärer Ordner `review-shots` |

## Skripte

| Skript | Zweck | Aufruf |
|---|---|---|
| `api_fuzz.py` | 104 absichtlich fehlerhafte oder ungewöhnliche Szenariodateien an `POST /api/sessions/import-scenario`; angenommene Sitzungen werden weiterbearbeitet, durchsucht und erneut gespeichert. Am Ende steht unter `PROBLEMS` jede Antwort, die weder 200, 413 noch 422 war oder länger als 5 Sekunden dauerte. | `python3 tests/review/api_fuzz.py http://127.0.0.1:8000` |
| `roundtrip.py` | Speichern, Laden und erneutes Speichern für sieben Topologien, beide Verfahren, beide Metriken und 0 bis 2 Ausfälle. Letzte Zeile: `bad <Anzahl>`. | `python3 tests/review/roundtrip.py http://127.0.0.1:8000` |
| `gen_big.py` | Erzeugt ein großes Gitter-Szenario, um Laufzeiten zu messen. | `python3 tests/review/gen_big.py 900 > gitter.json` |
| `p3_race.cjs` | Tastaturbedienung, Verhalten während eines verzögerten Ladevorgangs, Wechsel zwischen Szenario und Topologie, Doppelklick auf „Szenario speichern“. | `node tests/review/p3_race.cjs` |
| `p3_ui.cjs` | Lädt die 29 Dateien `files/ui_*.json` über die Oberfläche und meldet weiße Seiten, Darstellungsfehler und Zustandsänderungen. | `node tests/review/p3_ui.cjs` |
| `p2_drag.cjs` | Knotenverschieben an allen Rändern, unter der Werkzeugleiste, stark hineingezoomt, mit anderen Maustasten und außerhalb des Fensters, bei drei Fenstergrößen. | `node tests/review/p2_drag.cjs` |
| `p2_arrows.cjs` | Aboreszenzpfeile bei verschiedenen Zoomstufen und kurzen Kanten, Tooltip am Rand. | `node tests/review/p2_arrows.cjs` |
| `p1_shots.cjs` | Bildschirmfotos der dichten Topologie mit Ausfällen in allen Anzeigearten; Zählung der gezeichneten Linienfarben. | `node tests/review/p1_shots.cjs` |
| `scroll_check.cjs` | Zeigt, dass die Seite 16 Pixel höher ist als das Fenster. | `node tests/review/scroll_check.cjs` |

## Hinweise zum Lesen der Ausgabe

- `p2_drag.cjs`, Zeilen „A … bottom“ und „F“: Das Skript zieht den Knoten
  zuerst in die rechte obere Ecke. Dort liegt er unter der Werkzeugleiste;
  der folgende Mausdruck trifft die Leiste, und das Ziehen nach unten scrollt
  die Seite um 16 Pixel (bekannter Überlauf der Seite). Das Skript rechnet
  danach mit einer veralteten Lage der Graphfläche und meldet „OUTSIDE“
  beziehungsweise „inside = false“, obwohl der Knoten nicht bewegt wurde.
  Direkt gegriffene Knoten bleiben an allen vier Rändern 14 Pixel innerhalb
  (Browserprüfung N-9c und N-9e).
- `files/ui_id_long.json` ist absichtlich groß (Kennungen mit 100 000 Zeichen).
- Die Datei mit 2500 Knoten aus dem Bericht liegt nicht bei; sie entsteht mit
  `python3 tests/review/gen_big.py 2500`.
