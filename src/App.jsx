import FileUploader from "./components/FileUploader";
import SelectField from "./components/SelectField";
import SidebarSection from "./components/SidebarSection";
import { useRoutingSimulator } from "./hooks/useRoutingSimulator";
import { S } from "./styles/sharedStyles";

const panel = {
  background: "#131720",
  border: "1px solid #252b3b",
  borderRadius: 10,
};

function Metric({ label, value, color = "#e2e8f4" }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "#64708a", textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color, ...S.mono }}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 30, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 38, marginBottom: 12 }}>🕸️</div>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Noch keine Topologie geladen</div>
        <div style={{ color: "#7a8499", maxWidth: 470, lineHeight: 1.6 }}>
          Lade links eine TopoHub-JSON- oder SNDlib-XML-Datei. Danach kannst du
          Zielknoten wählen, Kanten ausfallen lassen und die tatsächlich berechneten
          Routingzustände vergleichen.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const simulator = useRoutingSimulator();
  const {
    simulation, topology, loading, error, eventLog, eventLogEndRef,
    handleTopologyFile, setTargetNode, setWeightMode,
    selectedLinkId, setSelectedLinkId, selectedLinkFailed,
    routingLinkOptions, nodeOptions, simulateLinkFailure, restoreSelectedLink,
    repairNetwork, graphNodes, graphLinks, routeRows, failedCount, affectedCount,
    T1, T2, RED, GOLD, SVG_W, SVG_H,
  } = simulator;

  const targetNodeId = simulation?.routing.target_node_id ?? "";
  const weightMode = simulation?.routing.weight_mode ?? "hop_count";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0d0f14", color: "#e2e8f4", fontFamily: "system-ui,-apple-system,sans-serif", fontSize: 13, overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 5px; height: 5px }
        ::-webkit-scrollbar-thumb { background: #2e3650; border-radius: 4px }
        button:disabled { cursor: not-allowed !important; opacity: .45 }
      `}</style>

      <header style={{ height: 48, background: "#131720", borderBottom: "1px solid #252b3b", display: "flex", alignItems: "center", padding: "0 18px", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "grid", placeItems: "center" }}>↪</div>
        <div>
          <div style={{ fontWeight: 800 }}>Failover Routing Visualizer</div>
          <div style={{ fontSize: 9, color: "#64708a" }}>Deterministische Referenzstrategie · reale Routingdaten</div>
        </div>
        {simulation && (
          <>
            <div style={{ width: 1, height: 24, background: "#252b3b", marginLeft: 8 }} />
            <Metric label="Topologie" value={topology.name || topology.topology_id} color="#60a5fa" />
            <Metric label="Knoten / Kanten" value={`${topology.nodes.length} / ${topology.edges.length}`} />
            <Metric label="Ausfälle" value={failedCount} color={failedCount ? RED : "#22c55e"} />
            <Metric label="Betroffen" value={affectedCount} color={affectedCount ? RED : "#22c55e"} />
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: loading ? GOLD : "#22c55e", fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: loading ? GOLD : "#22c55e" }} />
          {loading ? "Berechnung läuft" : "Bereit"}
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <aside style={{ width: 285, flexShrink: 0, background: "#131720", borderRight: "1px solid #252b3b", overflowY: "auto" }}>
          <div style={{ padding: "14px 15px", borderBottom: "1px solid #252b3b" }}>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".1em" }}>Simulationssteuerung</div>
            <div style={{ color: "#64708a", fontSize: 10, marginTop: 3 }}>Import → Ziel → Fehlerzustand</div>
          </div>

          <SidebarSection title="Topologie laden" accent="#3b82f6">
            <FileUploader onFile={handleTopologyFile} disabled={loading} />
            {error && (
              <div role="alert" style={{ padding: "8px 9px", border: "1px solid rgba(255,64,64,.35)", background: "rgba(255,64,64,.08)", borderRadius: 6, color: "#ff8080", fontSize: 10, lineHeight: 1.45 }}>
                {error}
              </div>
            )}
          </SidebarSection>

          <SidebarSection title="Referenzrouting" accent="#a78bfa">
            <SelectField label="Zielknoten" value={targetNodeId} onChange={setTargetNode} options={nodeOptions} />
            <SelectField
              label="Routingmetrik"
              value={weightMode}
              onChange={setWeightMode}
              options={[
                { value: "hop_count", label: "Hop-Anzahl" },
                { value: "edge_weight", label: "Kantengewicht" },
              ]}
            />
            {!simulation && <div style={{ color: "#64708a", fontSize: 10 }}>Nach dem Import verfügbar.</div>}
          </SidebarSection>

          <SidebarSection title="Kantenfehler" accent={RED}>
            <SelectField label="Kante" value={selectedLinkId} onChange={setSelectedLinkId} options={routingLinkOptions} />
            <button
              onClick={selectedLinkFailed ? restoreSelectedLink : simulateLinkFailure}
              disabled={!simulation || !selectedLinkId || loading}
              style={{ width: "100%", padding: "9px", borderRadius: 6, border: `1px solid ${selectedLinkFailed ? "rgba(34,197,94,.35)" : "rgba(255,64,64,.35)"}`, background: selectedLinkFailed ? "rgba(34,197,94,.12)" : "linear-gradient(135deg,#dc2626,#991b1b)", color: "white", fontWeight: 800, cursor: "pointer", marginBottom: 7 }}
            >
              {selectedLinkFailed ? "↻ Ausgewählte Kante wiederherstellen" : "✂ Ausgewählte Kante ausfallen lassen"}
            </button>
            <button
              onClick={repairNetwork}
              disabled={!failedCount || loading}
              style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #2e3650", background: "transparent", color: "#9aa5bb", fontWeight: 700, cursor: "pointer" }}
            >
              Alle Kanten wiederherstellen
            </button>
          </SidebarSection>

          <div style={{ padding: 15, color: "#64708a", fontSize: 10, lineHeight: 1.65 }}>
            <strong style={{ color: "#9aa5bb" }}>Darstellung</strong><br />
            <span style={{ color: T2 }}>●</span> Baseline-Route<br />
            <span style={{ color: T1 }}>●</span> Aktuelle Route<br />
            <span style={{ color: RED }}>●</span> Ausfall / unerreichbar<br />
            <span style={{ color: GOLD }}>●</span> Zielknoten
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: 12, display: "grid", gridTemplateRows: "minmax(330px, 1fr) 190px minmax(180px, .65fr)", gap: 9 }}>
          <section style={{ ...panel, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ height: 38, padding: "0 13px", borderBottom: "1px solid #252b3b", display: "flex", alignItems: "center", fontWeight: 800 }}>
              Netzwerkzustand
              {simulation && <span style={{ marginLeft: 8, color: "#64708a", fontSize: 10, fontWeight: 500 }}>{topology.source}</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {!simulation ? <EmptyState /> : (
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%", height: "100%", display: "block" }}>
                  {graphLinks.map(link => (
                    <g key={link.id} onClick={() => setSelectedLinkId(link.id)} style={{ cursor: "pointer" }}>
                      <line
                        x1={link.sourcePosition.x}
                        y1={link.sourcePosition.y}
                        x2={link.targetPosition.x}
                        y2={link.targetPosition.y}
                        stroke={link.color}
                        strokeWidth={link.selected ? 5 : link.current ? 3.5 : 2}
                        strokeDasharray={link.failed ? "8 6" : undefined}
                        opacity={link.current || link.baseline || link.failed ? 1 : .35}
                        strokeLinecap="round"
                      />
                      {link.failed && (
                        <>
                          <circle cx={link.midpoint.x} cy={link.midpoint.y} r={9} fill="#0d0f14" stroke={RED} strokeWidth={2} />
                          <text x={link.midpoint.x} y={link.midpoint.y + 4} textAnchor="middle" fill={RED} fontSize={12} fontWeight="900">×</text>
                        </>
                      )}
                    </g>
                  ))}
                  {graphNodes.map(node => {
                    const color = node.target ? GOLD : node.affected ? RED : node.changed ? T2 : "#7a8499";
                    return (
                      <g key={node.id}>
                        {node.target && <circle cx={node.position.x} cy={node.position.y} r={26} fill="none" stroke={GOLD} opacity=".22" strokeWidth="4" />}
                        <circle cx={node.position.x} cy={node.position.y} r={16} fill="#181c2c" stroke={color} strokeWidth={node.target || node.affected ? 3 : 2} />
                        <text x={node.position.x} y={node.position.y + 4} textAnchor="middle" fill="#f3f6fc" fontSize={9} fontWeight="800">{node.id}</text>
                        <text x={node.position.x} y={node.position.y + 30} textAnchor="middle" fill={color} fontSize={9}>{node.label || node.id}</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 9, minHeight: 0 }}>
            <div style={{ ...panel, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #252b3b", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Routingzusammenfassung</div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {!simulation ? <div style={{ padding: 14, color: "#64708a" }}>Noch keine Ergebnisse.</div> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead><tr>{["Knoten", "Status", "Aktueller Pfad", "Kosten"].map(header => <th key={header} style={{ textAlign: "left", padding: "7px 10px", color: "#64708a", background: "#191d2c" }}>{header}</th>)}</tr></thead>
                    <tbody>
                      {routeRows.map(row => (
                        <tr key={row.nodeId} style={{ borderTop: "1px solid #202635" }}>
                          <td style={{ padding: "7px 10px", fontWeight: 800 }}>{row.nodeId}</td>
                          <td style={{ padding: "7px 10px", color: row.affected ? RED : row.changed ? T2 : "#22c55e" }}>{row.affected ? "nicht erreichbar" : row.changed ? "umgeleitet" : row.path ? "erreichbar" : "bereits ohne Baseline-Pfad"}</td>
                          <td style={{ padding: "7px 10px", ...S.mono }}>{row.path?.node_ids.join(" → ") || "—"}</td>
                          <td style={{ padding: "7px 10px", ...S.mono }}>{row.path?.total_weight ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{ ...panel, background: "#080a0f", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #202635", color: "#64708a", fontSize: 10, ...S.mono }}>event-log · echte API-Antworten</div>
              <div style={{ flex: 1, overflowY: "auto", padding: "7px 10px", fontSize: 10, lineHeight: 1.7, ...S.mono }}>
                {eventLog.map(item => (
                  <div key={item.id}>
                    <span style={{ color: "#46516a" }}>[{item.time}] </span>
                    <span style={{ color: item.type === "alert" ? RED : item.type === "success" ? T1 : "#9aa5bb" }}>{item.msg}</span>
                  </div>
                ))}
                <div ref={eventLogEndRef} />
              </div>
            </div>
          </section>

          <section style={{ ...panel, padding: 14, overflowY: "auto" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Interpretation des aktuellen Zustands</div>
            {!simulation ? (
              <div style={{ color: "#64708a" }}>Nach dem Import werden hier die fachlich relevanten Unterschiede zwischen Baseline und Fehlerzustand erklärt.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 9 }}>
                <Metric label="Ziel" value={simulation.routing.target_node_id} color={GOLD} />
                <Metric label="Metrik" value={weightMode === "hop_count" ? "Hop-Anzahl" : "Kantengewicht"} color="#a78bfa" />
                <Metric label="Geänderte Routen" value={simulation.result.changed_node_ids.length} color={T2} />
                <Metric label="Erreichbarkeit" value={`${simulation.result.reachable_node_count}/${simulation.result.node_count}`} color={affectedCount ? RED : "#22c55e"} />
                <div style={{ gridColumn: "1 / -1", color: "#9aa5bb", lineHeight: 1.55 }}>
                  {affectedCount
                    ? `${affectedCount} zuvor erreichbare Knoten können das Ziel nach den ausgewählten Kantenausfällen nicht mehr erreichen.`
                    : failedCount
                      ? "Der Fehlerzustand ist aktiv, aber alle zuvor erreichbaren Knoten besitzen weiterhin eine Route zum Ziel."
                      : "Fehlerfreier Baseline-Zustand. Wähle eine Kante, um die Failover-Visualisierung zu untersuchen."}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
