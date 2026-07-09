import { useRef, useState } from "react";
import { T1, S } from "../styles/sharedStyles";

export default function FileUploader({ onFile }) {
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
