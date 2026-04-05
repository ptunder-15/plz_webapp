import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

window.L = L;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);