import Chip from "./components/Chip";
import FileUploader from "./components/FileUploader";
import SelectField from "./components/SelectField";
import SidebarSection from "./components/SidebarSection";
import StatusPill from "./components/StatusPill";
import TabBar from "./components/TabBar";
import ToastItem from "./components/ToastItem";
import ToggleRow from "./components/ToggleRow";
import { useRoutingSimulator } from "./hooks/useRoutingSimulator";

export default function App() {
  const {
    networkTopology, setNetworkTopology, routingComparisonMode, setRoutingComparisonMode, targetNode, setTargetNode, routingMetric, topbarMetrics, routingMetricOptions, primaryTreeVisible, backupTreeVisible, togglePrimaryTreeVisibility, toggleBackupTreeVisibility,
    selectedLinkId, setSelectedLinkId, selectedLinkFailed, routingLinkOptions, activeTab, setActiveTab, scientificEvaluationTabActive, routeDetailsTabActive, uploadedTopologyFile, eventLog, toastQueue, eventLogEndRef, handleMetricChange,
    handleTopologyFile, simulateLinkFailure, repairNetwork, essenBochumStatusType, metricBenchmark, bonsaiDeliveryRate,
    greedyDeliveryRate, greedyComputationTime, getEventLogColor, tabs, graphFilters, graphGridDots, targetNodeRings, graphStatusChips, legendItems, terminalLights, evaluationTableHeaders, routeTableHeaders, primaryRouteHops, backupRouteHops, hopHistory, dismissToast, graphLinks, graphNodes, T1, T2, RED, GOLD, SVG_W, SVG_H, S,
  } = useRoutingSimulator();

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#0d0f14", fontFamily:"system-ui,-apple-system,sans-serif", fontSize:13, color:"#e2e8f4", overflow:"hidden" }}>
      <style>{`
        @keyframes slideInR  { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes drain     { from{width:100%} to{width:0} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes metricFade{ from{opacity:.3;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#2e3650;border-radius:2px}
        .metric-val { animation: metricFade .3s ease both }
      `}</style>
      <div style={{ height:46, background:"#131720", borderBottom:"1px solid #252b3b", display:"flex", alignItems:"center", padding:"0 18px", gap:10, flexShrink:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:"linear-gradient(135deg,#ff4040,#ff7700)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>⚡</div>
          <span style={{ fontWeight:700, letterSpacing:".01em" }}>Fast-Failover Routing Simulator</span>
          <span style={{ fontSize:9, color:"#3e4860", background:"#1f2438", padding:"2px 6px", borderRadius:4, border:"1px solid #252b3b", ...S.mono }}>v3.0-HCI</span>
        </div>
        {topbarMetrics.map((metric,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:1, height:20, background:"#252b3b" }} />
            <div>
              <div style={{ fontSize:9, color:"#3e4860", textTransform:"uppercase", letterSpacing:".08em" }}>{metric.label}</div>
              <div className="metric-val" key={routingMetric} style={{ fontSize:12, fontWeight:700, color:metric.color, ...S.mono }}>{metric.value}</div>
            </div>
          </div>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, fontSize:10, fontWeight:600, color:"#22c55e", animation:"livePulse 1.6s ease-in-out infinite" }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }} /> Live
        </div>
      </div>
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <aside style={{ width:"25%", minWidth:232, maxWidth:286, background:"#131720", borderRight:"1px solid #252b3b", display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <div style={{ padding:"14px 15px", borderBottom:"1px solid #252b3b", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:7, background:"#1f2438", border:"1px solid #2e3650", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>⚙️</div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".10em" }}>Simulations-Steuerung</div>
              <div style={{ fontSize:10, color:"#3e4860", marginTop:2 }}>Konfiguration & Szenarien</div>
            </div>
          </div>
          <SidebarSection title="Konfiguration" accent="#3b82f6">
            <SelectField label="Topologie auswählen"  value={networkTopology}   onChange={setNetworkTopology}   options={["Atlanta","Abilene"]} />
            <SelectField label="Zielknoten (Target)"   value={targetNode} onChange={setTargetNode} options={["Dortmund","Düsseldorf","Berlin"]} />
            <SelectField label="Vergleichs-Modus"      value={routingComparisonMode}   onChange={setRoutingComparisonMode}   options={["Bonsai-Heuristik vs. Greedy-Routing","Dijkstra (Global Re-computation)"]} />
          </SidebarSection>
          <SidebarSection title="Datenquelle & Metrik" accent="#a78bfa">
            <FileUploader onFile={handleTopologyFile} />
            {uploadedTopologyFile && (
              <div style={{ marginBottom:8, padding:"5px 8px", borderRadius:5, background:"rgba(57,255,20,.05)", border:"1px solid rgba(57,255,20,.15)", fontSize:9, color:T1, display:"flex", alignItems:"center", gap:5, ...S.mono }}>
                <span>✓</span><span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{uploadedTopologyFile}</span>
              </div>
            )}
            <SelectField
              label="Routing-Metrik auswählen"
              value={routingMetric}
              onChange={handleMetricChange}
              options={["Hop-Count","Latency (ms)","Cost (Abstract)"]}
            />
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {routingMetricOptions.map(metricOption => (
                <button key={metricOption.value} onClick={() => handleMetricChange(metricOption.value)} style={{
                  fontSize:8, padding:"2px 7px", borderRadius:4, cursor:"pointer",
                  border:`1px solid ${metricOption.selected ? "#a78bfa" : "#252b3b"}`,
                  background: metricOption.selected ? "rgba(167,139,250,.12)" : "transparent",
                  color: metricOption.selected ? "#a78bfa" : "#3e4860",
                  fontWeight: metricOption.selected ? 800 : 500, transition:"all .15s",
                }}>
                  {metricOption.label}
                </button>
              ))}
            </div>
          </SidebarSection>
          <SidebarSection title="Tree Control (Layer-Steuerung)" accent={T1}>
            <ToggleRow label="Primärbaum (T1)" sub="Neon-Grün · Arboreszenz #1" dotColor={T1} checked={primaryTreeVisible} onToggle={togglePrimaryTreeVisibility} activeColor="rgba(57,255,20,.04)" activeBorder="rgba(57,255,20,.28)" />
            <ToggleRow label="Backup-Baum (T2)" sub="Neon-Lila · Failover-Pfad" dotColor={T2} checked={backupTreeVisible} onToggle={toggleBackupTreeVisibility} activeColor="rgba(192,132,252,.04)" activeBorder="rgba(192,132,252,.28)" />
          </SidebarSection>
          <SidebarSection title="Störung simulieren" accent={RED}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#7a8499", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>Kante auswählen</div>
              <select value={selectedLinkId} onChange={e=>setSelectedLinkId(e.target.value)} style={{ width:"100%", background:"#1f2438", border:"1px solid #2e3650", borderRadius:6, color:"#e2e8f4", fontSize:12, padding:"7px 10px", cursor:"pointer", outline:"none", ...S.sys }}>
                {routingLinkOptions.map(linkOption => (
                  <option key={linkOption.id} value={linkOption.id} style={{ background:"#1f2438", color:linkOption.color }}>
                    {linkOption.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={simulateLinkFailure} disabled={selectedLinkFailed} style={{ width:"100%", padding:"9px 12px", borderRadius:6, background: selectedLinkFailed ? "#2a0d0d" : "linear-gradient(135deg,#dc2626,#991b1b)", color:"white", border:"1px solid rgba(255,80,80,.3)", fontSize:12, fontWeight:700, cursor: selectedLinkFailed ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:6, opacity: selectedLinkFailed ? .5 : 1, ...S.sys }}>
              ✂ Verbindung kappen
            </button>
            <button onClick={repairNetwork} style={{ width:"100%", padding:"9px 12px", borderRadius:6, background:"transparent", color:"#7a8499", border:"1px solid #2e3650", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, ...S.sys }}>
              🔄 Netzwerk reparieren
            </button>
          </SidebarSection>

          <div style={{ padding:"12px 15px", borderTop:"1px solid #252b3b", fontSize:10, color:"#3e4860", lineHeight:1.75, marginTop:"auto" }}>
            TU Dortmund · Informatik LS 4<br />
            Algorithmen & Komplexität<br />
            Sam Taleb — HCI UI Concept
            <div style={{ marginTop:5, display:"inline-block", background:"#1f2438", border:"1px solid #252b3b", borderRadius:4, padding:"2px 8px", fontSize:9, color:"#3b82f6", ...S.mono }}>Research Blueprint</div>
          </div>
        </aside>
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:12, gap:8, overflow:"hidden" }}>
          <div style={{ flex:"0 0 50%", background:"#131720", border:"1px solid #252b3b", borderRadius:10, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"8px 14px", borderBottom:"1px solid #252b3b", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".07em" }}>Netzwerk-Topologie (State-Based Visualisierung)</span>
              <span style={{ fontSize:10, color:"#3e4860" }}>· Ruhrgebiet · 9 Knoten · 12 Kanten</span>
              <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                {graphStatusChips.map(chip => <Chip key={chip.label} lbl={chip.label} color={chip.color} bg={chip.background} border={chip.border} />)}
              </div>
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width:"100%", height:"100%", display:"block" }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  {graphFilters.map(filter => (
                    <filter key={filter[0]} id={filter[0]} x="-70%" y="-70%" width="240%" height="240%">
                      <feGaussianBlur stdDeviation={filter[1]} in="SourceGraphic" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  ))}
                </defs>
                {graphGridDots.map(dot => <circle key={dot.id} cx={dot.x} cy={dot.y} r={.8} fill="rgba(255,255,255,.04)" />)}
                {graphLinks.map(link => {
                  if (link.linkState === "dim") {
                    return (
                      <line
                        key={link.id}
                        x1={link.sourcePosition.x}
                        y1={link.sourcePosition.y}
                        x2={link.targetPosition.x}
                        y2={link.targetPosition.y}
                        stroke={link.selected ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)"}
                        strokeWidth={1}
                      />
                    );
                  }

                  if (link.linkState === "broken") {
                    return (
                      <g key={link.id} onClick={()=>setSelectedLinkId(link.id)} style={{ cursor:"pointer" }}>
                        <line x1={link.sourcePosition.x} y1={link.sourcePosition.y} x2={link.targetPosition.x} y2={link.targetPosition.y} stroke={RED} strokeWidth={2.5} strokeDasharray="9,6" filter="url(#gR)" strokeLinecap="round" />
                        <circle cx={link.midpoint.x} cy={link.midpoint.y} r={10} fill="#0d0f14" stroke={RED} strokeWidth={1.5} />
                        <line x1={link.midpoint.x-4} y1={link.midpoint.y-4} x2={link.midpoint.x+4} y2={link.midpoint.y+4} stroke={RED} strokeWidth={2} strokeLinecap="round" />
                        <line x1={link.midpoint.x+4} y1={link.midpoint.y-4} x2={link.midpoint.x-4} y2={link.midpoint.y+4} stroke={RED} strokeWidth={2} strokeLinecap="round" />
                      </g>
                    );
                  }

                  return (
                    <g key={link.id} onClick={()=>setSelectedLinkId(link.id)} style={{ cursor:"pointer" }}>
                      <line x1={link.sourcePosition.x} y1={link.sourcePosition.y} x2={link.targetPosition.x} y2={link.targetPosition.y} stroke={link.color} strokeWidth={link.selected?4.5:link.failoverRoute?4:2.5} filter={link.filter} strokeLinecap="round" />
                    </g>
                  );
                })}
                {graphNodes.map(node => {
                  return (
                    <g key={node.id}>
                      {node.target&&targetNodeRings.map(ring=>(
                        <circle key={ring.radius} cx={node.position.x} cy={node.position.y} r={ring.radius} fill="none" stroke={GOLD} strokeWidth={4} opacity={ring.opacity} />
                      ))}
                      <circle cx={node.position.x} cy={node.position.y} r={16} fill={node.target?"#1e1708":"#181c2c"} stroke={node.strokeColor} strokeWidth={node.target?2.5:1.8} filter={node.filter} />
                      {node.target&&<text x={node.position.x} y={node.position.y-33} textAnchor="middle" fill={GOLD} fontSize={9} fontWeight="bold" fontFamily="system-ui">TARGET ?</text>}
                      <text x={node.position.x} y={node.position.y} textAnchor="middle" dominantBaseline="middle" fill={node.target?GOLD:"#e2e8f4"} fontSize={10} fontWeight="bold" fontFamily="system-ui">{node.id}</text>
                      <text x={node.position.x} y={node.position.y+28} textAnchor="middle" fill={node.target?"rgba(251,191,36,.5)":"#3a4458"} fontSize={9.5} fontFamily="system-ui">{node.lbl}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0, height:105 }}>
            <div style={{ width:190, flexShrink:0, background:"#131720", border:"1px solid #252b3b", borderRadius:8, padding:"10px 14px", display:"flex", flexDirection:"column", gap:7 }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#3e4860", textTransform:"uppercase", letterSpacing:".10em" }}>Legende</div>
              {legendItems.map((it,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:10, color:"#7a8499" }}>
                  {it.type==="dot"
                    ? <div style={{ width:10, height:10, borderRadius:"50%", background:it.color, boxShadow:`0 0 7px ${it.color}`, flexShrink:0 }} />
                    : <svg width={22} height={8} style={{ flexShrink:0 }}><line x1={0} y1={4} x2={22} y2={4} stroke={it.color} strokeWidth={it.dash?2:3} strokeDasharray={it.dash?"5,4":undefined} /></svg>
                  }
                  {it.label}
                </div>
              ))}
            </div>
            <div style={{ flex:1, background:"#080a0f", border:"1px solid #252b3b", borderRadius:8, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ padding:"5px 10px", borderBottom:"1px solid #161b24", display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
                <div style={{ display:"flex", gap:4 }}>
                  {terminalLights.map(color=><div key={color} style={{ width:8, height:8, borderRadius:"50%", background:color }} />)}
                </div>
                <span style={{ fontSize:10, color:"#3e4860", ...S.mono }}>system — event-log · live diagnostics</span>
                <span style={{ marginLeft:"auto", fontSize:9, color:"#3e4860", background:"#1f2438", padding:"1px 6px", borderRadius:3, border:"1px solid #252b3b", ...S.mono }}>{routingMetric}</span>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"5px 10px", ...S.mono, fontSize:10.5, lineHeight:1.8 }}>
                {eventLog.map(l => (
                  <div key={l.id}>
                    <span style={{ color:"#3e4860" }}>[{l.time}]&nbsp;</span>
                    <span style={{ color:getEventLogColor(l.type) }}>{l.msg}</span>
                  </div>
                ))}
                <div ref={eventLogEndRef} />
              </div>
            </div>
          </div>
          <div style={{ flex:1, background:"#131720", border:"1px solid #252b3b", borderRadius:10, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
            <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {scientificEvaluationTabActive && (
              <div style={{ overflowY:"auto", flex:1 }}>
                <div style={{ padding:"6px 14px 4px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #191d2c" }}>
                  <span style={{ fontSize:9, color:"#3e4860" }}>Quantitativer Algorithmen-Vergleich · DSN19/Foerster-Paper</span>
                  <span className="metric-val" key={routingMetric} style={{ marginLeft:"auto", fontSize:9, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,.08)", border:"1px solid rgba(167,139,250,.2)", borderRadius:4, padding:"1px 7px", ...S.mono }}>⚖ {routingMetric}</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {evaluationTableHeaders.map(h => (
                        <th key={h} style={{ padding:"7px 14px", background:"#191d2c", fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".09em", color:"#3e4860", textAlign:"left", borderBottom:"1px solid #252b3b", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom:"1px solid #191d2c" }}>
                      <td style={{ padding:"10px 14px" }}><span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:"1px solid #2e3650", borderRadius:5, padding:"3px 8px", ...S.mono }}>ES</span></td>
                      <td style={{ padding:"10px 14px" }}><StatusPill type={essenBochumStatusType} /></td>
                      <td style={{ padding:"10px 14px", fontSize:12, fontWeight:700, color:"#22c55e", ...S.mono }}>100%</td>
                      <td className="metric-val" key={`es-avg-${routingMetric}`} style={{ padding:"10px 14px", fontSize:12, color:"#22c55e", ...S.mono }}>{metricBenchmark.esAvg}</td>
                      <td className="metric-val" key={`es-max-${routingMetric}`} style={{ padding:"10px 14px", fontSize:12, color:"#22c55e", ...S.mono }}>{metricBenchmark.esMax}</td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#3e4860", ...S.mono }}>N/A (Lokal geschaltet)</td>
                    </tr>
                    <tr style={{ borderBottom:"1px solid #191d2c", background:"rgba(251,146,60,.02)" }}>
                      <td style={{ padding:"10px 14px" }}><span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:"1px solid rgba(251,146,60,.4)", borderRadius:5, padding:"3px 8px", color:"#fb923c", ...S.mono }}>BO</span></td>
                      <td style={{ padding:"10px 14px" }}><StatusPill type="failover" /></td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <div className="metric-val" key={`b-del-${routingMetric}`} style={{ fontSize:12, fontWeight:700, color:"#22c55e", ...S.mono }}>{bonsaiDeliveryRate} (Bonsai)</div>
                          <div style={{ fontSize:11, color:RED, ...S.mono }}>{greedyDeliveryRate}</div>
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <div className="metric-val" key={`b-avg-${routingMetric}`} style={{ fontSize:13, fontWeight:800, color:T1, ...S.mono }}>{metricBenchmark.bonsaiAvgStretch} <span style={{fontSize:9,color:"#3e4860"}}>Bonsai</span></div>
                          <div className="metric-val" key={`g-avg-${routingMetric}`} style={{ fontSize:11, color:"#5a6585", ...S.mono }}>{metricBenchmark.greedyAvgStretch} <span style={{fontSize:9,color:"#3e4860"}}>Greedy</span></div>
                        </div>
                      </td>
                      <td className="metric-val" key={`max-${routingMetric}`} style={{ padding:"10px 14px", fontSize:12, color:"#fb923c", ...S.mono }}>{metricBenchmark.bonsaiMaxStretch}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <div className="metric-val" key={`bt-${routingMetric}`} style={{ fontSize:12, fontWeight:700, color:GOLD, ...S.mono }}>{metricBenchmark.bonsaiTime} <span style={{fontSize:8,color:"#22c55e",background:"rgba(34,197,94,.1)",padding:"1px 4px",borderRadius:3}}>Sub-Fast FRR</span></div>
                          <div className="metric-val" key={`gt-${routingMetric}`} style={{ fontSize:11, color:"#5a6585", ...S.mono }}>{greedyComputationTime} <span style={{fontSize:8,color:"#3e4860"}}>Global Re-calc</span></div>
                        </div>
                      </td>
                    </tr>
                    <tr style={{ opacity:.62 }}>
                      <td style={{ padding:"10px 14px" }}><span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:"1px solid rgba(255,64,64,.4)", borderRadius:5, padding:"3px 8px", color:RED, ...S.mono }}>KO</span></td>
                      <td style={{ padding:"10px 14px" }}><StatusPill type="isolated" /></td>
                      <td style={{ padding:"10px 14px", fontSize:12, color:"#ff6060", ...S.mono }}>0%</td>
                      <td style={{ padding:"10px 14px", fontSize:12, color:"#3e4860", ...S.mono }}>—</td>
                      <td style={{ padding:"10px 14px", fontSize:12, color:"#3e4860", ...S.mono }}>—</td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#3e4860", ...S.mono }}>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {routeDetailsTabActive && (
              <div style={{ overflowY:"auto", flex:1 }}>
                <div style={{ padding:"6px 14px 4px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #191d2c" }}>
                  <span style={{ fontSize:9, color:"#3e4860" }}>Aktiver Routing-Zustand · Echtzeit-Pfadanalyse</span>
                  <span className="metric-val" key={routingMetric} style={{ marginLeft:"auto", fontSize:9, fontWeight:700, color:T2, background:"rgba(192,132,252,.08)", border:"1px solid rgba(192,132,252,.2)", borderRadius:4, padding:"1px 7px", ...S.mono }}>⚖ {routingMetric}</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {routeTableHeaders.map(h => (
                        <th key={h} style={{ padding:"7px 14px", background:"#191d2c", fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".09em", color:"#3e4860", textAlign:"left", borderBottom:"1px solid #252b3b", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom:"1px solid #191d2c", background:"rgba(57,255,20,.02)" }}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:T1 }}>Primary Route</span>
                          <span style={{ fontSize:9, color:"#3e4860", ...S.mono }}>T2 · Failover-aktiv</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div className="metric-val" key={`ph-${routingMetric}`} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          {primaryRouteHops.map((node, i, arr) => (
                            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:`1px solid ${T1}44`, borderRadius:5, padding:"2px 7px", color:T1, ...S.mono }}>{node}</span>
                              {i < arr.length-1 && <span style={{ color:"#3e4860", fontSize:12 }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="metric-val" key={`pl-${routingMetric}`} style={{ padding:"12px 14px", fontSize:13, fontWeight:700, color:GOLD, ...S.mono }}>{metricBenchmark.pathPrimary.lat}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(57,255,20,.08)", border:"1px solid rgba(57,255,20,.2)", color:T1, ...S.mono }}>Bonsai-RR</span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:11, fontWeight:600 }}>
                        <span style={{ color:"#22c55e" }}>{metricBenchmark.pathPrimary.status}</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom:"1px solid #191d2c" }}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:T2 }}>Backup Route</span>
                          <span style={{ fontSize:9, color:"#3e4860", ...S.mono }}>T1 · Standby</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div className="metric-val" key={`bh-${routingMetric}`} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          {backupRouteHops.map((node, i, arr) => (
                            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:`1px solid ${T2}44`, borderRadius:5, padding:"2px 7px", color:T2, ...S.mono }}>{node}</span>
                              {i < arr.length-1 && <span style={{ color:"#3e4860", fontSize:12 }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="metric-val" key={`bl-${routingMetric}`} style={{ padding:"12px 14px", fontSize:13, fontWeight:700, color:"#a78bfa", ...S.mono }}>{metricBenchmark.pathBackup.lat}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(192,132,252,.08)", border:"1px solid rgba(192,132,252,.2)", color:T2, ...S.mono }}>Greedy-FRR</span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:11, fontWeight:600, color:"#a78bfa" }}>
                        {metricBenchmark.pathBackup.status}
                      </td>
                    </tr>
                    <tr style={{ opacity:.5 }}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:RED }}>Isolierter Knoten</span>
                          <span style={{ fontSize:9, color:"#3e4860", ...S.mono }}>KO · Kein Pfad</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:11, color:"#3e4860", ...S.mono }}>— kein erreichbarer Pfad —</span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:12, color:RED, ...S.mono }}>∞</td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(255,64,64,.08)", border:"1px solid rgba(255,64,64,.2)", color:RED, ...S.mono }}>N/A</span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:11, color:RED }}>🔴 Isoliert</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ margin:"8px 14px 10px", padding:"10px 12px", background:"#0d0f14", border:"1px solid #252b3b", borderRadius:7, display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ fontSize:9, fontWeight:800, color:"#3e4860", textTransform:"uppercase", letterSpacing:".10em" }}>Hop-Historie</div>
                  {hopHistory.map((h,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9 }}>
                      <span style={{ color:"#3e4860", ...S.mono }}>[{h.time}]</span>
                      <span style={{ color:h.color }}>{h.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ position:"fixed", bottom:18, right:18, display:"flex", flexDirection:"column", gap:8, zIndex:200 }}>
        {toastQueue.map(t => <ToastItem key={t.id} t={t} onClose={() => dismissToast(t.id)} />)}
      </div>
    </div>
  );
}
