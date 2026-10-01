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
