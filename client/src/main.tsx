import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Captura o primeiro segmento da URL como UUID
const uuid = window.location.pathname.split("/")[1] || "";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={`/${uuid}`}>
    <App />
  </BrowserRouter>,
);
