# 작업 규칙 (Claude Code 세션용)

## 비공개 자료 비밀번호
- 홈페이지의 비공개(잠금) 파일·폴더는 몇 개든 **비밀번호 하나로 통일**한다 — 파트너 자료실(`members.html`, `files/private/`) 비밀번호. 새 비공개 파일·폴더를 만들 때도 같은 비밀번호로 암호화하고, 비밀번호를 바꿀 때는 모든 비공개 폴더를 함께 다시 암호화한다.
- 비밀번호는 저장소·코드·커밋 메시지·PR에 절대 적지 않는다. 환경변수 `PRIVATE_PASS`로 받는다(없으면 사용자에게 요청).
- 암호화: `_src/private/encrypt.js` (`PRIVATE_OUT`으로 폴더 지정). 커밋 전 확인: `PRIVATE_PASS='…' node _src/private/check.js` — 모든 비공개 폴더가 열려야 한다.
- 원본(비공개 문서·docs.json·생성 스크립트)은 저장소 밖에 둔다. 공개 저장소이므로 암호화된 파일만 올린다. 자세한 방법은 `_src/private/README.md`.

## 국문·영문 일치
- **영문은 항상 국문과 같은 내용·구성으로 맞춘다.** 국문 페이지·PDF·자료실 목록·보도자료를 바꾸면 같은 작업(같은 PR)에서 영문(`en/` 페이지, 영문 PDF)도 고친다. 국문 전용으로 둔 것만 예외: 파트너 자료실(`members.html`), `404.html`, `profile.html`, 네이버 확인 파일, 영업용 소개서·수소 소개서·리플렛·공급기업 설명서처럼 처음부터 국문판만 있는 PDF.
- 회사소개서: 국문 `_src/profile/build_profile_refs.py` ↔ 영문 `build_profile_refs_en.py`(실적 7장), 본문은 `base/profile_base_KR.pdf` · `base/profile_base_EN.pdf`를 함께 고친다. 장수가 바뀌면 메인(`index.html`, `en/index.html`) 숫자 칸과 자료실 표기도 고친다.
- 보도자료: 국문 `news-*.html`을 올리면 같은 이름의 `en/` 영문판, 국문·영문 보도자료 목록과 메인 미디어 목록(같은 순서), `sitemap.xml`의 hreflang 짝까지 함께 올린다.
- 커밋 전 확인: `python3 _src/check_ko_en.py` — 페이지 짝, 자료실 파일·건수, 보도자료 순서, 연혁, 회사소개서 장수가 모두 맞아야 한다.
