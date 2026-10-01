# donginensis
## 배포
`main` 브랜치에 푸시하면 아래 두 곳에 자동 배포됩니다.
- GitHub Pages: https://bmk3037.github.io/donginensis/
- Cloudflare Workers: https://fancy-mud-ff3d.bmk3037.workers.dev/ (설정: `wrangler.jsonc`)

## 도메인
- 운영 주소: https://donginensis.com/ (GitHub Pages 커스텀 도메인, 저장소 루트 `CNAME` 파일)
- DNS: `donginensis.com` A 레코드 185.199.108~111.153, `www` CNAME → `bmk3037.github.io`
- 모든 페이지의 `og:url`·`og:image`는 `https://donginensis.com/...` 기준입니다.
- 네이버 서치어드바이저 소유확인 파일(`naver*.html`)은 삭제하지 마세요.

## 인쇄물 QR 안내 (전시회 배너)
- 2026년 전시회 배너 3종의 QR은 임시 주소(`https://fancy-mud-ff3d.bmk3037.workers.dev/`)로 인쇄되어 있습니다.
- 접속하면 `https://donginensis.com/?utm_source=banner&utm_medium=qr&utm_campaign=flyasia2026`으로 자동 이동합니다 (각 페이지 `<head>`의 스크립트).
- **Cloudflare Workers 배포(`fancy-mud-ff3d`)와 이 저장소 연결은 삭제하지 마세요.** 삭제하면 인쇄된 배너 QR이 동작하지 않습니다.

## 업데이트가 바로 안 보일 때
- CSS·JS는 브라우저가 최대 10분 캐시합니다. `css/style.css`나 `js/site.js`를 바꾸면 모든 페이지의 `?v=` 값을 새 값으로 올려 주세요.

## 보도자료 뉴스 페이지
- 보도자료 전문은 루트에 `news-*.html`로 올립니다 (예: `news-flyasia-2026.html`). 사진은 `img/news/`.
- 새 글을 올리면 `index.html` 미디어 > 보도자료 목록과 `news.html`(보도자료 전체 목록) 맨 위, `sitemap.xml`, `rss.xml`에 함께 추가하고, 네이버 서치어드바이저에서 웹 페이지 수집을 요청하세요.
- `press/` 폴더는 배포용 원고(Word·PDF·사진) 보관용이라 검색에서 제외했습니다 (`robots.txt`, `.assetsignore`).
