export default function DetailsPanelHandle({
  collapsed,
  detailsHeight,
  isResizing,
  summary,
  onToggle,
  handlers,
}) {
  return (
    <div
      {...handlers}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Größe des Ergebnisbereichs ändern"
      aria-valuemin={240}
      aria-valuenow={Math.round(detailsHeight)}
      aria-valuetext={collapsed ? "Ergebnisbereich eingeklappt" : `${Math.round(detailsHeight)} Pixel hoch`}
      aria-expanded={!collapsed}
      tabIndex={0}
      title={collapsed
        ? "Ergebnisbereich aufklappen"
        : "Ziehen zum Vergrößern, Doppelklick zum Zurücksetzen"}
      style={{
        height: 38,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 9,
        margin: "0 2px",
        padding: "0 8px",
        borderRadius: 6,
        color: "#7a8499",
        background: isResizing ? "rgba(167,139,250,.12)" : "transparent",
        cursor: collapsed ? "default" : "row-resize",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <span aria-hidden="true" style={{ color: "#a78bfa", fontSize: 15, pointerEvents: "none" }}>↕</span>
      <span style={{ fontSize: 9.5, fontWeight: 800, color: "#9aa5bb", pointerEvents: "none" }}>
        Details
      </span>
      <span aria-hidden="true" style={{ height: 1, flex: 1, background: "#2e3650", pointerEvents: "none" }} />
      <span style={{ maxWidth: "48%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9.5, pointerEvents: "none" }}>
        {summary}
      </span>
      <button
        type="button"
        aria-controls="routing-detail-panels"
        aria-expanded={!collapsed}
        onPointerDown={event => event.stopPropagation()}
        onClick={onToggle}
        style={{
          flexShrink: 0,
          padding: "5px 9px",
          border: "1px solid #3a435c",
          borderRadius: 5,
          background: "#181c2c",
          color: "#c4b5fd",
          fontSize: 9.5,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {collapsed ? "▾ Aufklappen" : "▴ Einklappen"}
      </button>
    </div>
  );
}
