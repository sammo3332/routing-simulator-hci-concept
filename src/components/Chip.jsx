export default function Chip({ lbl, color, bg, border }) {
  return <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:4, textTransform:"uppercase", letterSpacing:".06em", color, background:bg, border:`1px solid ${border}` }}>{lbl}</span>;
}
