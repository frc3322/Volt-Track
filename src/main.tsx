import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initializeDesktopRuntime } from "./desktop";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Unable to find the root element.");
}

async function bootstrap() {
  await initializeDesktopRuntime();

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
