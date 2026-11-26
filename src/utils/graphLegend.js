// Legende der Graphansicht. Die Oberfläche und der Bildexport verwenden
// dieselbe Liste, damit beide dieselben Einträge, Farben und Bezeichnungen
// zeigen.
//
// `glyph` ist das Zeichen, das die Oberfläche anzeigt. `kind` sagt dem
// Bildexport, welches Symbol er stattdessen als Vektorform zeichnet: Zeichen wie
// ━ oder ✕ sind nicht in jeder Schrift vorhanden, ein SVG soll aber auch dort
// richtig aussehen, wo es geöffnet wird.
export const TREE_COLOR = "#a78bfa";

export function graphLegendItems(colors, hasBonsai) {
  const items = [
    { id: "route-before", kind: "line", glyph: "━━", color: colors.T2, label: "Route vor dem Ausfall" },
    { id: "route-current", kind: "line", glyph: "━━", color: colors.T1, label: "Aktuelle Route" },
    { id: "edge-idle", kind: "line", glyph: "━━", color: colors.EDGE_IDLE, label: "Kante ohne Route" },
    { id: "edge-failed", kind: "failed", glyph: "┄✕┄", color: colors.RED, label: "Ausgefallene Kante" },
    { id: "node-rerouted", kind: "dot", glyph: "●", color: colors.T2, label: "Umgeleiteter Knoten" },
    { id: "node-unreachable", kind: "dot", glyph: "●", color: colors.RED, label: "Unerreichbarer Knoten" },
    { id: "node-target", kind: "dot", glyph: "●", color: colors.GOLD, label: "Zielknoten" },
  ];
  if (hasBonsai) {
    items.push({ id: "tree", kind: "arrow", glyph: "━━▶", color: TREE_COLOR, label: "Gewählte Aboreszenz" });
  }
  return items;
}
