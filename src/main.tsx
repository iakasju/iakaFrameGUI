import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { bootstrapCharte } from "./theme/useCharte";

// Applique la charte persistée (ou Cinabre par défaut) AVANT le premier rendu (anti-flash).
bootstrapCharte();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Élément racine #root introuvable");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
