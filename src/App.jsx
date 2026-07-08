import { useState, useEffect, useRef, useCallback } from "react";

const T1 = "#39ff14", T2 = "#c084fc", RED = "#ff4040", GOLD = "#fbbf24";
const SVG_W = 800, SVG_H = 410, PAD = 58;

const NODES = [
  { id:"DO",  lbl:"Dortmund",   rx:.73, ry:.15, tgt:true },
  { id:"BO",  lbl:"Bochum",     rx:.51, ry:.25 },
  { id:"ES",  lbl:"Essen",      rx:.26, ry:.22 },
  { id:"DU",  lbl:"Duisburg",   rx:.07, ry:.37 },
  { id:"MH",  lbl:"Mülheim",    rx:.16, ry:.51 },
  { id:"HA",  lbl:"Hagen",      rx:.73, ry:.50 },
  { id:"WU",  lbl:"Wuppertal",  rx:.53, ry:.62 },
  { id:"DUS", lbl:"Düsseldorf", rx:.26, ry:.70 },
  { id:"KO",  lbl:"Köln",       rx:.13, ry:.84 },
];

const EDGES = [
  { id:"ES-BO",  a:"ES",  b:"BO",  tree:"t1", lbl:"Essen ↔ Bochum" },
  { id:"BO-DO",  a:"BO",  b:"DO",  tree:"t1", lbl:"Bochum ↔ Dortmund" },
  { id:"BO-HA",  a:"BO",  b:"HA",  tree:"t1", lbl:"Bochum ↔ Hagen" },
  { id:"HA-DO",  a:"HA",  b:"DO",  tree:"t2", lbl:"Hagen ↔ Dortmund" },
  { id:"ES-DU",  a:"ES",  b:"DU",  tree:"t1", lbl:"Essen ↔ Duisburg" },
  { id:"DU-MH",  a:"DU",  b:"MH",  tree:"t2", lbl:"Duisburg ↔ Mülheim" },
  { id:"MH-DUS", a:"MH",  b:"DUS", tree:"t1", lbl:"Mülheim ↔ Düsseldorf" },
  { id:"DUS-WU", a:"DUS", b:"WU",  tree:"t2", lbl:"Düsseldorf ↔ Wuppertal" },
  { id:"ES-WU",  a:"ES",  b:"WU",  tree:"t2", lbl:"Essen ↔ Wuppertal" },
  { id:"WU-HA",  a:"WU",  b:"HA",  tree:"t1", lbl:"Wuppertal ↔ Hagen" },
  { id:"WU-DO",  a:"WU",  b:"DO",  tree:"t2", lbl:"Wuppertal ↔ Dortmund" },
  { id:"DUS-KO", a:"DUS", b:"KO",  tree:"t1", lbl:"Düsseldorf ↔ Köln" },
];

// Metric-driven benchmark data
const METRIC_DATA = {
  "Hop-Count": {
    bonsaiAvgStretch: "1.5", bonsaiMaxStretch: "1.8", greedyAvgStretch: "2.1",
    bonsaiTime: "12 ms", greedyTime: "148 ms", esAvg: "1.0", esMax: "1.0",
    pathPrimary: { hop:"ES → WU → DO", lat:"3 Hops", status:"🟢 Aktiv (Failover)" },
    pathBackup:  { hop:"HA → DO",      lat:"2 Hops", status:"🟣 Standby" },
  },
  "Latency (ms)": {
    bonsaiAvgStretch: "1.3", bonsaiMaxStretch: "1.6", greedyAvgStretch: "2.4",
    bonsaiTime: "9 ms", greedyTime: "183 ms", esAvg: "1.1", esMax: "1.2",
    pathPrimary: { hop:"ES → WU → DO", lat:"24ms", status:"🟢 Aktiv (Failover)" },
    pathBackup:  { hop:"HA → DO",      lat:"12ms", status:"🟣 Standby" },
  },
  "Cost (Abstract)": {
    bonsaiAvgStretch: "1.7", bonsaiMaxStretch: "2.1", greedyAvgStretch: "2.8",
    bonsaiTime: "17 ms", greedyTime: "201 ms", esAvg: "1.0", esMax: "1.3",
    pathPrimary: { hop:"ES → WU → DO", lat:"0.74 cost", status:"🟢 Aktiv (Failover)" },
    pathBackup:  { hop:"HA → DO",      lat:"0.41 cost", status:"🟣 Standby" },
  },
};

function npos(n){ return { x: PAD + n.rx*(SVG_W-PAD*2), y: PAD + n.ry*(SVG_H-PAD*2) }; }
function tstamp(){ const d=new Date(); return [d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,"0")).join(":"); }

const S = {
  mono: { fontFamily:"'Courier New',monospace" },
  sys:  { fontFamily:"system-ui,-apple-system,sans-serif" },
};

// ── Sub-components ───────────────────────────────────────────

function Chip({ lbl, color, bg, border }) {
  return <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:".06em", color, background:bg, border:`1px solid ${border}` }}>{lbl}</span>;
}

