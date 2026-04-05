import { demoMarkers } from "./geoData";

export const demoLocations = demoMarkers.map((item) => ({
  plz: item.plz,
  name: item.name,
  position: [item.lat, item.lng],
}));