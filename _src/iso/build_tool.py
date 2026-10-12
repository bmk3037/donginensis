"""ISO 기록 묶음 생성기(브라우저 도구) 빌드.

forms_data.py의 양식 정의를 JSON으로 바꿔 tool/ 폴더의 HTML·JS에 넣고,
한 파일짜리 도구를 만든다.

    python3 _src/iso/build_tool.py

결과
  _src/iso/tool/dist/ISO-기록생성기.html   공용 저장소에 두고 크롬으로 여는 파일
  _src/iso/tool/dist/artifact.html          claude.ai 아티팩트 게시용(문서 머리 없음)
  _src/iso/tool/dist/forms.json             양식 정의(테스트용)
  files/iso/ISO-record-builder.html         홈페이지 자료실 게시본(위 HTML과 같음)
"""
import base64
import json
import os

import forms_data as D

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(HERE, 'tool')
DIST = os.path.join(TOOL, 'dist')

# 프로젝트 기록으로 쓰는 양식만 넣는다(연간·전사 양식은 기록양식집 원본을 쓴다)
PROJECT_FORMS = ['PF-00', 'QF-02', 'QF-03', 'QF-04', 'QF-05', 'QF-06', 'QF-06-1', 'QF-07', 'QF-08',
                 'QF-09', 'QF-15', 'QF-16', 'SF-02', 'SF-03']


def to_json_spec(spec):
    out = {}
    for k, v in spec.items():
        if callable(v):
            continue
        if k == 'dv':
            v = {str(c): ({'whole': list(o)} if isinstance(o, tuple) else list(o)) for c, o in v.items()}
        elif k in ('formulas', 'formats'):
            v = {str(c): o for c, o in v.items()}
        elif k == 'risk_cf':
            v = {str(c): list(o) for c, o in v.items()}
        elif k == 'fields':
            v = [[[f[0], list(f[1]) if len(f) > 1 and f[1] else None] for f in row] for row in v]
        elif k == 'sign':
            v = list(v) if v is not None else None
        elif k == 'cols':
            v = [[n, w] for n, w in v]
        out[k] = v
    return out


def logo_svg():
    """CI 로고(벡터)의 안쪽 그림. 명판·라벨에 색을 바꿔 넣는다(파랑 #1857A5, i 점 빨강 #E83E30)."""
    import re
    path = os.path.join(HERE, '..', '..', 'files', 'brand', 'logo', 'DONG-IN-ENSIS_logo_color.svg')
    with open(path, encoding='utf-8') as f:
        svg = f.read()
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    inner = svg[svg.index('>', svg.index('<svg')) + 1:svg.rindex('</svg>')]
    inner = re.sub(r'\s+', ' ', inner).strip()
    return {'viewBox': vb, 'inner': inner}


def export():
    by_code = {s['code']: s for s in D.FORMS}
    forms = {code: to_json_spec(by_code[code]) for code in PROJECT_FORMS}
    common = [{key: s.get(key, '') for key in ('code', 'title', 'owner', 'when', 'keep', 'clause')}
              for s in D.FORMS if s['code'] not in PROJECT_FORMS]
    # 회사 단위 양식 전체 정의(05 회사 연간 기록 탭에서 양식을 채워 만든다)
    company = {s['code']: to_json_spec(s) for s in D.FORMS if s['code'] not in PROJECT_FORMS}
    return {'rev': D.REV, 'date': D.DATE, 'effective': getattr(D, 'EFFECTIVE', D.DATE), 'forms': forms, 'common': common, 'company': company}


def build():
    os.makedirs(DIST, exist_ok=True)
    data = export()
    with open(os.path.join(DIST, 'forms.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(os.path.join(HERE, 'logo.png'), 'rb') as f:
        logo = base64.b64encode(f.read()).decode()

    def read(name):
        with open(os.path.join(TOOL, name), encoding='utf-8') as f:
            return f.read()

    page = read('page.html')
    page = page.replace('/*@CSS@*/', read('app.css'))
    with open(os.path.join(TOOL, 'logo_white.png'), 'rb') as f:
        page = page.replace('@LOGO_WHITE@', 'data:image/png;base64,' + base64.b64encode(f.read()).decode())
    script = ('window.ISO_FORMS = ' + json.dumps(data, ensure_ascii=False) + ';\n'
              + 'window.ISO_LOGO = "' + logo + '";\n'
              + 'window.ISO_LOGO_SVG = ' + json.dumps(logo_svg()) + ';\n'
              + read('engine.js') + '\n' + read('project.js') + '\n' + read('samples.js') + '\n' + read('app.js')
              + '\n' + read('labels.js') + '\n' + read('fat.js') + '\n' + read('dash.js') + '\n' + read('annual.js') + '\n' + read('quote.js'))
    page = page.replace('/*@SCRIPT@*/', script.replace('</script', '<\\/script'))
    with open(os.path.join(DIST, 'artifact.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    # 홈페이지판: 바탕화면 설치(웹 앱)와 오프라인 캐시. 매니페스트·서비스워커는 files/iso/에 함께 둔다.
    pwa = ('<link rel="manifest" href="iso-tool.webmanifest">\n<meta name="theme-color" content="#0f2a4a">\n'
           '<link rel="apple-touch-icon" href="../../apple-touch-icon.png">\n'
           # 새 판이 배포되면: 서비스워커 파일을 캐시 없이 확인(updateViaCache none) → 새 워커가 넘겨받으면 한 번만 새로고침
           '<script>if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {'
           'var hadSW = !!navigator.serviceWorker.controller, reloaded = false;'
           'navigator.serviceWorker.addEventListener("controllerchange", function () { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });'
           'window.addEventListener("load", function () { navigator.serviceWorker.register("iso-sw.js", { updateViaCache: "none" })'
           '.then(function (r) { r.update(); }).catch(function () {}); }); }</script>\n')
    full = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            + pwa + '</head>\n<body>\n' + page + '\n</body>\n</html>\n')
    with open(os.path.join(DIST, 'ISO-기록생성기.html'), 'w', encoding='utf-8') as f:
        f.write(full)
    with open(os.path.join(HERE, '..', '..', 'files', 'iso', 'ISO-record-builder.html'), 'w', encoding='utf-8') as f:
        f.write(full)
    # 서비스워커 캐시 이름: 도구 내용이 바뀌면 바뀐다(이전 캐시 정리)
    import hashlib
    sw_src = os.path.join(HERE, 'tool', 'sw.js')
    with open(sw_src, encoding='utf-8') as f:
        sw = f.read().replace('@VERSION@', hashlib.sha1(full.encode('utf-8')).hexdigest()[:10])
    with open(os.path.join(HERE, '..', '..', 'files', 'iso', 'iso-sw.js'), 'w', encoding='utf-8') as f:
        f.write(sw)
    print('built', DIST)


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--json':
        os.makedirs(DIST, exist_ok=True)
        with open(os.path.join(DIST, 'forms.json'), 'w', encoding='utf-8') as f:
            json.dump(export(), f, ensure_ascii=False, indent=1)
        print('forms.json written')
    else:
        build()
