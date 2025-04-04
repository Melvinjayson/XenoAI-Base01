import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { useLocation } from "wouter";
import App from "./App";
import "./index.css";

// Wrapper component to handle initial navigation
function AppWithInitialNavigation() {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // If we're at the root path, redirect to splash screen
    if (location === "/") {
      setLocation("/splash");
    }
  }, [location, setLocation]);
  
  return <App />;
}

createRoot(document.getElementById("root")!).render(<AppWithInitialNavigation />);
