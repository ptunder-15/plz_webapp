import { useEffect, useMemo } from "react";
import { GeoJSON, MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { APP_CONFIG } from "./config";

function FitToGeoJSON({ geoFeatures }) {
  const map = useMap();

  useEffect(() => {
    if (!geoFeatures?.features?.length) {
      return;
    }

    const geoJsonLayer = window.L.geoJSON(geoFeatures);
    const bounds = geoJsonLayer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [28, 28],
        maxZoom: 8,
        animate: true,
      });
    }
  }, [geoFeatures, map]);

  return null;
}

function buildFeatureCollection(features) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function MapView({
  geoFeatures,
  isLoadingGeoFeatures,
  selectedPlz = [],
  togglePlz,
  groups = [],
  assignments = [],
}) {
  const selectedSet = useMemo(() => new Set(selectedPlz), [selectedPlz]);

  const assignmentColorMap = useMemo(() => {
    const groupColorById = {};

    for (const group of groups) {
      groupColorById[group.id] = group.color;
    }

    const postcodeColorMap = {};

    for (const assignment of assignments) {
      const postcode = String(assignment?.postcode || "").trim();
      if (!postcode) {
        continue;
      }

      postcodeColorMap[postcode] =
        groupColorById[assignment.group_id] || "#94a3b8";
    }

    return postcodeColorMap;
  }, [groups, assignments]);

  const {
    neutralFeatures,
    assignedFeatures,
    selectedNeutralFeatures,
    selectedAssignedFeatures,
  } = useMemo(() => {
    const allFeatures = geoFeatures?.features || [];

    const neutral = [];
    const assigned = [];
    const selectedNeutral = [];
    const selectedAssigned = [];

    for (const feature of allFeatures) {
      const postcode = String(feature?.properties?.postcode || "").trim();
      const hasAssignment = Boolean(assignmentColorMap[postcode]);
      const isSelected = selectedSet.has(postcode);

      if (!postcode) {
        neutral.push(feature);
        continue;
      }

      if (isSelected && hasAssignment) {
        selectedAssigned.push(feature);
        continue;
      }

      if (isSelected && !hasAssignment) {
        selectedNeutral.push(feature);
        continue;
      }

      if (hasAssignment) {
        assigned.push(feature);
        continue;
      }

      neutral.push(feature);
    }

    return {
      neutralFeatures: neutral,
      assignedFeatures: assigned,
      selectedNeutralFeatures: selectedNeutral,
      selectedAssignedFeatures: selectedAssigned,
    };
  }, [geoFeatures, selectedSet, assignmentColorMap]);

  const selectedCountLabel =
    selectedPlz.length === 0
      ? "Keine Auswahl"
      : `${selectedPlz.length} PLZ ausgewählt`;

  return (
    <div
      style={{
        height: "620px",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(15,23,42,0.08)",
        position: "relative",
        boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
        background: "#f8fafc",
      }}
    >
      {isLoadingGeoFeatures && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.78)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            color: "#334155",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          Lade Geodaten...
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 500,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: "999px",
          padding: "8px 12px",
          fontSize: "13px",
          color: "#334155",
          fontWeight: 600,
          boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {selectedCountLabel}
      </div>

      <MapContainer
        center={APP_CONFIG.map.defaultCenter}
        zoom={APP_CONFIG.map.defaultZoom}
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        boxZoom={false}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={140}
        preferCanvas={true}
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomControl position="bottomright" />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoFeatures?.features?.length ? (
          <>
            <FitToGeoJSON geoFeatures={geoFeatures} />

            {neutralFeatures.length > 0 && (
              <GeoJSON
                key={`neutral-${neutralFeatures.length}-${selectedPlz.length}-${assignments.length}`}
                data={buildFeatureCollection(neutralFeatures)}
                style={{
                  color: "#94a3b8",
                  weight: 1.4,
                  fillColor: "#e5e7eb",
                  fillOpacity: 0.42,
                }}
                onEachFeature={(feature, layer) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  layer.on({
                    click: () => {
                      if (postcode) {
                        togglePlz(postcode);
                      }
                    },
                  });
                }}
              />
            )}

            {assignedFeatures.length > 0 && (
              <GeoJSON
                key={`assigned-${assignedFeatures.length}-${assignments.length}-${selectedPlz.length}`}
                data={buildFeatureCollection(assignedFeatures)}
                style={(feature) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  const assignedColor = assignmentColorMap[postcode] || "#94a3b8";

                  return {
                    color: "#475569",
                    weight: 1.5,
                    fillColor: assignedColor,
                    fillOpacity: 0.45,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  layer.on({
                    click: () => {
                      if (postcode) {
                        togglePlz(postcode);
                      }
                    },
                  });
                }}
              />
            )}

            {selectedNeutralFeatures.length > 0 && (
              <GeoJSON
                key={`selected-neutral-${selectedNeutralFeatures.length}-${selectedPlz.join("-")}`}
                data={buildFeatureCollection(selectedNeutralFeatures)}
                style={{
                  color: "#111827",
                  weight: 2.8,
                  fillColor: "#9ca3af",
                  fillOpacity: 0.72,
                }}
                onEachFeature={(feature, layer) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  layer.on({
                    click: () => {
                      if (postcode) {
                        togglePlz(postcode);
                      }
                    },
                  });
                }}
              />
            )}

            {selectedAssignedFeatures.length > 0 && (
              <GeoJSON
                key={`selected-assigned-${selectedAssignedFeatures.length}-${selectedPlz.join("-")}-${assignments.length}`}
                data={buildFeatureCollection(selectedAssignedFeatures)}
                style={(feature) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  const assignedColor = assignmentColorMap[postcode] || "#94a3b8";

                  return {
                    color: "#111827",
                    weight: 3.2,
                    fillColor: assignedColor,
                    fillOpacity: 0.72,
                    dashArray: "6 4",
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  layer.on({
                    click: () => {
                      if (postcode) {
                        togglePlz(postcode);
                      }
                    },
                  });
                }}
              />
            )}
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}

export default MapView;