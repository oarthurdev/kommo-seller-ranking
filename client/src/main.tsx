import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandingProvider } from "./lib/brandingContext";
import { UnifiedFilterProvider } from "./lib/unifiedFilterContext";
import { AuthProvider } from "./lib/authContext";

// Captura o primeiro segmento da URL como UUID
const uuid = window.location.pathname.split("/")[1] || "";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={`/${uuid}`}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </BrowserRouter>,
);