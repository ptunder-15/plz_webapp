import { useEffect, useState } from "react";
import SelectionPanel from "./SelectionPanel";
import Layout from "./Layout";
import MapSection from "./MapSection";
import LandingPage from "./LandingPage";
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

    if (!confirmed) return;

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

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "56px", lineHeight: 0.95, fontWeight: 750, letterSpacing: "-0.04em", color: "#1d1d1f", marginBottom: "10px" }}>
          standardgrid
        </div>
        <div style={{ fontSize: "18px", color: "#86868b", lineHeight: 1.35 }}>
          Gebiete auswählen, Gruppen zuweisen und geschützt gemeinsam nutzen.
        </div>
      </div>

      {/* Produktbereiche / Tabs Editor */}
      <div className="shell-card" style={{ padding: "18px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", marginBottom: tabOptions.length > 0 ? "14px" : "0", flexWrap: "wrap" }}>
          <div>
            <div className="label-xs" style={{ marginBottom: "4px" }}>Produktbereiche</div>
            <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", color: "#1d1d1f" }}>
              {activeTab?.name || "Kein Bereich gewählt"}
            </div>
          </div>
          <button className="btn btn-subtle" onClick={handleStartCreateTab}>Neuer Bereich</button>
        </div>

        {isLoadingTabs ? (
          <div className="message-text">Bereiche werden geladen...</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "8px", borderRadius: "999px", background: "rgba(248,250,252,0.9)", border: "1px solid rgba(15,23,42,0.06)", marginBottom: showTabEditor || tabMessage ? "14px" : "0" }}>
            {tabOptions.map((tab) => {
              const isActive = tab.id === selectedTabId;
              return (
                <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: isActive ? "4px" : "0", borderRadius: "999px", background: isActive ? "rgba(255,255,255,0.9)" : "transparent", border: isActive ? "1px solid rgba(15,23,42,0.06)" : "1px solid transparent" }}>
                  <button
                    onClick={() => setSelectedTabId(tab.id)}
                    className={`btn tab-btn${isActive ? " tab-btn--active" : ""}`}
                  >
                    {tab.name}
                  </button>
                  {isActive && (
                    <>
                      <button className="btn btn-subtle" onClick={() => handleStartEditTab(tab)}>Bearbeiten</button>
                      <button className="btn btn-danger" onClick={() => handleDeleteTab(tab.id, tab.name)}>Löschen</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showTabEditor && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: tabMessage ? "10px" : "0" }}>
            <input
              type="text"
              placeholder="Name des Produktbereichs"
              value={tabFormName}
              onChange={(e) => setTabFormName(e.target.value)}
              className="tab-input"
            />
            <button className="btn tab-save-btn" onClick={handleSaveTab}>
              {editingTabId ? "Speichern" : "Anlegen"}
            </button>
            <button className="btn tab-cancel-btn" onClick={resetTabForm}>Abbrechen</button>
          </div>
        )}
        {tabMessage && <div className="message-text" style={{ marginTop: "10px" }}>{tabMessage}</div>}
      </div>

      {/* Haupt-Grid: Karte und Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        <MapSection
          geoFeatures={geoFeaturesData}
          isLoadingGeoFeatures={isLoadingGeoFeatures}
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
  const hostname = window.location.hostname;

  const isAppDomain =
    hostname === "app.standard-grid.com" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  if (!isAppDomain) {
    return <LandingPage />;
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
