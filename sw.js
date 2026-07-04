/* GFP 가이드 서비스 워커
   - 방문한 리소스를 캐시에 저장해, 호스팅된 사이트도 오프라인에서 열리게 한다.
   - 전략:
     · 페이지(HTML 문서) → 네트워크 우선: 배포하면 온라인 사용자에겐 즉시 새 버전,
       오프라인이면 캐시본으로 열림. (버전 올리는 걸 잊어도 안전)
     · 그 외(아이콘 등)   → 캐시 우선 + 백그라운드 갱신.
   - 큰 구조를 바꿔 배포할 때는 아래 CACHE 버전도 함께 올려주면 가장 확실하다. */
const CACHE = "gfp-guide-v3";

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

  // HTML 문서(앱 본체)는 네트워크 우선 — 실패하면 캐시 폴백
  if (e.request.mode === "navigate" ||
      (e.request.headers.get("accept") || "").includes("text/html")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // 나머지 리소스는 캐시 우선 + 백그라운드 갱신
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
