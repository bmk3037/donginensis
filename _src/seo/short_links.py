"""채널별 짧은 홈페이지 주소(donginensis.com/ig 등) 생성.

SNS·지도 프로필에 긴 출처 표시(UTM) 주소 대신 짧은 주소를 걸고, 이 페이지가 UTM 붙은 메인으로 바로 넘긴다.
GA4 「획득 > 트래픽 획득」에서 채널별로 따로 집계된다. 이 페이지에는 GA 태그가 없어 넘어간 메인에서 한 번만 집계된다.
채널을 더하거나 바꿀 때는 LINKS를 고치고 다시 실행한다: python3 _src/seo/short_links.py
"""
import os

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LINKS = {  # 짧은 주소: (utm_source, utm_medium, 설명)
    'ig': ('instagram', 'social', '인스타그램 프로필'),
    'th': ('threads', 'social', '스레드 프로필'),
    'yt': ('youtube', 'social', '유튜브 채널 정보'),
    'nb': ('naver_blog', 'social', '네이버 블로그 프로필'),
    'np': ('naver_place', 'local', '네이버 플레이스 홈페이지 칸'),
    'gb': ('google_business', 'local', '구글 비즈니스 프로필 웹사이트 칸'),
}

for key, (src, med, _) in LINKS.items():
    to = f'/?utm_source={src}&utm_medium={med}&utm_campaign=profile'
    os.makedirs(os.path.join(SITE, key), exist_ok=True)
    with open(os.path.join(SITE, key, 'index.html'), 'w') as f:
        f.write(f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>(주)동인엔시스</title><link rel="canonical" href="https://donginensis.com/">
<script>location.replace('{to}');</script>
<meta http-equiv="refresh" content="0;url={to}">
</head><body><a href="{to}">donginensis.com</a></body></html>
''')
    print(f'https://donginensis.com/{key}  →  {to}')
