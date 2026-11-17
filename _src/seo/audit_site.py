"""홈페이지 기술 SEO 전체 점검 (저장소 HTML을 그대로 읽는다, 인터넷 불필요).

쓰는 법:  python3 _src/seo/audit_site.py          # 문제만 출력, 문제가 있으면 종료 코드 1
          python3 _src/seo/audit_site.py --all    # 참고(INFO)까지 출력

검사 항목 (공개 SEO 점검 도구 claude-seo[MIT]의 seo-page·seo-technical·seo-hreflang·seo-sitemap·seo-images·seo-schema
점검 목록을 참고해 동인엔시스 정적 사이트에 맞게 다시 만든 것):
  깨진 링크   내부 링크·그림·영상·스크립트 파일이 있는지, 다른 페이지 #앵커가 실제로 있는지
  기본        lang·charset·viewport, 제목·설명 있음/길이/사이트 안 중복, H1 1개
  주소        canonical(절대 주소, 자기 자신), og:url = canonical, og:image 파일 있음
  국·영 짝    hreflang 자기 자신·되돌림(ko↔en)·x-default, 가리키는 페이지가 있는지
  그림        alt 없음, width/height 없음(화면 밀림), 첫 화면 그림 lazy 로딩, 500KB 넘는 그림
  구조화 데이터 JSON-LD 문법, @context, 주소(url·image·logo)가 절대 주소인지
  사이트맵    모든 주소가 실제 파일, noindex·robots 차단 페이지가 없는지, 색인 대상 페이지가 빠지지 않았는지, lastmod 형식
  기타        http:// 링크(https 아님), 글자 없는 링크
색인 대상: 루트·en/ 의 .html 중 noindex가 없는 페이지 (네이버 확인 파일 제외).
"""
import json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = 'https://donginensis.com'
SHOW_INFO = '--all' in sys.argv
SKIP_PAGES = {'navercd5da1e18b67bfb5db7a114d9dc4b639.html'}
BIG_IMG = 500 * 1024


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags, self.ids, self.title, self.h1, self.jsonld = [], set(), None, 0, []
        self._in, self._buf, self.links = None, [], []
        self._a = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append((tag, a, self.getpos()[0]))
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'a' and 'name' in a: self.ids.add(a['name'])
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self._in, self._buf = 'title', []
        if tag == 'script' and a.get('type') == 'application/ld+json': self._in, self._buf = 'ld', []
        if tag == 'a': self._a = [a, [], self.getpos()[0]]
        if tag == 'img' and self._a is not None: self._a[1].append(a.get('alt') or 'img')

    def handle_endtag(self, tag):
        if tag == 'title' and self._in == 'title': self.title = ''.join(self._buf).strip(); self._in = None
        if tag == 'script' and self._in == 'ld': self.jsonld.append((''.join(self._buf), self.getpos()[0])); self._in = None
        if tag == 'a' and self._a is not None: self.links.append(self._a); self._a = None

    def handle_data(self, d):
        if self._in: self._buf.append(d)
        if self._a is not None: self._a[1].append(d)


def rel(path): return os.path.relpath(path, ROOT)


def pages():
    out = []
    for d in ('', 'en'):
        for f in sorted(os.listdir(os.path.join(ROOT, d) if d else ROOT)):
            if f.endswith('.html') and f not in SKIP_PAGES:
                out.append(os.path.join(d, f) if d else f)
    return out


def url_of(page):
    p = '/' + page
    if p.endswith('/index.html'): p = p[:-len('index.html')]
    return SITE + p


def page_of(url):
    """사이트 주소 → 저장소 파일 경로 (없으면 None)"""
    u = urlparse(url)
    if u.netloc and u.netloc not in ('donginensis.com', 'www.donginensis.com'): return None
    p = unquote(u.path).lstrip('/')
    if p == '' or p.endswith('/'): p += 'index.html'
    return p


