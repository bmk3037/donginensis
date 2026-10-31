"""IndexNow — 바뀐 페이지 주소를 검색엔진(네이버·빙 등)에 알린다. GitHub Actions(.github/workflows/indexnow.yml)에서 실행.

  python3 _src/seo/indexnow.py urls          # 바뀐 페이지 주소 출력 (BEFORE 환경변수 = 이전 커밋, ALL=true면 사이트맵 전체)
  python3 _src/seo/indexnow.py send 목록.txt  # 목록의 주소를 보냄
  python3 _src/seo/indexnow.py send-all       # 사이트맵의 모든 주소를 보냄 (처음 한 번·큰 변경 때)
검색에서 빼 둔 페이지(내부·파트너 자료실, 404, 소개서 보기, 네이버 확인 파일)는 보내지 않는다.
"""
import glob, json, os, re, subprocess, sys, urllib.request

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HOST = 'donginensis.com'
SKIP = {'internal.html', 'members.html', '404.html', 'profile.html'}
ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow']


def key():
    ks = [os.path.basename(p)[:-4] for p in glob.glob(os.path.join(SITE, '*.txt')) if re.fullmatch(r'[0-9a-f]{32}\.txt', os.path.basename(p))]
    if len(ks) != 1: sys.exit('루트에 IndexNow 키 파일(32자리.txt)이 하나 있어야 합니다.')
    return ks[0]


def url_of(path):
    path = path.replace('\\', '/')
    if not path.endswith('.html') or path.startswith(('_src/', 'files/', '.')) or os.path.basename(path) in SKIP or os.path.basename(path).startswith('naver'): return None
    if path.count('/') > 1 or (path.count('/') == 1 and not path.startswith('en/')): return None
    page = path.split('/')[-1]
    base = f'https://{HOST}/' + ('en/' if path.startswith('en/') else '')
    return base + ('' if page == 'index.html' else page)


def sitemap_urls():
    return re.findall(r'<loc>([^<]+)</loc>', open(os.path.join(SITE, 'sitemap.xml'), encoding='utf-8').read())


def changed():
    if os.environ.get('ALL') == 'true': return sitemap_urls()
    before = os.environ.get('BEFORE', '')
    rng = f'{before}..HEAD' if before and not set(before) <= {'0'} else 'HEAD~1..HEAD'
    files = subprocess.run(['git', 'diff', '--name-only', rng], capture_output=True, text=True, cwd=SITE).stdout.split()
    out = [u for u in map(url_of, files) if u]
    return sorted(set(out))


def send(urls):
    urls = [u for u in urls if u.startswith(f'https://{HOST}/')]
    if not urls: print('보낼 주소 없음'); return
    k = key()
    body = json.dumps({'host': HOST, 'key': k, 'keyLocation': f'https://{HOST}/{k}.txt', 'urlList': urls[:10000]}).encode()
    for ep in ENDPOINTS:
        req = urllib.request.Request(ep, data=body, headers={'Content-Type': 'application/json; charset=utf-8'})
        try:
            with urllib.request.urlopen(req, timeout=30) as r: print(ep, r.status, len(urls), '건')
        except urllib.error.HTTPError as e: print(ep, 'HTTP', e.code, e.read()[:200])
        except Exception as e: print(ep, '실패', e)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'urls': print('\n'.join(changed()))
    elif cmd == 'send': send([l.strip() for l in open(sys.argv[2]) if l.strip()])
    elif cmd == 'send-all': send(sitemap_urls())
    else: print(__doc__)
