import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import axios from "./services/apiClient";
import App from "./App.jsx";
import "./index.scss";
axios.defaults.timeout = 10000;
const Router =
  import.meta.env.VITE_DEMO_MODE === "true" ? HashRouter : BrowserRouter;
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
