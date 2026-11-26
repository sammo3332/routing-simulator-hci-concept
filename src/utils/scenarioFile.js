// Dateiname für ein gespeichertes Szenario, z. B.
// "szenario-germany50-20261126-0915.json".
export function scenarioFileName(topologyName, date = new Date()) {
  const slug = String(topologyName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  const pad = value => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `szenario-${slug || "topologie"}-${stamp}.json`;
}

// Kurzbeschreibung des wiederhergestellten fachlichen Zustands.
export function describeScenario(simulation) {
  const { routing, failures, topology } = simulation;
  const strategy = routing.strategy === "bonsai_greedy" ? "Bonsai (Greedy)" : "Kürzester Pfad";
  const metric = routing.weight_mode === "edge_weight" ? "Kantengewicht" : "Hop-Anzahl";
  const count = failures.failed_edge_ids.length;
  return `${topology.nodes.length} Knoten, ${topology.edges.length} Kanten, `
    + `Ziel ${routing.target_node_id}, ${strategy}, ${metric}, `
    + `${count} ${count === 1 ? "Ausfall" : "Ausfälle"}`;
}

export function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
