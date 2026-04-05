import { useEffect, useState } from "react";
import { fetchGeoSample } from "./api";

function useGeoSample() {
  const [geoSample, setGeoSample] = useState(null);
  const [isLoadingGeoSample, setIsLoadingGeoSample] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadGeoSample() {
      try {
        const data = await fetchGeoSample();
        if (isMounted) {
          setGeoSample(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der GeoJSON-Stichprobe:", error);
      } finally {
        if (isMounted) {
          setIsLoadingGeoSample(false);
        }
      }
    }

    loadGeoSample();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    geoSample,
    isLoadingGeoSample,
  };
}

export default useGeoSample;