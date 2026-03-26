import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { forceImageLoad } from "../utils/Forceimageload.ts";

forceImageLoad();

createRoot(document.getElementById("root")!).render(<App />);