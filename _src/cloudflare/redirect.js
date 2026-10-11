// 옛 전시회 배너 QR(https://fancy-mud-ff3d.bmk3037.workers.dev/) → 정식 주소로 바로 이동
// 페이지를 띄우지 않고 Cloudflare에서 즉시 넘깁니다. 배너 유입 집계용 UTM은 그대로 붙입니다.
const HOME = 'https://donginensis.com';
const UTM = '?utm_source=banner&utm_medium=qr&utm_campaign=flyasia2026';

export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(HOME + url.pathname + (url.search || UTM), 302);
  },
};