function SidebarSection({ title, accent, children }) {
  return (
    <div style={{ padding:"13px 15px", borderBottom:"1px solid #252b3b" }}>
      <div style={{ fontSize:9, fontWeight:800, color:"#3e4860", textTransform:"uppercase", letterSpacing:".12em", marginBottom:11, display:"flex", alignItems:"center", gap:7 }}>
        <div style={{ width:3, height:12, borderRadius:2, background:accent, flexShrink:0 }} />
        {title}
      </div>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ fontSize:9, fontWeight:700, color:"#7a8499", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", background:"#1f2438", border:"1px solid #2e3650", borderRadius:6, color:"#e2e8f4", fontSize:12, padding:"7px 10px", cursor:"pointer", outline:"none", ...S.sys }}>
        {options.map(o=><option key={o} value={o} style={{ background:"#1f2438" }}>{o}</option>)}
      </select>
    </div>
  );
}

function ToggleRow({ label, sub, dotColor, checked, onToggle, activeColor, activeBorder }) {
  return (
    <div onClick={onToggle} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", borderRadius:6, border:`1px solid ${checked ? activeBorder : "#252b3b"}`, background:checked ? activeColor : "#1f2438", cursor:"pointer", marginBottom:6, transition:"all .15s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:9, height:9, borderRadius:"50%", background:dotColor, boxShadow:`0 0 6px ${dotColor}`, flexShrink:0 }} />
        <div>
          <div style={{ fontSize:11, fontWeight:600 }}>{label}</div>
          <div style={{ fontSize:9, color:"#3e4860" }}>{sub}</div>
        </div>
      </div>
      <div style={{ width:34, height:19, borderRadius:19, background:checked ? dotColor : "#2e3650", border:`1px solid ${checked ? dotColor : "#3a4260"}`, position:"relative", flexShrink:0, transition:"background .2s" }}>
        <div style={{ position:"absolute", top:3, left:checked ? 17 : 3, width:11, height:11, borderRadius:"50%", background:checked ? "#fff" : "#5a6585", transition:"left .2s" }} />
      </div>
    </div>
  );
}

function StatusPill({ type }) {
  const m = {
    normal:   { bg:"rgba(34,197,94,.1)",  c:"#22c55e", br:"rgba(34,197,94,.2)",  lbl:"Normal" },
    failover: { bg:"rgba(251,146,60,.1)", c:"#fb923c", br:"rgba(251,146,60,.2)", lbl:"Failover aktiv" },
    isolated: { bg:"rgba(255,64,64,.1)",  c:RED,       br:"rgba(255,64,64,.2)",  lbl:"Isoliert" },
  }[type];
  return (
    <span style={{ background:m.bg, color:m.c, border:`1px solid ${m.br}`, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.c, display:"inline-block" }} />{m.lbl}
    </span>
  );
}

function ToastItem({ t, onClose }) {
  const isAlert = t.type === "alert";
  return (
    <div style={{ background:"#1a1e2c", border:`1px solid ${isAlert ? "rgba(255,64,64,.35)" : "rgba(34,197,94,.35)"}`, borderLeft:`3px solid ${isAlert ? RED : "#22c55e"}`, borderRadius:9, padding:"12px 14px 15px", width:340, boxShadow:"0 12px 40px rgba(0,0,0,.7)", position:"relative", overflow:"hidden", animation:"slideInR .35s cubic-bezier(.34,1.3,.64,1) both" }}>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18 }}>{isAlert ? "🚨" : "✅"}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:3 }}>{isAlert ? "Netzwerkausfall erkannt" : "Netzwerk repariert"}</div>
          <div style={{ fontSize:11, color:"#7a8499", lineHeight:1.55 }}>{t.msg}</div>
          {isAlert && <div style={{ marginTop:6, display:"inline-block", background:"rgba(255,64,64,.1)", border:"1px solid rgba(255,64,64,.2)", borderRadius:4, padding:"2px 7px", fontSize:9, fontWeight:700, color:RED, ...S.mono }}>⚡ Fast-Failover in {METRIC_DATA["Latency (ms)"].bonsaiTime}</div>}
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#3e4860", cursor:"pointer", fontSize:14, lineHeight:1 }}>✕</button>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, height:2, background:isAlert ? RED : "#22c55e", borderRadius:"0 0 0 9px", animation:"drain 5s linear forwards" }} />
    </div>
  );
}

