/* 지원사업 서류 도구 — 화면·상태·문서 만들기 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'dongin-grant-state', CO_KEY = 'dongin-grant-company';
  var CHECK = '【확인필요】';
  var D = window.GrantDocx, M = window.GrantMedia;

  /* ---------------------------------------------------------------- 상태 */

  function blank() {
    return {
      sample: false,
      사업: { 사업명: '', 과제명: '', 주관기관: '', 협약번호: '', 사업기간: { 시작: '', 종료: '' },
             사업비: { 정부지원금: '', 자부담_현금: '', 자부담_현물: '', 총사업비: '' } },
      기업: { 기업명: '', 대표자: '', 사업자등록번호: '', 주소: '', 담당자: '', 연락처: '' },
      청구: { 청구일: '', 청구금액: '', 계좌: { 은행: '', 계좌번호: '', 예금주: '' } },
      과제목록: [],
      문장: { 추진목적: '', 기대효과: '', 향후계획: '' },
      결재: { 작성: '', 검토: '', 승인: '' },
      증빙목록: [],
      files: [],          // {id, eid, name, type, date, w, h}  (원본은 IndexedDB / blobs)
    };
  }
  var state = blank();
  var blobs = {};        // file id → Blob(원본)
  var forms = [];        // {name, bytes, scan, map:{idx: key|'__text'|''}, text:{idx: str}, dates:{str: key}}

  function get(path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, state);
  }
  function set(path, v) {
    var ks = path.split('.'), o = state;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가(사생활 모드 등) */ }
    }, 300);
  }

  /* ---------------------------------------------------------------- 표기 */

  function toInt(v) { var s = String(v == null ? '' : v).replace(/[^\d-]/g, ''); return s ? parseInt(s, 10) : 0; }
  function comma(v) { return toInt(v).toLocaleString('ko-KR'); }
  var DIG = '영일이삼사오육칠팔구', SMALL = ['', '십', '백', '천'], BIG = ['', '만', '억', '조'];
  function hangul(n) {
    if (!n) return '영';
    var out = [], g = 0;
    while (n > 0) {
      var chunk = n % 10000; n = Math.floor(n / 10000);
      if (chunk) {
        var s = '';
        for (var i = 3; i >= 0; i--) { var d = Math.floor(chunk / Math.pow(10, i)) % 10; if (d) s += DIG[d] + SMALL[i]; }
        out.unshift(s + BIG[g]);
      }
      g++;
    }
    return out.join('');
  }
  function ymd(v) { var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(String(v || '')); return m ? [+m[1], +m[2], +m[3]] : null; }
  function dotDate(v) { var d = ymd(v); return d ? d[0] + '. ' + d[1] + '. ' + d[2] + '.' : String(v || ''); }
  function korDate(v) { var d = ymd(v); return d ? d[0] + '년 ' + d[1] + '월 ' + d[2] + '일' : String(v || ''); }
  function iso(v) { var d = ymd(v); return d ? d[0] + '-' + String(d[1]).padStart(2, '0') + '-' + String(d[2]).padStart(2, '0') : ''; }
  function period() { return dotDate(get('사업.사업기간.시작')) + ' ~ ' + dotDate(get('사업.사업기간.종료')); }
  function rate(target, actual) {
    var t = parseFloat(String(target).replace(/[^\d.]/g, '')), a = parseFloat(String(actual).replace(/[^\d.]/g, ''));
    return t > 0 && !isNaN(a) ? Math.round(a / t * 100) + '%' : '';
  }

  /* ---------------------------------------------------------------- 입력 칸 정의 */

  var FIELDS = {
    fBiz: [['사업.사업명', '사업명', 1], ['사업.과제명', '과제명', 1], ['사업.주관기관', '주관(전담)기관'], ['사업.협약번호', '협약번호'],
      ['사업.사업기간.시작', '사업 시작일', 0, 'date'], ['사업.사업기간.종료', '사업 종료일', 0, 'date'],
      ['사업.사업비.정부지원금', '정부지원금 (원)', 0, 'money'], ['사업.사업비.자부담_현금', '자부담 현금 (원)', 0, 'money'],
      ['사업.사업비.자부담_현물', '자부담 현물 (원)', 0, 'money'], ['사업.사업비.총사업비', '총사업비 (원)', 0, 'money']],
    fCo: [['기업.기업명', '기업명', 1], ['기업.대표자', '대표자', 1], ['기업.사업자등록번호', '사업자등록번호'], ['기업.주소', '주소'],
      ['기업.담당자', '실무 담당자'], ['기업.연락처', '연락처']],
    fClaim: [['청구.청구일', '청구일', 1, 'date'], ['청구.청구금액', '청구금액 (원)', 1, 'money'], ['청구.계좌.은행', '은행'],
      ['청구.계좌.계좌번호', '계좌번호'], ['청구.계좌.예금주', '예금주']],
    fText: [['문장.추진목적', '추진 목적 (결과보고서 1. 사업 개요)', 0, 'area'], ['문장.기대효과', '기대효과', 0, 'area'],
      ['문장.향후계획', '향후 계획', 0, 'area']],
    fSign: [['결재.작성', '작성'], ['결재.검토', '검토'], ['결재.승인', '승인']],
  };

  function renderFields(id) {
    var box = $(id);
    box.innerHTML = '';
    FIELDS[id].forEach(function (f) {
      var path = f[0], wrap = document.createElement('div');
      wrap.className = 'field' + (f[3] === 'area' ? ' wide' : '');
      var lab = document.createElement('label'), inId = 'f-' + path.replace(/\./g, '-');
      lab.htmlFor = inId;
      lab.textContent = f[1];
      if (f[2]) { var r = document.createElement('span'); r.className = 'req'; r.textContent = '*'; lab.appendChild(r); }
      var el = document.createElement(f[3] === 'area' ? 'textarea' : 'input');
      el.id = inId;
      if (f[3] !== 'area') { el.type = f[3] === 'date' ? 'date' : 'text'; el.autocomplete = 'off'; }
      if (f[3] === 'money') { el.className = 'num'; el.inputMode = 'numeric'; }
      var v = get(path);
      el.value = f[3] === 'money' ? (v === '' || v == null ? '' : comma(v)) : (f[3] === 'date' ? iso(v) : (v || ''));
      el.addEventListener('input', function () {
        set(path, f[3] === 'money' ? (el.value.trim() ? toInt(el.value) : '') : el.value);
        save(); refresh();
      });
      if (f[3] === 'money') el.addEventListener('blur', function () { if (el.value.trim()) el.value = comma(el.value); });
      wrap.appendChild(lab); wrap.appendChild(el); box.appendChild(wrap);
    });
  }

  /* ---------------------------------------------------------------- 과제 표 */

  function input(value, onInput, cls, area) {
    var el = document.createElement(area ? 'textarea' : 'input');
    if (!area) el.type = 'text';
    if (cls) el.className = cls;
    el.value = value == null ? '' : value;
    el.addEventListener('input', function () { onInput(el.value); save(); refresh(); });
    return el;
  }
  function renderTasks() {
    var tb = $('taskTable').tBodies[0];
    tb.innerHTML = '';
    state.과제목록.forEach(function (t, i) {
      var tr = tb.insertRow();
      [['id', 'w-s'], ['이름'], ['내용', '', 1], ['지표'], ['목표', 'w-s'], ['실적', 'w-s'], ['단위', 'w-s']].forEach(function (c) {
        tr.insertCell().appendChild(input(t[c[0]], function (v) { t[c[0]] = v; if (c[0] === 'id') renderEv(); }, c[1], c[2]));
      });
      var del = document.createElement('button');
      del.type = 'button'; del.className = 'btn btn-ghost btn-icon'; del.textContent = '×';
      del.setAttribute('aria-label', (t.이름 || t.id) + ' 과제 삭제');
      del.addEventListener('click', function () { state.과제목록.splice(i, 1); save(); renderTasks(); refresh(); });
      tr.insertCell().appendChild(del);
    });
  }

  /* ---------------------------------------------------------------- 증빙 자료 */

  function filesOf(eid) { return state.files.filter(function (f) { return f.eid === eid; }); }
  function isImg(f) { return /^image\//.test(f.type); }
  function nextEvId() {
    var n = state.증빙목록.reduce(function (m, e) { var k = parseInt(String(e.id).replace(/\D/g, ''), 10); return isNaN(k) ? m : Math.max(m, k); }, 0);
    return 'E' + String(n + 1).padStart(2, '0');
  }

  async function addFiles(eid, list) {
    for (var i = 0; i < list.length; i++) {
      var file = list[i];
      var rec = { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), eid: eid, name: file.name,
                  type: file.type || 'application/octet-stream', date: null };
      if (/jpe?g$/i.test(file.name) || file.type === 'image/jpeg') rec.date = M.exifDate(await file.slice(0, 256 * 1024).arrayBuffer());
      if (/\.hei[cf]$/i.test(file.name)) { setStatus('evStatus', file.name + ': HEIC 사진은 브라우저가 열지 못합니다. 휴대폰에서 JPG로 보내거나 변환해 넣으세요.', true); continue; }
      blobs[rec.id] = file;
      state.files.push(rec);
      M.store.put({ id: rec.id, blob: file });
    }
    save(); renderEv(); refresh();
  }

  function thumb(f) {
    var box = document.createElement('div');
    box.className = 'g-thumb';
    if (isImg(f) && blobs[f.id]) {
      var img = document.createElement('img');
      img.alt = f.name; img.loading = 'lazy';
      img.src = URL.createObjectURL(blobs[f.id]);
      box.appendChild(img);
    } else {
      var d = document.createElement('div'); d.className = 'doc'; d.textContent = (f.name.split('.').pop() || 'FILE').toUpperCase(); box.appendChild(d);
    }
    var cap = document.createElement('div');
    var out = isImg(f) && f.date && !inPeriod(f.date);
    cap.className = 'cap' + (out ? ' warn' : '');
    cap.textContent = isImg(f) ? (f.date ? dotDate(f.date) + (out ? ' (기간 밖)' : '') : '촬영일 없음') : f.name;
    cap.title = f.name;
    box.appendChild(cap);
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'btn btn-sm'; del.textContent = '×';
    del.setAttribute('aria-label', f.name + ' 빼기');
    del.addEventListener('click', function () {
      state.files = state.files.filter(function (x) { return x.id !== f.id; });
      delete blobs[f.id]; M.store.del(f.id); save(); renderEv(); refresh();
    });
    box.appendChild(del);
    return box;
  }
  function inPeriod(d) {
    var s = iso(get('사업.사업기간.시작')), e = iso(get('사업.사업기간.종료'));
    return !s || !e || (d >= s && d <= e);
  }

  function renderEv() {
    var box = $('evList');
    box.innerHTML = '';
    var tasks = state.과제목록.map(function (t) { return t.id; }).filter(Boolean);
    state.증빙목록.forEach(function (e, i) {
      var fs = filesOf(e.id);
      var card = document.createElement('div');
      card.className = 'g-ev ' + (fs.length ? 'done' : (e.필수 !== false ? 'todo' : ''));
      var head = document.createElement('div'); head.className = 'g-ev-head';
      var idb = document.createElement('span'); idb.className = 'g-ev-id'; idb.textContent = e.id; head.appendChild(idb);
      var name = input(e.항목, function (v) { e.항목 = v; }, 'grow');
      name.placeholder = '자료 이름 (예: 센서 설치 사진)'; name.setAttribute('aria-label', e.id + ' 자료 이름');
      head.appendChild(name);
      var chip = document.createElement('span');
      chip.className = 'chip ' + (fs.length ? 'chip-ok' : (e.필수 !== false ? 'chip-bad' : 'chip-warn'));
      chip.textContent = fs.length ? '받음 ' + fs.length : (e.필수 !== false ? '필수 · 미제출' : '선택');
      head.appendChild(chip);
      var del = document.createElement('button');
      del.type = 'button'; del.className = 'btn btn-ghost btn-icon'; del.textContent = '×';
      del.setAttribute('aria-label', e.id + ' 자료 삭제');
      del.addEventListener('click', function () {
        fs.forEach(function (f) { delete blobs[f.id]; M.store.del(f.id); });
        state.files = state.files.filter(function (f) { return f.eid !== e.id; });
        state.증빙목록.splice(i, 1); save(); renderEv(); refresh();
      });
      head.appendChild(del);
      card.appendChild(head);

      var g = document.createElement('div'); g.className = 'grid';
      function fld(label, el) { var w = document.createElement('div'); w.className = 'field'; var l = document.createElement('label'); l.textContent = label; w.appendChild(l); w.appendChild(el); g.appendChild(w); }
      var sel = document.createElement('select');
      [''].concat(tasks).forEach(function (t) { var o = document.createElement('option'); o.value = t; o.textContent = t || '(공통)'; sel.appendChild(o); });
      sel.value = e.관련과제 || '';
      sel.addEventListener('change', function () { e.관련과제 = sel.value; save(); refresh(); });
      fld('관련 과제', sel);
      var kind = document.createElement('select');
      ['사진', '화면 캡처', '영상', '문서', '데이터'].forEach(function (k) { var o = document.createElement('option'); o.textContent = k; kind.appendChild(o); });
      kind.value = e.종류 || '사진';
      kind.addEventListener('change', function () { e.종류 = kind.value; save(); });
      fld('종류', kind);
      fld('담당', input(e.담당, function (v) { e.담당 = v; }));
      var due = document.createElement('input'); due.type = 'date'; due.value = iso(e.마감);
      due.addEventListener('input', function () { e.마감 = due.value; save(); });
      fld('마감', due);
      var req = document.createElement('label'); req.className = 'check';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = e.필수 !== false;
      cb.addEventListener('change', function () { e.필수 = cb.checked; save(); renderEv(); refresh(); });
      req.appendChild(cb); req.appendChild(document.createTextNode(' 필수'));
      var rw = document.createElement('div'); rw.className = 'field'; rw.appendChild(document.createElement('label')); rw.appendChild(req); g.appendChild(rw);
      card.appendChild(g);

      var how = input(e.설명, function (v) { e.설명 = v; }, '', true);
      how.placeholder = '요청 내용: 무엇을 어떻게 찍을지/받을지 (예: 라인별 설치 위치와 명판이 보이게, 원본 사진 파일로)';
      how.setAttribute('aria-label', e.id + ' 요청 내용');
      card.appendChild(how);

      var th = document.createElement('div'); th.className = 'g-thumbs';
      fs.forEach(function (f) { th.appendChild(thumb(f)); });
      if (fs.length) card.appendChild(th);

      var drop = document.createElement('div'); drop.className = 'drop';
      var fid = 'ev-file-' + i;
      drop.innerHTML = '<label for="' + fid + '"><b>파일 선택</b> 또는 사진·파일을 여기로 끌어다 놓기</label>';
      var fin = document.createElement('input'); fin.type = 'file'; fin.id = fid; fin.multiple = true;
      fin.addEventListener('change', function () { addFiles(e.id, Array.from(fin.files)); });
      drop.appendChild(fin);
      wireDrop(drop, function (files) { addFiles(e.id, files); });
      card.appendChild(drop);
      box.appendChild(card);
    });
    if (!state.증빙목록.length) {
      var p = document.createElement('p'); p.className = 'help';
      p.textContent = '아직 요청자료가 없습니다. "자료 추가" 또는 "과제별 사진 항목 자동 추가"로 시작하세요.';
      box.appendChild(p);
    }
  }

  function wireDrop(el, onFiles) {
    ['dragenter', 'dragover'].forEach(function (t) { el.addEventListener(t, function (ev) { ev.preventDefault(); el.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { el.addEventListener(t, function () { el.classList.remove('over'); }); });
    el.addEventListener('drop', function (ev) { ev.preventDefault(); if (ev.dataTransfer.files.length) onFiles(Array.from(ev.dataTransfer.files)); });
  }

  /* ---------------------------------------------------------------- 기관 양식 */

  var VALUES = [
    ['사업명', function () { return get('사업.사업명'); }, /사업명|지원사업명/],
    ['과제명', function () { return get('사업.과제명'); }, /과제명|세부과제|과제/],
    ['주관기관', function () { return get('사업.주관기관'); }, /주관기관|전담기관|수행기관|기관명/],
    ['협약번호', function () { return get('사업.협약번호'); }, /협약번호|과제번호|관리번호/],
    ['사업기간', period, /사업기간|협약기간|수행기간|과제기간/],
    ['총사업비', function () { return comma(get('사업.사업비.총사업비')) + '원'; }, /총사업비/],
    ['정부지원금', function () { return comma(get('사업.사업비.정부지원금')) + '원'; }, /정부지원금|지원금|보조금|국비|도비|시비/],
    ['자부담 현금', function () { return comma(get('사업.사업비.자부담_현금')) + '원'; }, /자부담.*현금|현금/],
    ['자부담 현물', function () { return comma(get('사업.사업비.자부담_현물')) + '원'; }, /자부담.*현물|현물/],
    ['기업명', function () { return get('기업.기업명'); }, /기업명|업체명|회사명|상호|법인명|신청기업|수행기업|청구인|신청인/],
    ['대표자', function () { return get('기업.대표자'); }, /대표자|대표이사|대표/],
    ['사업자등록번호', function () { return get('기업.사업자등록번호'); }, /사업자(등록)?번호|등록번호/],
    ['주소', function () { return get('기업.주소'); }, /주소|소재지/],
    ['담당자', function () { return get('기업.담당자'); }, /담당자|실무자|작성자/],
    ['연락처', function () { return get('기업.연락처'); }, /연락처|전화|휴대폰|핸드폰/],
    ['청구금액 (숫자)', function () { return comma(get('청구.청구금액')) + '원'; }, null],
    ['청구금액 (금 …원정)', function () { var n = toInt(get('청구.청구금액')); return '금 ' + hangul(n) + '원정 (₩' + n.toLocaleString('ko-KR') + ')'; }, /청구금액|신청금액|청구액|금액/],
    ['청구일 (2026년 1월 1일)', function () { return korDate(get('청구.청구일')); }, /청구일|작성일|신청일|일자|날짜/],
    ['청구일 (2026. 1. 1.)', function () { return dotDate(get('청구.청구일')); }, null],
    ['은행', function () { return get('청구.계좌.은행'); }, /은행|금융기관/],
    ['계좌번호', function () { return get('청구.계좌.계좌번호'); }, /계좌번호/],
    ['예금주', function () { return get('청구.계좌.예금주'); }, /예금주/],
    ['입금계좌 (은행 계좌번호 / 예금주)', function () { return [get('청구.계좌.은행'), get('청구.계좌.계좌번호')].join(' ').trim() + '\n예금주: ' + get('청구.계좌.예금주'); }, /입금계좌|지급계좌|계좌/],
  ];
  function guess(label) {
    var k = D.norm(label);
    for (var i = 0; i < VALUES.length; i++) if (VALUES[i][2] && VALUES[i][2].test(k)) return String(i);
    return '';
  }
  function valueOf(key, form, idx) {
    if (key === '__text') return (form.text[idx] || '');
    var v = VALUES[+key];
    return v ? String(v[1]() || '') : '';
  }

  async function addForms(list) {
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!/\.docx$/i.test(f.name)) { setStatus('makeStatus', f.name + ': 워드(.docx)만 넣을 수 있습니다. 한글 양식은 한글에서 워드로 저장해 넣으세요.', true); continue; }
      try {
        var bytes = new Uint8Array(await f.arrayBuffer());
        var form = await D.openForm(new Blob([bytes]));
        var sc = D.scanForm(form);
        var item = { name: f.name, bytes: bytes, scan: sc, map: {}, text: {}, dates: {} };
        sc.blanks.forEach(function (b, k) { item.map[k] = guess(b.label); });
        sc.dates.forEach(function (d) { item.dates[d] = '17'; });   // 청구일 (2026년 1월 1일)
        forms.push(item);
      } catch (e) {
        setStatus('makeStatus', f.name + ': 열지 못했습니다 (' + e.message + ')', true);
      }
    }
    renderForms(); refresh();
  }

  function valueSelect(cur, onChange, allowText) {
    var s = document.createElement('select');
    var o = document.createElement('option'); o.value = ''; o.textContent = '(비움)'; s.appendChild(o);
    VALUES.forEach(function (v, i) { var x = document.createElement('option'); x.value = String(i); x.textContent = v[0]; s.appendChild(x); });
    if (allowText) { var t = document.createElement('option'); t.value = '__text'; t.textContent = '직접 입력'; s.appendChild(t); }
    s.value = cur || '';
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  function renderForms() {
    var box = $('formList');
    box.innerHTML = '';
    forms.forEach(function (form, fi) {
      var card = document.createElement('div'); card.className = 'g-form';
      var head = document.createElement('div'); head.className = 'g-form-head';
      var b = document.createElement('b'); b.textContent = form.name; head.appendChild(b);
      var n = form.scan.blanks.length;
      var chip = document.createElement('span'); chip.className = 'chip ' + (n ? 'chip-ok' : 'chip-warn');
      chip.textContent = n ? '빈칸 ' + n + '곳' : '빈칸을 찾지 못함'; head.appendChild(chip);
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost btn-sm'; del.textContent = '빼기';
      del.addEventListener('click', function () { forms.splice(fi, 1); renderForms(); refresh(); });
      head.appendChild(del);
      card.appendChild(head);
      if (!n) {
        var p = document.createElement('p'); p.className = 'help';
        p.textContent = '표 안의 "라벨 | 빈칸" 구조를 찾지 못했습니다. 양식이 글상자·그림으로 되어 있으면 워드에서 직접 채워야 합니다.';
        card.appendChild(p);
      }
      if (n || form.scan.dates.length) {
        var wrap = document.createElement('div'); wrap.className = 'table-wrap';
        var t = document.createElement('table'); t.className = 'tbl';
        t.innerHTML = '<thead><tr><th>양식 칸</th><th>넣을 값</th><th>들어갈 내용</th></tr></thead><tbody></tbody>';
        var tb = t.tBodies[0];
        form.scan.blanks.forEach(function (bk, k) {
          var tr = tb.insertRow();
          tr.insertCell().textContent = bk.label + (bk.nth > 1 ? ' (' + bk.nth + ')' : '') + (bk.dir === 'down' ? ' ↓' : ' →');
          var pick = tr.insertCell(), pv = tr.insertCell();
          var txt = input(form.text[k], function (v) { form.text[k] = v; show(); });
          txt.hidden = form.map[k] !== '__text';
          txt.setAttribute('aria-label', bk.label + ' 직접 입력');
          var sel = valueSelect(form.map[k], function (v) { form.map[k] = v; txt.hidden = v !== '__text'; show(); refresh(); }, true);
          sel.setAttribute('aria-label', bk.label + ' 넣을 값');
          pick.appendChild(sel); pick.appendChild(txt);
          function show() {
            var v = form.map[k] ? valueOf(form.map[k], form, k) : '';
            pv.textContent = v || '—';
            pv.className = v.indexOf(CHECK) >= 0 ? 'missing' : '';
          }
          show();
        });
        form.scan.dates.forEach(function (d) {
          var tr = tb.insertRow();
          tr.insertCell().textContent = '날짜 빈칸 "' + d.trim().replace(/\s+/g, ' ') + '"';
          var pick = tr.insertCell(), pv = tr.insertCell();
          var sel = valueSelect(form.dates[d], function (v) { form.dates[d] = v; pv.textContent = v ? valueOf(v) : '—'; });
          sel.setAttribute('aria-label', '날짜 빈칸 넣을 값');
          pick.appendChild(sel);
          pv.textContent = form.dates[d] ? valueOf(form.dates[d]) : '—';
        });
        wrap.appendChild(t); card.appendChild(wrap);
      }
      box.appendChild(card);
    });
  }

  /* ---------------------------------------------------------------- 점검 */

  function checks() {
    var out = [];
    var text = JSON.stringify({ 사업: state.사업, 기업: state.기업, 청구: state.청구, 과제목록: state.과제목록 });
    var n = (text.match(/【확인필요/g) || []).length;
    if (n) out.push(['bad', '<b>확인 안 된 값 ' + n + '곳</b> — 【확인필요】를 실제 값으로 바꾸세요']);
    [['사업.사업명', '사업명'], ['사업.과제명', '과제명'], ['기업.기업명', '기업명'], ['기업.대표자', '대표자'], ['청구.청구일', '청구일'], ['청구.청구금액', '청구금액']].forEach(function (f) {
      if (!String(get(f[0]) || '').trim()) out.push(['bad', '<b>' + f[1] + '</b>이(가) 비어 있습니다']);
    });
    var m = state.사업.사업비, parts = toInt(m.정부지원금) + toInt(m.자부담_현금) + toInt(m.자부담_현물), total = toInt(m.총사업비);
    if (total && parts !== total) out.push(['bad', '<b>사업비 합계 불일치</b>: 정부지원금+자부담 ' + parts.toLocaleString() + '원 ≠ 총사업비 ' + total.toLocaleString() + '원']);
    var claim = toInt(get('청구.청구금액')), gov = toInt(m.정부지원금);
    if (claim && gov && claim > gov) out.push(['bad', '<b>청구금액</b> ' + claim.toLocaleString() + '원이 정부지원금 ' + gov.toLocaleString() + '원보다 큽니다']);
    state.증빙목록.forEach(function (e) {
      var fs = filesOf(e.id);
      if (e.필수 !== false && !fs.length) out.push(['bad', '<b>' + e.id + ' ' + (e.항목 || '') + '</b> 미제출' + (e.담당 ? ' (' + e.담당 + ')' : '')]);
      fs.forEach(function (f) {
        if (!isImg(f)) return;
        if (f.date && !inPeriod(f.date)) out.push(['warn', e.id + ' <b>' + f.name + '</b>: 촬영일 ' + dotDate(f.date) + '이 사업기간 밖']);
        else if (!f.date) out.push(['off', e.id + ' ' + f.name + ': 촬영일 정보 없음 (원본 사진이면 보강 권장)']);
      });
    });
    state.과제목록.forEach(function (t) {
      if (t.지표 && !String(t.실적 || '').trim()) out.push(['warn', '<b>' + (t.id || '') + ' ' + (t.지표 || '') + '</b> 실적 미입력']);
    });
    if (!String(get('문장.추진목적') || '').trim()) out.push(['warn', '결과보고서 <b>추진 목적</b> 문장이 비어 있습니다 (01 탭 4단계)']);
    forms.forEach(function (f) {
      var empty = f.scan.blanks.filter(function (b, k) { return !f.map[k]; }).length;
      if (empty) out.push(['off', f.name + ': 값을 고르지 않은 칸 ' + empty + '곳은 비워 둡니다']);
    });
    if (!out.length) out.push(['ok', '<b>점검 통과</b> — 빠진 자료와 확인 안 된 값이 없습니다']);
    return out;
  }
  function renderChecks() {
    var ul = $('checkList');
    ul.innerHTML = '';
    var ic = { bad: '!', warn: '!', off: 'i', ok: '✓' };
    checks().forEach(function (c) {
      var li = document.createElement('li');
      li.className = c[0] === 'bad' ? 'warn' : c[0];
      li.innerHTML = '<span class="ic">' + ic[c[0]] + '</span><span class="txt">' + c[1] + '</span>';
      ul.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------- 만들 파일 */

  var DOCS = [['report', '결과보고서 (워드)'], ['photos', '증빙 사진대지 (워드)'], ['checklist', '요청자료 체크리스트 (엑셀)']];
  var docOn = { report: true, photos: true, checklist: true };
  function renderDocChecks() {
    var box = $('docChecks');
    box.innerHTML = '';
    DOCS.forEach(function (d) {
      var l = document.createElement('label'); l.className = 'check';
      var c = document.createElement('input'); c.type = 'checkbox'; c.checked = docOn[d[0]];
      c.addEventListener('change', function () { docOn[d[0]] = c.checked; refresh(); });
      l.appendChild(c); l.appendChild(document.createTextNode(' ' + d[1])); box.appendChild(l);
    });
  }
  function safe(s) { return String(s || '').replace(/[\\/:*?"<>|\n]+/g, ' ').trim().slice(0, 60) || '지원사업'; }
  function outputs() {
    var list = [];
    if (docOn.report) list.push('01_결과보고서.docx');
    if (docOn.photos) list.push('02_증빙_사진대지.docx');
    if (docOn.checklist) list.push('03_요청자료_체크리스트.xlsx');
    forms.forEach(function (f, i) { list.push('양식/' + String(i + 1).padStart(2, '0') + '_' + f.name.replace(/\.docx$/i, '') + '_작성.docx'); });
    if (state.files.length) list.push('증빙/ (' + state.files.length + '개 파일)');
    list.push(safe(get('사업.사업명')) + '.json');
    return list;
  }
  function renderOut() {
    var ul = $('outList'), list = outputs();
    ul.innerHTML = '';
    list.forEach(function (n) { var li = document.createElement('li'); li.innerHTML = '<span class="mono"></span>'; li.firstChild.textContent = n; ul.appendChild(li); });
    $('outCount').textContent = list.length;
  }

  function refresh() {
    var done = state.증빙목록.filter(function (e) { return filesOf(e.id).length; }).length;
    $('evDone').textContent = done;
    $('evAll').textContent = state.증빙목록.length;
    var sum = $('evSummary');
    sum.innerHTML = '';
    state.증빙목록.forEach(function (e) {
      var r = document.createElement('div'); r.className = 'row';
      var a = document.createElement('span'); a.textContent = e.id + ' ' + (e.항목 || '');
      var b = document.createElement('span'); var n = filesOf(e.id).length;
      b.className = 'chip ' + (n ? 'chip-ok' : (e.필수 !== false ? 'chip-bad' : 'chip-warn'));
      b.textContent = n ? n + '개' : '없음';
      r.appendChild(a); r.appendChild(b); sum.appendChild(r);
    });
    renderChecks(); renderOut();
  }

  /* ---------------------------------------------------------------- 문서 만들기 */

  async function photoEntries(eids, withDate) {
    var out = [];
    for (var i = 0; i < eids.length; i++) {
      var e = state.증빙목록.filter(function (x) { return x.id === eids[i]; })[0];
      var imgs = filesOf(eids[i]).filter(isImg).filter(function (f) { return blobs[f.id]; });
      for (var k = 0; k < imgs.length; k++) {
        var p = await M.prepare(blobs[imgs[k].id]);
        var cap = (e.id + ' ' + (e.항목 || '')).trim() + (imgs.length > 1 ? ' (' + (k + 1) + ')' : '');
        if (withDate) cap += '\n촬영일: ' + (imgs[k].date ? dotDate(imgs[k].date) : '촬영일 정보 없음');
        out.push({ bytes: p.bytes, w: p.w, h: p.h, caption: cap });
      }
    }
    return out;
  }

  async function buildReport() {
    var s = state, title = (s.사업.과제명 || s.사업.사업명 || '') + ' 결과보고서';
    var d = new D.Doc(title.trim());
    d.cover({
      title: s.사업.과제명 || s.사업.사업명,
      subtitles: ['결과보고서', s.사업.사업명],
      items: [['사업명', s.사업.사업명], ['주관기관', s.사업.주관기관], ['협약번호', s.사업.협약번호], ['수행기업', s.기업.기업명], ['사업기간', period()]]
        .filter(function (r) { return String(r[1] || '').trim(); }),
      sign: s.결재,
      date: korDate(s.청구.청구일),
    });
    d.heading('1. 사업 개요', 1);
    d.heading('가. 추진 목적', 2);
    if ((s.문장.추진목적 || '').trim()) d.para(s.문장.추진목적); else d.note('【작성필요】 추진 목적');
    d.heading('나. 사업비', 2);
    var m = s.사업.사업비;
    d.table({ head: ['구분', '정부지원금', '자부담(현금)', '자부담(현물)', '합계'],
      rows: [['금액(원)', toInt(m.정부지원금), toInt(m.자부담_현금), toInt(m.자부담_현물), toInt(m.총사업비) || (toInt(m.정부지원금) + toInt(m.자부담_현금) + toInt(m.자부담_현물))]],
      widths: [30, 35, 35, 35, 35], note: '※ 협약서 기준 (단위: 원)' });

    d.heading('2. 추진 내용 및 결과', 1);
    var seen = {};
    for (var i = 0; i < s.과제목록.length; i++) {
      var t = s.과제목록[i];
      if (seen[t.id]) continue;
      seen[t.id] = true;
      d.heading(((t.id || '') + '. ' + (t.이름 || '')).replace(/^\. /, ''), 2);
      var lines = String(t.내용 || '').split('\n').map(function (x) { return x.replace(/^[-•·\s]+/, '').trim(); }).filter(Boolean);
      if (lines.length) d.bullets(lines); else d.note('【작성필요】 추진 내용');
      var evs = s.증빙목록.filter(function (e) { return e.관련과제 && e.관련과제 === t.id; }).map(function (e) { return e.id; });
      d.photos(await photoEntries(evs, false), 2);
    }

    d.heading('3. 성과지표 달성 현황', 1);
    var rows = s.과제목록.filter(function (t) { return t.지표; }).map(function (t) {
      var ev = s.증빙목록.filter(function (e) { return e.관련과제 === t.id; }).map(function (e) { return e.id; }).join(', ');
      return [t.지표, (t.목표 || '') + (t.단위 ? ' ' + t.단위 : ''), t.실적 ? t.실적 + (t.단위 ? ' ' + t.단위 : '') : '【확인필요】', rate(t.목표, t.실적), ev];
    });
    if (rows.length) d.table({ head: ['성과지표', '목표', '실적', '달성률', '증빙'], rows: rows, widths: [48, 24, 24, 18, 36] });
    else d.note('【작성필요】 성과지표');

    d.heading('4. 기대효과 및 향후 계획', 1);
    d.heading('가. 기대효과', 2);
    if ((s.문장.기대효과 || '').trim()) d.para(s.문장.기대효과); else d.note('【작성필요】 기대효과');
    d.heading('나. 향후 계획', 2);
    if ((s.문장.향후계획 || '').trim()) d.para(s.문장.향후계획); else d.note('【작성필요】 향후 계획');

    var all = await photoEntries(s.증빙목록.map(function (e) { return e.id; }), true);
    if (all.length) { d.pageBreak(); d.heading('[별첨] 증빙 사진대지', 1); d.photos(all, 2); }
    return d.toBlob();
  }

  async function buildPhotoSheet() {
    var d = new D.Doc('증빙 사진대지');
    d.heading('증빙 사진대지', 1);
    d.table({ head: ['사업명', '기업명', '사업기간'], rows: [[state.사업.사업명, state.기업.기업명, period()]], widths: [70, 50, 50], center: true });
    var all = await photoEntries(state.증빙목록.map(function (e) { return e.id; }), true);
    if (all.length) d.photos(all, 2); else d.note('【사진 없음】 02 탭에서 증빙 사진을 넣으세요');
    return d.toBlob();
  }

  async function buildChecklist() {
    var wb = new ExcelJS.Workbook();
    var ws = wb.addWorksheet('요청자료', { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    ws.headerFooter.oddFooter = '&C&9동인엔시스 | &A | 페이지 &P / 전체 &N';
    var font = { name: '맑은 고딕', size: 10, color: { argb: 'FF263445' } };
    var line = { style: 'thin', color: { argb: 'FFD3DDE8' } }, box = { top: line, left: line, bottom: line, right: line };
    ws.mergeCells('A1:J1');
    ws.getCell('A1').value = '요청자료 체크리스트 — ' + (state.사업.사업명 || '');
    ws.getCell('A1').font = { name: '맑은 고딕', size: 14, bold: true, color: { argb: 'FF1857A5' } };
    var head = ['ID', '자료', '관련 과제', '종류', '구분', '요청 내용 (찍을 것·받을 것)', '담당', '마감', '상태', '받은 파일'];
    var widths = [7, 24, 22, 9, 7, 46, 10, 12, 9, 34];
    var hr = ws.getRow(3);
    head.forEach(function (h, j) {
      ws.getColumn(j + 1).width = widths[j];
      var c = hr.getCell(j + 1);
      c.value = h; c.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1857A5' } }; c.border = box;
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    var tname = {};
    state.과제목록.forEach(function (t) { tname[t.id] = t.이름; });
    state.증빙목록.forEach(function (e, i) {
      var fs = filesOf(e.id);
      var row = ws.getRow(4 + i);
      [e.id, e.항목, ((e.관련과제 || '') + ' ' + (tname[e.관련과제] || '')).trim(), e.종류 || '사진', e.필수 !== false ? '필수' : '선택', e.설명, e.담당, dotDate(e.마감),
        fs.length ? '제출' : '미제출', fs.map(function (f) { return f.name; }).join('\n')].forEach(function (v, j) {
        var c = row.getCell(j + 1);
        c.value = v || ''; c.font = font; c.border = box;
        c.alignment = { vertical: 'top', wrapText: true, horizontal: j === 0 || j === 8 ? 'center' : undefined };
        if (i % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F5FB' } };
      });
      row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fs.length ? 'FFE3F4EA' : 'FFFCE6E3' } };
    });
    ws.views = [{ state: 'frozen', ySplit: 3 }];
    var n = 4 + state.증빙목록.length + 1;
    ws.getCell('A' + n).value = '파일은 원본으로 보내 주세요(메신저 전송 시 촬영일 정보가 지워짐). 소프트웨어 결과물은 실제 실행 화면 캡처·시연 영상, 현장 설비는 실물 사진.';
    ws.getCell('A' + n).font = { name: '맑은 고딕', size: 9, color: { argb: 'FF5A6577' } };
    var buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async function buildForm(f) {
    var form = await D.openForm(new Blob([f.bytes]));
    var fills = [];
    f.scan.blanks.forEach(function (b, k) {
      if (!f.map[k]) return;
      fills.push({ table: b.table, row: b.row, col: b.col, dir: b.dir, label: b.label, value: valueOf(f.map[k], f, k) });
    });
    var reps = Object.keys(f.dates).filter(function (dk) { return f.dates[dk]; }).map(function (dk) { return { from: dk, to: (/^\s/.test(dk) ? ' ' : '') + valueOf(f.dates[dk]) }; });
    return D.fillForm(form, fills, reps);
  }

  function exportJson() {
    var o = JSON.parse(JSON.stringify(state));
    delete o.sample;
    o.files = state.files.map(function (f) { return { eid: f.eid, name: f.name, date: f.date }; });
    o._type = 'dongin-grant';
    return JSON.stringify(o, null, 1);
  }

  function setProgress(p) { $('progress').hidden = p == null; $('pbarI').style.width = Math.round((p || 0) * 100) + '%'; }
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  async function makeAll() {
    var btn = $('btnMake');
    btn.disabled = true; setStatus('makeStatus', '만드는 중…');
    try {
      var zip = new JSZip(), steps = 3 + forms.length + 1, k = 0, failed = [];
      var tick = function () { k++; setProgress(k / steps); };
      setProgress(0);
      if (docOn.report) zip.file('01_결과보고서.docx', await buildReport()); tick();
      if (docOn.photos) zip.file('02_증빙_사진대지.docx', await buildPhotoSheet()); tick();
      if (docOn.checklist) zip.file('03_요청자료_체크리스트.xlsx', await buildChecklist()); tick();
      for (var i = 0; i < forms.length; i++) {
        var r = await buildForm(forms[i]);
        zip.file('양식/' + String(i + 1).padStart(2, '0') + '_' + forms[i].name.replace(/\.docx$/i, '') + '_작성.docx', r.blob);
        r.failed.forEach(function (x) { failed.push(forms[i].name + ': ' + x); });
        tick();
      }
      var count = {};
      state.files.forEach(function (f) {
        if (!blobs[f.id]) return;
        var e = state.증빙목록.filter(function (x) { return x.id === f.eid; })[0] || { 항목: '' };
        count[f.eid] = (count[f.eid] || 0) + 1;
        var ext = (f.name.split('.').pop() || 'bin').toLowerCase();
        zip.file('증빙/' + f.eid + '_' + safe(e.항목).replace(/\s+/g, '_') + '_' + String(count[f.eid]).padStart(2, '0') + '.' + ext, blobs[f.id]);   // 원본 그대로(촬영 정보 유지)
      });
      zip.file(safe(get('사업.사업명')) + '.json', exportJson());
      tick();
      var blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      download(blob, safe(get('사업.사업명')) + '_제출서류.zip');
      setStatus('makeStatus', '묶음을 받았습니다.' + (failed.length ? ' 채우지 못한 곳: ' + failed.join(' / ') : ''), !!failed.length, !failed.length);
    } catch (e) {
      setStatus('makeStatus', '만들지 못했습니다: ' + e.message, true);
      console.error(e);
    } finally {
      btn.disabled = false; setProgress(null);
    }
  }

  function setStatus(id, msg, bad, ok) { var el = $(id); el.textContent = msg; el.className = 'status' + (bad ? ' bad' : ok ? ' ok' : ''); }

  /* ---------------------------------------------------------------- 저장·불러오기 */

  function normalize(o) {
    var s = blank();
    ['사업', '기업', '청구', '문장', '결재'].forEach(function (k) { if (o[k]) s[k] = deepMerge(s[k], o[k]); });
    // Claude/파이썬 도구 형식: 과제마다 성과지표 배열 → 화면은 지표마다 한 줄
    s.과제목록 = [];
    (o.과제목록 || []).forEach(function (t) {
      var ks = t.성과지표 && t.성과지표.length ? t.성과지표 : [{ 지표: t.지표, 목표: t.목표, 단위: t.단위, 실적: t.실적 }];
      ks.forEach(function (k, i) {
        s.과제목록.push({ id: t.id || '', 이름: t.이름 || '', 내용: i ? '' : (t.내용 || t.목표설명 || ''), 지표: k.지표 || '', 목표: str(k.목표), 단위: k.단위 || '', 실적: str(k.실적) });
      });
    });
    s.증빙목록 = (o.증빙목록 || []).map(function (e) {
      return { id: e.id, 항목: e.항목 || '', 관련과제: e.관련과제 || '', 종류: e.종류 || '사진', 필수: e.필수 !== false, 담당: e.담당 || '', 마감: str(e.마감), 설명: e.설명 || '' };
    });
    return s;
  }
  function str(v) { return v == null ? '' : String(v); }
  function deepMerge(a, b) {
    var o = JSON.parse(JSON.stringify(a));
    Object.keys(b || {}).forEach(function (k) {
      o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? deepMerge(o[k] || {}, b[k]) : (b[k] == null ? '' : b[k]);
    });
    return o;
  }

  async function openFile(file) {
    try {
      if (/\.zip$/i.test(file.name)) {
        var zip = await JSZip.loadAsync(file);
        var jsonName = Object.keys(zip.files).filter(function (n) { return /\.json$/i.test(n) && !/\//.test(n); })[0];
        if (!jsonName) throw new Error('묶음 안에 사업 저장 파일(.json)이 없습니다');
        await loadState(JSON.parse(await zip.file(jsonName).async('string')));
        var names = Object.keys(zip.files).filter(function (n) { return /^증빙\//.test(n) && !zip.files[n].dir; });
        for (var i = 0; i < names.length; i++) {
          var base = names[i].split('/').pop(), eid = (/^(E\d+)/.exec(base) || [])[1];
          if (!eid) continue;
          var blob = await zip.file(names[i]).async('blob');
          var type = /\.(jpe?g)$/i.test(base) ? 'image/jpeg' : /\.png$/i.test(base) ? 'image/png' : '';
          await addFiles(eid, [new File([blob], base, { type: type })]);
        }
      } else {
        await loadState(JSON.parse(await file.text()));
      }
      setStatus('infoStatus', file.name + ' 을(를) 불러왔습니다.', false, true);
    } catch (e) {
      setStatus('infoStatus', '불러오지 못했습니다: ' + e.message, true);
    }
  }
  async function loadState(o) {
    state = normalize(o);
    blobs = {};
    await M.store.clear();
    save(); renderAll();
  }

  /* ---------------------------------------------------------------- 바탕화면 설치 (ISO 기록 도구와 같은 방식)
     크롬·엣지가 웹 앱 설치를 허락하면 설치 창을, 아니면 바탕화면 바로가기 파일(.url)과 방법을 보여 준다. */

  var TOOL_URL = 'https://donginensis.com/files/grant/grant-docs-builder.html';
  var installEvt = null;
  function standalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function hideInstall() { var b = $('btnInstall'); if (b) b.hidden = true; }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', function () { hideInstall(); installEvt = null; });
  function showInstallHelp() {
    var old = $('installHelp'); if (old) old.remove();
    var box = document.createElement('div');
    box.id = 'installHelp'; box.className = 'inst-overlay';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'instTitle');
    box.innerHTML = '<div class="inst-card"><h2 id="instTitle">바탕화면에서 바로 열기</h2>'
      + '<p class="inst-step">① 아래 버튼을 누릅니다.</p>'
      + '<button type="button" class="btn btn-primary inst-dl">바탕화면 바로가기 파일 받기</button>'
      + '<p class="inst-step">② 받은 「지원사업 서류 도구」 파일(다운로드 폴더)을 바탕화면으로 끌어다 놓습니다.</p>'
      + '<p class="inst-step">③ 바탕화면 아이콘을 더블클릭하면 도구가 열립니다.</p>'
      + '<p class="inst-or">또는 크롬·엣지에서 직접 설치</p>'
      + '<p class="inst-how">주소창 오른쪽 끝의 설치 아이콘(⊕) 또는 메뉴(⋮) → 「앱 설치」를 누르면 회사 「동」 아이콘으로 설치됩니다. 홈페이지 주소로 열었을 때만 됩니다.</p>'
      + '<button type="button" class="btn btn-ghost inst-close">닫기</button></div>';
    function close() { box.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    box.querySelector('.inst-close').addEventListener('click', close);
    box.querySelector('.inst-dl').addEventListener('click', function () {
      var txt = '[InternetShortcut]\r\nURL=' + TOOL_URL + '\r\nIconFile=https://donginensis.com/favicon.ico\r\nIconIndex=0\r\n';
      download(new Blob([txt], { type: 'application/octet-stream' }), '지원사업 서류 도구.url');
    });
    document.addEventListener('keydown', esc);
    document.body.appendChild(box);
    box.querySelector('.inst-dl').focus();
  }
  function wireInstall() {
    if (standalone()) { hideInstall(); return; }
    $('btnInstall').addEventListener('click', function () {
      if (installEvt) {
        installEvt.prompt();
        installEvt.userChoice.then(function (c) { installEvt = null; if (c && c.outcome === 'accepted') hideInstall(); });
        return;
      }
      showInstallHelp();
    });
  }

  /* ---------------------------------------------------------------- 탭·시작 */

  var VIEWS = ['info', 'ev', 'make'];
  function showView(v) {
    VIEWS.forEach(function (x) {
      var on = x === v, t = $('tab-' + x);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $('view-' + x).hidden = !on;
    });
    if (v === 'make') refresh();
  }
  function wireTabs() {
    var tabs = VIEWS.map(function (v) { return $('tab-' + v); });
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); showView(n.getAttribute('data-view'));
      });
    });
  }

  function renderAll() {
    Object.keys(FIELDS).forEach(renderFields);
    renderTasks(); renderEv(); renderDocChecks(); renderForms(); refresh();
    $('sampleBar').hidden = !state.sample;
  }

  function wire() {
    wireTabs();
    wireInstall();
    $('btnAddTask').addEventListener('click', function () {
      state.과제목록.push({ id: 'T' + (state.과제목록.length + 1), 이름: '', 내용: '', 지표: '', 목표: '', 실적: '', 단위: '' });
      save(); renderTasks(); renderEv(); refresh();
    });
    $('btnAddEv').addEventListener('click', function () {
      state.증빙목록.push({ id: nextEvId(), 항목: '', 관련과제: '', 종류: '사진', 필수: true, 담당: '', 마감: '', 설명: '' });
      save(); renderEv(); refresh();
    });
    $('btnEvFromTasks').addEventListener('click', function () {
      var have = {};
      state.증빙목록.forEach(function (e) { if (e.관련과제) have[e.관련과제] = true; });
      state.과제목록.forEach(function (t) {
        if (!t.id || have[t.id]) return;
        have[t.id] = true;
        state.증빙목록.push({ id: nextEvId(), 항목: (t.이름 || t.id) + ' 결과 사진', 관련과제: t.id, 종류: '사진', 필수: true, 담당: '', 마감: '',
          설명: '결과물이 실제로 보이게 촬영(소프트웨어는 실행 화면 캡처), 원본 파일로' });
      });
      save(); renderEv(); refresh();
    });
    $('btnChecklist').addEventListener('click', async function () {
      try { download(await buildChecklist(), '요청자료_체크리스트_' + safe(get('사업.사업명')) + '.xlsx'); setStatus('evStatus', '체크리스트를 받았습니다.', false, true); }
      catch (e) { setStatus('evStatus', '만들지 못했습니다: ' + e.message, true); }
    });
    $('btnSave').addEventListener('click', function () {
      download(new Blob([exportJson()], { type: 'application/json' }), safe(get('사업.사업명')) + '.json');
      setStatus('infoStatus', '저장 파일을 받았습니다. 사진은 들어 있지 않으니 사진까지 옮기려면 03 탭 묶음(zip)을 쓰세요.', false, true);
    });
    $('fileOpen').addEventListener('change', function (e) { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; });
    $('btnCopyPrompt').addEventListener('click', function () {
      var t = $('claudePrompt').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
        setStatus('infoStatus', '문장을 복사했습니다.', false, true);
      }, function () {
        var r = document.createRange(); r.selectNodeContents($('claudePrompt'));
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        setStatus('infoStatus', '문장을 선택했습니다. Ctrl+C 로 복사하세요.');
      });
    });
    $('btnCoSave').addEventListener('click', function () {
      try { localStorage.setItem(CO_KEY, JSON.stringify({ 기업: state.기업, 계좌: state.청구.계좌, 결재: state.결재 })); setStatus('infoStatus', '기업 정보·계좌·결재란을 기본값으로 저장했습니다.', false, true); }
      catch (e) { setStatus('infoStatus', '이 브라우저에 저장할 수 없습니다.', true); }
    });
    $('btnClear').addEventListener('click', async function () {
      state = blank();
      try {
        var co = JSON.parse(localStorage.getItem(CO_KEY) || 'null');
        if (co) { state.기업 = deepMerge(state.기업, co.기업); state.청구.계좌 = deepMerge(state.청구.계좌, co.계좌); state.결재 = deepMerge(state.결재, co.결재); }
      } catch (e) { /* 기본값 없음 */ }
      blobs = {}; forms = []; await M.store.clear(); save(); renderAll();
    });
    $('formFile').addEventListener('change', function (e) { var fs = Array.from(e.target.files); e.target.value = ''; addForms(fs); });
    wireDrop($('formDrop'), addForms);
    $('btnMake').addEventListener('click', makeAll);
  }

  async function start() {
    wire();
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    if (saved) {
      state = deepMerge(blank(), saved);
      var recs = await M.store.all();
      recs.forEach(function (r) { blobs[r.id] = r.blob; });
      state.files = state.files.filter(function (f) { return blobs[f.id]; });
    } else if (window.GrantSamples) {
      state = window.GrantSamples.project(blank);
      var files = await window.GrantSamples.photos();
      for (var i = 0; i < files.length; i++) await addFiles(files[i].eid, [files[i].file]);
    }
    renderAll();
  }

  window.GrantApp = { state: function () { return state; }, checks: checks, buildReport: buildReport, buildForm: buildForm,
                      addForms: addForms, forms: function () { return forms; }, makeAll: makeAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
