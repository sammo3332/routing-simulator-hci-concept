import { S } from "../styles/sharedStyles";

export default function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ fontSize:9, fontWeight:700, color:"#7a8499", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", background:"#1f2438", border:"1px solid #2e3650", borderRadius:6, color:"#e2e8f4", fontSize:12, padding:"7px 10px", cursor:"pointer", outline:"none", ...S.sys }}>
        {options.map(o=><option key={o} value={o} style={{ background:"#1f2438" }}>{o}</option>)}
      </select>
    </div>
  );
}
