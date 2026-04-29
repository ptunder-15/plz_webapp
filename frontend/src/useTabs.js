import { useCallback, useEffect, useState } from "react";
import { fetchTabs } from "./api";

function useTabs(teamId) {
  const [tabs, setTabs] = useState([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);

  const reloadTabs = useCallback(async () => {
    if (!teamId) return [];
    setIsLoadingTabs(true);
    try {
      const data = await fetchTabs(teamId);
      setTabs(data);
      return data;
    } catch (error) {
      console.error("Fehler beim Laden der Tabs:", error);
      return [];
    } finally {
      setIsLoadingTabs(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      setTabs([]);
      return;
    }

    let isMounted = true;
    setIsLoadingTabs(true);

    fetchTabs(teamId)
      .then((data) => { if (isMounted) setTabs(data); })
      .catch((error) => console.error("Fehler beim Laden der Tabs:", error))
      .finally(() => { if (isMounted) setIsLoadingTabs(false); });

    return () => { isMounted = false; };
  }, [teamId]);

  return { tabs, isLoadingTabs, reloadTabs };
}

export default useTabs;
