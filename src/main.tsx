import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppProviders } from "@/components/providers/AppProviders";
import { migrateLegacyLocalStorageKeys } from "@/lib/migrateLegacyKeys";
import App from "./App";

migrateLegacyLocalStorageKeys();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container #root not found in index.html");
}

createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </ThemeProvider>
  </React.StrictMode>,
);
