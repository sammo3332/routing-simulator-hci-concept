# Knoten manuell verschieben

Diese Erweiterung baut auf Commit `99c2962962cc706f88a38af34254a180003d55ab` auf.
Sie ist eine Weiterentwicklung nach der Bachelorarbeit und gehört nicht zum
damals evaluierten Referenzstand.

## Bedienung und Abgrenzung

- Einen Knoten mit der linken Maustaste halten und ziehen.
- Seine Beschriftung, verbundenen Kanten, Routen, Arboreszenzpfeile und
  Ausfallmarkierungen verwenden die angepasste Anzeigegeometrie.
- Nachbarknoten bewegen sich nicht mit.
- Ziehen auf freier Fläche verschiebt weiterhin die gesamte Ansicht.
- Ein Knoten bleibt beim Ziehen innerhalb der sichtbaren Graphfläche.
- Änderungen von Ziel, Routingverfahren, Metrik und Kantenausfällen erhalten
  die manuell angeordneten Positionen derselben Sitzung.
- „Einpassen“ berücksichtigt die aktuelle Anordnung; es setzt sie nicht zurück.
- „Knotenpositionen zurücksetzen“ verwirft nur die manuelle Anordnung.
  Ausfälle und Routing-Einstellungen bleiben erhalten. Der Ausschnitt wird
  dadurch nicht automatisch neu eingepasst; dafür steht „Einpassen“ bereit.
- Ein neuer erfolgreicher Topologieimport verwirft die vorherige Anordnung,
  auch wenn beide Topologien dieselben Knoten-IDs besitzen.
- Beim Neuladen der Seite geht die Anordnung wie der übrige Frontendzustand
  verloren. Es gibt keine zusätzliche Speicherung.

Die Positionsänderungen liegen ausschließlich im React-Darstellungszustand.
Sie lösen keine API-Anfrage aus und verändern weder die importierten
Topologiekoordinaten noch Verbindungen, Gewichte oder Routingergebnisse.
Manuell verschobene Positionen sind keine geografischen Ortsangaben.

## Umsetzung

- `src/utils/graphLayout.js`: Anzeigegeometrie für Knoten und Kanten sowie
  Umrechnung von Mauskoordinaten mit der inversen SVG-Bildschirmtransformation.
- `src/hooks/useGraphLayout.js`: flüchtige, nach Session-ID getrennte
  Positionsänderungen und Zurücksetzen.
- `src/hooks/useGraphViewport.js`: Unterscheidung zwischen Knotenverschiebung
  und Verschieben der Gesamtansicht; Pointer-Capture und Abbruchbehandlung.
- `src/App.jsx`: gemeinsame Anzeigegeometrie, Knotenmarkierung und Anbindung.
- `src/components/GraphZoomControls.jsx`: Schaltfläche zum Zurücksetzen.

## Ausgeführte Prüfungen

- `npm run test:frontend`: 23 Tests bestanden, davon 8 neue Geometrietests.
- `python -m pytest -q`: 49 Tests bestanden.
- `npm run lint`: bestanden.
- `npm run build`: bestanden.
- `git diff --check`: bestanden.

Die zusätzlichen Logiktests prüfen unter anderem ein- und ausgehende
Kantenendpunkte, Ausfallmittelpunkte, unveränderte Topologiedaten und
Routingmerkmale, Zurücksetzen sowie Bewegungen bei verschiedenen Zoomstufen.
Ein Browserstart für die Mausprüfung wurde damals durch die
Ausführungsumgebung blockiert.

## Nachgeholte Browserprüfung vom 26. November 2026

Die Interaktionsprüfungen wurden mit `tests/browser/checks/30-knoten.cjs` in
Chromium 158 (headless, 1440 × 900) nachgeholt. Alle zehn Punkte der folgenden
Liste sind dort bestanden. Drei dabei gefundene Fehler wurden behoben:
Knoten ließen sich aus der sichtbaren Fläche ziehen, der Tooltip weit
verschobener Knoten erschien an falscher Stelle, und die Pfeilspitzen der
Aboreszenz waren verdeckt. Einzelergebnisse und Grenzen stehen in
[Paket 2](weiterentwicklung/PAKET_2_KNOTENVERSCHIEBEN.md). Geprüft wurde ein
automatisierter Ablauf in einem Browser, keine Nutzung durch Personen.

## Prüfschritte

1. Eine Topologie importieren und einen Knoten ziehen. Nur dieser Knoten soll
   sich bewegen; alle verbundenen Linien und die Beschriftung sollen folgen.
2. Dasselbe nach Zoomen und Verschieben der Gesamtansicht wiederholen.
   Der Knoten soll unter der Maus bleiben und nicht springen.
3. Einen Knoten verschieben, dann Kanten ausfallen lassen und wiederherstellen.
   Seine Position muss erhalten bleiben; Kennzahlen und Routen müssen fachlich
   auf die Ausfälle reagieren, nicht auf die Positionsänderung.
4. Ziel, Routingverfahren, Metrik, hervorgehobene Route und angezeigte
   Arboreszenz wechseln. Die manuelle Anordnung muss erhalten bleiben.
5. Eine ausgefallene Kante mit verschobenem Endknoten ansehen: Kreuzmarkierung
   und gestrichelte Linie müssen weiter zusammenpassen.
6. „Einpassen“ betätigen: Die manuelle Anordnung bleibt bestehen.
7. „Knotenpositionen zurücksetzen“ betätigen: Nur die ursprüngliche Anordnung
   wird wiederhergestellt. Ausfälle und Einstellungen bleiben erhalten.
8. Eine andere Topologie und anschließend dieselbe Datei erneut importieren.
   Alte Positionsänderungen dürfen nicht übernommen werden.
9. Einen Drag außerhalb der Graphfläche beenden. Nach dem Loslassen darf kein
   Knoten weiter an der Maus hängen; es darf kein Kantenausfall ausgelöst werden.
10. Große Topologie und kleine Fensterbreite prüfen; die Werkzeugleiste muss
    erreichbar bleiben. Browserkonsole auf neue Fehler kontrollieren.
