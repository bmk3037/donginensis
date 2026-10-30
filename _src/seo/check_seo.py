"""홈페이지 SEO 점검 — 페이지별 목표 검색어(keywords.json)가 제목·설명·H1·본문에 들어갔는지, 기본 항목을 표로 보여 준다.

사용법
  python3 _src/seo/check_seo.py          # 국문
  python3 _src/seo/check_seo.py en       # 영문
기본 항목: 제목 길이(한글 15~40자 권장), 설명 길이(50~160자), H1 1개, 대체 글(alt) 없는 그림, canonical·hreflang, 사이트맵 포함 여부
"""
import html, json, os, re, sys

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EN = len(sys.argv) > 1 and sys.argv[1] == 'en'
KW = json.load(open(os.path.join(os.path.dirname(__file__), 'keywords.json'), encoding='utf-8'))
SITEMAP = open(os.path.join(SITE, 'sitemap.xml'), encoding='utf-8').read()


def text(s):
    s = re.sub(r'<(script|style|svg|noscript)[^>]*>.*?</\1>', ' ', s, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s)))


def one(r, s):
    m = re.search(r, s, re.S | re.I)
    return html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else ''


def check(page):
    p = os.path.join(SITE, 'en' if EN else '', page)
    s = open(p, encoding='utf-8').read()
    title, desc = one(r'<title>(.*?)</title>', s), one(r'<meta name="description" content="(.*?)"', s)
    h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    h1 = html.unescape(re.sub(r'<[^>]+>', '', h1s[0])).strip() if h1s else ''
    body = text(s[s.find('<body'):])
    noalt = [m for m in re.findall(r'<img\b[^>]*>', s) if not re.search(r'\balt="[^"]+"', m)]
    url = 'https://donginensis.com/' + ('en/' if EN else '') + ('' if page == 'index.html' else page)
    probs = []
    if not (15 <= len(title) <= (70 if EN else 40)): probs.append(f'제목 길이 {len(title)}')
    if not (50 <= len(desc) <= (160 if EN else 120)): probs.append(f'설명 길이 {len(desc)}')
    if len(h1s) != 1: probs.append(f'H1 {len(h1s)}개')
    if noalt: probs.append(f'alt 없는 그림 {len(noalt)}')
    if 'rel="canonical"' not in s: probs.append('canonical 없음')
    if 'hreflang=' not in s: probs.append('hreflang 없음')
    if url not in SITEMAP: probs.append('사이트맵에 없음')
    k = KW.get(page, {})
    # 여러 낱말 검색어는 사이에 조사·문장부호·짧은 말(6자 이내)이 끼어도 같은 것으로 본다: 「제어반을 제작」, 「제어반 설계·제작」
    def hit(w, t):
        parts = [re.escape(x) for x in w.lower().split()]
        return re.compile(r'.{0,6}?'.join(parts) if len(parts) > 1 else parts[0], re.S)
    rows = []
    for kind in ('main', 'sub'):
        for w in k.get(('en_' if EN else '') + kind, []):
            r = hit(w, None)
            rows.append((kind, w, bool(r.search(title.lower())), bool(r.search(desc.lower())), bool(r.search(h1.lower())), len(r.findall(body.lower()))))
    return title, desc, h1, probs, rows


def main():
    print(('[영문] ' if EN else '[국문] ') + 'SEO 점검\n')
    miss = 0
    for page in KW:
        if page.startswith('_'): continue
        title, desc, h1, probs, rows = check(page)
        print(f'■ {page}\n  제목: {title}\n  H1  : {h1}\n  점검: {", ".join(probs) if probs else "이상 없음"}')
        print('  검색어                     제목 설명 H1  본문')
        for kind, w, t, d, h, n in rows:
            need = (t and d and n) if kind == 'main' else (d or n >= 1)
            if not need: miss += 1
            mark = lambda b: ' O ' if b else ' - '
            print(f'  {"★" if kind == "main" else "·"} {w:<24}{mark(t)}  {mark(d)}  {mark(h)} {n:>3}{"" if need else "   ← 보강"}')
        print()
    print(f'보강할 곳 {miss}개' if miss else '모든 목표 검색어가 들어 있습니다.')


if __name__ == '__main__':
    main()
