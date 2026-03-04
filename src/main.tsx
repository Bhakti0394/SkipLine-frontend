import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Get the root element
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

// Create React root
const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
