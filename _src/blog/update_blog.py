"""네이버 블로그 3곳의 최신 글을 메인(index.html·en/index.html) '블로그 최신 글' 칸에 넣는다.

- 깃허브 자동 작업(.github/workflows/blog.yml)이 3시간마다 실행한다. 손으로 돌려도 된다: python3 _src/blog/update_blog.py
- 네이버 RSS(rss.blog.naver.com/<아이디>.xml)를 읽어 블로그마다 최근 글 POSTS개를 <!-- BLOG:START --> ~ <!-- BLOG:END --> 사이에 HTML로 쓴다.
  화면에서 바로 읽지 않고 미리 써 두는 이유: 네이버가 다른 사이트의 직접 읽기를 막고, 검색엔진도 글 제목을 읽을 수 있게.
- 글 목록이 그대로면 파일을 바꾸지 않는다(불필요한 커밋 방지). RSS를 못 읽은 블로그는 기존 내용을 그대로 둔다.
- 블로그를 늘리거나 이름을 바꿀 때는 아래 BLOGS와 메인 미디어 칸의 블로그 카드를 함께 고친다.
"""
import html
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POSTS = 3
KST = timezone(timedelta(hours=9))
BLOGS = [  # (네이버 아이디, 국문 이름, 영문 이름) — 메인 블로그 카드와 같은 순서
    ('donginensis', '설비 데이터', 'Equipment Data'),
]
PAGES = {'index.html': 'ko', 'en/index.html': 'en'}
START, END = '<!-- BLOG:START -->', '<!-- BLOG:END -->'


def fetch(bid):
    req = urllib.request.Request(f'https://rss.blog.naver.com/{bid}.xml', headers={'User-Agent': 'donginensis-site-bot'})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())
    posts = []
    for it in root.iter('item'):
        title = (it.findtext('title') or '').strip()
        link = (it.findtext('link') or '').strip().split('?')[0]
        try:
            d = parsedate_to_datetime(it.findtext('pubDate')).astimezone(KST)
        except Exception:
            continue
        if title and link.startswith('https://blog.naver.com/'):
            posts.append((title, link, d))
    posts.sort(key=lambda p: p[2], reverse=True)
    return posts[:POSTS]


def old_posts(text, bid):
    """기존 HTML에서 한 블로그의 글 목록을 다시 읽는다(RSS 실패 시 유지용)."""
    m = re.search(rf'<div class="bn-col" data-blog="{bid}">(.*?)</div>', text, re.S)
    if not m:
        return []
    out = []
    for u, t, d in re.findall(r'<a href="([^"]+)"[^>]*><span class="t">(.*?)</span><time datetime="([^"]+)"', m.group(1)):
        out.append((html.unescape(t), u, datetime.fromisoformat(d).replace(tzinfo=KST)))
    return out


def render(lang, data):
    en = lang == 'en'
    cols = []
    for bid, ko, eng in BLOGS:
        name = f'Naver Blog · {eng}' if en else f'네이버 블로그 · {ko}'
        items = ''.join(
            f'<li><a href="{html.escape(u)}" target="_blank" rel="noopener"><span class="t">{html.escape(t)}</span>'
            f'<time datetime="{d:%Y-%m-%d}">{d:%Y.%m.%d}</time></a></li>'
            for t, u, d in data[bid])
        more = 'More posts →' if en else '글 더보기 →'
        cols.append(f'<div class="bn-col" data-blog="{bid}"><h4><a href="https://blog.naver.com/{bid}" target="_blank" rel="noopener">{name}</a></h4>'
                    f'<ul>{items}</ul><a class="bn-more" href="https://blog.naver.com/{bid}" target="_blank" rel="noopener">{more}</a></div>')
    head = 'Latest blog posts <small>(in Korean)</small>' if en else '블로그 최신 글'
    return f'{START}\n    <div class="blog-new rv"><h3 class="press-h">{head}</h3><div class="bn-grid">{"".join(cols)}</div></div>\n    {END}'


def main():
    texts = {p: (ROOT / p).read_text(encoding='utf-8') for p in PAGES}
    data, failed = {}, []
    for bid, _, _ in BLOGS:
        try:
            data[bid] = fetch(bid)
            if not data[bid]:
                raise ValueError('글 없음')
        except Exception as e:
            failed.append(bid)
            print(f'{bid}: RSS 실패 ({e}) — 기존 목록 유지', file=sys.stderr)
            data[bid] = old_posts(texts['index.html'], bid)
    changed = []
    for p, lang in PAGES.items():
        t = texts[p]
        if START not in t or END not in t:
            sys.exit(f'{p}에 {START} / {END} 표시가 없습니다.')
        new = t[:t.index(START)] + render(lang, data) + t[t.index(END) + len(END):]
        if new != t:
            (ROOT / p).write_text(new, encoding='utf-8')
            changed.append(p)
    print('바뀐 파일:', ', '.join(changed) if changed else '없음')
    if len(failed) == len(BLOGS):
        sys.exit('모든 블로그 RSS를 읽지 못했습니다.')


if __name__ == '__main__':
    main()
