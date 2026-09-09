const buttonStyle = {
  minWidth: 30,
  height: 28,
  padding: "0 8px",
  border: "1px solid #3a435c",
  borderRadius: 5,
  background: "#181c2c",
  color: "#dbe4f3",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

export default function GraphZoomControls({
  scale,
  showAllLabels,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleLabels,
}) {
  return (
    <div
      aria-label="Graphansicht steuern"
      role="toolbar"
      onPointerDown={event => event.stopPropagation()}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: 5,
        border: "1px solid rgba(58,67,92,.9)",
        borderRadius: 7,
        background: "rgba(19,23,32,.94)",
        boxShadow: "0 4px 16px rgba(0,0,0,.28)",
      }}
    >
      <button type="button" onClick={onZoomOut} aria-label="Herauszoomen" title="Herauszoomen (−)" style={buttonStyle}>
        −
      </button>
      <output
        aria-live="polite"
        aria-label={`Zoomstufe ${Math.round(scale * 100)} Prozent`}
        style={{ minWidth: 48, color: "#c4b5fd", fontSize: 10, fontWeight: 800, textAlign: "center" }}
      >
        {Math.round(scale * 100)} %
      </output>
      <button type="button" onClick={onZoomIn} aria-label="Hineinzoomen" title="Hineinzoomen (+)" style={buttonStyle}>
        +
      </button>
      <button type="button" onClick={onFit} aria-label="Topologie einpassen" title="Gesamte Topologie einpassen" style={buttonStyle}>
        Einpassen
      </button>
      <button
        type="button"
        aria-pressed={showAllLabels}
        onClick={onToggleLabels}
        title={showAllLabels ? "Nur wichtige Knotennamen anzeigen" : "Alle Knotennamen anzeigen"}
        style={{
          ...buttonStyle,
          borderColor: showAllLabels ? "#a78bfa" : "#3a435c",
          background: showAllLabels ? "rgba(124,58,237,.28)" : buttonStyle.background,
          color: showAllLabels ? "#ddd6fe" : buttonStyle.color,
        }}
      >
        Namen
      </button>
    </div>
  );
}
