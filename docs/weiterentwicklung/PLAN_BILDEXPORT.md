# Offen: Bildexport des Graphen als PNG und SVG

Stand: 25. November 2026 · Status: **nicht umgesetzt**, Plan zur Abstimmung

## Befund

Ein Export der Graphansicht als Bild ist in keinem Stand vorhanden.

Geprüft am 25. November 2026:

- Quellcode aller lokalen und aller Zweige auf GitHub (`src/`, `backend/`,
  `desktop/`, `index.html`, `package.json`) auf die üblichen Bausteine eines
  Bildexports durchsucht (`toDataURL`, `toBlob`, `XMLSerializer`, `canvas`,
  `image/png`, `image/svg`, „Bildexport“, „als PNG“, „als SVG“ und ähnliche).
  Einziger Treffer ist der Verweis auf das Favicon.
- Dokumentation aller Zweige sowie das archivierte Handout durchsucht:
  keine Erwähnung eines Bildexports.
- Issues und Pull Requests des Repositorys durchsucht: keine Erwähnung.

Der Bildexport war auch nicht Teil der vier Pakete dieser Weiterentwicklung.
„Szenario speichern“ aus Paket 3 erzeugt eine JSON-Datei und ist kein
Bildexport.

Wo der Bildexport vereinbart wurde, lässt sich aus dem Repository nicht
belegen. Der folgende Plan geht davon aus, dass er gewünscht ist.

## Vorschlag zur Umsetzung

Eigenes Paket auf eigenem Zweig (`claude/paket-5-bildexport`), aufbauend auf
`claude/basis-fehlerbehebungen`, unabhängig von den Paketen 1 bis 4. Nur
Frontend, keine neue Abhängigkeit, keine Änderung am Backend.

1. **SVG erzeugen.** Die vorhandene Graphzeichnung (das `<svg>` der Ansicht)
   wird kopiert und für den Export aufbereitet: dunkler Hintergrund wie in der
   Oberfläche, feste Schriftangaben, Legende und eine Kopfzeile mit Topologie,
   Zielknoten, Routingverfahren und Zahl der Ausfälle. Elemente, die nur der
   Bedienung dienen, entfallen (unsichtbare Klickflächen, Tooltip,
   Auswahlmarkierung, Fokusrahmen). Ausgabe über `XMLSerializer`.
2. **PNG erzeugen.** Das SVG wird im Browser in ein Bild geladen und auf eine
   Zeichenfläche (`canvas`) in doppelter Auflösung gezeichnet; Ausgabe mit
   `canvas.toBlob`.
3. **Bedienung.** Zwei Schaltflächen im vorhandenen Stil der Werkzeugleiste
   „Graphansicht steuern“, zum Beispiel „SVG“ und „PNG“ mit erklärendem
   Tooltip. Ohne geladene Topologie inaktiv. Dateiname
   `graph-<Topologie>-<Datum>-<Uhrzeit>.svg` beziehungsweise `.png`.
4. **Windows-Programm.** Der Export nutzt denselben Download-Weg wie
   „Szenario speichern“; im Programmfenster erscheint der Speichern-Dialog.
5. **Prüfung.** Eine eigene Browser-Prüfgruppe
   (`tests/browser/checks/50-bildexport.cjs`) und eine Erweiterung des
   Fenstertests des Windows-Programms.

Aufwand: voraussichtlich ein halber bis ein Arbeitstag einschließlich Prüfung
und Dokumentation.

## Abnahmekriterien

| Nr. | Kriterium | Prüfung |
|---|---|---|
| B-1 | Mit geladener Topologie lassen sich eine SVG- und eine PNG-Datei speichern; ohne Topologie sind die Schaltflächen inaktiv. | Browserprüfung über das Download-Ereignis |
| B-2 | Das Bild zeigt den aktuellen fachlichen Zustand: Zielknoten, aktuelle Routen, Routen vor dem Ausfall, ausgefallene Kanten mit Kreuz, Kanten ohne Route und im Bonsai-Modus die Pfeile der gewählten Aboreszenz. | Vergleich von Anzahl und Farbe der Linien und Knoten im SVG mit der Ansicht |
| B-3 | Farben und Linienarten entsprechen der Legende der Oberfläche; die Legende ist im Bild enthalten. | Auslesen der Farbwerte im SVG |
| B-4 | Die gesamte Topologie ist sichtbar, unabhängig von Zoom und Ausschnitt; manuell verschobene Knoten und die Option „Namen“ werden berücksichtigt. | Export bei 600 % Zoom und verschobenem Ausschnitt |
| B-5 | Das SVG ist eigenständig: gültiges XML, keine externen Verweise, lässt sich ohne die Anwendung öffnen. Das PNG ist mindestens 1600 Pixel breit und nicht leer. | XML-Prüfung; PNG-Signatur, Abmessungen und Stichproben einzelner Bildpunkte |
| B-6 | Der Export verändert weder Ansicht noch Zustand und löst keine API-Anfrage aus. | Zustand und Anfragenzahl vor und nach dem Export |
| B-7 | Der Export funktioniert im Windows-Programm und ohne Internetzugang. | Fenstertest und Prüfung mit Firewall-Sperre auf dem Windows-Runner |
| B-8 | Layout, Begriffe und Farbbedeutungen der Oberfläche bleiben unverändert; es entsteht kein neuer Schaltflächenstil. | Vorher-/Nachher-Aufnahme der Werkzeugleiste, auch bei 900 Pixel Fensterbreite |

## Vor der Umsetzung zu entscheiden

1. Soll das Bild die gesamte Topologie zeigen (Vorschlag) oder genau den
   sichtbaren Ausschnitt?
2. Sollen Legende und Kopfzeile im Bild stehen (Vorschlag: ja)?
3. Wird zusätzlich eine helle Variante für den Druck gewünscht, etwa für
   Abbildungen in einer Arbeit? Der Plan sieht nur die dunkle Darstellung der
   Oberfläche vor.
4. Platz der Schaltflächen: Werkzeugleiste der Graphansicht (Vorschlag) oder
   Seitenleiste?
