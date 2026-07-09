# Architektur-Übersicht

Der Fokus bei diesem Prototyp liegt auf einer sauberen Trennung von UI und Geschäftslogik. Die Codebase ist strikt modular aufgebaut, um Wartbarkeit und Skalierbarkeit zu sichern:

* **`/components`**: Beinhaltet die reinen UI-Bausteine (Presentational Components). Sie kümmern sich ausschließlich um das Rendering und bleiben frei von komplexer Logik.
* **`/hooks`**: Custom Hooks übernehmen das lokale und globale State-Management sowie die UI-Logik.
* **`/services`**: Die eigentliche Kernlogik – also die Routing-Algorithmen und die Failover-Simulation – ist in dedizierte Services ausgelagert.

Dieses Setup hält die React-Komponenten schlank und macht die Netzwerklogik unabhängig von der Oberfläche testbar. Weitere Details und visuelle Architektur-Diagramme sind im `/docs`-Ordner dokumentiert.