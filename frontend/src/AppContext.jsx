import { createContext, useContext, useEffect, useState } from "react";
import useSelection from "./useSelection";
import useMarkers from "./useMarkers";
import useGeoSample from "./useGeoSample";
import usePostcodeRecords from "./usePostcodeRecords";
import useGeoFeatures from "./useGeoFeatures";
import useBundeslaender from "./useBundeslaender";
import useGroups from "./useGroups";
import useAssignments from "./useAssignments";
import usePostcodeValues from "./usePostcodeValues";
import useTabs from "./useTabs";
import useTeams from "./useTeams";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [geoFeatureLimit, setGeoFeatureLimit] = useState(null);
  const [selectedBundesland, setSelectedBundesland] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const { teams, isLoadingTeams, teamsError, reloadTeams } = useTeams();

  // Erstes Team automatisch auswählen
  useEffect(() => {
    if (selectedTeamId === null && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Aktuelle Rolle des Nutzers im gewählten Team
  const currentUserRole = teams.find((t) => t.id === selectedTeamId)?.role ?? null;

  const markers = useMarkers();
  const geoSample = useGeoSample();
  const geoFeatures = useGeoFeatures(geoFeatureLimit, selectedBundesland);
  const bundeslaender = useBundeslaender();
  const postcodeRecords = usePostcodeRecords(selectedBundesland);
  const tabs = useTabs(selectedTeamId);

  // Ersten Tab automatisch auswählen sobald Tabs geladen sind
  useEffect(() => {
    if (selectedTabId === null && tabs.tabs.length > 0) {
      setSelectedTabId(tabs.tabs[0].id);
    }
  }, [tabs.tabs, selectedTabId]);

  // Tab-Auswahl zurücksetzen wenn Team wechselt
  useEffect(() => {
    setSelectedTabId(null);
  }, [selectedTeamId]);

  const groups = useGroups(selectedTabId);
  const assignments = useAssignments(selectedTabId);
  const postcodeValues = usePostcodeValues(selectedTeamId);
  const selection = useSelection(markers.markers, postcodeRecords.postcodeRecords);

  const activeTab = tabs.tabs.find((tab) => tab.id === selectedTabId) || null;
  const activeTeam = teams.find((t) => t.id === selectedTeamId) || null;

  const value = {
    selection,
    markers,
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
    // Team-State
    teams,
    isLoadingTeams,
    teamsError,
    reloadTeams,
    selectedTeamId,
    setSelectedTeamId,
    currentUserRole,
    activeTeam,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}
