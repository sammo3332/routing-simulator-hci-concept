# Anforderungen (Auszug)

Diese Übersicht fasst die zentralen Anforderungen meiner Bachelorarbeit zusammen.

## Funktionale Anforderungen
| ID | Anforderung | Fokus |
| :--- | :--- | :--- |
| FA-1 | Topologie-Import | GML/JSON via Backend |
| FA-4 | Routing-Berechnung | Bonsai-Heuristik |
| FA-6 | Netzwerk-Reparatur | Reset-Funktion |

## Nicht-Funktionale Anforderungen (HCI-Fokus)
* **Kognitive Entlastung:** Visuelle Trennung von Primär-/Backup-Pfaden.
* **Systemstatus:** Integration von Live-Toasts und Event-Logs bei Ausfällen[cite: 1].

*Das vollständige Anforderungsdokument mit allen Details liegt unter [/docs/handout.pdf](/docs/handout.pdf).*

## Umsetzungsstand FA-4

FA-4 ist als deterministische Greedy-Referenzstrategie umgesetzt. Das Backend
berechnet vollständige arc-disjunkte Aboreszenzen, simuliert zirkuläres
Failover-Routing und trennt physische Unerreichbarkeit von Routingfehlern. Das
Frontend erlaubt den Vergleich mit dem bisherigen kürzesten Pfad und zeigt
ausgewählte Aboreszenzen gerichtet an.