def main():
    probs, info = [], []
    add = lambda lv, pg, msg: (probs if lv == 'X' else info).append((pg, msg))
    meta, parsed = {}, {}
    plist = pages()
    for pg in plist:
        src = open(os.path.join(ROOT, pg), encoding='utf-8').read()
        p = P(); p.feed(src); parsed[pg] = (p, src)

    titles, descs = {}, {}
    for pg, (p, src) in parsed.items():
        base = os.path.dirname(pg)
        m = {}
        for tag, a, ln in p.tags:
            if tag == 'meta':
                k = a.get('name') or a.get('property') or ('charset' if 'charset' in a else None)
                if k: m.setdefault(k.lower(), a.get('content', a.get('charset', '')))
            if tag == 'link' and a.get('rel') == 'canonical': m['canonical'] = a.get('href', '')
            if tag == 'link' and a.get('rel') == 'alternate' and a.get('hreflang'): m.setdefault('hreflang', {})[a['hreflang']] = a.get('href', '')
            if tag == 'html': m['lang'] = a.get('lang', '')
        meta[pg] = m
        noindex = 'noindex' in (m.get('robots') or '')
        m['noindex'] = noindex
        en = pg.startswith('en/')

        # 기본
        if not m.get('lang'): add('X', pg, 'html lang 없음')
        if 'charset' not in m: add('X', pg, 'charset 없음')
        if 'viewport' not in m: add('X', pg, 'viewport 없음')
        if not p.title: add('X', pg, '제목(title) 없음')
        if not noindex:
            t = p.title or ''; d = m.get('description') or ''
            if not d: add('X', pg, '설명(description) 없음')
            tmax, dmin, dmax = (70, 70, 165) if en else (45, 40, 160)
            if len(t) > tmax: add('I', pg, f'제목이 김 {len(t)}자 (검색 결과에서 잘림)')
            if d and len(d) > dmax: add('I', pg, f'설명이 김 {len(d)}자')
            if d and len(d) < dmin: add('I', pg, f'설명이 짧음 {len(d)}자')
            titles.setdefault(t, []).append(pg); descs.setdefault(d, []).append(pg)
            if p.h1 != 1: add('X', pg, f'H1이 {p.h1}개 (1개여야 함)')
            # 주소
            can = m.get('canonical')
            if not can: add('X', pg, 'canonical 없음')
            elif can != url_of(pg) and not (pg.endswith('index.html') and can.rstrip('/') == url_of(pg).rstrip('/')):
                add('X', pg, f'canonical이 자기 주소가 아님: {can}')
            if m.get('og:url') and can and m['og:url'] != can: add('X', pg, f'og:url({m["og:url"]})이 canonical과 다름')
            og = m.get('og:image')
            if not og: add('I', pg, 'og:image 없음 (링크 미리보기 그림 없음)')
            elif page_of(og) and not os.path.exists(os.path.join(ROOT, page_of(og))): add('X', pg, f'og:image 파일 없음: {og}')
            # 국·영 짝
            hl = m.get('hreflang', {})
            if hl:
                me = 'en' if en else 'ko'
                if hl.get(me) != can: add('X', pg, f'hreflang {me}가 자기 주소가 아님')
                if 'x-default' not in hl: add('X', pg, 'hreflang x-default 없음')
                for lang, u in hl.items():
                    tp = page_of(u)
                    if tp is None or not os.path.exists(os.path.join(ROOT, tp)): add('X', pg, f'hreflang {lang} 대상 페이지 없음: {u}')

        # 구조화 데이터
        for raw, ln in p.jsonld:
            try:
                d = json.loads(raw)
            except Exception as e:
                add('X', pg, f'JSON-LD 문법 오류 ({ln}줄): {e}'); continue
            for node in (d if isinstance(d, list) else [d]):
                if isinstance(node, dict) and '@context' not in node: add('X', pg, f'JSON-LD @context 없음 ({ln}줄)')

            def walk(x, key=''):
                if isinstance(x, dict):
                    for k, v in x.items(): walk(v, k)
                elif isinstance(x, list):
                    for v in x: walk(v, key)
                elif isinstance(x, str) and key in ('url', 'image', 'logo', 'item', 'contentUrl', 'thumbnailUrl', 'mainEntityOfPage') and not x.startswith(('http://', 'https://')):
                    add('X', pg, f'JSON-LD {key}가 절대 주소가 아님: {x[:60]}')
                elif isinstance(x, str) and key in ('url', 'image', 'logo', 'contentUrl', 'thumbnailUrl') and page_of(x) and x.startswith(SITE):
                    f = page_of(x)
                    if not os.path.exists(os.path.join(ROOT, f)): add('X', pg, f'JSON-LD {key} 파일 없음: {x}')
            walk(d)

        # 링크·파일
        first_img = True
        for tag, a, ln in p.tags:
            refs = []
            if tag == 'a' and a.get('href'): refs.append(('href', a['href']))
            if tag in ('img', 'script', 'source', 'video', 'audio', 'iframe') and a.get('src'): refs.append(('src', a['src']))
            if tag == 'video' and a.get('poster'): refs.append(('poster', a['poster']))
            if tag == 'link' and a.get('rel') in ('stylesheet', 'icon', 'apple-touch-icon', 'preload') and a.get('href'): refs.append(('href', a['href']))
            for k in ('data-src-pc', 'data-src-m', 'data-poster-m', 'data-full', 'data-pop-thumb', 'data-narr'):
                if a.get(k): refs.append((k, a[k]))
            for k, v in refs:
                if v.startswith(('mailto:', 'tel:', 'javascript:', 'data:', '{', 'sms:')): continue
                if v.startswith('http://') and 'donginensis.com' not in v: add('I', pg, f'{ln}줄 http 링크(https 아님): {v[:70]}')
                u = urlparse(v)
                if u.scheme and u.netloc not in ('donginensis.com', 'www.donginensis.com'): continue
                path = unquote(u.path)
                if path.startswith('/'): tgt = path.lstrip('/')
                elif path == '': tgt = pg
                else: tgt = os.path.normpath(os.path.join(base, path))
                if tgt == '' or tgt.endswith('/') or os.path.isdir(os.path.join(ROOT, tgt)): tgt = os.path.join(tgt, 'index.html')
                if not os.path.exists(os.path.join(ROOT, tgt)):
                    add('X', pg, f'{ln}줄 깨진 링크({k}): {v}'); continue
                if u.fragment and tgt.endswith('.html') and k == 'href':
                    tp = parsed.get(tgt)
                    if tp is None and os.path.exists(os.path.join(ROOT, tgt)):
                        q = P(); q.feed(open(os.path.join(ROOT, tgt), encoding='utf-8').read()); parsed_extra = q
                        ids = q.ids
                    else:
                        ids = tp[0].ids if tp else set()
                    # 자료실은 js/site.js가 #cert → #cat-cert 폴더를 열어 준다
                    alias = {'smartfactory': 'supplier', 'datavoucher': 'supplier'}.get(u.fragment, u.fragment)
                    if u.fragment not in ids and not (tgt.endswith('resources.html') and 'cat-' + alias in ids):
                        add('X', pg, f'{ln}줄 없는 위치(#{u.fragment}): {v}')
            if tag == 'img':
                if 'alt' not in a: add('X', pg, f'{ln}줄 그림 alt 없음: {a.get("src", "")[:60]}')
                if not ('width' in a and 'height' in a) and 'aspect-ratio' not in (a.get('style') or ''):
                    add('I', pg, f'{ln}줄 그림 width/height 없음(화면 밀림 가능): {a.get("src", "")[:60]}')
                src_ = a.get('src', '')
                if first_img and not src_.endswith(('.svg',)) and 'logo' not in src_:
                    if a.get('loading') == 'lazy' and pg.startswith(('news-', 'en/news-')):
                        add('I', pg, f'{ln}줄 첫 화면 그림이 lazy 로딩(늦게 뜸): {src_[:60]}')
                    first_img = False
        for a, txt, ln in p.links:
            t = re.sub(r'\s+', '', ''.join(txt))
            if not t and not a.get('aria-label') and not a.get('title'): add('X', pg, f'{ln}줄 글자 없는 링크(aria-label 필요): {a.get("href", "")[:60]}')

    # 사이트 안 중복
    for t, pgs in titles.items():
        if t and len(pgs) > 1: add('X', ', '.join(pgs), f'제목 중복: {t[:50]}')
    for d, pgs in descs.items():
        if d and len(pgs) > 1: add('X', ', '.join(pgs), f'설명 중복: {d[:50]}')

    # 사이트맵·robots
    sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    locs = re.findall(r'<loc>([^<]+)</loc>', sm)
    robots = open(os.path.join(ROOT, 'robots.txt'), encoding='utf-8').read()
    dis = [l.split(':', 1)[1].strip() for l in robots.splitlines() if l.lower().startswith('disallow:') and l.split(':', 1)[1].strip()]
    seen = set()
    for u in locs:
        if u in seen: add('X', 'sitemap.xml', f'주소 중복: {u}')
        seen.add(u)
        f = page_of(u)
        if not f or not os.path.exists(os.path.join(ROOT, f)): add('X', 'sitemap.xml', f'파일 없는 주소: {u}'); continue
        if f in meta and meta[f].get('noindex'): add('X', 'sitemap.xml', f'noindex 페이지가 들어 있음: {u}')
        if any(urlparse(u).path.startswith(d) for d in dis): add('X', 'sitemap.xml', f'robots.txt가 막은 주소가 들어 있음: {u}')
        if f in meta and not meta[f].get('noindex') and meta[f].get('canonical') and meta[f]['canonical'] != u:
            add('X', 'sitemap.xml', f'canonical과 다른 주소: {u} (canonical {meta[f]["canonical"]})')
    for lm in re.findall(r'<lastmod>([^<]+)</lastmod>', sm):
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}(T[\d:]+(Z|[+-]\d{2}:\d{2}))?', lm): add('X', 'sitemap.xml', f'lastmod 형식 오류: {lm}')
    for pg in plist:
        if not meta[pg].get('noindex') and (meta[pg].get('canonical') or url_of(pg)) not in seen and pg != '404.html':
            add('X', pg, '색인 대상인데 사이트맵에 없음 (색인을 막을 페이지면 noindex)')

    # 큰 그림
    for d, _, fs in os.walk(os.path.join(ROOT, 'img')):
        for f in fs:
            fp = os.path.join(d, f)
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')) and os.path.getsize(fp) > BIG_IMG:
                add('I', rel(fp), f'그림이 큼 {os.path.getsize(fp) // 1024}KB (500KB 이하 권장)')

    for lv, rows in (('문제', probs), ('참고', info if SHOW_INFO else [])):
        if not rows: continue
        print(f'\n[{lv}] {len(rows)}건')
        for pg, msg in rows: print(f'  {pg}: {msg}')
    print(f'\n점검 {len(plist)}쪽 · 사이트맵 {len(locs)}개 주소 · 문제 {len(probs)}건 · 참고 {len(info)}건' + ('' if SHOW_INFO else ' (참고는 --all)'))
    if not probs: print('이상 없음')
    sys.exit(1 if probs else 0)


if __name__ == '__main__':
    main()
