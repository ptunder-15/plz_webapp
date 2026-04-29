import { useCallback, useEffect, useState } from "react";
import { fetchTabs } from "./api";

function useTabs() {
  const [tabs, setTabs] = useState([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);

  const reloadTabs = useCallback(async () => {
    setIsLoadingTabs(true);
    try {
      const data = await fetchTabs();
      setTabs(data);
      return data;
    } catch (error) {
      console.error("Fehler beim Laden der Tabs:", error);
      return [];
    } finally {
      setIsLoadingTabs(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingTabs(true);

    fetchTabs()
      .then((data) => { if (isMounted) setTabs(data); })
      .catch((error) => console.error("Fehler beim Laden der Tabs:", error))
      .finally(() => { if (isMounted) setIsLoadingTabs(false); });

    return () => { isMounted = false; };
  }, []);

  return { tabs, isLoadingTabs, reloadTabs };
}

export default useTabs;
