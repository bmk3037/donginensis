# 작업 규칙 (Claude Code 세션용)

## 비공개 자료 비밀번호
- 홈페이지의 비공개(잠금) 파일·폴더는 몇 개든 **비밀번호 하나로 통일**한다 — 파트너 자료실(`members.html`, `files/private/`) 비밀번호. 새 비공개 파일·폴더를 만들 때도 같은 비밀번호로 암호화하고, 비밀번호를 바꿀 때는 모든 비공개 폴더를 함께 다시 암호화한다.
- 비밀번호는 저장소·코드·커밋 메시지·PR에 절대 적지 않는다. 환경변수 `PRIVATE_PASS`로 받는다(없으면 사용자에게 요청).
- 암호화: `_src/private/encrypt.js` (`PRIVATE_OUT`으로 폴더 지정). 커밋 전 확인: `PRIVATE_PASS='…' node _src/private/check.js` — 모든 비공개 폴더가 열려야 한다.
- 원본(비공개 문서·docs.json·생성 스크립트)은 저장소 밖에 둔다. 공개 저장소이므로 암호화된 파일만 올린다. 자세한 방법은 `_src/private/README.md`.
