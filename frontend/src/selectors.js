export function getSelectedItems(selectedPlz, markers = [], postcodeRecords = []) {
  const markerItems = markers.map((item) => ({
    plz: item.plz,
    name: item.name,
    source: "marker",
  }));

  const postcodeItems = postcodeRecords.map((item) => ({
    plz: item.postcode,
    name: item.bundesland ? `${item.postcode} · ${item.bundesland}` : item.postcode,
    source: "geojson",
  }));

  const combined = [...markerItems, ...postcodeItems];

  const uniqueByPlz = combined.filter(
    (item, index, array) =>
      item.plz &&
      array.findIndex((candidate) => candidate.plz === item.plz) === index
  );

  return uniqueByPlz
    .filter((item) => selectedPlz.includes(item.plz))
    .sort((a, b) => a.plz.localeCompare(b.plz));
}