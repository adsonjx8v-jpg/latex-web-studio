'use strict';

const CACHE_NAME = 'lumatex-busytex-wasm-v1';
const REMOTE_WASM = 'https://texlyre.github.io/texlyre-busytex/core/busytex/busytex.wasm';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'claim') event.waitUntil(self.clients.claim());
});

async function serveBusyTexWasm(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(REMOTE_WASM, { mode: 'cors' });
  if (!response.ok) return response;

  const headers = new Headers({ 'Content-Type': 'application/wasm', 'Cache-Control': 'public, max-age=31536000, immutable' });
  const wasm = new Response(response.body, { status: 200, headers });
  try { await cache.put(request, wasm.clone()); } catch { }
  return wasm;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const wasmUrl = new URL('vendor/busytex/busytex.wasm', self.registration.scope);
  if (url.origin === self.location.origin && url.pathname === wasmUrl.pathname) {
    event.respondWith(serveBusyTexWasm(request).catch(() => fetch(request)));
  }
});
