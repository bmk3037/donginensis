"""마케팅 대시보드 데이터 만들기: GA4 Reports Builder가 채우는 구글 시트 → 대시보드용 JSON 4개.

사용: python3 _src/marketing/dashboard_data.py <시트 ID> <출력 폴더>
- 시트는 '링크가 있는 모든 사용자: 뷰어'로 공유돼 있어야 한다(탭 일별·채널·페이지·행동).
- 시트 ID와 만든 JSON(방문 통계)은 공개 저장소에 올리지 않는다. 출력 폴더는 저장소 밖(작업용 임시 폴더)으로.
- 출력: daily.json · channels.json · pages.json · events.json → 대시보드(claude.ai Artifact)의 같은 이름 데이터로 올린다.
"""
import collections, csv, io, json, os, sys, urllib.parse, urllib.request

SPAM = {'devilfinder.com', 'snappyfingers.com', 'finday.com', 'egerin.com'}  # 광고·봇이 남기는 가짜 유입
KEY = {'file_download': '자료 내려받기', 'form_start': '문의 양식 작성 시작', 'click': '외부 링크 클릭', 'generate_lead': '문의 전송',
       'phone_click': '전화 클릭', 'email_click': '메일 클릭', 'sns_click': 'SNS 버튼 클릭', 'doc_download': '회사소개서 등 PDF 받기'}
SECTIONS = {'/company.html': '회사소개', '/resources.html': '자료실', '/manufacturing.html': '제조기업 도입', '/manufacturing': '제조기업 도입',
            '/applications.html': '적용 분야', '/applications': '적용 분야', '/partner.html': 'IT기업 협업', '/partner': 'IT기업 협업',
            '/digital-twin.html': '디지털트윈', '/plc-programming.html': 'PLC 프로그램 개발',
            '/members.html': '파트너 자료실(잠금)', '/internal.html': '내부 자료실(잠금)'}


def tab(sheet, name):
    url = f'https://docs.google.com/spreadsheets/d/{sheet}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(name)}'
    with urllib.request.urlopen(url, timeout=60) as r:
        return list(csv.reader(io.StringIO(r.read().decode('utf-8'))))


def channel(s):
    s0 = s.split(' / ')[0]
    if s == '(direct) / (none)': return '직접 방문'
    if s0 == 'google': return '구글 검색'
    if s0 in ('naver', 'm.search.naver.com'): return '네이버 검색'
    if s0.startswith('naver_blog') or 'blog.naver' in s0 or 'naverblogwidget' in s0: return '네이버 블로그'
    if 'threads' in s0: return '스레드'
    if s0 in ('ig', 'instagram') or 'instagram' in s0: return '인스타그램'
    if 'facebook' in s0: return '페이스북'
    if s0 in ('chatgpt.com', 'doubao.com', 'perplexity.ai', 'gemini.google.com', 'claude.ai') or 'ai-assistant' in s: return 'AI 검색'
    if s.endswith('/ qr'): return '인쇄물 QR'
    if 'place.naver' in s0 or s0 in ('naver_place', 'google_business'): return '네이버 플레이스' if 'naver' in s0 else '구글 비즈니스'
    if 'youtube' in s0: return '유튜브'
    if s0 in SPAM: return '스팸'
    return '기타'


def section(p):
    if p in ('/', '/index.html') or p.startswith('/?'): return '메인'
    if p.startswith('/en'): return '영문 페이지'
    if p.startswith('/news'): return '보도자료'
    return SECTIONS.get(p, '기타')


def after(rows, head):
    i = next(i for i, r in enumerate(rows) if r and r[0] == head)
    return rows[i + 1:]


def ymd(d):
    return f'{d[:4]}-{d[4:6]}-{d[6:]}'


def main(sheet, out):
    os.makedirs(out, exist_ok=True)
    daily = sorted(({'day': ymd(r[0]), 'users': int(r[1]), 'newUsers': int(r[2]), 'sessions': int(r[3])}
                    for r in tab(sheet, '일별') if r and r[0].isdigit() and len(r[0]) == 8), key=lambda x: x['day'])
    ch = [{'source': r[0], 'channel': channel(r[0]), 'users': int(r[1]), 'sessions': int(r[2]), 'engagedSessions': int(r[3])}
          for r in after(tab(sheet, '채널'), 'sessionSourceMedium') if r and r[0] and r[1] and channel(r[0]) != '스팸']
    pg = [{'path': r[0], 'section': section(r[0]), 'views': int(r[1]), 'users': int(r[2]), 'engagementSec': int(float(r[3]))}
          for r in after(tab(sheet, '페이지'), 'pagePath') if r and r[0].startswith('/')]
    ev = collections.Counter()
    for r in tab(sheet, '행동'):
        if r and r[0].isdigit() and len(r) > 3 and r[1] in KEY and channel(r[2]) != '스팸':
            ev[(ymd(r[0]), r[1], r[2])] += int(float(r[3] or 0))
    evr = [{'day': d, 'event': e, 'action': KEY[e], 'source': s, 'channel': channel(s), 'count': n} for (d, e, s), n in sorted(ev.items())]
    for name, data in (('daily', daily), ('channels', ch), ('pages', pg), ('events', evr)):
        with open(os.path.join(out, name + '.json'), 'w') as f:
            json.dump(data, f, ensure_ascii=False)
        print(f'{name}: {len(data)}행')
    if daily:
        print('기간', daily[0]['day'], '~', daily[-1]['day'])


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
