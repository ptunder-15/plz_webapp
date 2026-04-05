import { useCallback, useEffect, useState } from "react";
import { fetchGroups } from "./api";

function useGroups(tabId) {
  const [groups, setGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const reloadGroups = useCallback(async () => {
    setIsLoadingGroups(true);

    try {
      const data = await fetchGroups(tabId);
      setGroups(data);
      return data;
    } catch (error) {
      console.error("Fehler beim Laden der Gruppen:", error);
      return [];
    } finally {
      setIsLoadingGroups(false);
    }
  }, [tabId]);

  useEffect(() => {
    let isMounted = true;

    async function loadGroups() {
      setIsLoadingGroups(true);

      try {
        const data = await fetchGroups(tabId);
        if (isMounted) {
          setGroups(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Gruppen:", error);
      } finally {
        if (isMounted) {
          setIsLoadingGroups(false);
        }
      }
    }

    loadGroups();

    return () => {
      isMounted = false;
    };
  }, [tabId]);

  return {
    groups,
    isLoadingGroups,
    reloadGroups,
  };
}

export default useGroups;