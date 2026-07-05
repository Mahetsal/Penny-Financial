/**
 * Helper to dynamically determine the local server API base URL.
 * In a standard browser, it defaults to relative paths (which Vite proxies to port 5000 in dev).
 * In a Capacitor mobile WebView (file:, capacitor:, or local HTTP hosts), it uses the user-configured server IP.
 */
export const getApiUrl = (path) => {
  // Check if we are running in a WebView or on a non-development hostname
  const isCapacitor = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
  const isTunnel = window.location.hostname.endsWith('.loca.lt') || window.location.hostname.endsWith('.ngrok.io') || window.location.hostname.endsWith('.ngrok-free.app') || window.location.hostname.endsWith('.trycloudflare.com');
  
  if ((isCapacitor || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) && !isTunnel) {
    let savedIp = '10.0.2.2';
    try {
      savedIp = localStorage.getItem('tharaa_server_ip') || '10.0.2.2';
    } catch (err) {
      console.warn('Failed to access localStorage in getApiUrl:', err);
    }
    // Make sure path starts with a slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `http://${savedIp}:5000${cleanPath}`;
  }
  
  return path;
};

/**
 * Custom fetch wrapper that automatically routes API calls to the correct host.
 */
export const apiFetch = async (path, options = {}) => {
  const url = getApiUrl(path);
  return fetch(url, options);
};
