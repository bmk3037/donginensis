# 홈페이지 SEO 점검

- `keywords.json` — 페이지별 목표 검색어 (국문 main/sub, 영문 en_main/en_sub)
- `check_seo.py` — 점검표: `python3 _src/seo/check_seo.py` (국문), `python3 _src/seo/check_seo.py en` (영문)
- 절차는 `.claude/skills/seo/SKILL.md`
- `indexnow.py` — 바뀐 페이지 주소를 IndexNow(네이버·빙)에 알림. 자동 실행: `.github/workflows/indexnow.yml`, 키 파일: 루트의 32자리 `.txt`

## 채널별 짧은 주소 (마케팅 분석)
- `donginensis.com/ig`·`/th`·`/yt`·`/nb`·`/np`·`/gb`는 인스타·스레드·유튜브·네이버 블로그·네이버 플레이스·구글 비즈니스 프로필에 거는 홈페이지 주소다. 접속하면 출처 표시(UTM)가 붙은 메인으로 바로 넘어가 GA4에서 채널별로 집계된다.
- 만들기·고치기: `python3 _src/seo/short_links.py` (채널 목록은 파일 안 `LINKS`). 이 페이지들은 검색에 나오지 않게 noindex이고, 사이트맵·IndexNow에서 빠진다.
- 행동 기록(GA4 이벤트, `js/site.js` 끝): 문의 전송 `generate_lead`, 전화 `phone_click`, 메일 `email_click`, SNS `sns_click`, PDF `doc_download`.