// ── File Uploader ────────────────────────────────────────────
function FileUploader({ onFile }) {
  const [drag, setDrag]   = useState(false);
  const [fname, setFname] = useState(null);
  const inputRef          = useRef(null);

  const handle = f => {
    if (!f) return;
    setFname(f.name);
    onFile && onFile(f.name);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      style={{
        border:`1.5px dashed ${drag ? "#3b82f6" : fname ? "rgba(57,255,20,.4)" : "#2e3650"}`,
        borderRadius:8, padding:"13px 10px", cursor:"pointer", textAlign:"center",
        background: drag ? "rgba(59,130,246,.06)" : fname ? "rgba(57,255,20,.03)" : "#181c2c",
        transition:"all .18s", marginBottom:10,
      }}
    >
      <input ref={inputRef} type="file" accept=".json,.gml" style={{ display:"none" }} onChange={e => handle(e.target.files[0])} />
      <div style={{ fontSize:17, marginBottom:5 }}>{fname ? "📄" : "📁"}</div>
      {fname
        ? <div style={{ fontSize:10, color:T1, fontWeight:700, ...S.mono, wordBreak:"break-all" }}>{fname}</div>
        : <>
            <div style={{ fontSize:11, fontWeight:700, color:"#7a8499", marginBottom:3 }}>JSON/GML Datei hochladen</div>
            <div style={{ fontSize:9, color:"#3e4860" }}>Drag & Drop oder klicken</div>
            <div style={{ marginTop:6, display:"inline-flex", gap:4 }}>
              {[".json",".gml"].map(ext => (
                <span key={ext} style={{ fontSize:8, fontWeight:700, padding:"1px 5px", borderRadius:3, background:"#1f2438", border:"1px solid #2e3650", color:"#3b82f6", ...S.mono }}>{ext}</span>
              ))}
            </div>
          </>
      }
      {fname && <div style={{ fontSize:9, color:"#3e4860", marginTop:4 }}>Klicken zum Ersetzen</div>}
    </div>
  );
}

