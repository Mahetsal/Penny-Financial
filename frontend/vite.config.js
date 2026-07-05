import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite plugin to auto-heal browsers stuck in a PWA cache-lock loop
function cacheBusterPlugin() {
  return {
    name: 'cache-buster',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const isStaleJs = req.url.includes('/assets/index-') && req.url.endsWith('.js');
        if (isStaleJs) {
          console.warn(`[Cache Buster] Intercepted request for stale asset: ${req.url}`);
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
          res.end(`
            console.warn('Stale production asset requested. Wiping PWA cache and unregistering service workers...');
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => {
                Promise.all(regs.map(r => r.unregister())).then(() => {
                  if ('caches' in window) {
                    caches.keys().then(keys => {
                      Promise.all(keys.map(k => caches.delete(k))).then(() => {
                        console.log('Caches wiped successfully. Reloading...');
                        window.location.reload(true);
                      });
                    });
                  } else {
                    window.location.reload(true);
                  }
                });
              });
            } else {
              window.location.reload(true);
            }
          `);
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cacheBusterPlugin()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
