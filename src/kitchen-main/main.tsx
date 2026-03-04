import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "../components/KitchenDashboard/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster position="bottom-right" richColors theme="dark" />
  </>
);