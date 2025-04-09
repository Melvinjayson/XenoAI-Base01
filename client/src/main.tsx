import { createRoot } from "react-dom/client";
import App from "./App.deploy"; // Use the deploy version that works reliably
import "./index.css";

// Handle service worker properly to prevent errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).then(() => {
    console.log('Previous service workers unregistered successfully');
  }).catch(error => {
    console.error('Service worker unregistration failed:', error);
  });
}

// Create error handler for React
window.addEventListener('error', (event) => {
  console.log('Global error caught:', event.error);
});

// Display connection status for WebSocket
window.addEventListener('load', () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log(`Attempting to connect to WebSocket at ${wsUrl}`);
  
  const socket = new WebSocket(wsUrl);
  socket.onopen = () => console.log('WebSocket connection established');
  socket.onerror = (error) => console.error('WebSocket error:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
