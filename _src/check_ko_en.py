"""국문·영문 일치 검사 — 영문은 항상 국문과 같은 내용·구성이어야 한다(CLAUDE.md 규칙).

검사 항목
  1. 국문 페이지마다 en/ 같은 이름의 영문 페이지가 있는지 (국문 전용 페이지는 KO_ONLY에 적어 둔 것만 예외)
  2. 자료실(resources.html ↔ en/resources.html)의 자료 파일 목록 · 폴더별 건수 · 전체 건수 표기
  3. 보도자료 목록 순서 (news.html ↔ en/news.html, 메인 미디어 index.html ↔ en/index.html)
  4. 회사소개 연혁(company.html ↔ en/company.html) 연도별 항목 수
  5. 회사소개서 PDF(국문 ↔ 영문) 장수, 메인 화면의 장수 표기
  6. 영문 페이지 · 영문 PDF에 옛 이름(Gijeon)이 없는지
실행: python3 _src/check_ko_en.py   (어긋난 곳이 있으면 목록을 출력하고 종료 코드 1)
"""
import os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
KO_ONLY = {'404.html', 'members.html', 'internal.html', 'profile.html', 'navercd5da1e18b67bfb5db7a114d9dc4b639.html'}  # 국문 전용으로 둔 페이지
bad = []


def t(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def ok(cond, msg):
    if not cond: bad.append(msg)


# 1. 페이지 짝
ko = {f for f in os.listdir(ROOT) if f.endswith('.html')}; en = {f for f in os.listdir(os.path.join(ROOT, 'en')) if f.endswith('.html')}
ok(not (ko - en - KO_ONLY), f'영문 페이지 없음: {sorted(ko - en - KO_ONLY)}')
ok(not (en - ko), f'국문 페이지 없음: {sorted(en - ko)}')

# 2. 자료실
def board(p):
    s = t(p); b = s[s.index('id="docBoard"'):s.index('id="dempty"')]
    secs = re.findall(r'<section class="rpanel" id="([^"]+)".*?</section>', b, re.S)
    bodies = re.findall(r'<section class="rpanel".*?</section>', b, re.S)
    files = sorted(set(h.replace('../', '', 1) for h in re.findall(r'href="((?:\.\./)?files/[^"]+)"', b)))
    counts = {i: len(re.findall(r'class="rrow[ "]', body)) for i, body in zip(secs, bodies)}
    label = re.search(r'id="dcount"[^>]*>([^<]+)<', s).group(1)
    return files, counts, label
fk, ck, lk = board('resources.html'); fe, ce, le = board('en/resources.html')
ok(fk == fe, f'자료실 파일 차이 — 국문만: {sorted(set(fk) - set(fe))} / 영문만: {sorted(set(fe) - set(fk))}')
ok(ck == ce, f'자료실 폴더별 건수 차이: { {k: (ck.get(k), ce.get(k)) for k in set(ck) | set(ce) if ck.get(k) != ce.get(k)} }')
n = sum(ck.values()); ok(lk == f'총 {n}건', f'국문 자료실 건수 표기 "{lk}" ≠ 총 {n}건')
n = sum(ce.values()); ok(le == f'{n} documents', f'영문 자료실 건수 표기 "{le}" ≠ {n} documents')

# 3. 보도자료 순서
for a, b in [('news.html', 'en/news.html'), ('index.html', 'en/index.html')]:
    la = list(dict.fromkeys(re.findall(r'href="(news-[^"]+\.html)"', t(a)))); lb = list(dict.fromkeys(re.findall(r'href="(news-[^"]+\.html)"', t(b))))
    ok(la == lb, f'보도자료 목록 순서 차이 {a} ↔ {b}: 국문 {la[:4]}… / 영문 {lb[:4]}…')

# 4. 연혁
def hist(p): return [len(re.findall(r'<li>', ul)) for ul in re.findall(r'<div class="hist-row[^"]*"><div class="y">[^<]+</div><ul>(.*?)</ul>', t(p))]
ok(hist('company.html') == hist('en/company.html'), f'연혁 연도별 항목 수 차이: 국문 {hist("company.html")} / 영문 {hist("en/company.html")}')

# 5. 회사소개서 PDF 장수와 메인 표기
try:
    import pymupdf as fitz
    pk = fitz.open(os.path.join(ROOT, 'files/DONG-IN-ENSIS_Company-Profile_KR.pdf')).page_count
    pe_doc = fitz.open(os.path.join(ROOT, 'files/DONG-IN-ENSIS_Company-Profile_EN.pdf')); pe = pe_doc.page_count
    ok(pk == pe, f'회사소개서 장수 차이: 국문 {pk} / 영문 {pe}')
    for p, n in [('index.html', pk), ('en/index.html', pe)]:
        m = re.search(r'<div class="prof-meta"><div><b>(\d+)</b>', t(p)); ok(m and int(m.group(1)) == n, f'{p} 회사소개서 장수 표기 {m.group(1) if m else "?"} ≠ PDF {n}장')
    ok(not any('Gijeon' in pg.get_text() for pg in pe_doc), '영문 회사소개서에 옛 이름(Gijeon) 있음')
except ImportError:
    print('(pymupdf 없음 — PDF 검사 생략)')

# 6. 영문 페이지 옛 이름
ok(not [f for f in en if 'Gijeon' in t(os.path.join('en', f))], '영문 페이지에 옛 이름(Gijeon) 있음')

if bad:
    print('국문·영문 불일치:'); [print(' -', b) for b in bad]; sys.exit(1)
print('국문·영문 일치 검사 통과')
