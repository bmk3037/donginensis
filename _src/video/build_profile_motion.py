"""모션 회사소개서 (profile.html) 생성기 — 회사소개 영상(모션판)과 같은 연출을 웹 페이지에서 움직이게 한다.

쓰는 법 (나레이션 녹음 21개가 있는 폴더를 알려 줘야 영상과 같은 시각이 나온다):
  TTS_ENGINE=files TTS_FILES_DIR=<녹음 폴더> python3 _src/video/build_profile_motion.py          # → _src/video/out/profile_motion/ (시안)
  TTS_ENGINE=files TTS_FILES_DIR=<녹음 폴더> python3 _src/video/build_profile_motion.py --site   # → 홈페이지 profile.html · img/profile-motion/ · video/profile-*.

- 쪽 연출(요소 좌표·순서·시각)은 build_motion.py의 page_groups()를 그대로 쓴다. 쪽 배치가 바뀌면 그쪽만 고치고 영상·이 페이지를 함께 다시 만든다.
- 쪽마다 ① 완성 화면(pNN.webp) ② 요소를 지운 바탕(pNN_b.webp) ③ 요소 묶음 그림(pNN_a.webp) ④ 사진(pNN_phK.webp)을 만든다.
  페이지는 평소 ①을 보여 주고, 화면에 들어오면 ②+③으로 요소를 차례로 띄운 뒤 다시 ①로 돌아간다(JS·애니메이션이 안 돼도 ①은 보인다).
- 글자(잉크) 요소는 바탕색으로 나눈 그림을 곱하기(multiply)로 겹쳐 원본과 같은 화면이 된다(영상과 같은 방식).
- 「나레이션과 함께 보기」: 영상과 같은 나레이션(배경음 없음, video/profile-narr_kr.mp3)과 자막에 맞춰 장면이 넘어간다.
- 회사소개서 PDF(files/DONG-IN-ENSIS_Company-Profile_KR.pdf)가 바뀌면 이 페이지도 다시 만든다. 국문 전용(영문은 PDF).
- 필요한 것: Python 3, pymupdf, pillow, numpy, ffmpeg (build_motion.py와 같음).
"""
import asyncio, json, os, sys, math, shutil, html
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import build_intro as B
import build_motion as M
import narration
import pymupdf as fitz

SITE = B.SITE
LANG = 'kr'
PDF = B.PDF[LANG]
VER = '20261119'
SC = M.SC                                  # 쪽 좌표 1440×810 → 1920×1080


def check_engine():
    if narration.ENGINE != 'files' or not narration.FILES_DIR:
        raise SystemExit('TTS_ENGINE=files TTS_FILES_DIR=<녹음 폴더> 를 지정하세요 (영상과 같은 나레이션·시각을 쓰기 위해).')
    meta = f'{B.OUT}/motion_{LANG}/tts/s00.json'
    sig = narration.engine_sig(LANG, B.VOICE[LANG], B.RATE[LANG])
    if os.path.exists(meta) and json.load(open(meta)).get('engine') != sig:
        raise SystemExit(f'녹음 폴더가 영상 만들 때와 다릅니다: {json.load(open(meta)).get("engine")} ≠ {sig}')


def to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def pack(items, maxw=2048, pad=2):
    """(키, PIL) 목록을 한 장에 줄 단위로 채워 넣는다 → (그림, {키: (x, y)})"""
    order = sorted(items, key=lambda kv: -kv[1].height)
    x = y = rowh = 0; pos = {}; W = 0
    for k, im in order:
        if x + im.width > maxw: x = 0; y += rowh + pad; rowh = 0
        pos[k] = (x, y); x += im.width + pad; rowh = max(rowh, im.height); W = max(W, x)
    H = y + rowh
    atlas = Image.new('RGB', (max(W, 1), max(H, 1)), (255, 255, 255))
    for k, im in items: atlas.paste(im.convert('RGB'), pos[k])
    return atlas, pos


def r1(v): return round(float(v), 2)


