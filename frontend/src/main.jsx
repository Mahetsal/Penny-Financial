import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ── GLOBAL FETCH INTERCEPTOR FOR MOBILE SERVER CONNECTIONS ──────────
const nativeFetch = window.fetch;
window.fetch = function (input, init) {
  let url = typeof input === 'string' ? input : (input && input.url);
  
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const isCapacitor = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname;
    const isTunnel = window.location.hostname.endsWith('.loca.lt') || window.location.hostname.endsWith('.ngrok.io') || window.location.hostname.endsWith('.ngrok-free.app') || window.location.hostname.endsWith('.trycloudflare.com');
    
    if ((isCapacitor || (!isLocal && window.location.port !== '5173')) && !isTunnel) {
      let savedIp = '10.0.2.2';
      try {
        savedIp = localStorage.getItem('tharaa_server_ip') || '10.0.2.2';
      } catch (err) {
        console.warn('Failed to access localStorage in fetch interceptor:', err);
      }
      const rewrittenUrl = `http://${savedIp}:5000${url}`;
      
      if (typeof input === 'string') {
        return nativeFetch(rewrittenUrl, init);
      } else {
        try {
          return nativeFetch(new Request(rewrittenUrl, input), init);
        } catch (err) {
          console.error('Failed to construct rewritten Request:', err);
        }
      }
    }
  }
  return nativeFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register Service Worker for offline-first PWA (production only)
// or aggressively clean it up in development to prevent stale cache-locking
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.warn('SW registration failed:', err));
  });
} else if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let unregisteredAny = false;
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Successfully unregistered stale service worker in dev mode:', registration.scope);
            unregisteredAny = true;
          }
        });
      }
      if (unregisteredAny) {
        setTimeout(() => window.location.reload(), 500);
      }
    });
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}
