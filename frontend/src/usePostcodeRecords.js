import { useEffect, useState } from "react";
import { fetchPostcodeRecords } from "./api";

function usePostcodeRecords(bundesland = "") {
  const [postcodeRecords, setPostcodeRecords] = useState([]);
  const [isLoadingPostcodeRecords, setIsLoadingPostcodeRecords] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPostcodeRecords() {
      try {
        const data = await fetchPostcodeRecords(bundesland);
        if (isMounted) {
          setPostcodeRecords(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der PLZ-Datensätze:", error);
      } finally {
        if (isMounted) {
          setIsLoadingPostcodeRecords(false);
        }
      }
    }

    setIsLoadingPostcodeRecords(true);
    loadPostcodeRecords();

    return () => {
      isMounted = false;
    };
  }, [bundesland]);

  return {
    postcodeRecords,
    isLoadingPostcodeRecords,
  };
}

export default usePostcodeRecords;