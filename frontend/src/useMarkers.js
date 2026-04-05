import { useEffect, useState } from "react";
import { fetchMarkers } from "./api";

function useMarkers() {
  const [markers, setMarkers] = useState([]);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMarkers() {
      try {
        const data = await fetchMarkers();
        if (isMounted) {
          setMarkers(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Marker:", error);
      } finally {
        if (isMounted) {
          setIsLoadingMarkers(false);
        }
      }
    }

    loadMarkers();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    markers,
    isLoadingMarkers,
  };
}

export default useMarkers;