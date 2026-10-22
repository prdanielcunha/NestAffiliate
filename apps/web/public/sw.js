/* Offline shell ONLY. Never intercept Google OAuth, reCAPTCHA Enterprise,
 * Firebase App Check/Firestore or NestAI traffic from controlled pages.
 */
const CACHE='nestaffiliate-shell-v5-transparent-brand';
const SHELL=['/','/manifest.webmanifest','/brand/nestaffiliate-transparent-v2.webp','/brand/nestaffiliate-transparent-v2-256.webp','/brand/nestaffiliate-transparent-v2-512.webp','/brand/icon-192.png?v=3','/brand/icon-512.png?v=3'];

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(SHELL))
      .then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate',(event)=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('nestaffiliate-shell-')&&key!==CACHE)
        .map(key=>caches.delete(key))
    )).then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',(event)=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  // Cross-origin resource fetches may still be visible to a service worker.
  // Never return an HTML offline shell to an external recaptcha script/iframe.
  if(url.origin!==self.location.origin)return;
  // All APIs, authentication, token exchanges and static assets are network-owned.
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/integrations/pinterest/')||request.mode!=='navigate')return;
  event.respondWith(
    fetch(request).catch(async()=>{
      const cache=await caches.open(CACHE);
      return (await cache.match('/'))||Response.error();
    })
  );
});
