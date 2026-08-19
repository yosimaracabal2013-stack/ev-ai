const TARGET = 'EV-New-Memory-Fixed-iPhone-Zoom-Voice-Time-Weather-Spotify-Fixed(1).html';

self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (!url.pathname.endsWith('/' + TARGET)) return;

  event.respondWith((async () => {
    const response = await fetch(event.request);
    if (!response.ok) return response;

    let html = await response.text();

    // Fix the two fatal JavaScript syntax errors without changing E.V.'s UI.
    html = html.replace(
      /\basync function\s*\n\s*\/\* ---------- Jarvis-style live weather ---------- \*\//,
      '/* ---------- Jarvis-style live weather ---------- */'
    );
    html = html.replace(
      /\basync sendMessage\(text, image\)\s*\{/,
      'async function sendMessage(text, image){'
    );

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.delete('content-length');
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  })());
});
