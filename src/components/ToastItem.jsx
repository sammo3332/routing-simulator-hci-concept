import { METRIC_BENCHMARKS } from "../services/mockBackendService";
import { RED, S } from "../styles/sharedStyles";

export default function ToastItem({ t, onClose }) {
  const isAlert = t.type === "alert";

  return (
    <div style={{ background:"#1a1e2c", border:`1px solid ${isAlert ? "rgba(255,64,64,.35)" : "rgba(34,197,94,.35)"}`, borderLeft:`3px solid ${isAlert ? RED : "#22c55e"}`, borderRadius:9, padding:"12px 14px 15px", width:340, boxShadow:"0 12px 40px rgba(0,0,0,.7)", position:"relative", overflow:"hidden", animation:"slideInR .35s cubic-bezier(.34,1.3,.64,1) both" }}>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18 }}>{isAlert ? "🚨" : "✅"}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:3 }}>{isAlert ? "Netzwerkausfall erkannt" : "Netzwerk repariert"}</div>
          <div style={{ fontSize:11, color:"#7a8499", lineHeight:1.55 }}>{t.msg}</div>
          {isAlert && <div style={{ marginTop:6, display:"inline-block", background:"rgba(255,64,64,.1)", border:"1px solid rgba(255,64,64,.2)", borderRadius:4, padding:"2px 7px", fontSize:9, fontWeight:700, color:RED, ...S.mono }}>⚡ Fast-Failover in {METRIC_BENCHMARKS["Latency (ms)"].bonsaiTime}</div>}
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#3e4860", cursor:"pointer", fontSize:14, lineHeight:1 }}>✕</button>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, height:2, background:isAlert ? RED : "#22c55e", borderRadius:"0 0 0 9px", animation:"drain 5s linear forwards" }} />
    </div>
  );
}
