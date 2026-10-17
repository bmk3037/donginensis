/* 지원사업 서류 도구 오프라인 캐시 (files/grant/ 범위) — ISO 기록 도구의 sw.js 와 같은 방식.
   도구 화면은 인터넷이 되면 항상 최신을 받고(실패하면 저장본), 엑셀·압축 라이브러리와 글꼴은 한 번 받은 것을 쓴다.
   도구를 고치면 build_tool.py 가 VERSION 을 바꿔 이전 캐시를 지운다. */
var VERSION = '6cbb3d23a7';
var CACHE = 'grant-tool-' + VERSION;
var PRECACHE = ['./grant-docs-builder.html',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('grant-tool-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var lib = url.hostname === 'cdnjs.cloudflare.com' || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (lib) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return res;
      });
    }));
    return;
  }
  if (url.origin === self.location.origin && /grant-docs-builder\.html$/.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (res) {
      var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put('./grant-docs-builder.html', cp); });
      return res;
    }).catch(function () { return caches.match('./grant-docs-builder.html'); }));
  }
});
