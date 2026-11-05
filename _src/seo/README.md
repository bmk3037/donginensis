# 홈페이지 SEO 점검

- `keywords.json` — 페이지별 목표 검색어 (국문 main/sub, 영문 en_main/en_sub)
- `check_seo.py` — 점검표: `python3 _src/seo/check_seo.py` (국문), `python3 _src/seo/check_seo.py en` (영문)
- 절차는 `.claude/skills/seo/SKILL.md`
- `indexnow.py` — 바뀐 페이지 주소를 IndexNow(네이버·빙)에 알림. 자동 실행: `.github/workflows/indexnow.yml`, 키 파일: 루트의 32자리 `.txt`

## 채널별 짧은 주소 (마케팅 분석)
- `donginensis.com/ig`·`/th`·`/yt`·`/nb`·`/np`·`/gb`는 인스타·스레드·유튜브·네이버 블로그·네이버 플레이스·구글 비즈니스 프로필에 거는 홈페이지 주소다. 접속하면 출처 표시(UTM)가 붙은 메인으로 바로 넘어가 GA4에서 채널별로 집계된다.
- 만들기·고치기: `python3 _src/seo/short_links.py` (채널 목록은 파일 안 `LINKS`). 이 페이지들은 검색에 나오지 않게 noindex이고, 사이트맵·IndexNow에서 빠진다.
- 행동 기록(GA4 이벤트, `js/site.js` 끝): 문의 전송 `generate_lead`, 전화 `phone_click`, 메일 `email_click`, SNS `sns_click`, PDF `doc_download`.

## GA4·서치콘솔 → 구글 시트 자동 수집
- `.github/workflows/analytics.yml`이 매일 오전 6:17(한국 시간) `_src/seo/analytics_pull.py`를 돌려 지난 90일 데이터를 구글 시트 탭(일별·채널·페이지·행동·지역·검색어 등)에 덮어쓴다. 데이터는 저장소에 남기지 않는다.
- 설정: 저장소 Secrets `GA_SA_KEY`(서비스 계정 JSON), Variables `GA_PROPERTY_ID`·`GA_SHEET_ID`·`GSC_SITE`. 서비스 계정 이메일을 GA4(뷰어)·서치콘솔(제한된 사용자)·시트(편집자)에 추가한다. 설정 전에는 건너뛴다.
