const CACHE_NAME = "smart-ordering-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/app.js"
];

// 安装阶段：缓存静态资源
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(urlsToCache).catch(async err => {
        console.warn('cache.addAll failed, trying individual add:', err);
        // try adding items individually to avoid total failure
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn('failed to cache', url, e);
          }
        }
      })
    )
  );
});

// 激活阶段：清理旧缓存
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
});

// 拦截请求：优先返回缓存
// 拦截请求：优先返回缓存，并在网络请求失败时降级处理
self.addEventListener("fetch", event => {
  event.respondWith((async () => {
    try {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      // 尝试网络请求
      return await fetch(event.request);
    } catch (err) {
      // 如果网络请求失败（跨域或被拦截），尝试从缓存返回（如果有），否则返回 504 响应
      console.warn('ServiceWorker fetch failed for', event.request.url, err);
      const fallback = await caches.match(event.request);
      if (fallback) return fallback;
      return new Response('Network error', { status: 504, statusText: 'Gateway Timeout' });
    }
  })());
});
