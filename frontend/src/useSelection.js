import { useEffect, useMemo, useState } from "react";
import { getSelectedItems } from "./selectors";

function useSelection(markers = [], postcodeRecords = []) {
  const [selectedPlz, setSelectedPlz] = useState([]);
  const [focusedPlz, setFocusedPlz] = useState(null);

  useEffect(() => {
    const allowedPlz = new Set(postcodeRecords.map((item) => item.postcode));

    setSelectedPlz((prev) => prev.filter((plz) => allowedPlz.has(plz)));

    setFocusedPlz((prev) => {
      if (!prev) return null;
      return allowedPlz.has(prev) ? prev : null;
    });
  }, [postcodeRecords]);

  const selectedItems = useMemo(() => {
    return getSelectedItems(selectedPlz, markers, postcodeRecords);
  }, [selectedPlz, markers, postcodeRecords]);

  const togglePlz = (plz) => {
    setSelectedPlz((prev) =>
      prev.includes(plz) ? prev.filter((item) => item !== plz) : [...prev, plz]
    );
    setFocusedPlz(plz);
  };

  const removePlz = (plzToRemove) => {
    setSelectedPlz((prev) => prev.filter((plz) => plz !== plzToRemove));

    setFocusedPlz((prev) => {
      if (prev !== plzToRemove) {
        return prev;
      }
      return null;
    });
  };

  const clearSelection = () => {
    setSelectedPlz([]);
    setFocusedPlz(null);
  };

  const addPlz = (plz) => {
    setSelectedPlz((prev) => (prev.includes(plz) ? prev : [...prev, plz]));
    setFocusedPlz(plz);
  };

  return {
    selectedPlz,
    selectedItems,
    focusedPlz,
    togglePlz,
    removePlz,
    clearSelection,
    addPlz,
  };
}

export default useSelection;