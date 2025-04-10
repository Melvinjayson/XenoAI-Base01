import { createRoot } from "react-dom/client";
import App from "./App"; // Use the original App with all components
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

// Create error handler to catch and log React errors
window.addEventListener('error', (event) => {
  console.log('Global error caught:', event.error);
});

// Add global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.log('Unhandled promise rejection:', event.reason);
});

// Set up WebSocket connection manually to ensure it's established
window.addEventListener('load', () => {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => console.log('WebSocket connection established');
    socket.onerror = (error) => console.error('WebSocket error:', error);
    
    // Keep WebSocket connection alive
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    socket.onclose = () => {
      console.log('WebSocket connection closed, clearing ping interval');
      clearInterval(pingInterval);
    };
    
    // Store socket in window for global access if needed
    (window as any).xenoSocket = socket;
  } catch (error) {
    console.error('Failed to establish WebSocket connection:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
