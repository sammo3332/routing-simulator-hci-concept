export default function TabBar({ tabs, active, onChange }) {
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