// ── Tab System ───────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", gap:0, borderBottom:"1px solid #252b3b", flexShrink:0 }}>
      {tabs.map((t, i) => {
        const isActive = active === i;
        return (
          <button key={i} onClick={() => onChange(i)} style={{
            padding:"8px 16px", fontSize:10, fontWeight:isActive ? 800 : 600,
            textTransform:"uppercase", letterSpacing:".08em",
            background:"transparent", border:"none", cursor:"pointer",
            color: isActive ? "#e2e8f4" : "#3e4860",
            borderBottom: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
            marginBottom:"-1px", transition:"all .15s", whiteSpace:"nowrap",
            display:"flex", alignItems:"center", gap:6,
          }}>
            <span style={{ fontSize:12 }}>{t.icon}</span>{t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [topo,           setTopo]          = useState("Atlanta");
  const [algo,           setAlgo]          = useState("Bonsai-Heuristik vs. Greedy-Routing");
  const [target,         setTarget]        = useState("Dortmund");
  const [selectedMetric, setSelectedMetric]= useState("Hop-Count");
  const [t1On,           setT1]            = useState(true);
  const [t2On,           setT2]            = useState(true);
  const [selEdge,        setSelE]          = useState("ES-BO");
  const [failed,         setFailed]        = useState(new Set(["ES-BO"]));
  const [activeTab,      setActiveTab]     = useState(0);
  const [uploadedFile,   setUploadedFile]  = useState(null);
  const [logs, setLogs] = useState([
    { id:1, time:"13:58:19", type:"info",    msg:"Simulation initialisiert. Topologie: Atlanta geladen." },
    { id:2, time:"13:58:20", type:"info",    msg:"Berechne kantendisjunkte Arboreszenzen (Bonsai-Heuristik)..." },
    { id:3, time:"13:58:20", type:"success", msg:"SUCCESS: Arborescenzen T1 & T2 berechnet. Netzwerk bereit." },
    { id:4, time:"13:58:22", type:"alert",   msg:"ALERT: Link Essen-Bochum getrennt. Ausfall gekappt." },
    { id:5, time:"13:58:22", type:"info",    msg:"State-Based Rerouting: Zustand zu lokalem Backup-Pfad gesprungen." },
    { id:6, time:"13:58:22", type:"success", msg:"SUCCESS: Fast-Failover konvergiert in 12ms (Bonsai RR-Swap)." },
  ]);
  const [toasts, setToasts] = useState([]);
  const logId  = useRef(10);
  const logEnd = useRef(null);

  useEffect(() => { logEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [logs]);

  const addLog   = (type, msg) => setLogs(p => [...p, { id:++logId.current, time:tstamp(), type, msg }]);
  const addToast = (msg, type) => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5500);
  };
  const dismissToast = id => setToasts(p => p.filter(t => t.id !== id));

  const handleMetricChange = v => {
    setSelectedMetric(v);
    addLog("info", `Routing-Metrik gewechselt: ${v}. Benchmark-Daten werden neu berechnet...`);
    setTimeout(() => addLog("success", `SUCCESS: Metriken aktualisiert (${v}). Vergleichstabelle neu geladen.`), 350);
  };

  const handleFile = name => {
    setUploadedFile(name);
    addLog("info", `Datei erkannt: "${name}". Topologie wird geparst...`);
    setTimeout(() => addLog("success", `SUCCESS: Topologie aus "${name}" geladen und validiert.`), 500);
  };

  const handleCut = () => {
    if (failed.has(selEdge)) return;
    const e = EDGES.find(e => e.id === selEdge);
    setFailed(p => new Set([...p, selEdge]));
    addLog("alert",   `ALERT: Link ${e.lbl} getrennt. Ausfall injiziert.`);
    addLog("info",    "Zustandsänderung registriert. Starte lokale Failover-Schaltung...");
    setTimeout(() => {
      addLog("success", `SUCCESS: Rerouting erfolgreich. Konvergenzzeit: ${md.bonsaiTime}. Delivery Rate stabil bei 100%.`);
      addToast(`Link ${e.lbl} offline. Fast-Failover in ${md.bonsaiTime} berechnet.`, "alert");
    }, 400);
  };

  const handleRepair = () => {
    if (!failed.size) return;
    setFailed(new Set());
    addLog("info", "Netzwerk-Reparatur läuft. Topologie-Zustand wird zurückgesetzt...");
    setTimeout(() => {
      addLog("success", "SUCCESS: Normalzustand wiederhergestellt. Alle Pfade aktiv.");
      addToast("Alle Links aktiv. Netzwerk vollständig repariert.", "success");
    }, 300);
  };

  const edgeSt = e => {
    if (failed.has(e.id)) return "broken";
    if (e.tree === "t1" && !t1On) return "dim";
    if (e.tree === "t2" && !t2On) return "dim";
    return e.tree;
  };

  const isEsBroken     = failed.has("ES-BO");
  const failCount      = failed.size;
  const md             = METRIC_DATA[selectedMetric];
  const bonsaiDelivery = failCount >= 3 ? "58%" : "100%";
  const greedyDelivery = isEsBroken ? "0% (Deadlock ⚠)" : "100%";
  const logColor = t => t === "alert" ? "#ff6060" : t === "success" ? T1 : "#7a8499";

  const TABS = [
    { label:"Wissenschaftliche Evaluation", icon:"📊", accent:"#3b82f6" },
    { label:"Pfad-Details & Hop-Historie",  icon:"🔀", accent:T2 },
  ];

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

      {/* TOPBAR */}
      <div style={{ height:46, background:"#131720", borderBottom:"1px solid #252b3b", display:"flex", alignItems:"center", padding:"0 18px", gap:10, flexShrink:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:"linear-gradient(135deg,#ff4040,#ff7700)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>⚡</div>
          <span style={{ fontWeight:700, letterSpacing:".01em" }}>Fast-Failover Routing Simulator</span>
          <span style={{ fontSize:9, color:"#3e4860", background:"#1f2438", padding:"2px 6px", borderRadius:4, border:"1px solid #252b3b", ...S.mono }}>v3.0-HCI</span>
        </div>
        {[
          { l:"Topologie",       v:topo,               c:"#60a5fa" },
          { l:"Metrik",          v:selectedMetric,     c:"#a78bfa" },
          { l:"Ausfälle",        v:failCount,          c:failCount > 0 ? RED : "#22c55e" },
          { l:"Global Delivery", v:bonsaiDelivery,     c:failCount >= 3 ? "#ff6060" : "#22c55e" },
          { l:"Failover-Zeit",   v:md.bonsaiTime,      c:GOLD },
        ].map((m,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:1, height:20, background:"#252b3b" }} />
            <div>
              <div style={{ fontSize:9, color:"#3e4860", textTransform:"uppercase", letterSpacing:".08em" }}>{m.l}</div>
              <div className="metric-val" key={selectedMetric} style={{ fontSize:12, fontWeight:700, color:m.c, ...S.mono }}>{m.v}</div>
            </div>
          </div>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, fontSize:10, fontWeight:600, color:"#22c55e", animation:"livePulse 1.6s ease-in-out infinite" }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }} /> Live
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* SIDEBAR */}
        <aside style={{ width:"25%", minWidth:232, maxWidth:286, background:"#131720", borderRight:"1px solid #252b3b", display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <div style={{ padding:"14px 15px", borderBottom:"1px solid #252b3b", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:7, background:"#1f2438", border:"1px solid #2e3650", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>⚙️</div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".10em" }}>Simulations-Steuerung</div>
              <div style={{ fontSize:10, color:"#3e4860", marginTop:2 }}>Konfiguration & Szenarien</div>
            </div>
          </div>

          {/* KONFIGURATION */}
          <SidebarSection title="Konfiguration" accent="#3b82f6">
            <SelectField label="Topologie auswählen"  value={topo}   onChange={setTopo}   options={["Atlanta","Abilene"]} />
            <SelectField label="Zielknoten (Target)"   value={target} onChange={setTarget} options={["Dortmund","Düsseldorf","Berlin"]} />
            <SelectField label="Vergleichs-Modus"      value={algo}   onChange={setAlgo}   options={["Bonsai-Heuristik vs. Greedy-Routing","Dijkstra (Global Re-computation)"]} />
          </SidebarSection>

          {/* DATENQUELLE & METRIK */}
          <SidebarSection title="Datenquelle & Metrik" accent="#a78bfa">
            <FileUploader onFile={handleFile} />
            {uploadedFile && (
              <div style={{ marginBottom:8, padding:"5px 8px", borderRadius:5, background:"rgba(57,255,20,.05)", border:"1px solid rgba(57,255,20,.15)", fontSize:9, color:T1, display:"flex", alignItems:"center", gap:5, ...S.mono }}>
                <span>✓</span><span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{uploadedFile}</span>
              </div>
            )}
            <SelectField
              label="Routing-Metrik auswählen"
              value={selectedMetric}
              onChange={handleMetricChange}
              options={["Hop-Count","Latency (ms)","Cost (Abstract)"]}
            />
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {["Hop-Count","Latency (ms)","Cost (Abstract)"].map(m => (
                <button key={m} onClick={() => handleMetricChange(m)} style={{
                  fontSize:8, padding:"2px 7px", borderRadius:4, cursor:"pointer",
                  border:`1px solid ${selectedMetric===m ? "#a78bfa" : "#252b3b"}`,
                  background: selectedMetric===m ? "rgba(167,139,250,.12)" : "transparent",
                  color: selectedMetric===m ? "#a78bfa" : "#3e4860",
                  fontWeight: selectedMetric===m ? 800 : 500, transition:"all .15s",
                }}>
                  {m === "Hop-Count" ? "HC" : m === "Latency (ms)" ? "MS" : "CA"}
                </button>
              ))}
            </div>
          </SidebarSection>

          {/* TREE CONTROL */}
          <SidebarSection title="Tree Control (Layer-Steuerung)" accent={T1}>
            <ToggleRow label="Primärbaum (T1)" sub="Neon-Grün · Arboreszenz #1" dotColor={T1} checked={t1On} onToggle={() => setT1(v=>!v)} activeColor="rgba(57,255,20,.04)" activeBorder="rgba(57,255,20,.28)" />
            <ToggleRow label="Backup-Baum (T2)" sub="Neon-Lila · Failover-Pfad" dotColor={T2} checked={t2On} onToggle={() => setT2(v=>!v)} activeColor="rgba(192,132,252,.04)" activeBorder="rgba(192,132,252,.28)" />
          </SidebarSection>

          {/* STÖRUNG */}
          <SidebarSection title="Störung simulieren" accent={RED}>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#7a8499", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>Kante auswählen</div>
              <select value={selEdge} onChange={e=>setSelE(e.target.value)} style={{ width:"100%", background:"#1f2438", border:"1px solid #2e3650", borderRadius:6, color:"#e2e8f4", fontSize:12, padding:"7px 10px", cursor:"pointer", outline:"none", ...S.sys }}>
                {EDGES.map(e => (
                  <option key={e.id} value={e.id} style={{ background:"#1f2438", color: failed.has(e.id) ? "#ff7070" : "#e2e8f4" }}>
                    {failed.has(e.id) ? `⚠ ${e.lbl}` : e.lbl}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleCut} disabled={failed.has(selEdge)} style={{ width:"100%", padding:"9px 12px", borderRadius:6, background: failed.has(selEdge) ? "#2a0d0d" : "linear-gradient(135deg,#dc2626,#991b1b)", color:"white", border:"1px solid rgba(255,80,80,.3)", fontSize:12, fontWeight:700, cursor: failed.has(selEdge) ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:6, opacity: failed.has(selEdge) ? .5 : 1, ...S.sys }}>
              ✂ Verbindung kappen
            </button>
            <button onClick={handleRepair} style={{ width:"100%", padding:"9px 12px", borderRadius:6, background:"transparent", color:"#7a8499", border:"1px solid #2e3650", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, ...S.sys }}>
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

        {/* MAIN WORKSPACE */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", padding:12, gap:8, overflow:"hidden" }}>

          {/* GRAPH CARD */}
          <div style={{ flex:"0 0 50%", background:"#131720", border:"1px solid #252b3b", borderRadius:10, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"8px 14px", borderBottom:"1px solid #252b3b", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:".07em" }}>Netzwerk-Topologie (State-Based Visualisierung)</span>
              <span style={{ fontSize:10, color:"#3e4860" }}>· Ruhrgebiet · 9 Knoten · 12 Kanten</span>
              <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                {t1On      && <Chip lbl="T1 aktiv" color={T1} bg="rgba(57,255,20,.10)"   border="rgba(57,255,20,.22)" />}
                {t2On      && <Chip lbl="T2 aktiv" color={T2} bg="rgba(192,132,252,.10)" border="rgba(192,132,252,.22)" />}
                {failCount>0 && <Chip lbl={`${failCount} Ausfall${failCount>1?"e":""}`} color={RED} bg="rgba(255,64,64,.10)" border="rgba(255,64,64,.22)" />}
              </div>
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width:"100%", height:"100%", display:"block" }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  {[["gG","4"],["gP","4"],["gGold","7"],["gR","3"]].map(([id,sd]) => (
                    <filter key={id} id={id} x="-70%" y="-70%" width="240%" height="240%">
                      <feGaussianBlur stdDeviation={sd} in="SourceGraphic" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  ))}
                </defs>
                {[...Array(Math.ceil(SVG_W/34))].map((_,i) => [...Array(Math.ceil(SVG_H/34))].map((_,j) => (
                  <circle key={`${i}-${j}`} cx={i*34} cy={j*34} r={.8} fill="rgba(255,255,255,.04)" />
                )))}
                {EDGES.map(e => {
                  const na=NODES.find(n=>n.id===e.a), nb=NODES.find(n=>n.id===e.b);
                  const pa=npos(na), pb=npos(nb), st=edgeSt(e), isSel=e.id===selEdge;
                  const isFailoverRoute = isEsBroken && (e.id==="ES-WU"||e.id==="WU-DO");
                  if (st==="dim") return <line key={e.id} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={isSel?"rgba(255,255,255,.12)":"rgba(255,255,255,.04)"} strokeWidth={1} />;
                  if (st==="broken") {
                    const mx=(pa.x+pb.x)/2, my=(pa.y+pb.y)/2;
                    return (
                      <g key={e.id} onClick={()=>setSelE(e.id)} style={{ cursor:"pointer" }}>
                        <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={RED} strokeWidth={2.5} strokeDasharray="9,6" filter="url(#gR)" strokeLinecap="round" />
                        <circle cx={mx} cy={my} r={10} fill="#0d0f14" stroke={RED} strokeWidth={1.5} />
                        <line x1={mx-4} y1={my-4} x2={mx+4} y2={my+4} stroke={RED} strokeWidth={2} strokeLinecap="round" />
                        <line x1={mx+4} y1={my-4} x2={mx-4} y2={my+4} stroke={RED} strokeWidth={2} strokeLinecap="round" />
                      </g>
                    );
                  }
                  const color=isFailoverRoute?GOLD:(st==="t1"?T1:T2);
                  const filt =isFailoverRoute?"url(#gGold)":(st==="t1"?"url(#gG)":"url(#gP)");
                  return (
                    <g key={e.id} onClick={()=>setSelE(e.id)} style={{ cursor:"pointer" }}>
                      <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={color} strokeWidth={isSel?4.5:isFailoverRoute?4:2.5} filter={filt} strokeLinecap="round" />
                    </g>
                  );
                })}
                {NODES.map(n => {
                  const p=npos(n), isTgt=n.tgt;
                  const hasT1=t1On&&EDGES.some(e=>(e.a===n.id||e.b===n.id)&&e.tree==="t1"&&!failed.has(e.id));
                  const hasT2=t2On&&EDGES.some(e=>(e.a===n.id||e.b===n.id)&&e.tree==="t2"&&!failed.has(e.id));
                  const bColor=isTgt?GOLD:hasT1?T1:hasT2?T2:"#2e3650";
                  const filter=isTgt?"url(#gGold)":hasT1?"url(#gG)":hasT2?"url(#gP)":undefined;
                  return (
                    <g key={n.id}>
                      {isTgt&&[46,36,27].map((r,i)=>(
                        <circle key={r} cx={p.x} cy={p.y} r={r} fill="none" stroke={GOLD} strokeWidth={4} opacity={[.05,.09,.14][i]} />
                      ))}
                      <circle cx={p.x} cy={p.y} r={16} fill={isTgt?"#1e1708":"#181c2c"} stroke={bColor} strokeWidth={isTgt?2.5:1.8} filter={filter} />
                      {isTgt&&<text x={p.x} y={p.y-33} textAnchor="middle" fill={GOLD} fontSize={9} fontWeight="bold" fontFamily="system-ui">TARGET 🎯</text>}
                      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={isTgt?GOLD:"#e2e8f4"} fontSize={10} fontWeight="bold" fontFamily="system-ui">{n.id}</text>
                      <text x={p.x} y={p.y+28} textAnchor="middle" fill={isTgt?"rgba(251,191,36,.5)":"#3a4458"} fontSize={9.5} fontFamily="system-ui">{n.lbl}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* LEGEND + TERMINAL */}
          <div style={{ display:"flex", gap:8, flexShrink:0, height:105 }}>
            <div style={{ width:190, flexShrink:0, background:"#131720", border:"1px solid #252b3b", borderRadius:8, padding:"10px 14px", display:"flex", flexDirection:"column", gap:7 }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#3e4860", textTransform:"uppercase", letterSpacing:".10em" }}>Legende</div>
              {[
                { type:"line", c:RED,  dash:true,  lbl:"Ausgefallener Link" },
                { type:"dot",  c:GOLD,             lbl:"Zielknoten (Dortmund)" },
                { type:"line", c:T1,               lbl:"Primärbaum T1" },
                { type:"line", c:T2,               lbl:"Backup-Baum T2" },
                { type:"line", c:GOLD, dash:false, lbl:"Aktiver Failover-Pfad" },
              ].map((it,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:10, color:"#7a8499" }}>
                  {it.type==="dot"
                    ? <div style={{ width:10, height:10, borderRadius:"50%", background:it.c, boxShadow:`0 0 7px ${it.c}`, flexShrink:0 }} />
                    : <svg width={22} height={8} style={{ flexShrink:0 }}><line x1={0} y1={4} x2={22} y2={4} stroke={it.c} strokeWidth={it.dash?2:3} strokeDasharray={it.dash?"5,4":undefined} /></svg>
                  }
                  {it.lbl}
                </div>
              ))}
            </div>
            <div style={{ flex:1, background:"#080a0f", border:"1px solid #252b3b", borderRadius:8, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <div style={{ padding:"5px 10px", borderBottom:"1px solid #161b24", display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
                <div style={{ display:"flex", gap:4 }}>
                  {["#ff5f56","#ffbd2e","#27c93f"].map(c=><div key={c} style={{ width:8, height:8, borderRadius:"50%", background:c }} />)}
                </div>
                <span style={{ fontSize:10, color:"#3e4860", ...S.mono }}>system — event-log · live diagnostics</span>
                <span style={{ marginLeft:"auto", fontSize:9, color:"#3e4860", background:"#1f2438", padding:"1px 6px", borderRadius:3, border:"1px solid #252b3b", ...S.mono }}>{selectedMetric}</span>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"5px 10px", ...S.mono, fontSize:10.5, lineHeight:1.8 }}>
                {logs.map(l => (
                  <div key={l.id}>
                    <span style={{ color:"#3e4860" }}>[{l.time}]&nbsp;</span>
                    <span style={{ color:logColor(l.type) }}>{l.msg}</span>
                  </div>
                ))}
                <div ref={logEnd} />
              </div>
            </div>
          </div>

          {/* TABBED BOTTOM PANEL */}
          <div style={{ flex:1, background:"#131720", border:"1px solid #252b3b", borderRadius:10, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
            <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

            {/* TAB 1 — Wissenschaftliche Evaluation */}
            {activeTab === 0 && (
              <div style={{ overflowY:"auto", flex:1 }}>
                <div style={{ padding:"6px 14px 4px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #191d2c" }}>
                  <span style={{ fontSize:9, color:"#3e4860" }}>Quantitativer Algorithmen-Vergleich · DSN19/Foerster-Paper</span>
                  <span className="metric-val" key={selectedMetric} style={{ marginLeft:"auto", fontSize:9, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,.08)", border:"1px solid rgba(167,139,250,.2)", borderRadius:4, padding:"1px 7px", ...S.mono }}>⚖ {selectedMetric}</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["Node","Status","Delivery Rate (%)","Avg. Stretch","Max Stretch","Computation Time"].map(h => (
                        <th key={h} style={{ padding:"7px 14px", background:"#191d2c", fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".09em", color:"#3e4860", textAlign:"left", borderBottom:"1px solid #252b3b", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom:"1px solid #191d2c" }}>
                      <td style={{ padding:"10px 14px" }}><span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:"1px solid #2e3650", borderRadius:5, padding:"3px 8px", ...S.mono }}>ES</span></td>
                      <td style={{ padding:"10px 14px" }}><StatusPill type={isEsBroken?"failover":"normal"} /></td>
                      <td style={{ padding:"10px 14px", fontSize:12, fontWeight:700, color:"#22c55e", ...S.mono }}>100%</td>
                      <td className="metric-val" key={`es-avg-${selectedMetric}`} style={{ padding:"10px 14px", fontSize:12, color:"#22c55e", ...S.mono }}>{md.esAvg}</td>
                      <td className="metric-val" key={`es-max-${selectedMetric}`} style={{ padding:"10px 14px", fontSize:12, color:"#22c55e", ...S.mono }}>{md.esMax}</td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#3e4860", ...S.mono }}>N/A (Lokal geschaltet)</td>
                    </tr>
                    <tr style={{ borderBottom:"1px solid #191d2c", background:"rgba(251,146,60,.02)" }}>
                      <td style={{ padding:"10px 14px" }}><span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:"1px solid rgba(251,146,60,.4)", borderRadius:5, padding:"3px 8px", color:"#fb923c", ...S.mono }}>BO</span></td>
                      <td style={{ padding:"10px 14px" }}><StatusPill type="failover" /></td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <div className="metric-val" key={`b-del-${selectedMetric}`} style={{ fontSize:12, fontWeight:700, color:"#22c55e", ...S.mono }}>{bonsaiDelivery} (Bonsai)</div>
                          <div style={{ fontSize:11, color:RED, ...S.mono }}>{greedyDelivery}</div>
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <div className="metric-val" key={`b-avg-${selectedMetric}`} style={{ fontSize:13, fontWeight:800, color:T1, ...S.mono }}>{md.bonsaiAvgStretch} <span style={{fontSize:9,color:"#3e4860"}}>Bonsai</span></div>
                          <div className="metric-val" key={`g-avg-${selectedMetric}`} style={{ fontSize:11, color:"#5a6585", ...S.mono }}>{md.greedyAvgStretch} <span style={{fontSize:9,color:"#3e4860"}}>Greedy</span></div>
                        </div>
                      </td>
                      <td className="metric-val" key={`max-${selectedMetric}`} style={{ padding:"10px 14px", fontSize:12, color:"#fb923c", ...S.mono }}>{md.bonsaiMaxStretch}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <div className="metric-val" key={`bt-${selectedMetric}`} style={{ fontSize:12, fontWeight:700, color:GOLD, ...S.mono }}>{md.bonsaiTime} <span style={{fontSize:8,color:"#22c55e",background:"rgba(34,197,94,.1)",padding:"1px 4px",borderRadius:3}}>Sub-Fast FRR</span></div>
                          <div className="metric-val" key={`gt-${selectedMetric}`} style={{ fontSize:11, color:"#5a6585", ...S.mono }}>{isEsBroken ? md.greedyTime : "N/A"} <span style={{fontSize:8,color:"#3e4860"}}>Global Re-calc</span></div>
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

            {/* TAB 2 — Pfad-Details & Hop-Historie */}
            {activeTab === 1 && (
              <div style={{ overflowY:"auto", flex:1 }}>
                <div style={{ padding:"6px 14px 4px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #191d2c" }}>
                  <span style={{ fontSize:9, color:"#3e4860" }}>Aktiver Routing-Zustand · Echtzeit-Pfadanalyse</span>
                  <span className="metric-val" key={selectedMetric} style={{ marginLeft:"auto", fontSize:9, fontWeight:700, color:T2, background:"rgba(192,132,252,.08)", border:"1px solid rgba(192,132,252,.2)", borderRadius:4, padding:"1px 7px", ...S.mono }}>⚖ {selectedMetric}</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>
                      {["Route","Hop-Sequenz","Gesamtlatenz","Algorithmus","Status"].map(h => (
                        <th key={h} style={{ padding:"7px 14px", background:"#191d2c", fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:".09em", color:"#3e4860", textAlign:"left", borderBottom:"1px solid #252b3b", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Primary Route */}
                    <tr style={{ borderBottom:"1px solid #191d2c", background:"rgba(57,255,20,.02)" }}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:T1 }}>Primary Route</span>
                          <span style={{ fontSize:9, color:"#3e4860", ...S.mono }}>T2 · Failover-aktiv</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div className="metric-val" key={`ph-${selectedMetric}`} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          {md.pathPrimary.hop.split(" → ").map((node, i, arr) => (
                            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:`1px solid ${T1}44`, borderRadius:5, padding:"2px 7px", color:T1, ...S.mono }}>{node}</span>
                              {i < arr.length-1 && <span style={{ color:"#3e4860", fontSize:12 }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="metric-val" key={`pl-${selectedMetric}`} style={{ padding:"12px 14px", fontSize:13, fontWeight:700, color:GOLD, ...S.mono }}>{md.pathPrimary.lat}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(57,255,20,.08)", border:"1px solid rgba(57,255,20,.2)", color:T1, ...S.mono }}>Bonsai-RR</span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:11, fontWeight:600 }}>
                        <span style={{ color:"#22c55e" }}>{md.pathPrimary.status}</span>
                      </td>
                    </tr>

                    {/* Backup Route */}
                    <tr style={{ borderBottom:"1px solid #191d2c" }}>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:T2 }}>Backup Route</span>
                          <span style={{ fontSize:9, color:"#3e4860", ...S.mono }}>T1 · Standby</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div className="metric-val" key={`bh-${selectedMetric}`} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          {md.pathBackup.hop.split(" → ").map((node, i, arr) => (
                            <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:11, fontWeight:700, background:"#1f2438", border:`1px solid ${T2}44`, borderRadius:5, padding:"2px 7px", color:T2, ...S.mono }}>{node}</span>
                              {i < arr.length-1 && <span style={{ color:"#3e4860", fontSize:12 }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="metric-val" key={`bl-${selectedMetric}`} style={{ padding:"12px 14px", fontSize:13, fontWeight:700, color:"#a78bfa", ...S.mono }}>{md.pathBackup.lat}</td>
                      <td style={{ padding:"12px 14px" }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:4, background:"rgba(192,132,252,.08)", border:"1px solid rgba(192,132,252,.2)", color:T2, ...S.mono }}>Greedy-FRR</span>
                      </td>
                      <td style={{ padding:"12px 14px", fontSize:11, fontWeight:600, color:"#a78bfa" }}>
                        {md.pathBackup.status}
                      </td>
                    </tr>

                    {/* Köln — no route */}
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

                {/* Hop-Historie Footer */}
                <div style={{ margin:"8px 14px 10px", padding:"10px 12px", background:"#0d0f14", border:"1px solid #252b3b", borderRadius:7, display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ fontSize:9, fontWeight:800, color:"#3e4860", textTransform:"uppercase", letterSpacing:".10em" }}>Hop-Historie</div>
                  {[
                    { t:"13:58:22", ev:"ES→WU aufgewertet (T2-Failover)", c:T1 },
                    { t:"13:58:22", ev:"WU→DO stabil, kein Loop", c:"#7a8499" },
                    { t:"13:58:22", ev:"HA→DO Standby gehalten", c:T2 },
                  ].map((h,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9 }}>
                      <span style={{ color:"#3e4860", ...S.mono }}>[{h.t}]</span>
                      <span style={{ color:h.c }}>{h.ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOASTS */}
      <div style={{ position:"fixed", bottom:18, right:18, display:"flex", flexDirection:"column", gap:8, zIndex:200 }}>
        {toasts.map(t => <ToastItem key={t.id} t={t} onClose={() => dismissToast(t.id)} />)}
      </div>
    </div>
  );
}