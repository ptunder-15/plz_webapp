import { useEffect, useState } from "react";
import { fetchBundeslaender } from "./api";

function useBundeslaender() {
  const [bundeslaender, setBundeslaender] = useState([]);
  const [isLoadingBundeslaender, setIsLoadingBundeslaender] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadBundeslaender() {
      try {
        const data = await fetchBundeslaender();
        if (isMounted) {
          setBundeslaender(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Bundesländer:", error);
      } finally {
        if (isMounted) {
          setIsLoadingBundeslaender(false);
        }
      }
    }

    loadBundeslaender();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    bundeslaender,
    isLoadingBundeslaender,
  };
}

export default useBundeslaender;