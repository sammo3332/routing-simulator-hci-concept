import { RED } from "../styles/sharedStyles";

export default function StatusPill({ type }) {
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
