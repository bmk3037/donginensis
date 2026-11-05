"""GA4·구글 서치콘솔 데이터를 구글 시트로 모은다(마케팅 분석·대시보드용).

GitHub Actions(.github/workflows/analytics.yml)가 매일 실행한다. 데이터는 저장소에 남기지 않고 시트에만 쓴다(공개 저장소).
필요한 설정(GitHub 저장소 Settings > Secrets and variables > Actions):
  비밀(Secrets)  GA_SA_KEY      서비스 계정 JSON 키 내용 전체
  변수(Variables) GA_PROPERTY_ID GA4 속성 ID(숫자, 관리 > 속성 세부정보)
                 GA_SHEET_ID    데이터를 받을 구글 시트 ID(주소의 /d/와 /edit 사이)
                 GSC_SITE       서치콘솔 속성(예: sc-domain:donginensis.com 또는 https://donginensis.com/), 없으면 건너뜀
서비스 계정 이메일을 GA4 속성(뷰어)·서치콘솔(제한된 사용자)·구글 시트(편집자)에 추가해야 한다.
로그에는 행 수만 찍는다(방문 데이터는 찍지 않는다).
"""
import datetime as dt, json, os, sys, urllib.parse

SCOPES = ['https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/spreadsheets']
EVENTS = ['generate_lead', 'phone_click', 'email_click', 'sns_click', 'doc_download']
DAYS = int(os.environ.get('GA_DAYS', '90'))


def ga(s, prop, dims, mets, limit=1000, event_filter=False, order=None):
    body = {'dateRanges': [{'startDate': f'{DAYS}daysAgo', 'endDate': 'today'}],
            'dimensions': [{'name': d} for d in dims], 'metrics': [{'name': m} for m in mets], 'limit': limit}
    if event_filter:
        body['dimensionFilter'] = {'filter': {'fieldName': 'eventName', 'inListFilter': {'values': EVENTS}}}
    if order:
        body['orderBys'] = [{'metric': {'metricName': order}, 'desc': True}]
    r = s.post(f'https://analyticsdata.googleapis.com/v1beta/properties/{prop}:runReport', json=body)
    if r.status_code != 200:
        raise RuntimeError(f'GA4 {dims}: {r.status_code} {r.json().get("error", {}).get("message", "")[:200]}')
    j = r.json()
    rows = [[v['value'] for v in row.get('dimensionValues', [])] + [num(v['value']) for v in row.get('metricValues', [])] for row in j.get('rows', [])]
    return [dims + mets] + rows


def num(v):
    try:
        f = float(v)
        return int(f) if f.is_integer() else round(f, 2)
    except ValueError:
        return v


def gsc(s, site, dim, limit=500):
    end = dt.date.today() - dt.timedelta(days=2)  # 서치콘솔은 2~3일 늦게 들어온다
    body = {'startDate': str(end - dt.timedelta(days=DAYS)), 'endDate': str(end), 'dimensions': [dim], 'rowLimit': limit}
    r = s.post(f'https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe="")}/searchAnalytics/query', json=body)
    if r.status_code != 200:
        raise RuntimeError(f'서치콘솔 {dim}: {r.status_code} {r.json().get("error", {}).get("message", "")[:200]}')
    rows = [[x['keys'][0], x['clicks'], x['impressions'], round(x['ctr'] * 100, 2), round(x['position'], 1)] for x in r.json().get('rows', [])]
    return [[dim, 'clicks', 'impressions', 'ctr_%', 'position']] + rows


def write(s, sheet, tabs):
    base = f'https://sheets.googleapis.com/v4/spreadsheets/{sheet}'
    have = {x['properties']['title'] for x in s.get(base, params={'fields': 'sheets.properties.title'}).json().get('sheets', [])}
    add = [{'addSheet': {'properties': {'title': t}}} for t in tabs if t not in have]
    if add:
        s.post(base + ':batchUpdate', json={'requests': add}).raise_for_status()
    for t, rows in tabs.items():
        rng = urllib.parse.quote(f"'{t}'", safe='')
        s.post(f'{base}/values/{rng}:clear').raise_for_status()
        s.put(f'{base}/values/{rng}!A1', params={'valueInputOption': 'RAW'}, json={'values': rows}).raise_for_status()
        print(f'{t}: {len(rows) - 1}행')


def main():
    key, prop, sheet = os.environ.get('GA_SA_KEY'), os.environ.get('GA_PROPERTY_ID'), os.environ.get('GA_SHEET_ID')
    if not (key and prop and sheet):
        print('GA_SA_KEY · GA_PROPERTY_ID · GA_SHEET_ID 설정 전이라 건너뜁니다.')
        return
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession
    s = AuthorizedSession(service_account.Credentials.from_service_account_info(json.loads(key), scopes=SCOPES))
    tabs, errs = {}, []
    jobs = {
        '일별': lambda: ga(s, prop, ['date'], ['totalUsers', 'newUsers', 'sessions', 'engagedSessions', 'screenPageViews']),
        '채널': lambda: ga(s, prop, ['sessionSourceMedium'], ['totalUsers', 'sessions', 'engagedSessions', 'userEngagementDuration', 'keyEvents'], order='totalUsers'),
        '채널_일별': lambda: ga(s, prop, ['date', 'sessionDefaultChannelGroup'], ['totalUsers', 'sessions'], limit=5000),
        '페이지': lambda: ga(s, prop, ['pagePath'], ['screenPageViews', 'totalUsers', 'userEngagementDuration'], limit=200, order='screenPageViews'),
        '행동_일별': lambda: ga(s, prop, ['date', 'eventName'], ['eventCount'], limit=5000, event_filter=True),
        '행동_채널': lambda: ga(s, prop, ['sessionSourceMedium', 'eventName'], ['eventCount'], event_filter=True),
        '행동_페이지': lambda: ga(s, prop, ['pagePath', 'eventName'], ['eventCount'], event_filter=True),
        '지역': lambda: ga(s, prop, ['city'], ['totalUsers', 'sessions'], limit=100, order='totalUsers'),
        '기기·언어': lambda: ga(s, prop, ['deviceCategory', 'language'], ['totalUsers'], order='totalUsers'),
    }
    site = os.environ.get('GSC_SITE')
    if site:
        jobs['검색어'] = lambda: gsc(s, site, 'query')
        jobs['검색_페이지'] = lambda: gsc(s, site, 'page')
    for name, fn in jobs.items():
        try:
            tabs[name] = fn()
        except Exception as e:
            errs.append(f'{name}: {e}')
    tabs['갱신'] = [['updated_at_kst', 'days', 'errors'],
                    [(dt.datetime.utcnow() + dt.timedelta(hours=9)).strftime('%Y-%m-%d %H:%M'), DAYS, ' | '.join(errs) or '없음']]
    write(s, sheet, tabs)
    for e in errs:
        print('오류', e)
    if len(errs) == len(jobs):
        sys.exit(1)


if __name__ == '__main__':
    main()
