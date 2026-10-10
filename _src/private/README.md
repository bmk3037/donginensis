# 파트너 자료실 (비밀번호)

**규칙: 홈페이지의 비공개(잠금) 파일·폴더는 몇 개든 비밀번호 하나로 통일합니다** — 파트너 자료실 비밀번호. 새 비공개 폴더를 만들 때도 같은 비밀번호로 암호화하고, 비밀번호를 바꿀 때는 모든 비공개 폴더를 함께 다시 암호화합니다. 확인: `PRIVATE_PASS='비밀번호' node _src/private/check.js` (모든 폴더가 열리면 OK).

`members.html`은 비밀번호를 아는 파트너·고객사만 열람하는 자료실입니다. 이 저장소는 **공개 저장소**이므로 원본 파일은 절대 올리지 않고, 암호화한 파일만 `files/private/`에 올립니다. 비밀번호를 입력하면 브라우저 안에서만 풀립니다.

- 암호화: AES-256-GCM, 키는 비밀번호에서 PBKDF2-SHA256 600,000회로 만듭니다.
- 파일 이름은 무작위이고, 자료 목록(`index.bin`)도 암호화되어 제목이 드러나지 않습니다.
- 비밀번호는 저장소·코드·커밋 메시지에 적지 않습니다.

## 자료 추가·교체, 비밀번호 변경

1. 저장소 **밖** 폴더에 원본 파일과 `docs.json`(목록)을 둡니다.

   ```json
   [{ "group": "가격 · 견적", "title": "가격정책 및 단가표 (DI-DS-02)", "desc": "Rev.00 · 4쪽", "file": "DI-DS-02_Rev00.pdf", "type": "application/pdf" }]
   ```

2. `PRIVATE_PASS='비밀번호' node _src/private/encrypt.js <원본 폴더>` — `files/private/`를 새로 만듭니다(전체 다시 암호화).
3. `files/private/`를 커밋·푸시합니다.

## 자료실 '혁신제품' 폴더의 잠금 자료 (`files/innov/private/`)

`resources.html`(국문·영문) 자료실의 **혁신제품** 폴더에도 같은 방식의 잠금 행이 있습니다(🔒 지능형 제어반 혁신제품 지정 추진 전략 DI-IN-02). 비밀번호는 파트너 자료실과 **같은 것**을 씁니다(한쪽을 바꾸면 두 폴더 모두 다시 암호화).

- 원본(DI-IN-02 PDF, docs.json, 생성 스크립트)은 저장소 밖에 둡니다. 핵심특허 내용·내부 일정이 들어 있어 공개 폴더(`files/innov/`)에는 올리지 않습니다.
- 교체·비밀번호 변경: `PRIVATE_OUT=files/innov/private PRIVATE_PASS='비밀번호' node _src/private/encrypt.js <원본 폴더>` → `files/innov/private/`를 새로 만들어 커밋·푸시합니다.
- 복호화 스크립트는 `resources.html`·`en/resources.html` 끝에 있습니다(`files/innov/private/index.bin`을 읽음).

## 내부 자료실 (`internal.html` · `files/internal/`) — 대표 전용

사업자등록증·공장등록증·수출실적·중소기업확인서·사업계획서처럼 지원사업·거래처 등록 때 자주 내는 내부 서류를 두는 곳입니다. 파트너 자료실과 **다른 비밀번호**(`INTERNAL_PASS`)를 쓰고, 국문 자료실(`resources.html`)의 파트너 자료실 아래 🔒 **내부 자료실** 칸으로 들어갑니다(영문판·메인 메뉴에는 없음). 사이트맵·검색에는 노출하지 않습니다(`robots.txt` 차단, `noindex`, 링크 `rel="nofollow"`). 칸이 보여도 비밀번호 없이는 목록조차 열리지 않습니다.

- 추가·교체: 저장소 밖 폴더에 원본과 `docs.json`을 두고
  `PRIVATE_OUT=files/internal PRIVATE_PASS="$INTERNAL_PASS" node _src/private/encrypt.js <원본 폴더>` → `files/internal/`를 커밋·푸시합니다.
- `docs.json`의 `group`은 예: "제출서류", "지원사업 · 사업계획서", "결과보고서", "회사 기본정보".
- 법인등기부등본·재무제표도 여기에 둘 수 있습니다(대표만 여는 곳). 다만 등기부등본은 보통 3개월 이내 발급본을 요구하므로 발급일을 `desc`에 적어 둡니다.
- 비밀번호는 12자 이상, 파트너 자료실과 다르게. 바꿀 때는 `files/internal/`만 다시 암호화하면 됩니다(파트너용 폴더와 독립).
- 확인: `PRIVATE_PASS='…' INTERNAL_PASS='…' node _src/private/check.js` (INTERNAL_PASS가 없으면 내부 자료실은 SKIP).

## 주의

- 비밀번호 하나를 함께 쓰는 방식이라 사용자별 기록이나 개별 차단은 없습니다. 퇴사·계약 종료 시에는 비밀번호를 바꿔 다시 암호화합니다.
- 비밀번호를 바꿔도 **이전 비밀번호로 암호화된 파일은 git 이력에 남습니다.** 이전 비밀번호를 아는 사람은 이력에서 옛 버전을 풀 수 있으므로, 유출이 의심되면 문서 자체도 개정합니다.
- 비밀번호는 12자 이상 무작위로 정합니다(짧으면 대입 공격에 약함).
- Claude Code(클라우드) 세션에서 암호화 작업을 시킬 때는 환경 설정의 환경변수 `PRIVATE_PASS`에 비밀번호를 넣어 두면 채팅에 적지 않아도 됩니다. 저장소에는 넣지 않습니다.
