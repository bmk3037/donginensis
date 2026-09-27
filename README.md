# donginensis
## 배포
`main` 브랜치에 푸시하면 아래 두 곳에 자동 배포됩니다.
- GitHub Pages: https://bmk3037.github.io/donginensis/
- Cloudflare Workers: https://fancy-mud-ff3d.bmk3037.workers.dev/ (설정: `wrangler.jsonc`)

## donginensis.com 도메인 연결 시 할 일
임시 주소를 카카오톡 등으로 공유할 때 예전 사이트 미리보기가 뜨지 않도록 아래 두 가지를 임시로 바꿔 두었습니다. 도메인을 연결하면 되돌립니다.
- 모든 페이지의 `og:url` 태그 제거 → 페이지별 `https://donginensis.com/...` 로 다시 추가
- `og:image` 주소 `https://fancy-mud-ff3d.bmk3037.workers.dev/img/og_image.jpg` → `https://donginensis.com/img/og_image.jpg`
- GitHub Pages로 연결하는 경우 저장소 루트에 `CNAME` 파일(내용: `donginensis.com`) 추가
