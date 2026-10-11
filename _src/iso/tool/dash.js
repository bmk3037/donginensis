/* 기록 현황판: 공용 저장소의 프로젝트 폴더들을 고르면 각 프로젝트의 00_기록현황(상태)·QF-04(판넬 LOT 출하)·
   00_프로젝트정보(입력 내용)를 읽어 진행 단계와 남은 기록을 한 화면에 보여 준다. 파일은 이 화면 안에서만 읽는다. */
(function () {
  'use strict';
  var A, el, $;
  var STAGES = ['1 수주', '2 설계', '3 구매·입고', '4 제작', '5 FAT·출하', '6 SAT·인수', '7 PLC'];
  var DONE = ['승인', '해당없음', '완료'];   // 완료: 이전 묶음의 상태 값
  var STARTED = ['작성중', '검토대기', '불합격', '보류'];

  var data = { projects: [], sample: false, mode: '', note: '' };
  var view = { owner: '', q: '', open: {} };

  function cl(v) { return A.P.clean(v); }
  function isEx(v) { return /^예\)/.test(cl(v)); }
  function val(v) { v = cl(v); return isEx(v) ? '' : v; }

  // ---------------------------------------------------------------- 파일 모으기
  function fromInput(files) {
    return Array.prototype.map.call(files, function (f) { return { file: f, path: f.webkitRelativePath || f.name }; });
  }
  function readEntries(entry, prefix) {
    return new Promise(function (resolve) {
      if (entry.isFile) {
        entry.file(function (f) { resolve([{ file: f, path: prefix + f.name }]); }, function () { resolve([]); });
        return;
      }
      var reader = entry.createReader(), all = [];
      (function more() {
        reader.readEntries(function (ents) {
          if (!ents.length) {
            Promise.all(all.map(function (e) { return readEntries(e, prefix + entry.name + '/'); })).then(function (lists) {
              resolve([].concat.apply([], lists));
            });
            return;
          }
          all = all.concat(Array.prototype.slice.call(ents));
          more();
        }, function () { resolve([]); });
      })();
    });
  }
  function fromDrop(dt) {
    var items = Array.prototype.slice.call(dt.items || []).filter(function (it) { return it.kind === 'file'; });
    var entries = items.map(function (it) { return it.webkitGetAsEntry ? it.webkitGetAsEntry() : null; });
    if (entries.some(Boolean)) {
      return Promise.all(entries.filter(Boolean).map(function (e) { return readEntries(e, ''); })).then(function (l) { return [].concat.apply([], l); });
    }
    return Promise.resolve(fromInput(dt.files));
  }

  // ---------------------------------------------------------------- 읽기
  function dir(path) { var i = path.lastIndexOf('/'); return i < 0 ? '' : path.slice(0, i); }
  function base(path) { return path.slice(path.lastIndexOf('/') + 1); }

  function fieldVal(rows, upto, label) {
    for (var r = 0; r < upto; r++) {
      var row = rows[r] || [], i = row.map(cl).indexOf(label);
      if (i < 0) continue;
      for (var c = i + 1; c < row.length; c++) if (cl(row[c])) return cl(row[c]);
      return '';
    }
    return '';
  }
  function headerAt(rows, must) {
    for (var r = 0; r < rows.length; r++) {
      var row = (rows[r] || []).map(cl);
      if (must.every(function (m) { return row.indexOf(m) >= 0; })) return r;
    }
    return -1;
  }

  function parseIndex(rows) {
    var h = headerAt(rows, ['양식', '상태']);
    if (h < 0) throw new Error('기록현황 표를 찾지 못했습니다');
    var head = rows[h].map(cl), col = {};
    ['단계', '양식', '문서', '판넬', '파일 위치', '담당', '상태', '완료일', '확인일', '확인자'].forEach(function (k) { col[k] = head.indexOf(k); });
    var recs = [];
    for (var r = h + 1; r < rows.length; r++) {
      var row = rows[r] || [], g = function (k) { return col[k] < 0 ? '' : cl(row[col[k]]); };
      if (!/^\d\s/.test(g('단계'))) continue;
      recs.push({ stage: g('단계'), code: g('양식'), doc: g('문서'), panel: g('판넬'), loc: g('파일 위치'), owner: g('담당'),
        status: g('상태') || '미작성', done: g('확인일') || g('완료일'), by: g('확인자'), exists: null });
    }
    return {
      pj: fieldVal(rows, h, '프로젝트 번호'), customer: fieldVal(rows, h, '고객'), name: fieldVal(rows, h, '프로젝트명·현장'),
      panelsText: fieldVal(rows, h, '판넬'), po: fieldVal(rows, h, '계약·PO 번호'), due: fieldVal(rows, h, '납기'),
      lots: fieldVal(rows, h, '판넬 LOT (제조번호)'), staff: fieldVal(rows, h, '담당 (설계 / 생산 / 품질 / 시험)'),
      created: fieldVal(rows, h, '생성일'), records: recs
    };
  }

  function parseQf04(rows) {
    var h = headerAt(rows, ['판넬 LOT (제조번호)']);
    if (h < 0) return [];
    var head = rows[h].map(cl), c = function (k) { return head.indexOf(k); };
    var out = [];
    for (var r = h + 1; r < rows.length; r++) {
      var row = rows[r] || [], g = function (k) { var i = c(k); return i < 0 ? '' : val(row[i]); };
      var lot = g('판넬 LOT (제조번호)'), tg = g('도면 Tag·설명');
      if (!lot && !tg) continue;
      if (/^첨부/.test(cl(row[0]))) break;
      out.push({ lot: lot, tag: tg, wire: g('배선 확인일'), fat: g('FAT 판정·일자'), ship: g('출하 승인·일자'), sat: g('SAT·인수일'), as: g('변경·AS 이력') });
    }
    return out;
  }

  function loadFiles(list) {
    list = list.filter(function (x) { return !/(^|\/)~\$/.test(x.path) && !/(^|\/)\./.test(base(x.path)); });
    var paths = {};
    list.forEach(function (x) { paths[x.path] = x; });
    var folderMode = list.some(function (x) { return x.path.indexOf('/') >= 0; });
    var idx = list.filter(function (x) { return /^00_기록현황_.*\.xlsx$/i.test(base(x.path)); });
    if (!idx.length) return Promise.reject(new Error('00_기록현황_*.xlsx 파일이 없습니다. 기록 묶음을 푼 프로젝트 폴더(또는 그 위 폴더)를 고르세요.'));
    return Promise.all(idx.map(function (x) {
      var root = dir(x.path);
      return A.readWorkbook(x.file).then(function (wb) {
        var name = wb.SheetNames.indexOf('기록현황') >= 0 ? '기록현황' : wb.SheetNames[0];
        var pr = parseIndex(A.sheetRows(wb, name));
        pr.root = root; pr.modified = x.file.lastModified || 0; pr.panels = [];
        var under = list.filter(function (y) { return root === '' || y.path.indexOf(root + '/') === 0; });
        if (folderMode) {
          pr.records.forEach(function (r) {
            if (!r.loc) return;
            var full = (root ? root + '/' : '') + r.loc;
            r.exists = /\/$/.test(r.loc) ? under.some(function (y) { return y.path.indexOf(full) === 0; }) : !!paths[full];
          });
        }
        var jobs = [];
        var q4 = under.filter(function (y) { return /_QF-04_.*\.xlsx$/i.test(base(y.path)); })[0];
        if (q4) jobs.push(A.readWorkbook(q4.file).then(function (w) { pr.panels = parseQf04(A.sheetRows(w, w.SheetNames[0])); }).catch(function () { /* 없는 셈 */ }));
        var js = under.filter(function (y) { return /^00_프로젝트정보_.*\.json$/i.test(base(y.path)); })[0];
        if (js) jobs.push(js.file.text().then(function (t) { pr.json = t; try { pr.info = JSON.parse(t).state.project; } catch (e) { pr.info = null; } }));
        pr.fatFiles = under.filter(function (y) { return /_FAT_.*_QF-06\.xlsx$/i.test(base(y.path)); }).length;
        return Promise.all(jobs).then(function () { return pr; });
      }).catch(function (e) { return { error: x.path + ': ' + e.message }; });
    })).then(function (prs) {
      var errors = prs.filter(function (x) { return x.error; }).map(function (x) { return x.error; });
      var byPj = {};
      prs.filter(function (x) { return !x.error; }).forEach(function (x) {
        var k = x.pj || x.root;
        if (!byPj[k] || byPj[k].modified < x.modified) { if (byPj[k]) x.older = (byPj[k].older || 0) + 1; byPj[k] = x; }
        else byPj[k].older = (byPj[k].older || 0) + 1;
      });
      data = { projects: Object.keys(byPj).map(function (k) { return summarize(byPj[k]); }), sample: false, mode: folderMode ? 'folder' : 'files',
        note: errors.length ? '읽지 못한 파일: ' + errors.join(' / ') : '' };
      return data;
    });
  }

  function summarize(pr) {
    var recs = pr.records.filter(function (r) { return STAGES.indexOf(r.stage) >= 0; });
    pr.total = recs.length;
    pr.doneN = recs.filter(function (r) { return DONE.indexOf(r.status) >= 0; }).length;
    pr.left = recs.filter(function (r) { return DONE.indexOf(r.status) < 0; });
    pr.missing = recs.filter(function (r) { return r.exists === false && DONE.indexOf(r.status) >= 0; }).length;
    pr.pct = pr.total ? Math.round(pr.doneN / pr.total * 100) : 0;
    pr.stages = STAGES.map(function (s) {
      var rs = recs.filter(function (r) { return r.stage === s; });
      var d = rs.filter(function (r) { return DONE.indexOf(r.status) >= 0; }).length;
      var started = rs.some(function (r) { return STARTED.indexOf(r.status) >= 0 || DONE.indexOf(r.status) >= 0; });
      return { name: s, n: rs.length, done: d, state: !rs.length ? 'none' : d === rs.length ? 'done' : started ? 'doing' : 'todo' };
    });
    var curStage = pr.stages.filter(function (s) { return s.state !== 'done' && s.state !== 'none'; })[0];
    pr.current = curStage ? curStage.name.slice(2) : '기록 완료';
    var info = pr.info || {};
    pr.customer = pr.customer || info.customer || '';
    pr.name = pr.name || info.name || '';
    pr.due = pr.due || info.due || '';
    pr.dday = dday(pr.due);
    return pr;
  }
  function dday(d) {
    var m = /^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/.exec(cl(d));
    if (!m) return null;
    var t = new Date(+m[1], +m[2] - 1, +m[3]), n = new Date();
    n = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((t - n) / 86400000);
  }

  // ---------------------------------------------------------------- 예시
  function sampleData() {
    var plan = A.plan(), F = A.FORMS.forms;
    var p0 = JSON.parse(JSON.stringify(A.S.project));
    var base = A.P.indexSpec(p0, plan.docs, F, A.P.today()).rows;
    function make(pj, customer, name, due, upto, doing, panels) {
      var recs = base.map(function (r) {
        var si = STAGES.indexOf(r[0]);
        var st = si < 0 ? '미작성' : si < upto ? '승인' : si === upto && doing ? (r[1] === '증빙' ? '작성중' : '승인') : '미작성';
        if (si === upto && doing && /QF-06/.test(r[1]) && /02/.test(r[3])) st = '검토대기';
        return { stage: r[0], code: r[1], doc: r[2], panel: r[3], loc: r[4], owner: r[5], status: st, done: st === '승인' ? '10/1' + (si + 1) : '', by: '', exists: null };
      });
      return summarize({ pj: pj, customer: customer, name: name, due: due, records: recs, panels: panels, root: pj, fatFiles: 0, info: null });
    }
    var d = new Date(), iso = function (k) { var x = new Date(d.getTime() + k * 86400000); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    data = {
      sample: true, mode: 'sample', note: '',
      projects: [
        make('EX-26-015', '아트라스콥코 (예시)', '공기압축기 인버터 제어반 (예시)', iso(9), 4, true,
          [{ lot: 'EX-26-015-01', tag: 'VFD-01', fat: '합격 10/25', ship: '' }, { lot: 'EX-26-015-02', tag: 'VFD-02', fat: '', ship: '' }]),
        make('EX-26-021', '현대터보기계 (예시)', '터보 블로워 MCC반 (예시)', iso(34), 1, true,
          [{ lot: 'EX-26-021-01', tag: 'MCC-01', fat: '', ship: '' }]),
        make('EX-26-009', '○○산업 (예시)', '펌프 제어반 (예시)', iso(-6), 5, false,
          [{ lot: 'EX-26-009-01', tag: 'LCP-01', fat: '합격 10/02', ship: '10/06 품질 확인' }])
      ]
    };
  }

  // ---------------------------------------------------------------- 요약 엑셀
  function exportXlsx() {
    if (!window.ExcelJS) { setStatus('엑셀 라이브러리를 불러오지 못했습니다.', 'bad'); return; }
    var wb = new window.ExcelJS.Workbook();
    function sheet(name, head, rows, widths) {
      var ws = wb.addWorksheet(name);
      ws.addRow(head);
      rows.forEach(function (r) { ws.addRow(r); });
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1857A5' } };
      widths.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: head.length } };
    }
    var ps = filtered();
    sheet('프로젝트', ['프로젝트 번호', '고객', '프로젝트명', '납기', 'D-day', '현재 단계', '기록 완료율(%)', '완료', '전체', '남은 기록', '판넬 LOT'],
      ps.map(function (p) { return [p.pj, p.customer, p.name, p.due, p.dday === null ? '' : p.dday, p.current, p.pct, p.doneN, p.total, p.left.length,
        p.panels.map(function (x) { return x.lot + (x.ship ? '(출하)' : x.fat ? '(FAT)' : ''); }).join(', ')]; }),
      [14, 18, 26, 12, 7, 12, 12, 7, 7, 9, 36]);
    var left = [];
    ps.forEach(function (p) { p.left.forEach(function (r) { if (!view.owner || r.owner === view.owner) left.push([p.pj, r.stage, r.code, r.doc, r.panel, r.owner, r.status, r.loc, r.exists === false ? '파일 없음' : '']); }); });
    sheet('남은 기록', ['프로젝트', '단계', '양식', '문서', '판넬', '담당', '상태', '파일 위치', '확인'], left, [12, 11, 9, 28, 9, 14, 9, 44, 10]);
    var lots = [];
    ps.forEach(function (p) { p.panels.forEach(function (x) { lots.push([p.pj, x.lot, x.tag, x.fat, x.ship, x.sat || '']); }); });
    sheet('판넬 LOT', ['프로젝트', '판넬 LOT', 'Tag', 'FAT 판정·일자', '출하 승인·일자', 'SAT·인수일'], lots, [12, 16, 22, 16, 18, 12]);
    var name = '기록현황_요약_' + A.P.today() + '.xlsx';
    wb.xlsx.writeBuffer().then(function (buf) {
      return A.saveFile(name, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    }).then(function () { setStatus(name + ' 저장', 'ok'); }, function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }

  // ---------------------------------------------------------------- 화면
  function setStatus(t, kind) { var s = $('dashStatus'); if (!s) return; s.textContent = t; s.className = 'status' + (kind ? ' ' + kind : ''); }

  function filtered() {
    var q = cl(view.q).toLowerCase();
    return data.projects.filter(function (p) {
      if (view.owner && !p.left.some(function (r) { return r.owner === view.owner; })) return false;
      if (!q) return true;
      return [p.pj, p.customer, p.name].join(' ').toLowerCase().indexOf(q) >= 0 ||
        p.panels.some(function (x) { return (x.lot + ' ' + x.tag).toLowerCase().indexOf(q) >= 0; });
    }).sort(function (a, b) {
      var da = a.dday === null ? 9999 : a.dday, db = b.dday === null ? 9999 : b.dday;
      if ((a.pct === 100) !== (b.pct === 100)) return a.pct === 100 ? 1 : -1;
      return da - db;
    });
  }

  function card(label, value, sub, cls) {
    return el('div', { cls: 'kpi' + (cls ? ' ' + cls : '') }, [el('span', { cls: 'kpi-l', text: label }), el('b', { cls: 'kpi-v', text: value }), sub ? el('span', { cls: 'kpi-s', text: sub }) : null]);
  }

  function stepper(p) {
    return el('ol', { cls: 'stg', 'aria-label': '단계 진행' }, p.stages.map(function (s) {
      var lab = s.name.slice(2);
      var txt = s.state === 'none' ? '해당 기록 없음' : s.done + '/' + s.n + (s.state === 'done' ? ' 완료' : s.state === 'doing' ? ' 진행 중' : ' 시작 전');
      return el('li', { cls: 'stg-' + s.state, title: lab + ' ' + txt }, [el('span', { cls: 'stg-dot', 'aria-hidden': 'true' }), el('span', { cls: 'stg-l', text: lab }),
        el('span', { cls: 'sr', text: txt })]);
    }));
  }

  function lotChips(p) {
    if (!p.panels.length) return el('span', { cls: 'sub', text: (p.panelsText || '판넬 정보 없음') + (p.lots ? ' · ' + p.lots : '') });
    return el('div', { cls: 'lots' }, p.panels.map(function (x) {
      var st = x.ship ? '출하' : x.fat ? 'FAT 완료' : '제작';
      return el('span', { cls: 'chip ' + (x.ship ? 'chip-ok' : x.fat ? '' : 'chip-warn'), title: [x.tag, x.fat && 'FAT ' + x.fat, x.ship && '출하 ' + x.ship].filter(Boolean).join(' · ') },
        [x.lot || x.tag, ' · ' + st]);
    }));
  }

  function projectRow(p) {
    var open = !!view.open[p.pj];
    var dd = p.dday === null ? '' : p.dday < 0 ? '납기 ' + (-p.dday) + '일 지남' : p.dday === 0 ? '오늘 납기' : 'D-' + p.dday;
    var left = p.left.filter(function (r) { return !view.owner || r.owner === view.owner; });
    var wrap = el('article', { cls: 'pj' + (p.pct === 100 ? ' pj-done' : '') }, [
      el('div', { cls: 'pj-h' }, [
        el('div', { cls: 'pj-id' }, [el('b', { cls: 'mono', text: p.pj }), el('span', { text: p.customer }), el('span', { cls: 'sub', text: p.name })]),
        el('div', { cls: 'pj-due ' + (p.dday !== null && p.dday <= 7 && p.pct < 100 ? 'hot' : '') }, [el('b', { text: dd || '납기 미입력' }), el('span', { cls: 'sub', text: p.due })]),
        el('div', { cls: 'pj-pr' }, [el('div', { cls: 'pbar', role: 'img', 'aria-label': '기록 완료 ' + p.pct + '%' }, [el('span', { style: 'width:' + p.pct + '%' })]),
          el('span', { cls: 'sub' }, [el('b', { text: p.pct + '%' }), ' · 현재 ', el('b', { text: p.current }), ' · 남은 기록 ' + p.left.length + '건' + (p.missing ? ' · 파일 없음 ' + p.missing : '')])])
      ]),
      stepper(p),
      lotChips(p),
      el('div', { cls: 'row-actions' }, [
        el('button', { type: 'button', cls: 'btn btn-sm', 'aria-expanded': open ? 'true' : 'false', text: (open ? '접기' : '남은 기록 보기') + ' (' + left.length + ')',
          onclick: function () { view.open[p.pj] = !open; renderList(); } }),
        p.json ? el('button', { type: 'button', cls: 'btn btn-sm btn-ghost', text: '이 프로젝트 열기 (명판·FAT·묶음 다시 만들기)', onclick: function () { openProject(p); } }) : null,
        p.older ? el('span', { cls: 'sub', text: '이전 묶음 ' + p.older + '개는 건너뜀' }) : null
      ])
    ]);
    if (open) {
      var tb = el('tbody');
      left.forEach(function (r) {
        tb.appendChild(el('tr', {}, [el('td', { text: r.stage.slice(2) }), el('td', { cls: 'c-mono', text: r.code }), el('td', { text: r.doc }), el('td', { text: r.panel }),
          el('td', { text: r.owner }), el('td', {}, [el('span', { cls: 'chip ' + (r.status === '미작성' || r.status === '불합격' ? 'chip-bad' : r.status === '보류' ? 'chip-warn' : ''), text: r.status })]),
          el('td', { cls: 'c-mono', text: r.loc })]));
      });
      if (!left.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '7', cls: 'empty', text: '남은 기록이 없습니다.' })]));
      wrap.appendChild(el('div', { cls: 'table-wrap' }, [el('table', { cls: 'tbl' }, [
        el('thead', {}, [el('tr', {}, ['단계', '양식', '문서', '판넬', '담당', '상태', '파일 위치'].map(function (h) { return el('th', { text: h }); }))]), tb])]));
    }
    return wrap;
  }

  function openProject(p) {
    try {
      A.loadProjectText(p.json);
      A.showView('pack');
      window.scrollTo(0, 0);
    } catch (e) { setStatus('프로젝트 정보를 불러오지 못했습니다: ' + e.message, 'bad'); }
  }

  function renderList() {
    var box = $('dashList');
    if (!box) return;
    A.clear(box);
    var ps = filtered();
    ps.forEach(function (p) { box.appendChild(projectRow(p)); });
    if (!ps.length) box.appendChild(el('p', { cls: 'help', text: data.projects.length ? '조건에 맞는 프로젝트가 없습니다.' : '' }));
    var k = $('dashKpi');
    A.clear(k);
    var all = data.projects, recs = 0, done = 0, left = 0, soon = 0, ready = 0;
    all.forEach(function (p) {
      recs += p.total; done += p.doneN; left += p.left.length;
      if (p.dday !== null && p.dday <= 14 && p.pct < 100) soon++;
      ready += p.panels.filter(function (x) { return x.fat && !x.ship; }).length;
    });
    k.appendChild(card('진행 프로젝트', String(all.filter(function (p) { return p.pct < 100; }).length), '전체 ' + all.length));
    k.appendChild(card('기록 완료율', (recs ? Math.round(done / recs * 100) : 0) + '%', done + ' / ' + recs + '건'));
    k.appendChild(card('남은 기록', String(left), '승인·해당없음 전', left ? 'warn' : ''));
    k.appendChild(card('납기 14일 이내', String(soon), '기록 미완료 프로젝트', soon ? 'warn' : ''));
    k.appendChild(card('출하 대기 판넬', String(ready), 'FAT 완료 · 출하 기록 전'));
    var owners = {};
    all.forEach(function (p) { p.left.forEach(function (r) { if (r.owner) owners[r.owner] = (owners[r.owner] || 0) + 1; }); });
    var sel = $('dashOwner');
    A.clear(sel);
    sel.appendChild(el('option', { value: '', text: '모든 담당' }));
    Object.keys(owners).sort().forEach(function (o) {
      var op = el('option', { value: o, text: o + ' (' + owners[o] + ')' });
      if (o === view.owner) op.selected = true;
      sel.appendChild(op);
    });
  }

  function render() {
    var root = $('view-dash');
    A.clear(root);
    root.appendChild(el('header', { cls: 'top' }, [
      el('p', { cls: 'eyebrow', text: '프로젝트별 기록 진행 · 감사 대비' }),
      el('h1', { text: '기록 현황판' }),
      el('p', { cls: 'lead', text: '공용 저장소에서 프로젝트 폴더들이 들어 있는 위 폴더를 고르면, 각 프로젝트의 00_기록현황 상태와 판넬 LOT 출하 기록을 모아 보여 줍니다. 누구나 같은 폴더를 고르면 같은 현황을 봅니다.' })
    ]));
    var drop = el('div', { cls: 'drop', id: 'dashDrop' }, [
      el('input', { type: 'file', id: 'dashDir', webkitdirectory: '', directory: '', multiple: '', onchange: function (e) { go(fromInput(e.target.files)); e.target.value = ''; } }),
      el('label', { for: 'dashDir' }, [el('b', { text: '프로젝트 폴더 고르기' }), ' 또는 폴더를 여기로 끌어다 놓기']),
      el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '예시 현황 보기', onclick: function () { sampleData(); afterLoad(); } })
    ]);
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); fromDrop(e.dataTransfer).then(go); });
    var lab = drop.querySelector('label');
    lab.setAttribute('tabindex', '0');
    lab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('dashDir').click(); } });
    root.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '1' }), '공용 저장소 폴더']),
      drop,
      el('p', { cls: 'help', text: '읽는 파일: 00_기록현황_*.xlsx(기록 상태), 05_FAT출하의 QF-04(판넬 LOT·출하), 00_프로젝트정보_*.json(입력 내용). 같은 프로젝트의 묶음이 여러 개면 가장 최근 것만 셉니다. 파일은 이 화면 안에서만 읽고 어디로도 보내지 않습니다.' }),
      el('p', { cls: 'status', id: 'dashStatus', role: 'status' })
    ]));
    root.appendChild(el('div', { id: 'dashBody', hidden: !data.projects.length }, [
      data.sample ? el('p', { cls: 'note', text: '예시 현황입니다(가상의 프로젝트 3건). 실제 현황은 위에서 공용 저장소 폴더를 고르세요.' }) : null,
      data.note ? el('p', { cls: 'note', text: data.note }) : null,
      el('div', { cls: 'kpis', id: 'dashKpi' }),
      el('div', { cls: 'dash-bar' }, [
        el('div', { cls: 'field' }, [el('label', { for: 'dashOwner', text: '담당자별 할 일' }), el('select', { id: 'dashOwner', onchange: function (e) { view.owner = e.target.value; renderList(); } })]),
        el('div', { cls: 'field' }, [el('label', { for: 'dashQ', text: '찾기 (프로젝트·고객·LOT)' }), el('input', { type: 'text', id: 'dashQ', value: view.q, oninput: function (e) { view.q = e.target.value; renderList(); } })]),
        el('button', { type: 'button', cls: 'btn', text: '현황 요약 엑셀 받기', onclick: exportXlsx })
      ]),
      el('div', { cls: 'pjs', id: 'dashList' })
    ]));
    renderList();
  }

  function afterLoad() {
    render();
    var n = data.projects.length;
    setStatus(data.sample ? '예시 현황을 보여 줍니다.' : n + '개 프로젝트를 읽었습니다' + (data.mode === 'files' ? ' (파일만 골라 파일 있음 여부는 확인하지 않았습니다)' : '') + '.', 'ok');
  }

  function go(list) {
    if (!window.XLSX) { setStatus('엑셀 읽기 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.', 'bad'); return; }
    setStatus('읽는 중… (' + list.length + '개 파일)', '');
    loadFiles(list).then(afterLoad).catch(function (e) { setStatus(e.message, 'bad'); });
  }

  window.IsoViews = window.IsoViews || {};
  window.IsoViews.dash = {
    show: function () { A = window.IsoApp; el = A.el; $ = A.$; render(); },
    _load: function (list) { return loadFiles(list).then(function (d) { render(); return d; }); },
    _data: function () { return data; }
  };
})();
