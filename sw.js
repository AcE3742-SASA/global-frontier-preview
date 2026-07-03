/* GFP 가이드 서비스 워커
   - 방문한 리소스를 캐시에 저장해, 호스팅된 사이트도 오프라인에서 열리게 한다.
   - 전략: 캐시 우선(cache-first) + 백그라운드 갱신(방문 시 최신본으로 조용히 교체).
   - 내용을 수정해 다시 배포할 때는 아래 CACHE 버전을 올려주면 된다. */
const CACHE = "gfp-guide-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(["./"]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const fetched = fetch(e.request)
        .then((res) => {
          if (res.ok && new URL(e.request.url).origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fetched;
    })
  );
});