def export_page(pno, sc, outdir):
    """쪽 하나 → 그림 파일들 + 연출 데이터(dict)"""
    doc = fitz.open(PDF); page = doc[pno - 1]
    pm = page.get_pixmap(matrix=fitz.Matrix(SC, SC), alpha=False)
    full = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    full.save(f'{outdir}/p{pno:02d}.webp', quality=86, method=6)
    d = dict(p=pno, w=full.width, h=full.height)
    if not sc: return d
    G, ps = M.build_scene(sc, LANG)
    to_img(ps.plate).save(f'{outdir}/p{pno:02d}_b.webp', quality=86, method=6)
    pieces, layers, nph = [], [], 0
    for i, g in enumerate(ps.order):
        k = g['k']; L = dict(k=k, t=r1(g.get('t', 0)), d=r1(g.get('d', 0.6)), z=M.zof(g))
        if k in ('hl',):
            b = M.ibox(M.px(g['r'])); col = g.get('color', M.HL)
            L.update(box=b, color='#%02x%02x%02x' % tuple(int(c * 255 + 0.5) for c in col), off=r1(g['off']) if g.get('off') is not None else None, d=r1(g.get('d', 0.5)))
            layers.append(L); continue
        if k == 'ring':
            col = g.get('color', M.RED)
            L.update(c=[r1(g['c'][0] * SC), r1(g['c'][1] * SC)], r0=r1(g['r0'] * SC), r1=r1(g['r1'] * SC), ts=[r1(t) for t in g['ts']], d=r1(g.get('d', 1.1)),
                     color='#%02x%02x%02x' % tuple(int(c * 255 + 0.5) for c in col))
            layers.append(L); continue
        b = g['box']; L['box'] = list(b)
        if k == 'photo':
            P = g['P']; nph += 1; fn = f'p{pno:02d}_ph{nph}.webp'
            g['raw'].save(f'{outdir}/{fn}', quality=84, method=6)
            L.update(src=fn, place=[r1(v) for v in P], radius=r1(g.get('radius', 9.5) * SC), corners=g.get('corners', 'all'), D=r1(g.get('D', 0.5)))
            layers.append(L); continue
        if k in ('ink', 'line'):
            im = g['img']; L['blend'] = 'multiply'
        elif k == 'count':
            im = to_img(g['final']); L['blend'] = 'multiply'
            L.update(n=g['n'], origin=[r1(g['origin'][0] * SC), r1(g['origin'][1] * SC)], size=r1(g['size'] * SC),
                     color='#%02x%02x%02x' % tuple(int(c * 255 + 0.5) for c in g['color']), cd=r1(g.get('cd', 1.4)), rbox=list(g['rbox']))
        elif k == 'card':
            im = g['img']
        elif k == 'circle':
            im = g['img']; r = M.px(g['r'])
            L['circle'] = [r1((r[0] + r[2]) / 2 - b[0]), r1((r[1] + r[3]) / 2 - b[1]), r1((r[2] - r[0]) / 2 + 0.6)]
        else:
            continue
        for key in ('a', 'dy', 'dx', 'k_back'):
            if key in g: L[key] = g[key]
        L.setdefault('a', 'rise')
        if g.get('pulses'): L['pulses'] = [[r1(v) for v in pu] for pu in g['pulses']]
        if k == 'line': L['anchors'] = [[r1(a), r1(x * SC)] for a, x in g['anchors']]
        L['_i'] = len(pieces); pieces.append((len(pieces), im)); layers.append(L)
    if pieces:
        atlas, pos = pack(pieces)
        atlas.save(f'{outdir}/p{pno:02d}_a.webp', lossless=True, method=6)
        for L in layers:
            if '_i' in L: L['src'] = list(pos[L.pop('_i')])
        d['atlas'] = True
    d.update(layers=layers, plate=True, end=r1(max([L['t'] + L['d'] * (2 if L['k'] == 'photo' else 1) for L in layers] + [0])))
    return d


def slides_html(pages, cover):
    n = len(pages); out = []
    for pg in pages:
        p = pg['p']
        if p == 1:
            k = html.escape(cover['kicker']); t1, t2 = (html.escape(x) for x in cover['title'])
            out.append(f'''<section class="sl cover" id="p1" data-p="1">
  <div class="stage cvr">
    <video class="bgv" src="video/profile-cover.mp4?v={VER}" poster="img/profile-motion/cover.jpg?v={VER}" muted loop playsinline autoplay preload="auto" aria-hidden="true"></video>
    <img class="lg2 an a-logo" src="img/logo_white.png" alt="(주)동인엔시스" width="600" height="110">
    <p class="kk an a-kk">{k}</p>
    <h1 class="tt"><span class="ln"><span class="an a-t1">{t1}</span></span><span class="ln"><span class="an a-t2">{t2}</span></span></h1>
    <span class="cap">연출 영상</span>
    <button type="button" class="go an a-go" data-narr>▶ 나레이션과 함께 보기 · 2분 30초</button>
  </div>
  <p class="pn">1 / {n}</p>
</section>''')
            continue
        lazy = '' if p <= 3 else ' loading="lazy"'
        out.append(f'<section class="sl" id="p{p}" data-p="{p}"><div class="stage"><img class="full" src="img/profile-motion/p{p:02d}.webp?v={VER}" width="1920" height="1080" alt="회사소개서 {p}쪽"{lazy} decoding="async"></div><p class="pn">{p} / {n}</p></section>')
    return '\n'.join(out)


