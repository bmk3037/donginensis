/* 기록 현황판: 공용 저장소의 프로젝트 폴더들을 고르면 각 프로젝트의 00_기록현황(상태)·QF-04(판넬 LOT 출하)·
   00_프로젝트정보(입력 내용)를 읽어 진행 단계와 남은 기록을 한 화면에 보여 준다. 파일은 이 화면 안에서만 읽는다. */
(function () {
  'use strict';
  var A, el, $;
  var STAGES = ['1 수주', '2 설계', '3 구매·입고', '4 제작', '5 FAT·출하', '6 SAT·인수', '7 PLC', '8 NCR·AS'];
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
    ['단계', '양식', '문서', '판넬', '파일 위치', '담당', '상태', '완료일', '확인일', '확인자', '승인 증거·대체 기록 경로', '해당없음 사유'].forEach(function (k) { col[k] = head.indexOf(k); });
    var recs = [];
    for (var r = h + 1; r < rows.length; r++) {
      var row = rows[r] || [], g = function (k) { return col[k] < 0 ? '' : val(row[col[k]]); };
      if (!/^\d\s/.test(g('단계'))) continue;
      recs.push({ stage: g('단계'), code: g('양식'), doc: g('문서'), panel: g('판넬'), loc: g('파일 위치'), owner: g('담당'),
        status: g('상태') || '미작성', done: g('확인일') || g('완료일'), by: g('확인자'), evidence: g('승인 증거·대체 기록 경로'), reason: g('해당없음 사유'), exists: null, evidenceExists: null });
    }
    return {
      pj: fieldVal(rows, h, '프로젝트 번호'), customer: fieldVal(rows, h, '고객'), name: fieldVal(rows, h, '프로젝트명·현장'),
      panelsText: fieldVal(rows, h, '판넬'), po: fieldVal(rows, h, '계약·PO 번호'), due: fieldVal(rows, h, '납기'),
      lots: fieldVal(rows, h, '판넬 LOT (제조번호)'), staff: fieldVal(rows, h, '담당 (설계 / 생산 / 품질 / 시험)'),
      created: fieldVal(rows, h, '생성일'), drawPlc: fieldVal(rows, h, '도면 Rev / PLC Ver'), schedText: fieldVal(rows, h, '일정 (예정일)'), records: recs
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
            r.evidenceExists = r.evidence ? !!(paths[r.evidence.replace(/\\/g, '/')] || paths[(root ? root + '/' : '') + r.evidence.replace(/\\/g, '/')]) : null;
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
        var fats = under.filter(function (y) { return /_FAT_.*_QF-06\.xlsx$/i.test(base(y.path)); });
        pr.fatFiles = fats.length;
        pr.fatVers = [];
        fats.forEach(function (y) {
          jobs.push(A.readWorkbook(y.file).then(function (w) {
            var rows = A.sheetRows(w, w.SheetNames[0]), v = verOf(fieldVal(rows, rows.length, 'PLC Ver / SF-02 번호'));
            if (v) pr.fatVers.push({ ver: v, file: base(y.path) });
          }).catch(function () { /* 못 읽으면 건너뜀 */ }));
        });
        if (folderMode) {
          pr.records.forEach(function (r) {
            if (r.code === '증빙' || !/\.xlsx$/i.test(r.loc || '')) return;
            var src = paths[(root ? root + '/' : '') + r.loc], sheetIdx = 0;
            // FAT 입력 화면에서 받은 결과 파일이 있으면 그것으로 판단(QF-06 시트 0, QF-06-1 시트 1)
            if ((r.code === 'QF-06' || r.code === 'QF-06-1') && r.panel) {
              var tag = r.panel.replace(/[\\\/:*?"<>|\s]/g, '');
              var ff = fats.filter(function (y) { return base(y.path).indexOf('_FAT_' + tag + '_') >= 0; }).sort(function (a, b) { return (b.file.lastModified || 0) - (a.file.lastModified || 0); })[0];
              if (ff) { src = ff; sheetIdx = r.code === 'QF-06' ? 0 : 1; r.fromFat = base(ff.path); }
            }
            if (!src) return;
            jobs.push(A.readWorkbook(src.file).then(function (w) {
              var name = w.SheetNames[Math.min(sheetIdx, w.SheetNames.length - 1)];
              r.auto = analyze(A.sheetRows(w, name), r.code);
            }).catch(function () { /* 못 읽으면 판단 안 함 */ }));
          });
        }
        return Promise.all(jobs).then(function () { pr._under = folderMode ? under : null; return pr; });
      }).catch(function (e) { return { error: x.path + ': ' + e.message }; });
    })).then(function (prs) {
      var errors = prs.filter(function (x) { return x.error; }).map(function (x) { return x.error; });
      var byPj = {};
      prs.filter(function (x) { return !x.error; }).forEach(function (x) {
        var k = x.pj || x.root;
        if (!byPj[k] || byPj[k].modified < x.modified) { if (byPj[k]) x.older = (byPj[k].older || 0) + 1; byPj[k] = x; }
        else byPj[k].older = (byPj[k].older || 0) + 1;
      });
      data = { projects: Object.keys(byPj).map(function (k) {
        var pr = summarize(byPj[k]);
        pr.vc = pr._under ? versionCheck(pr, pr._under, pr.root) : null;
        delete pr._under;
        return pr;
      }), sample: false, mode: folderMode ? 'folder' : 'files',
        note: errors.length ? '읽지 못한 파일: ' + errors.join(' / ') : '' };
      return data;
    });
  }

  // ---------------------------------------------------------------- 도면·PLC 버전 확인
  function revOf(t) { var m = /rev\.?\s*([0-9]+[a-z]?|[a-z])(?![a-z])/i.exec(cl(t)); return m ? m[1].toUpperCase() : ''; }
  function verOf(t) { var m = /(?:^|[^a-z])v\s*(\d+(?:\.\d+)*)/i.exec(cl(t)); return m ? m[1] : ''; }
  function cmpRev(a, b) { return /^\d+$/.test(a) && /^\d+$/.test(b) ? +a - +b : a < b ? -1 : a > b ? 1 : 0; }
  function cmpVer(a, b) {
    var x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
    return 0;
  }
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }
  function top(list, cmp) { return list.reduce(function (m, v) { return m === '' || cmp(v, m) > 0 ? v : m; }, ''); }

  /** 공용 저장소 폴더의 승인 도면·PLC 릴리스와 기록에 적힌 Rev·Ver를 비교한다 */
  function versionCheck(pr, under, root) {
    var pre = root ? root + '/' : '', info = pr.info || {};
    var inDir = function (d) { return under.filter(function (y) { return y.path.indexOf(pre + d) === 0 && !/\.txt$/i.test(y.path); }); };
    var managed = under.some(function (y) { return y.path === pre + '02_설계기준/도면관리_방법.txt' || y.path === pre + '07_PLC/PLC관리_방법.txt'; });
    var parts = String(pr.drawPlc || '').split('/');
    var recRev = revOf(info.drawRev || parts[0] || ''), recVer = verOf(info.plcVer || parts.slice(1).join('/') || '');
    var vc = { managed: managed, recRev: recRev, recVer: recVer, issues: [], notes: [] };
    // 도면
    var appr = inDir('02_설계기준/도면_승인본/'), work = inDir('02_설계기준/도면_작업중/');
    var revs = uniq(appr.map(function (y) { return revOf(base(y.path)); }));
    vc.revs = revs; vc.latestRev = top(revs, cmpRev);
    var noRev = appr.filter(function (y) { return !revOf(base(y.path)); }).length;
    if (!appr.length) { if (managed && pr.stages && pr.stages[1] && pr.stages[1].state === 'done') vc.issues.push('도면_승인본 폴더가 비어 있음 — 승인된 도면(PDF·DWG)을 넣으세요'); }
    else {
      if (revs.length > 1) vc.issues.push('도면_승인본에 Rev가 여러 개 (' + revs.map(function (r) { return 'Rev.' + r; }).join(', ') + ') — 이전 Rev는 도면_구본으로 옮기세요');
      if (noRev) vc.issues.push('도면_승인본에 파일명에 Rev가 없는 파일 ' + noRev + '개 — 파일명에 Rev를 붙이세요');
      if (recRev && vc.latestRev && recRev !== vc.latestRev) vc.issues.push('기록의 도면 Rev.' + recRev + ' ≠ 승인 도면 최신 Rev.' + vc.latestRev + ' — QF-02 변경 기록 후 01 탭 도면 Rev를 바꿔 묶음을 다시 만드세요');
      var newest = Math.max.apply(null, appr.map(function (y) { return y.file.lastModified || 0; }));
      var newerWork = work.filter(function (y) { return (y.file.lastModified || 0) > newest; }).length;
      if (newerWork) vc.notes.push('도면_작업중에 승인본보다 최근 파일 ' + newerWork + '개 (배포 전 검토·승인 필요)');
    }
    // PLC
    var rel = inDir('07_PLC/릴리스/');
    var vers = uniq(rel.map(function (y) {
      var rest = y.path.slice((pre + '07_PLC/릴리스/').length), seg = rest.split('/');
      return verOf(seg.length > 1 ? seg[0] : seg[0]);
    }));
    vc.vers = vers; vc.latestVer = top(vers, cmpVer);
    if (!rel.length) { if (managed && pr.panels.some(function (x) { return x.fat || x.ship; })) vc.issues.push('07_PLC/릴리스가 비어 있음 — FAT를 통과한 PLC 버전을 버전 폴더(예: V1.0_날짜_FAT)로 넣으세요'); }
    else {
      if (recVer && vc.latestVer && recVer !== vc.latestVer) vc.issues.push('기록의 PLC V' + recVer + ' ≠ 최신 릴리스 V' + vc.latestVer + ' — QF-08에 버전 기록 후 01 탭 PLC Ver를 바꾸세요');
      (pr.fatVers || []).forEach(function (f) {
        if (cmpVer(vc.latestVer, f.ver) > 0) vc.issues.push('FAT 시험 버전 V' + f.ver + ', 최신 릴리스 V' + vc.latestVer + ' — 변경 후 재시험 기록(QF-08·QF-06)을 확인하세요 (' + f.file + ')');
        else if (vers.indexOf(f.ver) < 0) vc.issues.push('FAT에 쓴 V' + f.ver + '가 릴리스 폴더에 없음 — 시험한 버전을 릴리스로 보관하세요');
      });
    }
    return vc;
  }

  // ---------------------------------------------------------------- 파일 내용으로 작성 상태 판단
  var INPUT_COL = /판정|결과|실측|확인|일자|작업자|검사기록|인계|승인|증거|담당|기한|완료|측정|조치|변경|재시험|재검사/;
  function isPlanned(v) { return /\(예정\)|^예정\s/.test(cl(v)); }
  /** 양식 시트(행 배열)를 읽어 입력 칸이 얼마나 채워졌는지, 예시·예정이 남았는지, 결재 일자가 있는지 본다 */
  function analyze(rows, code) {
    var spec = (A.FORMS.forms || {})[code], out = { examples: 0, planned: 0, rows: 0, filled: 0, signed: false, state: '미작성' };
    rows.forEach(function (r) { (r || []).forEach(function (c) { if (isEx(c)) out.examples++; else if (isPlanned(c)) out.planned++; }); });
    if (!spec) return null;
    var h0 = cl(spec.cols[0][0]), h1 = cl(spec.cols[1][0]), h = -1;
    for (var i = 0; i < rows.length; i++) { var rr = (rows[i] || []).map(cl); if (rr.indexOf(h0) >= 0 && rr.indexOf(h1) >= 0) { h = i; break; } }
    if (h < 0) return out;
    var head = rows[h].map(cl), inputs = [];
    head.forEach(function (t, k) { if (k >= 2 && t && INPUT_COL.test(t) && !/작업자|담당|도면 Rev/.test(t)) inputs.push(k); });   // 미리 채운 담당·Rev 열은 빼고 본다
    for (var r = h + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      if (/^첨부/.test(cl(row[0]))) break;
      if (!cl(row[0]) && !cl(row[1])) continue;
      out.rows++;
      if (inputs.some(function (k) { var v = cl(row[k]); return v && !isEx(v) && !isPlanned(v); })) out.filled++;
    }
    for (var j = h + 1; j < rows.length; j++) {
      var sr = (rows[j] || []).map(cl), at = sr.indexOf('일자');
      if (at >= 0 && j > 0 && (rows[j - 1] || []).map(cl).indexOf('성명·서명') >= 0) {
        out.signed = sr.slice(at + 1).some(function (v) { return v && !isEx(v); });
        break;
      }
    }
    out.state = !out.filled ? '미작성' : out.filled < out.rows ? '작성중' : out.signed ? '작성완료·서명' : '작성완료 (서명 전)';
    return out;
  }
  function autoText(a) {
    if (!a) return '';
    var t = a.state + (a.rows ? ' ' + a.filled + '/' + a.rows + '행' : '');
    if (a.examples) t += ' · 예시 ' + a.examples + '칸 남음';
    if (a.planned) t += ' · 예정 날짜 ' + a.planned + '칸 남음';
    return t;
  }

  function autoSummary(p) {
    var a = (p.records || []).filter(function (r) { return r.auto; });
    if (!a.length) return '';
    var w = a.filter(function (r) { return /^작성완료/.test(r.auto.state); }).length, ing = a.filter(function (r) { return r.auto.state === '작성중'; }).length;
    return ' · 파일 작성완료 ' + w + ' / 작성중 ' + ing + ' / ' + a.length;
  }

  function recordIssues(r) {
    if (DONE.indexOf(r.status) < 0) return [];
    var issues = [];
    if (r.auto && r.auto.examples) issues.push("작성 예시 '예)' " + r.auto.examples + '칸이 남아 있음');
    if (r.auto && r.auto.planned) issues.push("'예정' 날짜 " + r.auto.planned + '칸이 남아 있음 (실제 날짜로)');
    if (r.auto && r.status !== '해당없음' && r.auto.state === '미작성') issues.push('파일에 입력 내용 없음');
    if (!val(r.done)) issues.push('확인일 없음');
    if (!val(r.by)) issues.push('확인자 없음');
    if (r.status === '해당없음') {
      if (!val(r.reason)) issues.push('해당없음 사유 없음');
    } else {
      if (!val(r.evidence)) issues.push('승인 증거 경로 없음');
      else if (r.evidenceExists !== true) issues.push(r.evidenceExists === false ? '선택 폴더에 승인 증거 파일 없음' : '승인 증거 파일 미확인');
      if (r.exists === false && r.evidenceExists !== true) issues.push('원본 파일 없음');
    }
    return issues;
  }
  function recordDone(r) { return DONE.indexOf(r.status) >= 0 && !recordIssues(r).length; }
  function panelState(x) {
    var fat = val(x.fat), ship = val(x.ship);
    var bad = /불합격|보류|미완료|미승인|취소|반려|대기|승인\s*전|미확인|불승인/;
    if (/불합격/.test(fat)) return 'FAT 불합격';
    if (bad.test(fat)) return 'FAT 보류·미완료';
    if (bad.test(ship)) return '출하 보류';
    if (ship) return '출하 기록';
    if (/^합격(?:\s|$)/.test(fat)) return 'FAT 합격 기록';
    return fat ? 'FAT 판정 확인 필요' : '제작';
  }

  function summarize(pr) {
    var recs = pr.records.filter(function (r) { return STAGES.indexOf(r.stage) >= 0; });
    pr.total = recs.length;
    recs.forEach(function (r) { r.issues = recordIssues(r); });
    pr.doneN = recs.filter(recordDone).length;
    pr.left = recs.filter(function (r) { return !recordDone(r); });
    pr.missing = recs.filter(function (r) { return r.exists === false && r.status !== '해당없음' && r.evidenceExists !== true && DONE.indexOf(r.status) >= 0; }).length;
    pr.pct = pr.total ? Math.floor(pr.doneN / pr.total * 100) : 0;
    pr.stages = STAGES.map(function (s) {
      var rs = recs.filter(function (r) { return r.stage === s; });
      var d = rs.filter(recordDone).length;
      var started = rs.some(function (r) { return STARTED.indexOf(r.status) >= 0 || DONE.indexOf(r.status) >= 0 || (r.auto && r.auto.state !== '미작성'); });
      return { name: s, n: rs.length, done: d, state: !rs.length ? 'none' : d === rs.length ? 'done' : started ? 'doing' : 'todo' };
    });
    var curStage = pr.stages.filter(function (s) { return s.state !== 'done' && s.state !== 'none'; })[0];
    pr.current = curStage ? curStage.name.slice(2) : pr.total ? '증빙 연결 완료' : '기록 없음';
    var info = pr.info || {};
    pr.customer = pr.customer || info.customer || '';
    pr.name = pr.name || info.name || '';
    pr.due = pr.due || info.due || '';
    pr.dday = dday(pr.due);
    schedule(pr);
    return pr;
  }

  // 일정: 예정일이 지났는데 그 단계 기록이 끝나지 않았으면 지연
  var STAGE_OF = { dDesign: '2 설계', dMaterial: '3 구매·입고', dWiring: '4 제작', dShip: '5 FAT·출하', dSat: '6 SAT·인수' };
  function schedule(pr) {
    var info = pr.info || {}, list = [];
    A.P.SCHEDULE.forEach(function (s) { if (cl(info[s[0]])) list.push({ key: s[0], label: s[1], date: cl(info[s[0]]) }); });
    if (!list.length && pr.schedText) {
      pr.schedText.split('·').forEach(function (t) {
        var m = /^\s*(.+?)\s+(\d{4}-\d{2}-\d{2})\s*$/.exec(t);
        if (!m) return;
        var hit = A.P.SCHEDULE.filter(function (s) { return s[1] === m[1]; })[0];
        if (hit) list.push({ key: hit[0], label: hit[1], date: m[2] });
      });
    }
    pr.sched = list;
    pr.late = [];
    list.forEach(function (x) {
      var st = STAGE_OF[x.key], dd = dday(x.date);
      if (!st || dd === null || dd >= 0) return;
      var stg = (pr.stages || []).filter(function (g) { return g.name === st; })[0];
      if (x.key === 'dShip' && pr.panels && pr.panels.length && pr.panels.every(function (q) { return panelState(q) === '출하 기록'; })) return;
      if (stg && stg.state !== 'done' && stg.state !== 'none') {
        pr.late.push(x.label + ' 예정일 ' + x.date.slice(5).replace('-', '/') + ' 지남 (' + (-dd) + '일) — ' + st.slice(2) + ' 기록 ' + (stg.n - stg.done) + '건 남음');
      }
    });
    pr.next = list.filter(function (x) { var dd = dday(x.date); return dd !== null && dd >= 0; })[0] || null;
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
        return { stage: r[0], code: r[1], doc: r[2], panel: r[3], loc: r[4], owner: r[5], status: st, done: st === '승인' ? '10/1' + (si + 1) : '', by: st === '승인' ? '예시 확인자' : '', evidence: st === '승인' ? '예시 승인본.pdf' : '', reason: '', exists: null, evidenceExists: st === '승인' ? true : null };
      });
      return summarize({ pj: pj, customer: customer, name: name, due: due, records: recs, panels: panels, root: pj, fatFiles: 0, info: null });
    }
    function vc(recRev, revs, recVer, vers, issues) {
      return { managed: true, recRev: recRev, recVer: recVer, revs: revs, latestRev: top(revs, cmpRev), vers: vers, latestVer: top(vers, cmpVer), issues: issues || [], notes: [] };
    }
    function mk(pr, v, sch) {
      pr.vc = v;
      pr.info = sch;
      schedule(pr);
      return pr;
    }
    var d = new Date(), iso = function (k) { var x = new Date(d.getTime() + k * 86400000); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    data = {
      sample: true, mode: 'sample', note: '',
      projects: [
        mk(make('EX-26-015', '아트라스콥코 (예시)', '공기압축기 인버터 제어반 (예시)', iso(9), 4, true,
          [{ lot: 'EX-26-015-01', tag: 'VFD-01', fat: '합격 10/25', ship: '' }, { lot: 'EX-26-015-02', tag: 'VFD-02', fat: '', ship: '' }]),
          vc('1', ['2'], '1.0', ['1.0', '1.1'], ['기록의 도면 Rev.1 ≠ 승인 도면 최신 Rev.2 — QF-02 변경 기록 후 01 탭 도면 Rev를 바꿔 묶음을 다시 만드세요',
            '기록의 PLC V1.0 ≠ 최신 릴리스 V1.1 — QF-08에 버전 기록 후 01 탭 PLC Ver를 바꾸세요',
            'FAT 시험 버전 V1.0, 최신 릴리스 V1.1 — 변경 후 재시험 기록(QF-08·QF-06)을 확인하세요']),
          { dDesign: iso(-20), dMaterial: iso(-14), dWiring: iso(-6), dFat: iso(-2), dShip: iso(3), dSat: iso(8) }),
        mk(make('EX-26-021', '현대터보기계 (예시)', '터보 블로워 MCC반 (예시)', iso(34), 1, true,
          [{ lot: 'EX-26-021-01', tag: 'MCC-01', fat: '', ship: '' }]), vc('A', [], '', []),
          { dDesign: iso(-1), dMaterial: iso(8), dWiring: iso(18), dFat: iso(24), dShip: iso(28), dSat: iso(34) }),
        mk(make('EX-26-009', '○○산업 (예시)', '펌프 제어반 (예시)', iso(-6), 5, false,
          [{ lot: 'EX-26-009-01', tag: 'LCP-01', fat: '합격 10/02', ship: '10/06 품질 확인' }]), vc('3', ['3'], '2.0', ['2.0']),
          { dDesign: iso(-40), dMaterial: iso(-32), dWiring: iso(-24), dFat: iso(-20), dShip: iso(-16), dSat: iso(-9) })
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
    sheet('프로젝트', ['프로젝트 번호', '고객', '프로젝트명', '납기', 'D-day', '현재 단계', '다음 일정', '일정 지연', '증빙 연결률(%)', '연결 충족', '전체', '남은 기록', '판넬 LOT'],
      ps.map(function (p) { return [p.pj, p.customer, p.name, p.due, p.dday === null ? '' : p.dday, p.current,
        p.next ? p.next.label + ' ' + p.next.date : '', (p.late || []).join(' / '), p.pct, p.doneN, p.total, p.left.length,
        p.panels.map(function (x) { return x.lot + ' (' + panelState(x) + ')'; }).join(', ')]; }),
      [14, 18, 26, 12, 7, 12, 18, 40, 12, 7, 7, 9, 36]);
    var left = [];
    ps.forEach(function (p) { p.left.forEach(function (r) { if (!view.owner || r.owner === view.owner) left.push([p.pj, r.stage, r.code, r.doc, r.panel, r.owner, r.status, autoText(r.auto), r.loc, (r.issues || []).join(' · ')]); }); });
    sheet('남은 기록', ['프로젝트', '단계', '양식', '문서', '판넬', '담당', '상태', '파일 내용 (자동)', '파일 위치', '확인'], left, [12, 11, 9, 28, 9, 14, 9, 30, 44, 36]);
    var lots = [];
    ps.forEach(function (p) { p.panels.forEach(function (x) { lots.push([p.pj, x.lot, x.tag, x.fat, x.ship, x.sat || '']); }); });
    sheet('판넬 LOT', ['프로젝트', '판넬 LOT', 'Tag', 'FAT 판정·일자', '출하 승인·일자', 'SAT·인수일'], lots, [12, 16, 22, 16, 18, 12]);
    sheet('도면·PLC', ['프로젝트', '기록 도면 Rev', '승인 도면 최신 Rev', '기록 PLC Ver', '최신 릴리스', '확인할 것'],
      ps.filter(function (p) { return p.vc; }).map(function (p) {
        var v = p.vc;
        return [p.pj, v.recRev ? 'Rev.' + v.recRev : '', v.latestRev ? 'Rev.' + v.latestRev : '', v.recVer ? 'V' + v.recVer : '', v.latestVer ? 'V' + v.latestVer : '', v.issues.join(' / ') || (!v.recRev || !v.latestRev || !v.recVer || !v.latestVer ? '확인 자료 부족' : '파일명 기준 일치')];
      }), [12, 13, 16, 12, 12, 90]);
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
      var st = panelState(x);
      return el('span', { cls: 'chip ' + (/불합격|보류/.test(st) ? 'chip-bad' : st === '출하 기록' ? '' : 'chip-warn'), title: [x.tag, x.fat && 'FAT ' + x.fat, x.ship && '출하 ' + x.ship].filter(Boolean).join(' · ') },
        [x.lot || x.tag, ' · ' + st]);
    }));
  }

  function schedLine(p) {
    if (!p.sched || !p.sched.length) return null;
    var nx = p.next, dd = nx ? dday(nx.date) : null;
    return el('div', { cls: 'vc' }, [
      el('div', { cls: 'lots' }, [
        nx ? el('span', { cls: 'chip', text: '다음 일정 · ' + nx.label + ' ' + nx.date.slice(5).replace('-', '/') + (dd === 0 ? ' (오늘)' : ' (D-' + dd + ')') }) : el('span', { cls: 'chip chip-ok', text: '예정 일정 모두 지남' }),
        el('span', { cls: 'sub', text: p.sched.map(function (x) { return x.label + ' ' + x.date.slice(5).replace('-', '/'); }).join(' · ') })
      ]),
      p.late.length ? el('ul', { cls: 'vc-issues' }, p.late.map(function (t) { return el('li', { text: t }); })) : null
    ]);
  }

  function vcLine(p) {
    var v = p.vc;
    if (!v) return null;
    function chip(label, latest, rec, pfx, list) {
      if (!latest) return el('span', { cls: 'chip', text: label + ' · ' + (!v.managed ? '관리 폴더 없음' : label === 'PLC' ? '릴리스 없음' : '승인본 없음') });
      var ok = !!rec && rec === latest;
      return el('span', { cls: 'chip ' + (ok && list.length <= 1 ? 'chip-ok' : 'chip-bad'),
        text: label + ' ' + pfx + latest + (!rec ? ' (기록 버전 미입력)' : rec !== latest ? ' (기록 ' + pfx + rec + ')' : ' ✓') });
    }
    return el('div', { cls: 'vc' }, [
      el('div', { cls: 'lots' }, [chip('도면', v.latestRev, v.recRev, 'Rev.', v.revs || []), chip('PLC', v.latestVer, v.recVer, 'V', [])]),
      v.issues.length ? el('ul', { cls: 'vc-issues' }, v.issues.map(function (t) { return el('li', { text: t }); })) : null,
      v.notes.length ? el('p', { cls: 'sub', text: v.notes.join(' · ') }) : null
    ]);
  }

  function projectRow(p) {
    var open = !!view.open[p.pj];
    var dd = p.dday === null ? '' : p.dday < 0 ? '납기 ' + (-p.dday) + '일 지남' : p.dday === 0 ? '오늘 납기' : 'D-' + p.dday;
    var left = p.left.filter(function (r) { return !view.owner || r.owner === view.owner; });
    var wrap = el('article', { cls: 'pj' + (p.pct === 100 ? ' pj-done' : '') }, [
      el('div', { cls: 'pj-h' }, [
        el('div', { cls: 'pj-id' }, [el('b', { cls: 'mono', text: p.pj }), el('span', { text: p.customer }), el('span', { cls: 'sub', text: p.name })]),
        el('div', { cls: 'pj-due ' + (p.dday !== null && p.dday <= 7 && p.pct < 100 ? 'hot' : '') }, [el('b', { text: dd || '납기 미입력' }), el('span', { cls: 'sub', text: p.due })]),
        el('div', { cls: 'pj-pr' }, [el('div', { cls: 'pbar', role: 'img', 'aria-label': '증빙 연결 ' + p.pct + '%' }, [el('span', { style: 'width:' + p.pct + '%' })]),
          el('span', { cls: 'sub' }, [el('b', { text: p.pct + '%' }), ' · 현재 ', el('b', { text: p.current }), autoSummary(p) + ' · 남은 기록 ' + p.left.length + '건' + (p.missing ? ' · 파일 없음 ' + p.missing : '')])])
      ]),
      stepper(p),
      lotChips(p),
      schedLine(p),
      vcLine(p),
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
          el('td', {}, [r.auto ? el('span', { cls: 'chip ' + (r.auto.examples || r.auto.planned ? 'chip-warn' : r.auto.state === '미작성' ? '' : 'chip-ok'), text: autoText(r.auto) }) : el('span', { cls: 'sub', text: '—' }),
            r.fromFat ? el('div', { cls: 'sub', text: 'FAT 입력 결과: ' + r.fromFat }) : null]),
          el('td', { cls: 'c-mono', text: r.loc }), el('td', { text: (r.issues || []).join(' · ') })]));
      });
      if (!left.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '9', cls: 'empty', text: '남은 기록이 없습니다.' })]));
      wrap.appendChild(el('div', { cls: 'table-wrap' }, [el('table', { cls: 'tbl' }, [
        el('thead', {}, [el('tr', {}, ['단계', '양식', '문서', '판넬', '담당', '상태', '파일 내용 (자동)', '파일 위치', '미충족 항목'].map(function (h) { return el('th', { text: h }); }))]), tb])]));
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
      ready += p.panels.filter(function (x) { return panelState(x) === 'FAT 합격 기록'; }).length;
    });
    k.appendChild(card('진행 프로젝트', String(all.filter(function (p) { return p.pct < 100; }).length), '전체 ' + all.length));
    k.appendChild(card('증빙 연결률', (recs ? Math.floor(done / recs * 100) : 0) + '%', done + ' / ' + recs + '건'));
    k.appendChild(card('남은 기록', String(left), '승인·해당없음 확인 항목 미충족', left ? 'warn' : ''));
    k.appendChild(card('납기 14일 이내', String(soon), '기록 미완료 프로젝트', soon ? 'warn' : ''));
    k.appendChild(card('출하 확인 필요 판넬', String(ready), 'FAT 합격 기록 · 출하 기록 전'));
    var lateN = all.filter(function (p) { return p.late && p.late.length; }).length;
    var exDocs = 0, writtenNotMarked = 0;
    all.forEach(function (p) { p.records.forEach(function (r) {
      if (r.auto && (r.auto.examples || r.auto.planned) && DONE.indexOf(r.status) >= 0) exDocs++;
      if (r.auto && r.status === '미작성' && /^작성완료/.test(r.auto.state)) writtenNotMarked++;
    }); });
    k.appendChild(card('예시·예정 남은 승인 문서', String(exDocs), exDocs ? "승인했는데 '예)'·'예정'이 남음" : '없음', exDocs ? 'warn' : ''));
    k.appendChild(card('작성됐는데 상태 미작성', String(writtenNotMarked), writtenNotMarked ? '파일은 작성완료 — 기록현황 상태 확인' : '없음', writtenNotMarked ? 'warn' : ''));
    k.appendChild(card('일정 지연', String(lateN), lateN ? '예정일 지났는데 기록 미완료' : '지연 없음', lateN ? 'warn' : ''));
    var vcBad = all.filter(function (p) { return p.vc && p.vc.issues.length; }).length;
    k.appendChild(card('도면·PLC 확인', String(vcBad), vcBad ? '버전 불일치·정리 필요 프로젝트' : '버전 경고 없음 · 미확인 자료 별도 확인', vcBad ? 'warn' : ''));
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
      el('p', { cls: 'help', text: '읽는 파일: 00_기록현황_*.xlsx(기록 상태), 05_FAT출하의 QF-04(판넬 LOT·출하)·FAT 결과, 00_프로젝트정보_*.json(입력 내용), 02_설계기준/도면_승인본과 07_PLC/릴리스의 파일 이름(최신 Rev·버전 확인). 같은 프로젝트의 묶음이 여러 개면 가장 최근 것만 셉니다. 파일은 이 화면 안에서만 읽고 어디로도 보내지 않습니다.' }),
      el('p', { cls: 'help', text: '프로젝트 기록의 증빙 연결률은 확인일·확인자·승인 증거 파일 연결(해당없음은 사유)을 대조합니다. 증거 경로는 프로젝트 폴더 기준 상대경로 또는 선택 폴더 내 경로로 입력하세요. 파일 내용·서명·승인 권한과 공통기록참조 시트의 전사 경영 기록은 담당자가 별도로 확인해야 합니다.' }),
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

  if (typeof module !== 'undefined' && module.exports) { A = { P: require('./project.js') }; module.exports = { parseIndex: parseIndex, parseQf04: parseQf04, recordIssues: recordIssues, recordDone: recordDone, panelState: panelState, summarize: summarize }; return; }

  window.IsoViews = window.IsoViews || {};
  window.IsoViews.dash = {
    show: function () { A = window.IsoApp; el = A.el; $ = A.$; render(); },
    _load: function (list) { return loadFiles(list).then(function (d) { render(); return d; }); },
    _data: function () { return data; }
  };
})();
