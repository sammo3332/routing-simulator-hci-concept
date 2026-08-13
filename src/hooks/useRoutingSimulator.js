import { useEffect, useMemo, useRef, useState } from "react";
import { importTopology, updateSimulationSession } from "../services/backendService";
import { GOLD, PAD, RED, SVG_H, SVG_W, T1, T2 } from "../styles/sharedStyles";

function timestamp() {
  return new Date().toLocaleTimeString("de-DE", { hour12: false });
}

function edgeUnion(pathMap = {}) {
  const result = new Set();
  Object.values(pathMap).forEach(path => path?.edge_ids?.forEach(id => result.add(id)));
  return result;
}

function layoutNodes(nodes) {
  const positioned = nodes.filter(node => node.position);
  const canUsePositions = positioned.length === nodes.length && nodes.length > 1;
  if (canUsePositions) {
    const xs = nodes.map(node => node.position.x);
    const ys = nodes.map(node => node.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX > minX && maxY > minY) {
      return Object.fromEntries(nodes.map(node => [
        node.id,
        {
          x: PAD + ((node.position.x - minX) / (maxX - minX)) * (SVG_W - PAD * 2),
          y: PAD + (1 - (node.position.y - minY) / (maxY - minY)) * (SVG_H - PAD * 2),
        },
      ]));
    }
  }
  return Object.fromEntries(nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1) - Math.PI / 2;
    return [
      node.id,
      {
        x: SVG_W / 2 + Math.cos(angle) * (SVG_W * 0.34),
        y: SVG_H / 2 + Math.sin(angle) * (SVG_H * 0.34),
      },
    ];
  }));
}

