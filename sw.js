// ScanBoss 離線快取：先回快取，背景再更新，斷網時也能開啟收銀
const CACHE = 'scanboss-v8';
const SHELL = [
    './',
    'index.html',
    'manifest.webmanifest',
    'icon.svg',
    'vendor/chart.umd.min.js',
    'vendor/html5-qrcode.min.js',
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;
    const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
    if (!sameOrigin && !isFont) return;

    e.respondWith(
        caches.open(CACHE).then(async cache => {
            const cached = await cache.match(req, { ignoreSearch: sameOrigin });
            const network = fetch(req)
                .then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
                .catch(() => cached);
            return cached || network;
        })
    );
});
