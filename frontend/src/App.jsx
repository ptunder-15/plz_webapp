import { useEffect, useState } from "react";
import SelectionPanel from "./SelectionPanel";
import Layout from "./Layout";
import MapSection from "./MapSection";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import InvitePage from "./InvitePage";
import TabMembersModal from "./TabMembersModal";
import { AppProvider, useAppContext } from "./AppContext";
import { createTab, deleteTab, updateTab, getMe, logout } from "./api";

function AppContent({ onLogout }) {
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
    currentUserRole,
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
  const { tabs: tabOptions, isLoadingTabs, reloadTabs } = tabs;
  const { groups: groupOptions, reloadGroups } = groups;
  const { assignments: assignmentData, reloadAssignments } = assignments;
  const { postcodeValues: postcodeValuesData, reloadPostcodeValues } = postcodeValues;

  const [tabFormName, setTabFormName] = useState("");
  const [tabMessage, setTabMessage] = useState("");
  const [editingTabId, setEditingTabId] = useState(null);
  const [showTabEditor, setShowTabEditor] = useState(false);
  const [showMembersForTabId, setShowMembersForTabId] = useState(null);

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  const canEdit = currentUserRole === "admin" || currentUserRole === "editor";

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
        if (stillExists) setSelectedTabId(editingTabId);
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
      if (editingTabId === tabId) resetTabForm();
      setTabMessage(result.message || "Produktbereich gelöscht.");
    } catch (error) {
      setTabMessage(error.message || "Fehler beim Löschen.");
    }
  };

  return (
    <Layout>
      {/* Top bar */}
      <div className="app-topbar">
        <div className="app-topbar-brand">
          <span className="app-logo">standardgrid</span>
          <span className="app-tagline">Gebiete auswählen, Gruppen zuweisen und gemeinsam nutzen.</span>
        </div>
        <button className="btn btn-subtle app-logout-btn" onClick={handleLogout}>Abmelden</button>
      </div>

      {/* Tab bar */}
      <div className="tab-bar-wrap">
        {isLoadingTabs ? (
          <span className="message-text">Laden…</span>
        ) : (
          <div className="tab-bar">
            {tabOptions.map((tab) => {
              const isActive = tab.id === selectedTabId;
              const isAdmin = tab.user_role === "admin";
              return (
                <div key={tab.id} className={`tab-item${isActive ? " tab-item--active" : ""}`}>
                  <button
                    className={`btn tab-btn${isActive ? " tab-btn--active" : ""}`}
                    onClick={() => setSelectedTabId(tab.id)}
                  >
                    {tab.name}
                    {isActive && !isAdmin && (
                      <span className="tab-role-chip">
                        {tab.user_role === "editor" ? "Bearbeiter" : "Betrachter"}
                      </span>
                    )}
                  </button>
                  {isActive && isAdmin && (
                    <div className="tab-actions">
                      <button
                        className="tab-action-btn"
                        onClick={() => handleStartEditTab(tab)}
                        title="Umbenennen"
                      >✎</button>
                      <button
                        className="tab-action-btn"
                        onClick={() => setShowMembersForTabId(tab.id)}
                        title="Zugriff verwalten"
                      >👥</button>
                      <button
                        className="tab-action-btn tab-action-btn--danger"
                        onClick={() => handleDeleteTab(tab.id, tab.name)}
                        title="Löschen"
                      >✕</button>
                    </div>
                  )}
                </div>
              );
            })}

            {canEdit && (
              <button className="btn tab-new-btn" onClick={handleStartCreateTab}>
                + Neuer Bereich
              </button>
            )}
          </div>
        )}

        {showTabEditor && canEdit && (
          <div className="tab-editor-row">
            <input
              type="text"
              placeholder={editingTabId ? "Neuer Name…" : "Name des Produktbereichs"}
              value={tabFormName}
              onChange={(e) => setTabFormName(e.target.value)}
              className="tab-input"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTab(); if (e.key === "Escape") resetTabForm(); }}
            />
            <button className="btn tab-save-btn" onClick={handleSaveTab}>
              {editingTabId ? "Speichern" : "Anlegen"}
            </button>
            <button className="btn tab-cancel-btn" onClick={resetTabForm}>Abbrechen</button>
          </div>
        )}
        {tabMessage && <p className="tab-message">{tabMessage}</p>}
      </div>

      {/* Haupt-Grid: Karte und Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>
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
          userRole={currentUserRole}
        />
      </div>

      {showMembersForTabId && (
        <TabMembersModal
          tab={tabs.tabs.find((t) => t.id === showMembersForTabId)}
          onClose={() => setShowMembersForTabId(null)}
          onMembersChanged={() => tabs.reloadTabs()}
        />
      )}
    </Layout>
  );
}

function App() {
  const hostname = window.location.hostname;
  const isAppDomain =
    hostname === "app.standard-grid.com" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  if (!isAppDomain) return <LandingPage />;

  return <AuthGate />;
}

function AuthGate() {
  const [authState, setAuthState] = useState("checking"); // "checking" | "loggedIn" | "loggedOut"

  // URL-Parameter prüfen (invite / reset-password)
  const params = new URLSearchParams(window.location.search);
  const isInvitePage = window.location.pathname === "/invite";
  const isResetPage = window.location.pathname === "/reset-password";
  const inviteToken = isInvitePage ? params.get("token") : null;
  const resetToken = isResetPage ? params.get("token") : null;

  useEffect(() => {
    // Auf localhost ist man immer eingeloggt (Dev-Bypass)
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      setAuthState("loggedIn");
      return;
    }
    getMe().then((user) => {
      setAuthState(user ? "loggedIn" : "loggedOut");
    });
  }, []);

  if (authState === "checking") {
    return (
      <div className="auth-page">
        <div style={{ color: "#86868b", fontSize: "15px" }}>Laden…</div>
      </div>
    );
  }

  // Einladungslink
  if (inviteToken) {
    return (
      <InvitePage
        token={inviteToken}
        mode="invite"
        onSuccess={() => {
          window.history.replaceState({}, "", "/");
          setAuthState("loggedIn");
        }}
      />
    );
  }

  // Passwort-Reset-Link
  if (isResetPage && resetToken) {
    return (
      <InvitePage
        token={resetToken}
        mode="reset"
        onSuccess={() => {
          window.history.replaceState({}, "", "/");
          setAuthState("loggedIn");
        }}
      />
    );
  }

  if (authState === "loggedOut") {
    return <LoginPage onLogin={() => setAuthState("loggedIn")} />;
  }

  return (
    <AppProvider>
      <AppContent onLogout={() => setAuthState("loggedOut")} />
    </AppProvider>
  );
}

export default App;