export function useRoutingSimulator() {
  const [simulation, setSimulation] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventLog, setEventLog] = useState([
    { id: 1, time: timestamp(), type: "info", msg: "Bereit. Bitte TopoHub-JSON oder SNDlib-XML laden." },
  ]);
  const logId = useRef(1);
  const eventLogEndRef = useRef(null);

  useEffect(() => {
    eventLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLog]);

  const addLog = (type, msg) => {
    setEventLog(previous => [
      ...previous,
      { id: ++logId.current, time: timestamp(), type, msg },
    ]);
  };

  const run = async (description, operation) => {
    setLoading(true);
    setError("");
    addLog("info", description);
    try {
      const next = await operation();
      setSimulation(next);
      if (!selectedLinkId || !next.topology.edges.some(edge => edge.id === selectedLinkId)) {
        setSelectedLinkId(next.topology.edges[0]?.id ?? "");
      }
      return next;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unbekannter Fehler";
      setError(message);
      addLog("alert", `FEHLER: ${message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleTopologyFile = async file => {
    const importTime = timestamp();
    const next = await run(
      `Importiere „${file.name}“…`,
      () => importTopology(file),
    );
    if (next) {
      setEventLog([
        {
          id: ++logId.current,
          time: importTime,
          type: "info",
          msg: `Importiere „${file.name}“…`,
        },
        {
          id: ++logId.current,
          time: timestamp(),
          type: "success",
          msg: `Topologie geladen: ${next.topology.nodes.length} Knoten, ${next.topology.edges.length} Kanten.`,
        },
      ]);
    }
  };

  const updateSession = async (patch, message) => {
    if (!simulation) return;
    const next = await run(message, () => updateSimulationSession(simulation.session_id, patch));
    if (next) {
      addLog(
        "success",
        `Routing neu berechnet: ${next.result.reachable_node_count}/${next.result.node_count} Knoten erreichen das Ziel.`,
      );
    }
  };

  const setTargetNode = targetNodeId => updateSession(
    { target_node_id: targetNodeId },
    `Setze Zielknoten auf ${targetNodeId}.`,
  );

  const setWeightMode = weightMode => updateSession(
    { weight_mode: weightMode },
    `Wechsle Routingmetrik auf ${weightMode === "hop_count" ? "Hop-Anzahl" : "Kantengewicht"}.`,
  );

  const simulateLinkFailure = () => {
    if (!simulation || !selectedLinkId) return;
    const failures = new Set(simulation.failures.failed_edge_ids);
    failures.add(selectedLinkId);
    updateSession(
      { failed_edge_ids: [...failures] },
      `Schalte Kante ${selectedLinkId} aus.`,
    );
  };

  const restoreSelectedLink = () => {
    if (!simulation || !selectedLinkId) return;
    updateSession(
      {
        failed_edge_ids: simulation.failures.failed_edge_ids.filter(
          edgeId => edgeId !== selectedLinkId,
        ),
      },
      `Stelle Kante ${selectedLinkId} wieder her.`,
    );
  };

  const repairNetwork = () => updateSession(
    { failed_edge_ids: [] },
    "Stelle alle Kanten wieder her.",
  );

  const topology = simulation?.topology;
  const failedEdgeIds = useMemo(
    () => new Set(simulation?.failures.failed_edge_ids ?? []),
    [simulation],
  );
  const affectedNodeIds = useMemo(
    () => new Set(simulation?.result.affected_node_ids ?? []),
    [simulation],
  );
  const changedNodeIds = useMemo(
    () => new Set(simulation?.result.changed_node_ids ?? []),
    [simulation],
  );
  const baselineEdgeIds = useMemo(
    () => edgeUnion(simulation?.result.baseline_paths),
    [simulation],
  );
  const currentEdgeIds = useMemo(
    () => edgeUnion(simulation?.result.current_paths),
    [simulation],
  );
  const positions = useMemo(
    () => layoutNodes(topology?.nodes ?? []),
    [topology],
  );

  const graphNodes = (topology?.nodes ?? []).map(node => ({
    ...node,
    position: positions[node.id],
    target: node.id === simulation.routing.target_node_id,
    affected: affectedNodeIds.has(node.id),
    changed: changedNodeIds.has(node.id),
  }));
  const graphLinks = (topology?.edges ?? []).map(edge => {
    const sourcePosition = positions[edge.source];
    const targetPosition = positions[edge.target];
    const failed = failedEdgeIds.has(edge.id);
    const current = currentEdgeIds.has(edge.id);
    const baseline = baselineEdgeIds.has(edge.id);
    return {
      ...edge,
      sourcePosition,
      targetPosition,
      midpoint: {
        x: (sourcePosition.x + targetPosition.x) / 2,
        y: (sourcePosition.y + targetPosition.y) / 2,
      },
      failed,
      current,
      baseline,
      selected: edge.id === selectedLinkId,
      color: failed ? RED : current ? T1 : baseline ? T2 : "#31394d",
    };
  });

  const routingLinkOptions = (topology?.edges ?? []).map(edge => ({
    value: edge.id,
    label: `${failedEdgeIds.has(edge.id) ? "⚠ " : ""}${edge.source} ↔ ${edge.target} (${edge.id})`,
  }));
  const nodeOptions = (topology?.nodes ?? []).map(node => ({
    value: node.id,
    label: node.label ? `${node.label} (${node.id})` : node.id,
  }));
  const routeRows = Object.entries(simulation?.result.current_paths ?? {})
    .filter(([nodeId]) => nodeId !== simulation.routing.target_node_id)
    .map(([nodeId, path]) => ({
      nodeId,
      path,
      affected: affectedNodeIds.has(nodeId),
      changed: changedNodeIds.has(nodeId),
    }))
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));

  return {
    simulation,
    topology,
    loading,
    error,
    eventLog,
    eventLogEndRef,
    handleTopologyFile,
    setTargetNode,
    setWeightMode,
    selectedLinkId,
    setSelectedLinkId,
    selectedLinkFailed: failedEdgeIds.has(selectedLinkId),
    routingLinkOptions,
    nodeOptions,
    simulateLinkFailure,
    restoreSelectedLink,
    repairNetwork,
    graphNodes,
    graphLinks,
    routeRows,
    failedCount: failedEdgeIds.size,
    affectedCount: affectedNodeIds.size,
    T1,
    T2,
    RED,
    GOLD,
    SVG_W,
    SVG_H,
  };
}
