# HCI-zentrierte Gliederung der Bachelorarbeit

Stand: 15. September 2026

## Leitidee

Die Arbeit entwickelt keine neue Routingheuristik. Ihr Beitrag ist die
HCI-orientierte Konzeption, Implementierung und Evaluation eines Werkzeugs, mit
dem Failover-Routingzustände und insbesondere Bonsai-Routing nachvollziehbar
untersucht werden können.

## Empfohlene Gliederung

1. **Einleitung**
   - Problem: Failover-Verhalten und Routingfehler sind schwer zu überblicken.
   - Ziel und Abgrenzung des Werkzeugs.
   - Forschungsfragen zu Verständlichkeit, Bedienbarkeit und Diagnose.
   - Aufbau der Arbeit.
2. **Fachliche Grundlagen**
   - Graph, Knoten, Kante, Pfad, Gewicht und Konnektivität.
   - Routing, kürzester Pfad und Ausfall einer physischen Kante.
   - gerichtete Bäume/Aboreszenzen und Bonsai-Failover.
   - Nur so viel Algorithmik, wie zum Verständnis der Oberfläche nötig ist;
     Details und Beweise auf Primärliteratur verweisen.
3. **HCI- und Visualisierungsgrundlagen**
   - Sichtbarkeit des Systemstatus, Konsistenz, Kontrolle und Fehlerdiagnose.
   - Overview first, zoom/filter, details on demand.
   - Anforderungen an eine erklärbare Darstellung von Normalzustand,
     Umleitung, physischer Trennung, Schleife und Sackgasse.
4. **Anforderungsanalyse und Gestaltung**
   - Zielgruppen und Aufgaben.
   - funktionale und HCI-Anforderungen.
   - Entwicklung vom frühen Mockup zum aktuellen UI.
   - begründete Designentscheidungen: Farben plus Linienarten, Kürzel plus
     Tooltip, Auto-Fit, einklappbare Bereiche und Einzelroute.
5. **Architektur und Implementierung**
   - React/Vite-Präsentationsschicht, FastAPI und UI-unabhängiger Domänenkern.
   - gemeinsames Modell und Import von JSON, SNDlib-XML und GraphML.
   - deterministischer kürzester Pfad.
   - projektspezifische Bonsai-Greedy-Konstruktion und lokale Wechselregel.
   - API-Ablauf, Validierung, Tests und bekannte technische Grenzen.
6. **Evaluationsmethodik**
   - formative Designhistorie und empirische Benutzerstudie trennen.
   - Stichprobe, fünf Aufgaben, Erhebungsablauf und Datenschutz.
   - SUS und fünf projektspezifische Fragen.
   - Auswertungsmethode und Grenzen einer kleinen Stichprobe.
7. **Ergebnisse**
   - Aufgabenerfolg, Überspringen, Zeiten/Hilfen bei moderierten Tests.
   - SUS-Gesamtwerte und Darstellung der Einzelitems.
   - projektspezifische Skalen und qualitative Themen.
   - ausschließlich tatsächlich erhobene Daten berichten.
8. **Diskussion**
   - Forschungsfragen anhand der Ergebnisse beantworten.
   - Zusammenhang zwischen HCI-Entscheidungen und Befunden.
   - Grenzen: Stichprobe, Topologieauswahl, Prototyp, In-Memory-Sessions und
     projektspezifische Bonsai-Abgrenzung.
   - Änderungswünsche als Interpretation und zukünftige Arbeit, nicht als
     nachträglich erfundener Evaluationserfolg.
9. **Fazit und Ausblick**
   - Beitrag knapp zusammenfassen.
   - priorisierte nächste Verbesserungen nennen.

## Empfohlene Forschungsfragen

- **F1:** In welchem Maß unterstützt die Oberfläche Nutzende dabei,
  Zustandsänderungen nach einem Kantenausfall zu erkennen und zu erklären?
- **F2:** Können Nutzende physische Unerreichbarkeit von Bonsai-Routingfehlern
  unterscheiden?
- **F3:** Welche Gebrauchstauglichkeit weist der Prototyp in den definierten
  Untersuchungsszenarien auf?

## Schreibreihenfolge

Zuerst können die Kapitel 2 bis 6 aus dem bereits stabilen Stand geschrieben
werden. Kapitel 7 und die ergebnisbezogenen Teile von 8 folgen nach Ende der
Studie. Einleitung, Fazit und Abstract werden zuletzt auf den tatsächlich
belegten Beitrag abgestimmt.

