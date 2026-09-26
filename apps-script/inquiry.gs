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
var SKIP = ['website', 'agree'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var p = (e && e.parameter) || {};
    if (p.website) return ok_(); // 봇이 숨은 칸을 채운 경우 무시

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
    sheet.appendRow(headers.map(function (h) { return p[h] || ''; }));

    if (NOTIFY_EMAIL) {
      var body = headers.filter(function (h) { return p[h]; })
        .map(function (h) { return h + ': ' + p[h]; }).join('\n');
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: p.email || '',
        subject: '[홈페이지 문의] ' + (p.form_type || '') + ' - ' + (p.company || '') + ' ' + (p.name || ''),
        body: body + '\n\n문의 목록: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      });
    }
    return ok_();
  } finally {
    lock.releaseLock();
  }
}

function ok_() {
  return ContentService.createTextOutput('ok');
}
