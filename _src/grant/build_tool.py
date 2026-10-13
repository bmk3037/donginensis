"""지원사업 서류 도구(브라우저 도구) 빌드 — ISO 기록 도구와 같은 방식으로 한 파일 HTML 을 만든다.

    python3 _src/grant/build_tool.py

결과
  _src/grant/tool/dist/지원사업-서류도구.html   공용 저장소에 두고 크롬·엣지로 여는 파일
  _src/grant/tool/dist/artifact.html            claude.ai 아티팩트 게시용(문서 머리 없음)
  files/grant/grant-docs-builder.html          홈페이지 게시본(위 HTML 과 같음, 자료실에는 링크하지 않음)

화면 서식은 ISO 기록 도구(_src/iso/tool/app.css)를 그대로 쓰고 grant.css 를 덧붙인다.
회사 문서 서식 틀(grantkit/assets/dongin_template.docx)을 base64 로 넣어 브라우저에서 워드를 만든다.
"""
import base64
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TOOL = os.path.join(HERE, 'tool')
DIST = os.path.join(TOOL, 'dist')
ISO_TOOL = os.path.join(ROOT, '_src', 'iso', 'tool')

sys.path.insert(0, HERE)
from grantkit.build import TEMPLATE, ensure_template  # noqa: E402


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def b64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()


def build():
    ensure_template()
    os.makedirs(DIST, exist_ok=True)
    page = read(os.path.join(TOOL, 'page.html'))
    page = page.replace('/*@CSS@*/', read(os.path.join(ISO_TOOL, 'app.css')) + '\n' + read(os.path.join(TOOL, 'grant.css')))
    page = page.replace('@LOGO_WHITE@', 'data:image/png;base64,' + b64(os.path.join(ISO_TOOL, 'logo_white.png')))
    script = ('window.GRANT_TEMPLATE = "' + b64(str(TEMPLATE)) + '";\n'
              + '\n'.join(read(os.path.join(TOOL, n)) for n in ('docx.js', 'media.js', 'samples.js', 'app.js')))
    page = page.replace('/*@SCRIPT@*/', script.replace('</script', '<\\/script'))
    with open(os.path.join(DIST, 'artifact.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    full = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<meta name="robots" content="noindex">\n'
            '</head>\n<body>\n' + page + '\n</body>\n</html>\n')
    out = os.path.join(DIST, '지원사업-서류도구.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(full)
    pub = os.path.join(ROOT, 'files', 'grant')
    os.makedirs(pub, exist_ok=True)
    with open(os.path.join(pub, 'grant-docs-builder.html'), 'w', encoding='utf-8') as f:
        f.write(full)
    print('wrote', out, f'({len(full.encode()) // 1024} KB)')


if __name__ == '__main__':
    build()
