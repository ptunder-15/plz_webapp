import { useCallback, useEffect, useState } from "react";
import { fetchPostcodeValues } from "./api";

function usePostcodeValues() {
  const [postcodeValues, setPostcodeValues] = useState([]);
  const [isLoadingPostcodeValues, setIsLoadingPostcodeValues] = useState(true);

  const reloadPostcodeValues = useCallback(async () => {
    const data = await fetchPostcodeValues();
    setPostcodeValues(data);
    return data;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPostcodeValues() {
      try {
        const data = await fetchPostcodeValues();
        if (isMounted) {
          setPostcodeValues(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der PLZ-Werte:", error);
      } finally {
        if (isMounted) {
          setIsLoadingPostcodeValues(false);
        }
      }
    }

    loadPostcodeValues();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    postcodeValues,
    isLoadingPostcodeValues,
    reloadPostcodeValues,
  };
}

export default usePostcodeValues;