import { useRef } from "react";

const buttonStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: 6,
  border: "1px solid #2e3650",
  background: "transparent",
  color: "#9aa5bb",
  fontWeight: 700,
  cursor: "pointer",
};

export default function ScenarioControls({
  canSave,
  disabled,
  loadedScenario,
  error,
  onSave,
  onLoad,
}) {
  const inputRef = useRef(null);
  return (
    <>
      <div style={{ color: "#7a8499", fontSize: 9.5, lineHeight: 1.45, marginBottom: 9 }}>
        Ein Szenario enthält Topologie, Zielknoten, Routingverfahren, Routingmetrik und ausgefallene Kanten.
        Die Ergebnisse werden beim Laden neu berechnet. Namensanzeige und verschobene Knoten werden als
        Ansicht mitgespeichert.
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        aria-label="Szenariodatei auswählen"
        disabled={disabled}
        style={{ display: "none" }}
        onChange={event => {
          const file = event.target.files[0];
          // Sonst meldet der Browser keine Änderung, wenn dieselbe Datei erneut gewählt wird.
          event.target.value = "";
          if (file) onLoad(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="Gespeichertes Szenario (JSON) öffnen und den fachlichen Zustand wiederherstellen"
        style={{ ...buttonStyle, marginBottom: 7 }}
      >
        Szenario laden
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || disabled}
        title="Aktuellen fachlichen Zustand als JSON-Datei speichern"
        style={buttonStyle}
      >
        Szenario speichern
      </button>
      {loadedScenario && (
        <div role="status" style={{ marginTop: 9, padding: "7px 8px", borderRadius: 6, background: "#181c2c", border: "1px solid #252b3b", color: "#9aa5bb", fontSize: 9.5, lineHeight: 1.45, overflowWrap: "anywhere" }}>
          <strong>Geladenes Szenario:</strong> {loadedScenario.fileName}
          {loadedScenario.snapshot === "differs" && (
            <div style={{ marginTop: 3 }}>
              Die in der Datei gespeicherten Ergebnisse weichen von der Neuberechnung ab. Angezeigt wird die Neuberechnung.
            </div>
          )}
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: 9, padding: "8px 9px", border: "1px solid rgba(255,64,64,.35)", background: "rgba(255,64,64,.08)", borderRadius: 6, color: "#ff8080", fontSize: 10, lineHeight: 1.45 }}>
          {error}
        </div>
      )}
    </>
  );
}
