# 홈페이지 SEO 점검

- `keywords.json` — 페이지별 목표 검색어 (국문 main/sub, 영문 en_main/en_sub)
- `check_seo.py` — 점검표: `python3 _src/seo/check_seo.py` (국문), `python3 _src/seo/check_seo.py en` (영문)
- 절차는 `.claude/skills/seo/SKILL.md`
- `indexnow.py` — 바뀐 페이지 주소를 IndexNow(네이버·빙)에 알림. 자동 실행: `.github/workflows/indexnow.yml`, 키 파일: 루트의 32자리 `.txt`
