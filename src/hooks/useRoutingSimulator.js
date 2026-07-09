import { useEffect, useRef, useState } from "react";
import { METRIC_BENCHMARKS, NETWORK_LINKS, NETWORK_NODES } from "../services/mockBackendService";
import { GOLD, PAD, RED, S, SVG_H, SVG_W, T1, T2 } from "../styles/sharedStyles";

function getTimestamp() {
  const date = new Date();
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

function getNodePosition(node) {
  return {
    x: PAD + node.rx * (SVG_W - PAD * 2),
    y: PAD + node.ry * (SVG_H - PAD * 2),
  };
}

function getLinkState(link, failedLinkIds, primaryTreeVisible, backupTreeVisible) {
  if (failedLinkIds.has(link.id)) return "broken";
  if (link.tree === "t1" && !primaryTreeVisible) return "dim";
  if (link.tree === "t2" && !backupTreeVisible) return "dim";
  return link.tree;
}

export function useRoutingSimulator() {
  const [networkTopology, setNetworkTopology] = useState("Atlanta");
  const [routingComparisonMode, setRoutingComparisonMode] = useState("Bonsai-Heuristik vs. Greedy-Routing");
  const [targetNode, setTargetNode] = useState("Dortmund");
  const [routingMetric, setRoutingMetric] = useState("Hop-Count");
  const [primaryTreeVisible, setPrimaryTreeVisible] = useState(true);
  const [backupTreeVisible, setBackupTreeVisible] = useState(true);
  const [selectedLinkId, setSelectedLinkId] = useState("ES-BO");
  const [failedLinkIds, setFailedLinkIds] = useState(new Set(["ES-BO"]));
  const [activeTab, setActiveTab] = useState(0);
  const [uploadedTopologyFile, setUploadedTopologyFile] = useState(null);
  const [eventLog, setEventLog] = useState([
    { id:1, time:"13:58:19", type:"info",    msg:"Simulation initialisiert. Topologie: Atlanta geladen." },
    { id:2, time:"13:58:20", type:"info",    msg:"Berechne kantendisjunkte Arboreszenzen (Bonsai-Heuristik)..." },
    { id:3, time:"13:58:20", type:"success", msg:"SUCCESS: Arborescenzen T1 & T2 berechnet. Netzwerk bereit." },
    { id:4, time:"13:58:22", type:"alert",   msg:"ALERT: Link Essen-Bochum getrennt. Ausfall gekappt." },
    { id:5, time:"13:58:22", type:"info",    msg:"State-Based Rerouting: Zustand zu lokalem Backup-Pfad gesprungen." },
    { id:6, time:"13:58:22", type:"success", msg:"SUCCESS: Fast-Failover konvergiert in 12ms (Bonsai RR-Swap)." },
  ]);
  const [toastQueue, setToastQueue] = useState([]);
  const eventLogId = useRef(10);
  const eventLogEndRef = useRef(null);

  useEffect(() => {
    eventLogEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [eventLog]);

  const metricBenchmark = METRIC_BENCHMARKS[routingMetric];
  const essenBochumLinkFailed = failedLinkIds.has("ES-BO");
  const failedLinkCount = failedLinkIds.size;
  const bonsaiDeliveryRate = failedLinkCount >= 3 ? "58%" : "100%";
  const greedyDeliveryRate = essenBochumLinkFailed ? "0% (Deadlock ⚠)" : "100%";
  const greedyComputationTime = essenBochumLinkFailed ? metricBenchmark.greedyTime : "N/A";
  const essenBochumStatusType = essenBochumLinkFailed ? "failover" : "normal";
  const selectedLinkFailed = failedLinkIds.has(selectedLinkId);
  const topbarMetrics = [
    { label:"Topologie", value:networkTopology, color:"#60a5fa" },
    { label:"Metrik", value:routingMetric, color:"#a78bfa" },
    { label:"Ausfälle", value:failedLinkCount, color:failedLinkCount > 0 ? RED : "#22c55e" },
    { label:"Global Delivery", value:bonsaiDeliveryRate, color:failedLinkCount >= 3 ? "#ff6060" : "#22c55e" },
    { label:"Failover-Zeit", value:metricBenchmark.bonsaiTime, color:GOLD },
  ];
  const routingMetricOptions = ["Hop-Count", "Latency (ms)", "Cost (Abstract)"].map(metric => ({
    value: metric,
    label: metric === "Hop-Count" ? "HC" : metric === "Latency (ms)" ? "MS" : "CA",
    selected: routingMetric === metric,
  }));
  const routingLinkOptions = NETWORK_LINKS.map(link => ({
    ...link,
    failed: failedLinkIds.has(link.id),
    label: failedLinkIds.has(link.id) ? `⚠ ${link.lbl}` : link.lbl,
    color: failedLinkIds.has(link.id) ? "#ff7070" : "#e2e8f4",
  }));
  const graphFilters = [["gG","4"],["gP","4"],["gGold","7"],["gR","3"]];
  const graphGridDots = Array.from({ length: Math.ceil(SVG_W / 34) }, (_, xIndex) => (
    Array.from({ length: Math.ceil(SVG_H / 34) }, (_, yIndex) => ({
      id: `${xIndex}-${yIndex}`,
      x: xIndex * 34,
      y: yIndex * 34,
    }))
  )).flat();
  const targetNodeRings = [
    { radius:46, opacity:.05 },
    { radius:36, opacity:.09 },
    { radius:27, opacity:.14 },
  ];
  const graphStatusChips = [
    primaryTreeVisible && { label:"T1 aktiv", color:T1, background:"rgba(57,255,20,.10)", border:"rgba(57,255,20,.22)" },
    backupTreeVisible && { label:"T2 aktiv", color:T2, background:"rgba(192,132,252,.10)", border:"rgba(192,132,252,.22)" },
    failedLinkCount > 0 && { label:`${failedLinkCount} Ausfall${failedLinkCount > 1 ? "e" : ""}`, color:RED, background:"rgba(255,64,64,.10)", border:"rgba(255,64,64,.22)" },
  ].filter(Boolean);
  const legendItems = [
    { type:"line", color:RED, dash:true, label:"Ausgefallener Link" },
    { type:"dot", color:GOLD, label:"Zielknoten (Dortmund)" },
    { type:"line", color:T1, label:"Primärbaum T1" },
    { type:"line", color:T2, label:"Backup-Baum T2" },
    { type:"line", color:GOLD, dash:false, label:"Aktiver Failover-Pfad" },
  ];
  const terminalLights = ["#ff5f56", "#ffbd2e", "#27c93f"];
  const evaluationTableHeaders = ["Node", "Status", "Delivery Rate (%)", "Avg. Stretch", "Max Stretch", "Computation Time"];
  const routeTableHeaders = ["Route", "Hop-Sequenz", "Gesamtlatenz", "Algorithmus", "Status"];
  const primaryRouteHops = metricBenchmark.pathPrimary.hop.split(" → ");
  const backupRouteHops = metricBenchmark.pathBackup.hop.split(" → ");
  const hopHistory = [
    { time:"13:58:22", event:"ES→WU aufgewertet (T2-Failover)", color:T1 },
    { time:"13:58:22", event:"WU→DO stabil, kein Loop", color:"#7a8499" },
    { time:"13:58:22", event:"HA→DO Standby gehalten", color:T2 },
  ];
  const scientificEvaluationTabActive = activeTab === 0;
  const routeDetailsTabActive = activeTab === 1;

  const addEventLogEntry = (type, msg) => {
    setEventLog(previousLog => [
      ...previousLog,
      { id:++eventLogId.current, time:getTimestamp(), type, msg },
    ]);
  };

  const addToast = (msg, type) => {
    const id = Date.now();
    setToastQueue(previousToasts => [...previousToasts, { id, msg, type }]);
    setTimeout(() => {
      setToastQueue(previousToasts => previousToasts.filter(toast => toast.id !== id));
    }, 5500);
  };

  const dismissToast = id => {
    setToastQueue(previousToasts => previousToasts.filter(toast => toast.id !== id));
  };

  const handleMetricChange = metric => {
    setRoutingMetric(metric);
    addEventLogEntry("info", `Routing-Metrik gewechselt: ${metric}. Benchmark-Daten werden neu berechnet...`);
    setTimeout(() => {
      addEventLogEntry("success", `SUCCESS: Metriken aktualisiert (${metric}). Vergleichstabelle neu geladen.`);
    }, 350);
  };

  const handleTopologyFile = fileName => {
    setUploadedTopologyFile(fileName);
    addEventLogEntry("info", `Datei erkannt: "${fileName}". Topologie wird geparst...`);
    setTimeout(() => {
      addEventLogEntry("success", `SUCCESS: Topologie aus "${fileName}" geladen und validiert.`);
    }, 500);
  };

  const togglePrimaryTreeVisibility = () => {
    setPrimaryTreeVisible(visible => !visible);
  };

  const toggleBackupTreeVisibility = () => {
    setBackupTreeVisible(visible => !visible);
  };

  const simulateLinkFailure = () => {
    if (failedLinkIds.has(selectedLinkId)) return;
    const selectedLink = NETWORK_LINKS.find(link => link.id === selectedLinkId);

    setFailedLinkIds(previousFailedLinks => new Set([...previousFailedLinks, selectedLinkId]));
    addEventLogEntry("alert", `ALERT: Link ${selectedLink.lbl} getrennt. Ausfall injiziert.`);
    addEventLogEntry("info", "Zustandsänderung registriert. Starte lokale Failover-Schaltung...");

    setTimeout(() => {
      addEventLogEntry("success", `SUCCESS: Rerouting erfolgreich. Konvergenzzeit: ${metricBenchmark.bonsaiTime}. Delivery Rate stabil bei 100%.`);
      addToast(`Link ${selectedLink.lbl} offline. Fast-Failover in ${metricBenchmark.bonsaiTime} berechnet.`, "alert");
    }, 400);
  };

  const repairNetwork = () => {
    if (!failedLinkIds.size) return;
    setFailedLinkIds(new Set());
    addEventLogEntry("info", "Netzwerk-Reparatur läuft. Topologie-Zustand wird zurückgesetzt...");

    setTimeout(() => {
      addEventLogEntry("success", "SUCCESS: Normalzustand wiederhergestellt. Alle Pfade aktiv.");
      addToast("Alle Links aktiv. Netzwerk vollständig repariert.", "success");
    }, 300);
  };

  const getEventLogColor = type => {
    if (type === "alert") return "#ff6060";
    if (type === "success") return T1;
    return "#7a8499";
  };

  const graphLinks = NETWORK_LINKS.map(link => {
    const sourceNode = NETWORK_NODES.find(node => node.id === link.a);
    const targetNodeForLink = NETWORK_NODES.find(node => node.id === link.b);
    const sourcePosition = getNodePosition(sourceNode);
    const targetPosition = getNodePosition(targetNodeForLink);
    const linkState = getLinkState(link, failedLinkIds, primaryTreeVisible, backupTreeVisible);
    const selected = link.id === selectedLinkId;
    const failoverRoute = essenBochumLinkFailed && (link.id === "ES-WU" || link.id === "WU-DO");
    const midpoint = {
      x: (sourcePosition.x + targetPosition.x) / 2,
      y: (sourcePosition.y + targetPosition.y) / 2,
    };

    return {
      ...link,
      sourcePosition,
      targetPosition,
      midpoint,
      linkState,
      selected,
      failoverRoute,
      color: failoverRoute ? GOLD : linkState === "t1" ? T1 : T2,
      filter: failoverRoute ? "url(#gGold)" : linkState === "t1" ? "url(#gG)" : "url(#gP)",
    };
  });

  const graphNodes = NETWORK_NODES.map(node => {
    const position = getNodePosition(node);
    const target = Boolean(node.tgt);
    const connectedToPrimaryTree = primaryTreeVisible && NETWORK_LINKS.some(link => (
      (link.a === node.id || link.b === node.id) && link.tree === "t1" && !failedLinkIds.has(link.id)
    ));
    const connectedToBackupTree = backupTreeVisible && NETWORK_LINKS.some(link => (
      (link.a === node.id || link.b === node.id) && link.tree === "t2" && !failedLinkIds.has(link.id)
    ));

    return {
      ...node,
      position,
      target,
      strokeColor: target ? GOLD : connectedToPrimaryTree ? T1 : connectedToBackupTree ? T2 : "#2e3650",
      filter: target ? "url(#gGold)" : connectedToPrimaryTree ? "url(#gG)" : connectedToBackupTree ? "url(#gP)" : undefined,
    };
  });

  const tabs = [
    { label:"Wissenschaftliche Evaluation", icon:"📊", accent:"#3b82f6" },
    { label:"Pfad-Details & Hop-Historie",  icon:"🔀", accent:T2 },
  ];

  return {
    networkTopology,
    setNetworkTopology,
    routingComparisonMode,
    setRoutingComparisonMode,
    targetNode,
    setTargetNode,
    routingMetric,
    topbarMetrics,
    routingMetricOptions,
    primaryTreeVisible,
    backupTreeVisible,
    togglePrimaryTreeVisibility,
    toggleBackupTreeVisibility,
    selectedLinkId,
    setSelectedLinkId,
    failedLinkIds,
    selectedLinkFailed,
    routingLinkOptions,
    activeTab,
    setActiveTab,
    scientificEvaluationTabActive,
    routeDetailsTabActive,
    uploadedTopologyFile,
    eventLog,
    toastQueue,
    eventLogEndRef,
    handleMetricChange,
    handleTopologyFile,
    simulateLinkFailure,
    repairNetwork,
    essenBochumLinkFailed,
    failedLinkCount,
    metricBenchmark,
    bonsaiDeliveryRate,
    greedyDeliveryRate,
    greedyComputationTime,
    essenBochumStatusType,
    getEventLogColor,
    tabs,
    graphFilters,
    graphGridDots,
    targetNodeRings,
    graphStatusChips,
    legendItems,
    terminalLights,
    evaluationTableHeaders,
    routeTableHeaders,
    primaryRouteHops,
    backupRouteHops,
    hopHistory,
    dismissToast,
    graphLinks,
    graphNodes,
    routingLinks: NETWORK_LINKS,
    T1,
    T2,
    RED,
    GOLD,
    SVG_W,
    SVG_H,
    S,
  };
}
