import { useCallback, useEffect, useState } from "react";
import { fetchPostcodeValues } from "./api";

function usePostcodeValues(tabId) {
  const [postcodeValues, setPostcodeValues] = useState([]);
  const [isLoadingPostcodeValues, setIsLoadingPostcodeValues] = useState(false);

  const reloadPostcodeValues = useCallback(async () => {
    if (!tabId) return [];
    const data = await fetchPostcodeValues(tabId);
    setPostcodeValues(data);
    return data;
  }, [tabId]);

  useEffect(() => {
    if (!tabId) {
      setPostcodeValues([]);
      return;
    }

    let isMounted = true;
    setIsLoadingPostcodeValues(true);

    fetchPostcodeValues(tabId)
      .then((data) => { if (isMounted) setPostcodeValues(data); })
      .catch((error) => console.error("Fehler beim Laden der PLZ-Werte:", error))
      .finally(() => { if (isMounted) setIsLoadingPostcodeValues(false); });

    return () => { isMounted = false; };
  }, [tabId]);

  return { postcodeValues, isLoadingPostcodeValues, reloadPostcodeValues };
}

export default usePostcodeValues;
