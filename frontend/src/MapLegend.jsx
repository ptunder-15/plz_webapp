function LegendItem({ color, borderColor, label }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "4px",
            background: color,
            border: `1px solid ${borderColor}`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "14px", color: "#444" }}>{label}</span>
      </div>
    );
  }
  
  function MapLegend() {
    return (
      <div
        style={{
          display: "flex",
          gap: "18px",
          flexWrap: "wrap",
          marginBottom: "14px",
          padding: "12px 14px",
          borderRadius: "12px",
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
        }}
      >
        <LegendItem color="#93c5fd" borderColor="#2563eb" label="PLZ-Fläche" />
        <LegendItem color="#bdbdbd" borderColor="#111111" label="Ausgewählt" />
      </div>
    );
  }
  
  export default MapLegend;