# 인스타그램 카드뉴스 자동 생성

홈페이지(`index.html`, `company.html`)의 문구만 그대로 옮겨 8개 게시물 × 4~10장의
카드뉴스 이미지를 만드는 스크립트입니다. 회사 계정이 아직 개인 계정이라 API 자동
게시는 하지 않고, 이미지 + 캡션을 만들어 손으로 업로드하는 방식입니다.

## 구성
- `posts.json` — 게시물별 캡션·해시태그·슬라이드 콘텐츠 (문구는 전부 홈페이지 인용)
- `generate_cards.py` — `posts.json` → `output/<post_id>/slide_NN.jpg`(1080×1350, 4:5) + `caption.txt`
- `fonts/` — Pretendard OTF (오픈소스, SIL OFL 1.1)

## 사용법
```bash
pip install pillow
python3 instagram/generate_cards.py                  # 전체 게시물
python3 instagram/generate_cards.py 02_intelligent_panel   # 특정 게시물만
```

`instagram/output/`에 게시물마다 폴더가 생성됩니다. 인스타그램 앱에서 슬라이드
순서대로(카드뉴스) 올리고, `caption.txt` 내용을 캡션으로 붙여넣으면 됩니다.

## 콘텐츠 추가·수정
`posts.json`에 게시물 객체를 추가하면 됩니다. 슬라이드 `type`은 다음 중 하나:
`cover`(표지) · `timeline`(연혁/절차) · `stats`(숫자) · `list`(번호 목록) ·
`issue`(문제 제기, 어두운 배경) · `chips`(태그 나열) · `flow`(구성도 비교) ·
`split`(좌우 비교) · `photo`(현장 사진 + 배지) · `cta`(마무리 행동 유도).

배경 이미지(`bg`)는 저장소 루트 기준 상대경로(`../video/...`, `../img/...`)로 지정합니다.

## 추후 자동 게시로 확장하려면
- 회사 인스타그램을 비즈니스/크리에이터 계정으로 전환하고 Facebook 페이지에 연결
- Meta for Developers에서 앱 생성 → Instagram Graph API 권한(`instagram_content_publish` 등) 승인
- `generate_cards.py`가 만든 이미지를 퍼블릭 URL(예: 이 저장소의 GitHub Pages)로 올린 뒤
  Graph API `media` → `media_publish` 순으로 예약 게시하는 스크립트를 추가하면 됩니다.
