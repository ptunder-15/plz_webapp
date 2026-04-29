import { useEffect, useMemo, useRef, useState } from "react";
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
  const [hoverInfo, setHoverInfo] = useState(null);

  const { assignmentColorMap, assignmentGroupMap } = useMemo(() => {
    const groupColorById = {};
    const groupNameById = {};

    for (const group of groups) {
      groupColorById[group.id] = group.color;
      groupNameById[group.id] = group.name;
    }

    const colorMap = {};
    const labelMap = {};

    for (const assignment of assignments) {
      const postcode = String(assignment?.postcode || "").trim();
      if (!postcode) continue;
      colorMap[postcode] = groupColorById[assignment.group_id] || "#94a3b8";
      labelMap[postcode] = groupNameById[assignment.group_id] || null;
    }

    return { assignmentColorMap: colorMap, assignmentGroupMap: labelMap };
  }, [groups, assignments]);

  const {
    neutralFeatures,
    assignedFeatures,
    selectedNeutralFeatures,
    selectedAssignedFeatures,
  } = useMemo(() => {
    const allFeatures = geoFeatures?.features || [];
    const neutral = [], assigned = [], selectedNeutral = [], selectedAssigned = [];

    for (const feature of allFeatures) {
      const postcode = String(feature?.properties?.postcode || "").trim();
      const hasAssignment = Boolean(assignmentColorMap[postcode]);
      const isSelected = selectedSet.has(postcode);

      if (!postcode) { neutral.push(feature); continue; }
      if (isSelected && hasAssignment) { selectedAssigned.push(feature); continue; }
      if (isSelected && !hasAssignment) { selectedNeutral.push(feature); continue; }
      if (hasAssignment) { assigned.push(feature); continue; }
      neutral.push(feature);
    }

    return { neutralFeatures: neutral, assignedFeatures: assigned, selectedNeutralFeatures: selectedNeutral, selectedAssignedFeatures: selectedAssigned };
  }, [geoFeatures, selectedSet, assignmentColorMap]);

  const selectedCountLabel =
    selectedPlz.length === 0 ? "Keine Auswahl" : `${selectedPlz.length} PLZ ausgewählt`;

  const makeHandlers = (feature, baseStyle) => {
    const postcode = String(feature?.properties?.postcode || "").trim();
    const bundesland = String(feature?.properties?.bundesland || "").trim();
    const groupName = assignmentGroupMap[postcode] || null;

    return {
      mouseover: (e) => {
        e.target.setStyle({ ...baseStyle, fillOpacity: Math.min((baseStyle.fillOpacity || 0.5) + 0.28, 0.92), weight: (baseStyle.weight || 1.5) + 0.8 });
        e.target.bringToFront();
        setHoverInfo({ postcode, bundesland, groupName });
      },
      mouseout: (e) => {
        e.target.setStyle(baseStyle);
        setHoverInfo(null);
      },
      click: () => { if (postcode) togglePlz(postcode); },
    };
  };

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

      {/* Selection counter */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 500,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: "999px",
          padding: "8px 14px",
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

      {/* Hover info chip */}
      {hoverInfo && (
        <div
          style={{
            position: "absolute",
            bottom: "54px",
            left: "14px",
            zIndex: 500,
            background: "rgba(15,23,42,0.88)",
            borderRadius: "14px",
            padding: "10px 16px",
            fontSize: "13px",
            color: "#f8fafc",
            lineHeight: 1.5,
            boxShadow: "0 8px 24px rgba(15,23,42,0.22)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            pointerEvents: "none",
            transition: "opacity 0.1s ease",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em" }}>
            PLZ {hoverInfo.postcode}
          </span>
          {hoverInfo.bundesland && (
            <span style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
              {hoverInfo.bundesland}
            </span>
          )}
          {hoverInfo.groupName && (
            <span style={{ display: "block", color: "#7dd3fc", fontSize: "12px", marginTop: "1px", fontWeight: 600 }}>
              Gruppe: {hoverInfo.groupName}
            </span>
          )}
        </div>
      )}

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
        preferCanvas={false}
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomControl position="bottomright" />

        {/* CartoDB Positron: cleaner background, city labels still visible */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {geoFeatures?.features?.length ? (
          <>
            <FitToGeoJSON geoFeatures={geoFeatures} />

            {neutralFeatures.length > 0 && (
              <GeoJSON
                key={`neutral-${neutralFeatures.length}-${selectedPlz.length}-${assignments.length}`}
                data={buildFeatureCollection(neutralFeatures)}
                style={{ color: "#94a3b8", weight: 1.2, fillColor: "#dde3ec", fillOpacity: 0.38 }}
                onEachFeature={(feature, layer) => {
                  layer.on(makeHandlers(feature, { color: "#94a3b8", weight: 1.2, fillColor: "#dde3ec", fillOpacity: 0.38 }));
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
                  return { color: "#475569", weight: 1.5, fillColor: assignedColor, fillOpacity: 0.58 };
                }}
                onEachFeature={(feature, layer) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  const assignedColor = assignmentColorMap[postcode] || "#94a3b8";
                  layer.on(makeHandlers(feature, { color: "#475569", weight: 1.5, fillColor: assignedColor, fillOpacity: 0.58 }));
                }}
              />
            )}

            {selectedNeutralFeatures.length > 0 && (
              <GeoJSON
                key={`selected-neutral-${selectedNeutralFeatures.length}-${selectedPlz.join("-")}`}
                data={buildFeatureCollection(selectedNeutralFeatures)}
                style={{ color: "#1e3a5f", weight: 2.8, fillColor: "#64748b", fillOpacity: 0.7 }}
                onEachFeature={(feature, layer) => {
                  layer.on(makeHandlers(feature, { color: "#1e3a5f", weight: 2.8, fillColor: "#64748b", fillOpacity: 0.7 }));
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
                  return { color: "#111827", weight: 3.2, fillColor: assignedColor, fillOpacity: 0.78, dashArray: "6 4" };
                }}
                onEachFeature={(feature, layer) => {
                  const postcode = String(feature?.properties?.postcode || "").trim();
                  const assignedColor = assignmentColorMap[postcode] || "#94a3b8";
                  layer.on(makeHandlers(feature, { color: "#111827", weight: 3.2, fillColor: assignedColor, fillOpacity: 0.78, dashArray: "6 4" }));
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