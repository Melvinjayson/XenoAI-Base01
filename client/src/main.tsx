import { createRoot } from "react-dom/client";
import App from "./App.deploy";
import "./index.css";

// Disable service worker for now to prevent registration errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
