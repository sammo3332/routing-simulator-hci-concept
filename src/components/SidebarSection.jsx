export default function SidebarSection({ title, accent, children }) {
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
