import { useEffect, useState } from "react";
import SelectionPanel from "./SelectionPanel";
import Layout from "./Layout";
import MapSection from "./MapSection";
import { AppProvider, useAppContext } from "./AppContext";
import { createTab, deleteTab, updateTab } from "./api";

function AppContent() {
  const {
    selection,
    geoSample,
    geoFeatures,
    postcodeRecords,
    bundeslaender,
    tabs,
    groups,
    assignments,
    postcodeValues,
    geoFeatureLimit,
    setGeoFeatureLimit,
    selectedBundesland,
    setSelectedBundesland,
    selectedGroupId,
    setSelectedGroupId,
    selectedTabId,
    setSelectedTabId,
    activeTab,
  } = useAppContext();

  const {
    selectedPlz,
    selectedItems,
    focusedPlz,
    togglePlz,
    removePlz,
    clearSelection,
    addPlz,
  } = selection;

  const { isLoadingGeoSample } = geoSample;
  const { geoFeatures: geoFeaturesData, isLoadingGeoFeatures } = geoFeatures;
  const { postcodeRecords: postcodeRecordData } = postcodeRecords;
  const { bundeslaender: bundeslandOptions } = bundeslaender;
  const {
    tabs: tabOptions,
    isLoadingTabs,
    reloadTabs,
  } = tabs;
  const {
    groups: groupOptions,
    reloadGroups,
  } = groups;
  const {
    assignments: assignmentData,
    reloadAssignments,
  } = assignments;
  const {
    postcodeValues: postcodeValuesData,
    reloadPostcodeValues,
  } = postcodeValues;

  const [tabFormName, setTabFormName] = useState("");
  const [tabMessage, setTabMessage] = useState("");
  const [editingTabId, setEditingTabId] = useState(null);
  const [showTabEditor, setShowTabEditor] = useState(false);

  useEffect(() => {
    setTabFormName("");
    setEditingTabId(null);
    setTabMessage("");
    setShowTabEditor(false);
  }, [selectedTabId]);

  const geoSampleInfo = isLoadingGeoSample
    ? "GeoJSON-Stichprobe wird geladen..."
    : geoFeaturesData?.features
      ? selectedBundesland
        ? `GeoJSON-Flächen geladen: ${geoFeaturesData.features.length} Features für ${selectedBundesland}`
        : `GeoJSON-Flächen geladen: ${geoFeaturesData.features.length} Features für Alle Bundesländer`
      : "Keine GeoJSON-Flächen geladen";

  const resetTabForm = () => {
    setTabFormName("");
    setEditingTabId(null);
    setTabMessage("");
    setShowTabEditor(false);
  };

  const handleStartCreateTab = () => {
    setTabFormName("");
    setEditingTabId(null);
    setTabMessage("");
    setShowTabEditor(true);
  };

  const handleStartEditTab = (tab) => {
    setEditingTabId(tab.id);
    setTabFormName(tab.name);
    setTabMessage("");
    setShowTabEditor(true);
  };

  const handleSaveTab = async () => {
    const normalizedName = tabFormName.trim();

    if (!normalizedName) {
      setTabMessage("Bitte einen Namen eingeben.");
      return;
    }

    try {
      let result;

      if (editingTabId) {
        result = await updateTab(editingTabId, normalizedName);
      } else {
        result = await createTab(normalizedName);
      }

      const updatedTabs = await reloadTabs?.();

      if (!editingTabId && result?.tab?.id) {
        setSelectedTabId(result.tab.id);
      } else if (editingTabId) {
        const stillExists = (updatedTabs || []).some((tab) => tab.id === editingTabId);
        if (stillExists) {
          setSelectedTabId(editingTabId);
        }
      }

      setTabMessage(result.message || "Produktbereich gespeichert.");
      resetTabForm();
    } catch (error) {
      setTabMessage(error.message || "Fehler beim Speichern.");
    }
  };

  const handleDeleteTab = async (tabId, tabName) => {
    const confirmed = window.confirm(
      `Möchtest du den Produktbereich "${tabName}" wirklich löschen?\n\nAlle Gruppen und Zuweisungen in diesem Bereich gehen verloren.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteTab(tabId);
      const updatedTabs = await reloadTabs?.();

      if (selectedTabId === tabId && updatedTabs?.length) {
        setSelectedTabId(updatedTabs[0].id);
      }

      if (editingTabId === tabId) {
        resetTabForm();
      }

      setTabMessage(result.message || "Produktbereich gelöscht.");
    } catch (error) {
      setTabMessage(error.message || "Fehler beim Löschen.");
    }
  };

  const topShellStyle = {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.07)",
    borderRadius: "32px",
    boxShadow: "0 16px 42px rgba(15,23,42,0.06)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };

  const tabButtonStyle = (isActive) => ({
    border: "none",
    background: isActive ? "#0f172a" : "transparent",
    color: isActive ? "white" : "#0f172a",
    borderRadius: "999px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
    letterSpacing: "-0.01em",
    transition: "all 0.16s ease",
    whiteSpace: "nowrap",
  });

  const subtleButtonStyle = {
    border: "none",
    background: "#eef2f7",
    color: "#0f172a",
    borderRadius: "999px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 650,
    fontSize: "13px",
    whiteSpace: "nowrap",
  };

  const dangerButtonStyle = {
    ...subtleButtonStyle,
    background: "#fde8e8",
    color: "#b42318",
  };

  return (
    <Layout>
      <div
        style={{
          marginBottom: "18px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            lineHeight: 0.95,
            fontWeight: 750,
            letterSpacing: "-0.055em",
            color: "#020617",
            marginBottom: "10px",
          }}
        >
          PLZ Web App
        </div>

        <div
          style={{
            fontSize: "18px",
            color: "#6b7280",
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
          }}
        >
          Gebiete auswählen, Gruppen zuweisen und später gemeinsam nutzen.
        </div>
      </div>

      <div
        style={{
          ...topShellStyle,
          padding: "18px 20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            marginBottom: tabOptions.length > 0 ? "14px" : "0",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Produktbereiche
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#0f172a",
              }}
            >
              {activeTab?.name || "Kein Bereich gewählt"}
            </div>
          </div>

          <button onClick={handleStartCreateTab} style={subtleButtonStyle}>
            Neuer Bereich
          </button>
        </div>

        {isLoadingTabs ? (
          <div style={{ color: "#666", fontSize: "14px" }}>Bereiche werden geladen...</div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              padding: "8px",
              borderRadius: "999px",
              background: "rgba(248,250,252,0.9)",
              border: "1px solid rgba(15,23,42,0.06)",
              marginBottom: showTabEditor || tabMessage ? "14px" : "0",
            }}
          >
            {tabOptions.map((tab) => {
              const isActive = tab.id === selectedTabId;

              return (
                <div
                  key={tab.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: isActive ? "4px" : "0",
                    borderRadius: "999px",
                    background: isActive ? "rgba(255,255,255,0.9)" : "transparent",
                    border: isActive
                      ? "1px solid rgba(15,23,42,0.06)"
                      : "1px solid transparent",
                  }}
                >
                  <button
                    onClick={() => setSelectedTabId(tab.id)}
                    style={tabButtonStyle(isActive)}
                  >
                    {tab.name}
                  </button>

                  {isActive && (
                    <>
                      <button
                        onClick={() => handleStartEditTab(tab)}
                        style={subtleButtonStyle}
                      >
                        Bearbeiten
                      </button>

                      <button
                        onClick={() => handleDeleteTab(tab.id, tab.name)}
                        style={dangerButtonStyle}
                      >
                        Löschen
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showTabEditor && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: tabMessage ? "10px" : "0",
            }}
          >
            <input
              type="text"
              placeholder="Name des Produktbereichs"
              value={tabFormName}
              onChange={(e) => setTabFormName(e.target.value)}
              style={{
                flex: 1,
                minWidth: "260px",
                padding: "13px 16px",
                borderRadius: "18px",
                border: "1px solid rgba(15,23,42,0.09)",
                background: "#ffffff",
                fontSize: "15px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <button
              onClick={handleSaveTab}
              style={{
                border: "none",
                background: "#0f172a",
                color: "white",
                borderRadius: "18px",
                padding: "13px 18px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {editingTabId ? "Speichern" : "Anlegen"}
            </button>

            <button
              onClick={resetTabForm}
              style={{
                ...subtleButtonStyle,
                padding: "13px 16px",
                borderRadius: "18px",
              }}
            >
              Abbrechen
            </button>
          </div>
        )}

        {tabMessage && (
          <div style={{ fontSize: "13px", color: "#555" }}>
            {tabMessage}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <MapSection
          geoSample={geoFeaturesData}
          isLoadingMarkers={isLoadingGeoFeatures}
          selectedPlz={selectedPlz}
          focusedPlz={focusedPlz}
          togglePlz={togglePlz}
          selectedBundesland={selectedBundesland}
          groups={groupOptions}
          assignments={assignmentData}
        />

        <SelectionPanel
          selectedItems={selectedItems}
          removePlz={removePlz}
          clearSelection={clearSelection}
          addPlz={addPlz}
          postcodeRecords={postcodeRecordData}
          geoSampleInfo={geoSampleInfo}
          geoFeatureLimit={geoFeatureLimit}
          setGeoFeatureLimit={setGeoFeatureLimit}
          bundeslaender={bundeslandOptions}
          selectedBundesland={selectedBundesland}
          setSelectedBundesland={setSelectedBundesland}
          activeFilterLabel={selectedBundesland || "Alle Bundesländer"}
          groups={groupOptions}
          assignments={assignmentData}
          postcodeValues={postcodeValuesData}
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
          reloadAssignments={reloadAssignments}
          reloadPostcodeValues={reloadPostcodeValues}
          reloadGroups={reloadGroups}
          selectedTabId={selectedTabId}
          activeTabName={activeTab?.name || ""}
        />
      </div>
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;