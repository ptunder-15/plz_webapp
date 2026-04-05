const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const APP_CONFIG = {
  api: {
    baseUrl: API_BASE_URL,
  },
  map: {
    defaultCenter: [51.1657, 10.4515],
    defaultZoom: 6,
  },
};