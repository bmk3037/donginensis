/* 마케팅 대시보드 설치용 서비스 워커 (files/mkt/ 범위).
   화면은 인터넷이 되면 항상 최신을 받고(실패하면 저장본), d3·글꼴은 한 번 받은 것을 쓴다. 숫자(구글 시트)는 저장하지 않는다. */
var CACHE = 'mkt-dash-1';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add('./dashboard.html').catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('mkt-dash-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return res;
      });
    }));
    return;
  }
  if (url.origin === self.location.origin && /dashboard\.html$/.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (res) {
      var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put('./dashboard.html', cp); });
      return res;
    }).catch(function () { return caches.match('./dashboard.html'); }));
  }
});
