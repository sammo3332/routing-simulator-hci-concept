# Architektur-Übersicht

Das System folgt einer strikten Trennung zwischen Präsentationsschicht und Logikschicht. Durch die Entkopplung von UI und Berechnungs-Engines wird die Anwendung auch bei komplexen Netzwerk-Simulationen performant gehalten

## Schichtenmodell
* **Frontend (Präsentationsschicht):** Verantwortlich für das UI-Rendering, den State-Management-Flow via `st.session_state` und die Graphen-Visualisierung.
* **Backend (Logikschicht):** Kapselt die Berechnungs-Engines (Bonsai & Greedy) hinter einem Strategy-Pattern-Controller, was eine einfache Erweiterbarkeit um neue Algorithmen ermöglicht 

## Datenfluss
1. **Input:** Topologie-Parser verarbeitet die Eingabedateien
2. **State:** Der Session-State steuert die Ausfälle und triggert bei Änderungen eine Neuberechnung
3. **Engine:** Die Engine liefert das berechnete Graph-Objekt zurück an das Frontend, welches den Graphen neu rendert 

## Diagramme
Ein detaillierter Überblick über den Datenfluss und die Architektur-Komponenten findet sich in `docs/system_architecture.png`.