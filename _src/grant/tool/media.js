/* 증빙 사진: EXIF 촬영일 읽기, 회전 보정·축소(JPEG), 이 브라우저에 보관(IndexedDB). */
(function () {
  'use strict';

  /* JPEG EXIF 의 DateTimeOriginal(0x9003) → 없으면 DateTime(0x0132). 'YYYY-MM-DD' 또는 null */
  function exifDate(buf) {
    var v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
    var off = 2;
    while (off + 4 < v.byteLength) {
      var marker = v.getUint16(off), len = v.getUint16(off + 2);
      if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return readTiff(v, off + 10);
      if ((marker & 0xFF00) !== 0xFF00) break;
      off += 2 + len;
    }
    return null;
  }
  function readTiff(v, t) {
    var le = v.getUint16(t) === 0x4949;
    var u16 = function (o) { return v.getUint16(o, le); }, u32 = function (o) { return v.getUint32(o, le); };
    function ifd(o) {
      var tags = {}, n = u16(o);
      for (var i = 0; i < n; i++) {
        var e = o + 2 + i * 12;
        tags[u16(e)] = { type: u16(e + 2), count: u32(e + 4), val: e + 8 };
      }
      return tags;
    }
    function ascii(tag) {
      if (!tag || tag.type !== 2) return null;
      var p = tag.count > 4 ? t + u32(tag.val) : tag.val, s = '';
      for (var i = 0; i < tag.count - 1 && p + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(p + i));
      return s;
    }
    try {
      var ifd0 = ifd(t + u32(t + 4));
      var dt = null;
      if (ifd0[0x8769]) dt = ascii(ifd(t + u32(ifd0[0x8769].val))[0x9003]);
      dt = dt || ascii(ifd0[0x0132]);
      var m = dt && /^(\d{4}):(\d{2}):(\d{2})/.exec(dt);
      return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
    } catch (e) { return null; }
  }

  /* 회전 보정(EXIF 방향) + 긴 변 maxPx 로 축소한 JPEG. {bytes, w, h, url} */
  async function prepare(file, maxPx) {
    maxPx = maxPx || 1600;
    var bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    var s = Math.min(1, maxPx / Math.max(bmp.width, bmp.height));
    var w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(bmp, 0, 0, w, h);
    var blob = await new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.85); });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w: w, h: h, blob: blob };
  }

  /* ---- IndexedDB: 사진·파일을 이 브라우저에 보관 (새로고침해도 유지) */
  var DB = 'dongin-grant', STORE = 'files', dbp = null;
  function db() {
    if (!dbp) dbp = new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(STORE, mode), st = t.objectStore(STORE), out = fn(st);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  var store = {
    put: function (rec) { return tx('readwrite', function (s) { s.put(rec); }).catch(function () {}); },
    del: function (id) { return tx('readwrite', function (s) { s.delete(id); }).catch(function () {}); },
    all: function () { return tx('readonly', function (s) { return s.getAll(); }).catch(function () { return []; }); },
    clear: function () { return tx('readwrite', function (s) { s.clear(); }).catch(function () {}); },
  };

  window.GrantMedia = { exifDate: exifDate, prepare: prepare, store: store };
})();
