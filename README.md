# donginensis
## 배포
`main` 브랜치에 푸시하면 자동 배포됩니다.
- GitHub Pages: https://bmk3037.github.io/donginensis/ (홈페이지 본체, 도메인 donginensis.com)
- Cloudflare Workers: https://fancy-mud-ff3d.bmk3037.workers.dev/ — 옛 배너 QR 주소를 donginensis.com으로 바로 넘기는 용도만 합니다. 사이트 파일은 올리지 않습니다(설정 `wrangler.jsonc`, 코드 `_src/cloudflare/redirect.js`).

## 도메인
- 운영 주소: https://donginensis.com/ (GitHub Pages 커스텀 도메인, 저장소 루트 `CNAME` 파일)
- DNS: `donginensis.com` A 레코드 185.199.108~111.153, `www` CNAME → `bmk3037.github.io`
- 모든 페이지의 `og:url`·`og:image`는 `https://donginensis.com/...` 기준입니다.
- 네이버 서치어드바이저 소유확인 파일(`naver*.html`)은 삭제하지 마세요.

## 인쇄물 QR 안내 (전시회 배너)
- 새 배너 인쇄 파일 3종(아래 '인쇄 원본')은 QR이 정식 주소 `https://donginensis.com/?utm_source=banner&utm_medium=qr&utm_campaign=flyasia2026`로 바로 연결됩니다(2026.10 교체). 다시 인쇄할 때는 이 파일을 쓰세요.
- 그 전에 이미 인쇄한 2026년 전시회 배너 3종은 QR이 임시 주소(`https://fancy-mud-ff3d.bmk3037.workers.dev/`)로 되어 있고, 접속하면 Cloudflare가 페이지를 띄우지 않고 위 정식 주소로 바로 넘깁니다(302, `_src/cloudflare/redirect.js`, 2026.10~).
- **옛 배너를 쓰는 동안에는 Cloudflare Workers 배포(`fancy-mud-ff3d`)와 이 저장소 연결을 삭제하지 마세요.** 삭제하면 옛 배너 QR이 동작하지 않습니다. 옛 배너를 모두 폐기한 뒤에만 정리합니다.

## 인쇄 원본 (저장소 밖 보관)
배너·리플렛·봉투 인쇄 원본(옛 `exhibition/` 폴더, 약 91MB)은 홈페이지에서 쓰지 않아 저장소에서 뺐습니다(2026.10). 구글 드라이브에 보관하고, 저장소 기록에 남은 판은 아래 링크로 내려받을 수 있습니다.
- 배너 600×1800mm (QR 정식 주소판): [제조](https://github.com/bmk3037/donginensis/raw/e05ef64bcab1999b8c706f0b9801557a99fccbb5/exhibition/banner_print/dongin_banner_1_mfg_600x1800mm_150dpi.png) · [IT](https://github.com/bmk3037/donginensis/raw/e05ef64bcab1999b8c706f0b9801557a99fccbb5/exhibition/banner_print/dongin_banner_2_it_600x1800mm_150dpi.png) · [수소](https://github.com/bmk3037/donginensis/raw/e05ef64bcab1999b8c706f0b9801557a99fccbb5/exhibition/banner_print/dongin_banner_3_h2_600x1800mm_150dpi.png)
- 리플렛 A4 4쪽 최종(v8, CMYK·재단 3mm): [PDF](https://github.com/bmk3037/donginensis/raw/e05ef64bcab1999b8c706f0b9801557a99fccbb5/exhibition/leaflet/dongin_leaflet_v8_A4_4p_CMYK_print_bleed3mm.pdf)
- 봉투 330×245: [인쇄용 PDF](https://github.com/bmk3037/donginensis/raw/e05ef64bcab1999b8c706f0b9801557a99fccbb5/exhibition/envelope/dongin_envelope_330x245_print_CMYK_bleed3mm.pdf) · [가이드 PDF](https://github.com/bmk3037/donginensis/raw/e05ef64bcab1999b8c706f0b9801557a99fccbb5/exhibition/envelope/dongin_envelope_330x245_guide.pdf)
- 이전 판·미리보기 전체: [폴더 보기](https://github.com/bmk3037/donginensis/tree/e05ef64bcab1999b8c706f0b9801557a99fccbb5/exhibition)

## 비공개 자료 (비밀번호)
- 비밀번호가 걸린 자료는 파트너 자료실(`members.html` → `files/private/`)과 자료실 혁신제품 폴더의 잠금 행(`files/innov/private/`) 두 곳입니다. 저장소에는 암호화된 파일만 있고, 원본과 비밀번호는 저장소 밖에 둡니다.
- **비공개 파일·폴더의 비밀번호는 전부 하나로 통일합니다**(파트너 자료실 비밀번호). 새 비공개 자료를 올릴 때도 같은 비밀번호를 쓰고, 바꿀 때는 모두 함께 다시 암호화합니다. 방법과 확인 명령은 `_src/private/README.md`.

## 업데이트가 바로 안 보일 때
- CSS·JS는 브라우저가 최대 10분 캐시합니다. `css/style.css`나 `js/site.js`를 바꾸면 모든 페이지의 `?v=` 값을 새 값으로 올려 주세요.

## 보도자료 뉴스 페이지
- 보도자료 전문은 루트에 `news-*.html`로 올립니다 (예: `news-flyasia-2026.html`). 사진은 `img/news/`.
- 새 글을 올리면 `index.html` 미디어 > 보도자료 목록과 `news.html`(보도자료 전체 목록) 맨 위, `sitemap.xml`, `rss.xml`에 함께 추가하고, 네이버 서치어드바이저에서 웹 페이지 수집을 요청하세요.
- `press/` 폴더는 배포용 원고(Word·PDF·사진) 보관용이라 검색에서 제외했습니다 (`robots.txt`, `.assetsignore`).
