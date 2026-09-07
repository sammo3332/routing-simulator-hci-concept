const OPTIONS = [
  {
    value: "deterministic_shortest_path",
    title: "Standard",
    description: "Kürzester Pfad",
  },
  {
    value: "bonsai_greedy",
    title: "Bonsai",
    description: "Greedy-Routing",
  },
];

export default function AlgorithmSelector({ value, onChange, disabled = false }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#7a8499", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>
        Algorithmus auswählen
      </div>
      <div role="group" aria-label="Routingalgorithmus" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
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
                border: selected ? "1px solid #a78bfa" : "1px solid #2e3650",
                background: selected ? "rgba(167,139,250,.16)" : "#1f2438",
                color: selected ? "#ddd6fe" : "#9aa5bb",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ display: "block", fontSize: 11, fontWeight: 850 }}>
                {selected ? "● " : "○ "}{option.title}
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
