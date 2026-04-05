import MapLegend from "./MapLegend";
import MapView from "./MapView";

function MapSection({
  geoFeatures,
  isLoadingGeoFeatures,
  selectedPlz,
  focusedPlz,
  togglePlz,
  selectedBundesland,
  groups,
  assignments,
}) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.82)",
        borderRadius: "28px",
        padding: "20px",
        minHeight: "500px",
        border: "1px solid rgba(15,23,42,0.07)",
        boxShadow: "0 14px 34px rgba(15,23,42,0.05)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "14px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              marginTop: 0,
              marginBottom: "6px",
              fontSize: "28px",
              letterSpacing: "-0.03em",
            }}
          >
            Karte
          </h2>

          <div
            style={{
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.4,
            }}
          >
            PLZ-Gebiete direkt auf der Karte auswählen und der aktiven Gruppe zuweisen.
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderRadius: "16px",
            background: "#f8fafc",
            border: "1px solid rgba(15,23,42,0.07)",
            color: "#334155",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Filter: {selectedBundesland || "Alle Bundesländer"}
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <MapLegend />
      </div>

      <MapView
        geoFeatures={geoFeatures}
        isLoadingGeoFeatures={isLoadingGeoFeatures}
        selectedPlz={selectedPlz}
        focusedPlz={focusedPlz}
        togglePlz={togglePlz}
        groups={groups}
        assignments={assignments}
      />
    </section>
  );
}

export default MapSection;