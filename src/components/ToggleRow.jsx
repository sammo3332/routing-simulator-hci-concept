export default function ToggleRow({ label, sub, dotColor, checked, onToggle, activeColor, activeBorder }) {
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
