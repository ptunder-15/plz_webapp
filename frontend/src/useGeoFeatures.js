import { useEffect, useState } from "react";
import { fetchGeoFeatures } from "./api";

function useGeoFeatures(limit = 1000, bundesland = "") {
  const [geoFeatures, setGeoFeatures] = useState(null);
  const [isLoadingGeoFeatures, setIsLoadingGeoFeatures] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadGeoFeatures() {
      try {
        const data = await fetchGeoFeatures(limit, bundesland);
        if (isMounted) {
          setGeoFeatures(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der GeoJSON-Features:", error);
      } finally {
        if (isMounted) {
          setIsLoadingGeoFeatures(false);
        }
      }
    }

    setIsLoadingGeoFeatures(true);
    loadGeoFeatures();

    return () => {
      isMounted = false;
    };
  }, [limit, bundesland]);

  return {
    geoFeatures,
    isLoadingGeoFeatures,
  };
}

export default useGeoFeatures;