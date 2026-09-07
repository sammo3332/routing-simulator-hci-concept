const OPTIONS = [
  {
    value: "deterministic_shortest_path",
    title: "Kürzester Pfad",
    description: "Neuberechnung nach Ausfall",
  },
  {
    value: "bonsai_greedy",
    title: "Bonsai (Greedy)",
    description: "Vorbereitetes lokales Failover",
  },
];

export default function AlgorithmSelector({ value, onChange, disabled = false }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#7a8499", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>
        Routingverfahren
      </div>
      <div role="group" aria-label="Routingverfahren auswählen" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {OPTIONS.map(option => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              style={{
                minWidth: 0,
                padding: "8px 6px",
                borderRadius: 7,
                border: selected ? "1px solid #c4b5fd" : "1px solid #2e3650",
                background: selected
                  ? "linear-gradient(135deg,rgba(124,58,237,.34),rgba(79,70,229,.22))"
                  : "#1f2438",
                boxShadow: selected ? "inset 0 0 0 1px rgba(196,181,253,.22), 0 0 0 1px rgba(124,58,237,.16)" : "none",
                color: selected ? "#f5f3ff" : "#9aa5bb",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "block", fontSize: 11, fontWeight: 850 }}>
                <span aria-hidden="true">{selected ? "✓ " : "○ "}</span>{option.title}
              </span>
              <span style={{ display: "block", marginTop: 2, fontSize: 8.5, color: selected ? "#c4b5fd" : "#64708a" }}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
