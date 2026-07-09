# Fast-Failover Routing Simulator

Ein Prototyp zur Simulation und Visualisierung von Fast-Failover-Konzepten in Netzwerk-Topologien, entwickelt im Rahmen meiner Bachelorarbeit. Das Tool ermöglicht es, Netzwerkausfälle in Echtzeit zu simulieren und die Performance der Routing-Algorithmen zu analysieren.

## Hauptfunktionen
* Import von Netzwerk-Topologien (GML/JSON).
* Live-Simulation von Kanten-Ausfällen.
* Echtzeit-Berechnung kanten-disjunkter Ausweichpfade via Bonsai-Heuristik.
* Metrik-Analyse: Delivery Rate & Stretch.

## Tech Stack
* **Frontend:** React, Vite
* **Backend-Logik:** NetworkX (Python-basiert, angebunden via API)

## Setup
1. Repository klonen.
2. `npm install` ausführen.
3. `npm run dev` zum Starten der Anwendung.

## Dokumentation
Detaillierte Architektur-Diagramme und das Handout zur Bachelorarbeit befinden sich im Ordner `/docs`.