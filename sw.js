/* Expédition — Service Worker (app-shell offline)
   But : l'appli survit à une perte réseau / un rechargement pendant un événement live.
   - Navigation HTML : network-first → cache (les hotfixes en ligne passent toujours ;
     hors-ligne on sert la dernière version connue).
   - Statique même origine (manifest, icônes, confidentialité) : cache-first.
   - CDN versionnés (supabase-js, jszip, Leaflet) + polices : cache-first (URL figées).
   - Tuiles OSM : cache-first runtime (zones déjà vues dispo hors-ligne).
   - Appels Supabase (REST/Storage) : network-only (jamais d'état de jeu périmé).
   ⚠️ Bumper CACHE à chaque déploiement qui change l'app-shell. */
const CACHE = 'expedition-v22';
const CORE = [
  './expedition.html',
  './confidentialite.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon.svg',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
  './icons/apple-touch-icon.png'
];
const CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', e=>{
  e.waitUntil((async()=>{
    const c = await caches.open(CACHE);
    await c.addAll(CORE); // même origine : indispensable
    // CDN : best-effort en mode cors (SRI OK), ne fait pas échouer l'install
    await Promise.allSettled(CDN.map(async u=>{
      try{ const r = await fetch(u); if(r && r.ok) await c.put(u, r.clone()); }catch(_){}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=> k!==CACHE && k!=='expedition-tiles').map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

const isTile = u=> /tile\.openstreetmap\.org/.test(u);
const isSupabase = u=> /supabase\.co/.test(u);

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;          // écritures → réseau direct
  const url = new URL(req.url);

  if(isSupabase(url.href)) return;          // donnée de jeu : toujours réseau

  // Navigation (document) : network-first, fallback cache.
  // `cache:'reload'` contourne le cache HTTP du navigateur : sans lui, GitHub Pages
  // renvoie un max-age et un simple rechargement pouvait servir une app-shell périmée
  // (un correctif déployé n'apparaissait pas). On repart de req.url et non de req :
  // une Request en mode 'navigate' ne peut pas être reconstruite avec un init.
  if(req.mode === 'navigate'){
    e.respondWith((async()=>{
      try{
        const net = await fetch(req.url, { cache:'reload', credentials:'same-origin' });
        const c = await caches.open(CACHE);
        c.put('./expedition.html', net.clone()).catch(()=>{});
        return net;
      }catch(_){
        return (await caches.match(req)) || (await caches.match('./expedition.html')) || Response.error();
      }
    })());
    return;
  }

  // Tuiles carte : cache-first runtime (cache séparé)
  if(isTile(url.href)){
    e.respondWith((async()=>{
      const c = await caches.open('expedition-tiles');
      const hit = await c.match(req);
      if(hit) return hit;
      try{ const net = await fetch(req); c.put(req, net.clone()).catch(()=>{}); return net; }
      catch(_){ return hit || Response.error(); }
    })());
    return;
  }

  // CDN / polices / statique : cache-first + revalidation en tâche de fond
  e.respondWith((async()=>{
    const cached = await caches.match(req);
    const network = fetch(req).then(net=>{
      if(net && (net.ok || net.type==='opaque')){
        caches.open(CACHE).then(c=>c.put(req, net.clone())).catch(()=>{});
      }
      return net;
    }).catch(()=> cached || Response.error());
    return cached || network;
  })());
});
