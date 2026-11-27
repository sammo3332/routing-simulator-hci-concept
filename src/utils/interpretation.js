function nodeList(nodeIds, limit) {
  if (!nodeIds.length) return "";
  return nodeIds.length <= limit
    ? ` (${nodeIds.join(", ")})`
    : " (siehe Routingzusammenfassung)";
}

export function buildInterpretation({
  strategy,
  edgeConnectivity,
  failedEdgeCount,
  failedEdgeSummary,
  reroutedNodeIds,
  unreachableNodeIds,
  routingFailureNodeIds,
  targetNodeId,
  reachableCount,
  nodeCount,
}) {
  const failures = failedEdgeCount === 1
    ? "1 aktiver Kantenausfall"
    : `${failedEdgeCount} aktive Kantenausfälle`;
  return `${strategy === "bonsai_greedy" ? `Bonsai mit ${edgeConnectivity} Aboreszenzen; ` : ""}`
    + `${failures} (${failedEdgeSummary}); `
    + `${reroutedNodeIds.length} umgeleitete Route${reroutedNodeIds.length === 1 ? "" : "n"}`
    + `${nodeList(reroutedNodeIds, 5)}; `
    + `${unreachableNodeIds.length} physisch unerreichbare Knoten`
    + `${nodeList(unreachableNodeIds, 5)}; `
    + `${routingFailureNodeIds.length} Routingfehler trotz physischer Verbindung`
    + `${nodeList(routingFailureNodeIds, Infinity)}. `
    + `Zielknoten: ${targetNodeId}. Erfolgreich zugestellt: ${reachableCount}/${nodeCount}.`;
}
