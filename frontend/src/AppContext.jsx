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

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [geoFeatureLimit, setGeoFeatureLimit] = useState(null);
  const [selectedBundesland, setSelectedBundesland] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedTabId, setSelectedTabId] = useState(null);

  const tabs = useTabs();

  // Ersten Tab automatisch auswählen sobald Tabs geladen sind
  useEffect(() => {
    if (selectedTabId === null && tabs.tabs.length > 0) {
      setSelectedTabId(tabs.tabs[0].id);
    }
  }, [tabs.tabs, selectedTabId]);

  // Aktuelle Rolle des Nutzers im gewählten Tab
  const activeTab = tabs.tabs.find((tab) => tab.id === selectedTabId) || null;
  const currentUserRole = activeTab?.user_role ?? null;

  const markers = useMarkers();
  const geoSample = useGeoSample();
  const geoFeatures = useGeoFeatures(geoFeatureLimit, selectedBundesland);
  const bundeslaender = useBundeslaender();
  const postcodeRecords = usePostcodeRecords(selectedBundesland);
  const groups = useGroups(selectedTabId);
  const assignments = useAssignments(selectedTabId);
  const postcodeValues = usePostcodeValues(selectedTabId);
  const selection = useSelection(markers.markers, postcodeRecords.postcodeRecords);

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
    currentUserRole,
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
