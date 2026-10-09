/**
 * 동인엔시스 홈페이지 문의 수신용 Google Apps Script
 *
 * 설치 방법
 * 1. 문의를 쌓을 Google 스프레드시트를 새로 만든다.
 * 2. 메뉴 [확장 프로그램] → [Apps Script]를 열고, 기본 코드를 지운 뒤 이 파일 내용을 붙여넣는다.
 * 3. [배포] → [새 배포] → 유형 [웹 앱]
 *      - 다음 사용자 인증 정보로 실행: 나
 *      - 액세스 권한이 있는 사용자: 모든 사용자
 *    → [배포] 후 권한 승인, 발급된 웹 앱 URL(https://script.google.com/macros/s/.../exec)을 복사한다.
 * 4. 그 URL을 js/site.js 의 FORM_ENDPOINT 에 넣는다.
 */

// 새 문의가 들어오면 알림 메일을 받을 주소 (여러 개는 쉼표로 구분, 비우면 메일 안 보냄)
var NOTIFY_EMAIL = 'dongin@donginmne.com';

// 시트에 기록할 열 순서 (폼에 없는 항목은 빈칸, 새 항목은 자동으로 오른쪽에 추가)
var BASE_COLUMNS = ['submitted_at', 'form_type', 'lang', 'company', 'name', 'position', 'phone', 'email',
  'region', 'equipment', 'scale', 'control_type', 'interest', 'biz_area', 'collab_type', 'timeline',
  'message', 'page', 'referrer', 'utm_source', 'utm_medium', 'utm_campaign'];

// 저장하지 않을 항목 (스팸 차단용 숨은 칸, 동의 체크박스)
var SKIP = ['website', 'agree', 'elapsed_ms'];

// 스팸 차단 기준
var MIN_ELAPSED_MS = 3000;   // 폼을 연 뒤 3초 안에 제출하면 자동 입력으로 봄
var MAX_LINKS = 2;          // 문의 내용에 링크가 3개 이상이면 차단
var MAX_PER_10MIN = 20;     // 10분 동안 전체 접수 20건 초과 시 차단 (대량 공격 방지)
var DUP_WINDOW_SEC = 600;   // 같은 이메일·내용은 10분 안에 한 번만 접수

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var p = (e && e.parameter) || {};
    if (p.website) return ok_(); // 봇이 숨은 칸을 채운 경우 무시
    var blocked = spamReason_(p);
    if (blocked) { logBlocked_(p, blocked); return ok_(); } // 스팸으로 판단되면 저장·알림 없이 종료

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    if (!headers.length) {
      headers = BASE_COLUMNS.slice();
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
    Object.keys(p).forEach(function (k) {
      if (SKIP.indexOf(k) < 0 && headers.indexOf(k) < 0) {
        headers.push(k);
        sheet.getRange(1, headers.length).setValue(k);
      }
    });
    // 모든 칸을 텍스트로 저장 (전화번호 앞자리 0이 사라지지 않도록)
    var row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, headers.length).setNumberFormat('@')
      .setValues([headers.map(function (h) { return p[h] || ''; })]);

    if (NOTIFY_EMAIL) {
      var body = headers.filter(function (h) { return p[h]; })
        .map(function (h) { return h + ': ' + p[h]; }).join('\n');
      try {
        MailApp.sendEmail({
          to: NOTIFY_EMAIL,
          replyTo: p.email || '',
          subject: '[홈페이지 문의] ' + (p.form_type || '') + ' - ' + (p.company || '') + ' ' + (p.name || ''),
          body: body + '\n\n문의 목록: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
        });
      } catch (err) {
        console.error('알림 메일 발송 실패: ' + err); // 문의는 시트에 이미 저장됨
      }
    }
    return ok_();
  } finally {
    lock.releaseLock();
  }
}

// 스팸 여부 판단. 문제가 없으면 빈 문자열을 돌려준다.
function spamReason_(p) {
  var ms = parseInt(p.elapsed_ms, 10);
  if (!(ms >= MIN_ELAPSED_MS)) return '제출 시간 이상(' + (p.elapsed_ms || '없음') + ')';
  if (!p.company || !p.name || !(p.email || p.phone)) return '필수 항목 누락';
  var links = ((p.message || '') + ' ' + (p.company || '')).match(/https?:\/\/|www\./gi);
  if (links && links.length > MAX_LINKS) return '링크 과다';
  var cache = CacheService.getScriptCache();
  var bucket = 'cnt_' + Math.floor(Date.now() / 600000);
  var cnt = parseInt(cache.get(bucket) || '0', 10) + 1;
  cache.put(bucket, String(cnt), 900);
  if (cnt > MAX_PER_10MIN) return '단시간 대량 접수';
  var key = 'dup_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,
    (p.email || '') + '|' + (p.phone || '') + '|' + (p.message || '')));
  if (cache.get(key)) return '중복 접수';
  cache.put(key, '1', DUP_WINDOW_SEC);
  return '';
}

// 차단된 접수는 '차단 기록' 시트에 간단히 남긴다 (알림 메일 없음)
function logBlocked_(p, reason) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('차단 기록') || ss.insertSheet('차단 기록');
    if (!sh.getLastRow()) sh.appendRow(['blocked_at', 'reason', 'company', 'name', 'email', 'page']);
    if (sh.getLastRow() > 5000) return; // 기록이 너무 많아지면 더 쌓지 않음
    sh.appendRow([new Date().toISOString(), reason, (p.company || '').slice(0, 80), (p.name || '').slice(0, 40), (p.email || '').slice(0, 80), p.page || '']);
  } catch (err) {
    console.error('차단 기록 실패: ' + err);
  }
}

function ok_() {
  return ContentService.createTextOutput('ok');
}
