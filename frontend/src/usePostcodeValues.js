import { useCallback, useEffect, useState } from "react";
import { fetchPostcodeValues } from "./api";

function usePostcodeValues(teamId) {
  const [postcodeValues, setPostcodeValues] = useState([]);
  const [isLoadingPostcodeValues, setIsLoadingPostcodeValues] = useState(false);

  const reloadPostcodeValues = useCallback(async () => {
    if (!teamId) return [];
    const data = await fetchPostcodeValues(teamId);
    setPostcodeValues(data);
    return data;
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      setPostcodeValues([]);
      return;
    }

    let isMounted = true;
    setIsLoadingPostcodeValues(true);

    fetchPostcodeValues(teamId)
      .then((data) => { if (isMounted) setPostcodeValues(data); })
      .catch((error) => console.error("Fehler beim Laden der PLZ-Werte:", error))
      .finally(() => { if (isMounted) setIsLoadingPostcodeValues(false); });

    return () => { isMounted = false; };
  }, [teamId]);

  return { postcodeValues, isLoadingPostcodeValues, reloadPostcodeValues };
}

export default usePostcodeValues;
