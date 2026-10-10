# 작업 규칙 (Claude Code 세션용)

## 비공개 자료 비밀번호
- 비밀번호는 **두 개뿐**이다.
  - **파트너 자료실 비밀번호** (`PRIVATE_PASS`): 파트너·고객사와 공유하는 잠금 파일·폴더(`members.html`·`files/private/`, 자료실 혁신제품 잠금 자료 `files/innov/private/` 등)는 몇 개든 이 하나로 통일한다. 새 파트너용 잠금 폴더도 같은 비밀번호로 암호화하고, 바꿀 때는 모든 파트너용 폴더를 함께 다시 암호화한다.
  - **내부 자료실 비밀번호** (`INTERNAL_PASS`): 대표만 쓰는 `internal.html`·`files/internal/`(사업자등록증·사업계획서 등 내부 서류). 파트너 비밀번호와 반드시 다르게 하고, 이 페이지는 메뉴·사이트맵·검색에 노출하지 않는다(robots 차단, noindex). 파트너용 자료를 여기에 섞지 않는다.
- 비밀번호는 저장소·코드·커밋 메시지·PR에 절대 적지 않는다. 환경변수 `PRIVATE_PASS` / `INTERNAL_PASS`로 받는다(없으면 사용자에게 요청).
- 암호화: `_src/private/encrypt.js` (`PRIVATE_OUT`으로 폴더 지정, 내부 자료실은 `PRIVATE_PASS="$INTERNAL_PASS" PRIVATE_OUT=files/internal`). 커밋 전 확인: `PRIVATE_PASS='…' INTERNAL_PASS='…' node _src/private/check.js` — 모든 비공개 폴더가 정해진 비밀번호로 열려야 한다.
- 원본(비공개 문서·docs.json·생성 스크립트)은 저장소 밖에 둔다. 공개 저장소이므로 암호화된 파일만 올린다. 자세한 방법은 `_src/private/README.md`.

## 국문·영문 일치
- **영문은 항상 국문과 같은 내용·구성으로 맞춘다.** 국문 페이지·PDF·자료실 목록·보도자료를 바꾸면 같은 작업(같은 PR)에서 영문(`en/` 페이지, 영문 PDF)도 고친다. 국문 전용으로 둔 것만 예외: 파트너 자료실(`members.html`), 내부 자료실(`internal.html`), `404.html`, `profile.html`, 네이버 확인 파일, 영업용 소개서·수소 소개서·리플렛·공급기업 설명서처럼 처음부터 국문판만 있는 PDF.
- 회사소개서: 국문 `_src/profile/build_profile_refs.py` ↔ 영문 `build_profile_refs_en.py`(실적 7장), 본문은 `base/profile_base_KR.pdf` · `base/profile_base_EN.pdf`를 함께 고친다. 장수가 바뀌면 메인(`index.html`, `en/index.html`) 숫자 칸과 자료실 표기도 고친다.
- 보도자료: 국문 `news-*.html`을 올리면 같은 이름의 `en/` 영문판, 국문·영문 보도자료 목록과 메인 미디어 목록(같은 순서), `sitemap.xml`의 hreflang 짝까지 함께 올린다.
- 커밋 전 확인: `python3 _src/check_ko_en.py` — 페이지 짝, 자료실 파일·건수, 보도자료 순서, 연혁, 회사소개서 장수가 모두 맞아야 한다.

## 저장소 용량
- 공개 저장소는 1GB 이하를 목표로 한다(GitHub 권장). 파일을 바꾸면 이전 판도 기록에 계속 남으므로 큰 파일은 신중히 올린다.
- 홈페이지에서 쓰지 않는 인쇄 원본(배너·리플렛·봉투)·영상 원본·작업용 시안은 저장소에 올리지 않고 구글 드라이브에 둔다. 저장소에는 페이지에 실제로 링크된 파일만 둔다.
- 비공개 자료를 추가·교체할 때는 `_src/private/encrypt.js`가 바뀐 자료만 새로 암호화한다. `PRIVATE_FULL=1`(전체 재암호화)은 비밀번호 유출 등 필요할 때만 쓴다.
