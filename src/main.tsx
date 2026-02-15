import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTestHooks } from "./utils/testHooks";

// Expose test hooks for Playwright when ?testMode=true
initTestHooks();

createRoot(document.getElementById("root")!).render(<App />);
