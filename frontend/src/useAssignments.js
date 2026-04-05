import { useCallback, useEffect, useState } from "react";
import { fetchAssignments } from "./api";

function useAssignments(tabId) {
  const [assignments, setAssignments] = useState([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const loadAssignments = useCallback(async () => {
    setIsLoadingAssignments(true);

    try {
      const data = await fetchAssignments(tabId);
      setAssignments(data);
    } catch (error) {
      console.error("Fehler beim Laden der Zuweisungen:", error);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [tabId]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialAssignments() {
      setIsLoadingAssignments(true);

      try {
        const data = await fetchAssignments(tabId);
        if (isMounted) {
          setAssignments(data);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Zuweisungen:", error);
      } finally {
        if (isMounted) {
          setIsLoadingAssignments(false);
        }
      }
    }

    loadInitialAssignments();

    return () => {
      isMounted = false;
    };
  }, [tabId]);

  return {
    assignments,
    isLoadingAssignments,
    reloadAssignments: loadAssignments,
  };
}

export default useAssignments;