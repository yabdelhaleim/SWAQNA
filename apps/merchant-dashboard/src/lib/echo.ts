import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: any;
    Echo: any;
  }
}

let echoInstance: Echo<any> | null = null;

export const getEcho = (token?: string): Echo<any> | null => {
  if (typeof window === 'undefined') return null;

  // لو موجود قبل كده بنرجعه
  if (echoInstance) {
    return echoInstance;
  }

  window.Pusher = Pusher;

  const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('merchant_token') || '' : '');
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/api\/v1(\/merchant)?\/?$/, '');
  const useTls = process.env.NEXT_PUBLIC_REVERB_SCHEME === 'https';

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || 'hnghnwywzmpxeg2kxdfr',
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost',
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
    forceTLS: useTls,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBase}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
};

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};