def build(outdir, site_mode):
    check_engine()
    scenes, total, work = M.prepare(LANG)
    print(f'[{LANG}] 장면 {len(scenes)} | {total:.1f}초')
    imgdir = f'{outdir}/img/profile-motion'; viddir = f'{outdir}/video'
    os.makedirs(imgdir, exist_ok=True); os.makedirs(viddir, exist_ok=True)
    by_page = {sc['page']: sc for sc in scenes if sc.get('page')}
    pages = []
    doc = fitz.open(PDF)
    for pno in range(1, doc.page_count + 1):
        sc = by_page.get(pno)
        pages.append(export_page(pno, sc, imgdir)); print(f'  p{pno:02d}', len(pages[-1].get('layers', [])), '요소')
    # 나레이션 장면 시간표 (절대 시각) + 자막
    timeline = []
    for sc in scenes:
        at = M.word_finder(sc)
        cues = [[r1(a), r1(b), B.SUB_TEXT.get(line, line)] for li, (a, b, line) in enumerate(sc['cues']) if li not in sc.get('nosub', ())]
        item = dict(start=r1(sc['start']), dur=r1(sc['dur']), cues=cues)
        if sc.get('video'):
            k, t = sc['title']; lines = t.split('\\N')
            item.update(cover=True, kicker=k, title=lines,
                        tl=[r1(max(0.85, at(lines[0].split()[0], 0.9) - 0.05)), r1(max(1.05, at(lines[1].split()[0], 1.6) - 0.05))])
        else:
            item['p'] = sc['page']
        timeline.append(item)
    # 나레이션만 (배경음 없음): 장면 음성을 nstart에 놓는다
    ins = sum([['-i', sc['wav']] for sc in scenes], [])
    fc = [f'[{i}:a]adelay={int(sc["nstart"] * 1000)}|{int(sc["nstart"] * 1000)}[n{i}]' for i, sc in enumerate(scenes)]
    fc.append(''.join(f'[n{i}]' for i in range(len(scenes))) + f'amix=inputs={len(scenes)}:normalize=0:dropout_transition=0,apad=whole_dur={total:.3f},loudnorm=I=-16:LRA=9:TP=-1.5[a]')
    B.run([B.FF, '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[a]', '-t', f'{total:.3f}', '-ac', '1', '-ar', '44100',
           '-c:a', 'libmp3lame', '-b:a', '64k', f'{viddir}/profile-narr_kr.mp3'])
    # 표지 배경: 회사소개 영상 첫 장면과 같은 제어반 장면 — 앞으로 갔다 뒤로 돌아와 끊김 없이 반복 (화면은 자르지 않음)
    cov = B.ensure_cover()
    B.run([B.FF, '-v', 'error', '-y', '-i', cov, '-filter_complex', '[0:v]scale=1280:720:flags=lanczos,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]',
           '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{viddir}/profile-cover.mp4'])
    B.run([B.FF, '-v', 'error', '-y', '-i', cov, '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '4', f'{imgdir}/cover.jpg'])
    data = dict(ver=VER, total=r1(total), pages=pages, timeline=timeline)
    tpl = open(f'{HERE}/profile_motion_template.html', encoding='utf-8').read()
    page_html = tpl.replace('/*DATA*/null', json.dumps(data, ensure_ascii=False, separators=(',', ':'))).replace('<!--SLIDES-->', slides_html(pages, timeline[0]))
    open(f'{outdir}/profile.html', 'w', encoding='utf-8').write(page_html)
    sz = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(imgdir) for f in fs)
    print(f'-> {outdir}/profile.html | 그림 {sz / 1e6:.1f} MB | 나레이션 {os.path.getsize(viddir + "/profile-narr_kr.mp3") / 1e6:.1f} MB | 표지 {os.path.getsize(viddir + "/profile-cover.mp4") / 1e6:.1f} MB')


if __name__ == '__main__':
    site = '--site' in sys.argv
    out = SITE if site else f'{B.OUT}/profile_motion'
    if not site:
        os.makedirs(out, exist_ok=True)
        for f in ('img/logo_white.png', 'img/logo_color.png', 'favicon.ico', 'favicon-32.png', 'files/DONG-IN-ENSIS_Company-Profile_KR.pdf', 'files/DONG-IN-ENSIS_Company-Profile_EN.pdf'):
            if os.path.exists(f'{SITE}/{f}'):
                os.makedirs(os.path.dirname(f'{out}/{f}'), exist_ok=True); shutil.copy(f'{SITE}/{f}', f'{out}/{f}')
    build(out, site)
