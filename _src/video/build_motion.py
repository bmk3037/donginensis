"""회사소개 영상(국문) 모션판 생성기 — 회사소개서 쪽을 요소(제목·사진·카드·숫자·연혁·표)로 나눠 나레이션에 맞춰 차례로 등장시킨다.

사용: python3 _src/video/build_motion.py [--scenes N] [--out 파일.mp4] [--test 장면:시각,시각…]
  --scenes N : 앞 N개 장면만 (시안)      --test : 지정 장면의 정지 화면만 PNG로 (out/motion_test/)
결과: video/company-intro_kr.mp4 + .jpg (25MB 이하)

나레이션 대본·자막·배경음악·장면 시간표는 build_intro.py(SCENES['kr'])를 그대로 쓰고 화면만 새로 그린다.
  - 나레이션: narration.py (edge-tts 또는 타입캐스트, TTS_ENGINE)에서 단어 시각까지 받아, 자막과 화면 움직임을 실제 읽는 시각에 맞춘다
  - 화면: 쪽을 1920×1080으로 그린 뒤 요소마다 떼어 내고(위 요소부터 지워 가며 바탕 판을 만듦) 프레임마다 다시 합성한다
      글자(잉크)는 바탕색으로 나눈 값을 곱해 합성 → 다 그려진 화면은 원본 쪽과 같다
      카드·원·배지는 불투명 합성, 사진은 원본 이미지를 꺼내 확대·노출 효과 후 둥근 모서리로 자른다
  - 장면별 연출은 page_groups()에 쪽 좌표(1440×810)로 적는다. '@단어'에 맞추려면 at('단어', 기본초)
영문판은 아직 만들지 않는다(대표 요청, 2026.10) — 영문 영상은 build_intro.py en (쪽 확대 방식).
"""
import argparse, asyncio, json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import build_intro as B
import pymupdf as fitz

W, H, FPS = B.W, B.H, B.FPS
SC = W / 1440.0                     # 쪽 좌표(1440×810) → 화면 px
FONTS = B.FONTS
LANG = 'kr'
WHITE = (1.0, 1.0, 1.0)
GRAY = (245 / 255, 246 / 255, 250 / 255)
BLUE, RED = (0x18 / 255, 0x57 / 255, 0xA5 / 255), (0xE8 / 255, 0x3E / 255, 0x30 / 255)
HL = (0xE3 / 255, 0xED / 255, 0xFA / 255)   # 강조 띠(옅은 파랑)


# ── 이징
def cl(x, a=0.0, b=1.0): return a if x < a else b if x > b else x
def e_out3(u): u = cl(u); return 1 - (1 - u) ** 3
def e_out4(u): u = cl(u); return 1 - (1 - u) ** 4
def e_io3(u): u = cl(u); return 4 * u ** 3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2
def e_back(u, k=1.6): u = cl(u); return 1 + (k + 1) * (u - 1) ** 3 + k * (u - 1) ** 2


# ── 나레이션: 단어 시각까지 받는 TTS
async def tts_words(sc, voice, rate, base, lang='kr'):
    import narration
    await narration.tts_words(sc, voice, rate, base, lang)


# ── 그리기 도우미 (화면 좌표, float 배열 0~1)
def ibox(r, pad=0.0):
    return (max(0, int(math.floor(r[0] - pad))), max(0, int(math.floor(r[1] - pad))), min(W, int(math.ceil(r[2] + pad))), min(H, int(math.ceil(r[3] + pad))))


def px(r): return (r[0] * SC, r[1] * SC, r[2] * SC, r[3] * SC)


def transform(img, box, dx, dy, s, fill=(255, 255, 255), mode='RGB'):
    """img(PIL, box 크기)를 (dx,dy) 이동 · 가운데 기준 s배 → (배열, 왼쪽 위 x, y)"""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0; cx, cy = w / 2, h / 2
    if s == 1.0 and abs(dx - round(dx)) < 1e-3 and abs(dy - round(dy)) < 1e-3:
        return np.asarray(img, dtype=np.float32) / 255.0, x0 + int(round(dx)), y0 + int(round(dy))
    ox0 = int(math.floor(x0 + dx + cx - cx * s)) - 1; oy0 = int(math.floor(y0 + dy + cy - cy * s)) - 1
    ow = int(math.ceil(w * s)) + 3; oh = int(math.ceil(h * s)) + 3
    a = 1 / s; c = (ox0 - x0 - dx - cx) / s + cx; f = (oy0 - y0 - dy - cy) / s + cy
    out = img.transform((ow, oh), Image.AFFINE, (a, 0, c, 0, a, f), resample=Image.BICUBIC, fillcolor=fill if mode != 'L' else 0)
    return np.asarray(out, dtype=np.float32) / 255.0, ox0, oy0


def region(arr, X0, Y0, clip=None):
    h, w = arr.shape[:2]; bx0, by0, bx1, by1 = 0, 0, W, H
    if clip: bx0, by0, bx1, by1 = max(0, clip[0]), max(0, clip[1]), min(W, clip[2]), min(H, clip[3])
    x0, y0, x1, y1 = max(X0, bx0), max(Y0, by0), min(X0 + w, bx1), min(Y0 + h, by1)
    if x1 <= x0 or y1 <= y0: return None
    return (slice(y0, y1), slice(x0, x1)), (slice(y0 - Y0, y1 - Y0), slice(x0 - X0, x1 - X0))


def mslice(m, as_):
    return m[as_[0] if m.shape[0] > 1 else slice(None), as_[1] if m.shape[1] > 1 else slice(None)]


def colmask(x0, x1, edge, invert=False):
    m = np.clip(edge - (np.arange(x0, x1, dtype=np.float32) + 0.5) + 0.5, 0, 1)
    return (1 - m if invert else m)[None, :, None]


def rowmask(y0, y1, edge):
    return np.clip(edge - (np.arange(y0, y1, dtype=np.float32) + 0.5) + 0.5, 0, 1)[:, None, None]


def rounded_mask(w, h, r, corners='all', ss=4):
    im = Image.new('L', (w * ss, h * ss), 0); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), radius=r * ss, fill=255)
    if corners == 'top': d.rectangle((0, h * ss // 2, w * ss - 1, h * ss - 1), fill=255)
    return np.asarray(im.resize((w, h), Image.LANCZOS), dtype=np.float32)[:, :, None] / 255.0


def circle_mask(w, h, cx, cy, r):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32) + 0.5
    return np.clip(r - np.hypot(xx - cx, yy - cy) + 0.5, 0, 1)[:, :, None]


ZK = {'card': 0, 'hl': 1, 'line': 2, 'ink': 3, 'count': 3, 'photo': 3, 'circle': 4, 'ring': 6}
def zof(g): return g.get('z', ZK[g['k']])


# ── 쪽 장면
class PageScene:
    def __init__(self, pdf, pno, groups):
        self.doc = fitz.open(pdf); self.page = self.doc[pno - 1]
        pm = self.page.get_pixmap(matrix=fitz.Matrix(SC, SC), alpha=False)
        self.F = np.frombuffer(pm.samples, np.uint8).reshape(pm.h, pm.w, 3).astype(np.float32) / 255.0
        self.groups = groups; empty = self.F.copy()
        for g in sorted(groups, key=zof, reverse=True):           # 위에 놓인 요소부터 떼어 내고 그 자리를 바탕색으로 지움
            if g['k'] in ('hl', 'ring'): continue
            g['box'] = ibox(px(g['r']), g.get('pad', {'circle': 1, 'card': 2}.get(g['k'], 0)))   # 카드는 테두리 바깥 끝까지
            if 'bg' not in g: g['bg'] = self.auto_bg(empty, g['box'])
            self._prep(g, empty)
            b = g['box']; bg = np.array(g['bg'], np.float32)
            if g['k'] == 'circle':
                m = np.asarray(g['mask'], dtype=np.float32)[:, :, None] / 255.0; reg = empty[b[1]:b[3], b[0]:b[2]]; reg[:] = reg * (1 - m) + bg * m
            elif g.get('erase', True):
                eb = ibox(px(g['r']), g['epad']) if 'epad' in g else b       # epad: 지울 때만 테두리를 조금 더
                empty[eb[1]:eb[3], eb[0]:eb[2]] = bg
        self.plate = empty
        self.order = sorted(groups, key=zof)

    @staticmethod
    def auto_bg(img, b):
        x0, y0, x1, y1 = b; parts = []
        if y0 >= 2: parts.append(img[y0 - 2:y0, x0:x1].reshape(-1, 3))
        if y1 + 2 <= H: parts.append(img[y1:y1 + 2, x0:x1].reshape(-1, 3))
        if x0 >= 2: parts.append(img[y0:y1, x0 - 2:x0].reshape(-1, 3))
        if x1 + 2 <= W: parts.append(img[y0:y1, x1:x1 + 2].reshape(-1, 3))
        return tuple(float(v) for v in np.median(np.concatenate(parts), axis=0))

    def _prep(self, g, empty):
        k, b = g['k'], g['box']; bg = np.array(g['bg'], np.float32)
        crop = empty[b[1]:b[3], b[0]:b[2]]
        if k in ('ink', 'line'):
            patch = np.clip(crop / bg, 0, 1)
            for c in g.get('holes', []):                          # 원(마디)에 가려진 부분은 좌우 색으로 이어 붙임
                a0, a1 = int(c[0] * SC) - b[0] - 2, int(math.ceil(c[1] * SC)) - b[0] + 2
                L, R = patch[:, a0 - 1].copy(), patch[:, a1 + 1].copy()
                for i, x in enumerate(range(a0, a1 + 1)): patch[:, x] = L + (R - L) * (i + 1) / (a1 - a0 + 2)
            g['img'] = Image.fromarray((patch * 255 + 0.5).astype(np.uint8))
        elif k == 'card':
            g['img'] = Image.fromarray((crop * 255 + 0.5).astype(np.uint8))
            g['ones'] = Image.new('L', g['img'].size, 255)
        elif k == 'circle':
            w, h = b[2] - b[0], b[3] - b[1]; r = px(g['r'])
            g['img'] = Image.fromarray((crop * 255 + 0.5).astype(np.uint8))
            g['mask'] = Image.fromarray((circle_mask(w, h, (r[0] + r[2]) / 2 - b[0], (r[1] + r[3]) / 2 - b[1], (r[2] - r[0]) / 2 + 0.6)[:, :, 0] * 255).astype(np.uint8))
        elif k == 'photo':
            w, h = b[2] - b[0], b[3] - b[1]
            pix = fitz.Pixmap(self.doc, g['xref'])
            if pix.n - pix.alpha != 3 or pix.alpha: pix = fitz.Pixmap(fitz.csRGB, pix, 0)
            im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            P = px(g['place']); g['P'] = P
            g['raw'] = im.resize((int(round((P[2] - P[0]) * 1.15)), int(round((P[3] - P[1]) * 1.15))), Image.LANCZOS)
            g['mask'] = rounded_mask(w, h, g.get('radius', 9.5) * SC, g.get('corners', 'all'))
        elif k == 'count':
            g['cache'] = {}; g['font'] = fitz.Font(fontfile=f'{FONTS}/Pretendard-ExtraBold.otf')
            g['rbox'] = ibox(px(g['rr']), 0); g['final'] = np.clip(crop / bg, 0, 1)

    def count_layer(self, g, val):
        if val in g['cache']: return g['cache'][val]
        doc = fitz.open(); p = doc.new_page(width=1440, height=810)
        p.insert_font(fontname='EB', fontfile=f'{FONTS}/Pretendard-ExtraBold.otf')
        x, y = g['origin']
        for ch in str(val):
            p.insert_text((x, y), ch, fontname='EB', fontsize=g['size'], color=g['color']); x += g['font'].text_length(ch, g['size']) - 1.26
        rb = g['rbox']; h, w = rb[3] - rb[1], rb[2] - rb[0]
        pm = p.get_pixmap(matrix=fitz.Matrix(SC, SC), clip=fitz.Rect(rb[0] / SC, rb[1] / SC, rb[2] / SC, rb[3] / SC), alpha=False)
        a = (np.frombuffer(pm.samples, np.uint8).reshape(pm.h, pm.w, 3).astype(np.float32) / 255.0)[:h, :w]
        if a.shape[:2] != (h, w): a = np.pad(a, ((0, h - a.shape[0]), (0, w - a.shape[1]), (0, 0)), constant_values=1.0)
        g['cache'][val] = a; return a

    @staticmethod
    def ink(base, arr, X0, Y0, o, clip=None, m=None):
        R = region(arr, X0, Y0, clip)
        if not R: return
        bs, as_ = R; a = o if m is None else o * mslice(m, as_)
        base[bs] *= 1 - a * (1 - arr[as_])

    @staticmethod
    def opaque(base, arr, X0, Y0, o, clip=None, m=None):
        R = region(arr, X0, Y0, clip)
        if not R: return
        bs, as_ = R; a = o if m is None else o * mslice(m, as_)
        base[bs] = base[bs] * (1 - a) + arr[as_] * a

    def anim_params(self, g, t):
        """→ (투명도, dx, dy, 배율, clip, 마스크) 또는 아직이면 None"""
        a, t0, d = g.get('a', 'rise'), g['t'], g.get('d', 0.6); u = (t - t0) / d
        if u <= 0: return None
        b = g['box']; w, h = b[2] - b[0], b[3] - b[1]; s = 1.0
        for pu in g.get('pulses', []):
            v = (t - pu[0]) / pu[1]
            if 0 < v < 1: s *= 1 + pu[2] * math.sin(math.pi * v) ** 2
        if a == 'maskup':  e = e_out3(u); return (min(1, u * 2.5), 0, (1 - e) * h * 0.95, s, b, None)
        if a == 'rise':    e = e_out3(u); return (e, 0, (1 - e) * g.get('dy', 18), s, None, None)
        if a == 'slide':   e = e_out3(u); return (e, (1 - e) * g.get('dx', 48), 0, s, None, None)
        if a == 'fade':    return (e_out3(u), 0, 0, s, None, None)
        if a == 'pop':     return (cl(u * 3), 0, 0, s * (0.35 + 0.65 * e_back(u, g.get('k_back', 2.0))), None, None)
        if a == 'zoom':    e = e_out3(u); return (e, 0, 0, s * (0.92 + 0.08 * e), None, None)
        if a == 'wipe':    return (1.0, 0, 0, s, None, colmask(b[0], b[2], b[0] + e_io3(u) * w + 1))
        if a == 'wipe_tb': return (1.0, 0, 0, s, None, rowmask(b[1], b[3], b[1] + e_io3(u) * h + 1))
        return (1.0, 0, 0, s, None, None)

    def frame(self, t):
        base = self.plate.copy()
        for g in self.order:
            k = g['k']
            if k == 'hl':  self.highlight(base, g, t); continue
            if k == 'ring': self.ring(base, g, t); continue
            if k == 'photo': self.photo(base, g, t); continue
            if k == 'line':
                x = np.interp(t, [a[0] for a in g['anchors']], [a[1] * SC for a in g['anchors']]); b = g['box']
                if x > b[0]: self.ink(base, np.asarray(g['img'], dtype=np.float32) / 255.0, b[0], b[1], 1.0, m=colmask(b[0], b[2], x))
                continue
            p = self.anim_params(g, t)
            if not p: continue
            o, dx, dy, s, clip, m = p
            if k == 'count':
                u = (t - g['t']) / g.get('cd', 1.4)
                if u < 1: img, bx = Image.fromarray((self.count_layer(g, int(round(g['n'] * e_out4(u)))) * 255 + 0.5).astype(np.uint8)), g['rbox']
                else: img, bx = Image.fromarray((g['final'] * 255 + 0.5).astype(np.uint8)), g['box']
                arr, X0, Y0 = transform(img, bx, dx, dy, s); self.ink(base, arr, X0, Y0, o, clip, m); continue
            if k == 'ink':
                arr, X0, Y0 = transform(g['img'], g['box'], dx, dy, s); self.ink(base, arr, X0, Y0, o, clip, m); continue
            if k == 'card':
                arr, X0, Y0 = transform(g['img'], g['box'], dx, dy, s)
                if s != 1.0 or abs(dx - round(dx)) > 1e-3 or abs(dy - round(dy)) > 1e-3:
                    mk, _, _ = transform(g['ones'], g['box'], dx, dy, s, mode='L'); mk = mk[:, :, None]
                    m = mk if m is None else mk * m
                self.opaque(base, arr, X0, Y0, o, clip, m); continue
            if k == 'circle':
                arr, X0, Y0 = transform(g['img'], g['box'], dx, dy, s)
                mk, _, _ = transform(g['mask'], g['box'], dx, dy, s, mode='L')
                self.opaque(base, arr, X0, Y0, o, None, mk[:, :, None])
        return base

    def highlight(self, base, g, t):
        u = (t - g['t']) / g.get('d', 0.5)
        if u <= 0: return
        o = 1.0 if g.get('off') is None else 1 - cl((t - g['off']) / 0.45)
        if o <= 0: return
        b = ibox(px(g['r'])); m = colmask(b[0], b[2], b[0] + e_io3(u) * (b[2] - b[0]))
        reg = base[b[1]:b[3], b[0]:b[2]]; col = np.array(g.get('color', HL), np.float32); reg[:] = reg * (1 - o * m) + col * (o * m)

    def ring(self, base, g, t):
        for t0 in g['ts']:
            u = (t - t0) / g.get('d', 1.1)
            if not 0 < u < 1: continue
            cx, cy = g['c'][0] * SC, g['c'][1] * SC; r = (g['r0'] + (g['r1'] - g['r0']) * e_out3(u)) * SC
            R = int(g['r1'] * SC + 4); x0, y0 = int(cx - R), int(cy - R)
            yy, xx = np.mgrid[y0:y0 + 2 * R, x0:x0 + 2 * R].astype(np.float32) + 0.5
            a = np.clip(1.6 - np.abs(np.hypot(xx - cx, yy - cy) - r), 0, 1) * (1 - u) * 0.85
            reg = base[y0:y0 + 2 * R, x0:x0 + 2 * R]; col = np.array(g.get('color', RED), np.float32)
            reg[:] = reg * (1 - a[:, :, None]) + col * a[:, :, None]

    def photo(self, base, g, t):
        """파란 막이 왼쪽에서 덮었다가 오른쪽으로 걷히며 사진이 드러남. 사진은 1.12배에서 천천히 제자리로."""
        u = t - g['t']
        if u <= 0: return
        b = g['box']; w, h = b[2] - b[0], b[3] - b[1]; D = g.get('D', 0.5)
        z = 1.0 + 0.12 * math.exp(-max(0.0, u - D) / 3.2)
        P = g['P']; rw, rh = g['raw'].size; kx, ky = rw / (P[2] - P[0]), rh / (P[3] - P[1])
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        img = g['raw'].transform((w, h), Image.AFFINE, (kx / z, 0, (b[0] - cx) / z * kx + (cx - P[0]) * kx, 0, ky / z, (b[1] - cy) / z * ky + (cy - P[1]) * ky), resample=Image.BICUBIC)
        arr = np.asarray(img, dtype=np.float32) / 255.0; mk = g['mask']; reg = base[b[1]:b[3], b[0]:b[2]]; col = np.array(BLUE, np.float32)
        if u < D:
            m = mk * colmask(b[0], b[2], b[0] + e_io3(u / D) * w); reg[:] = reg * (1 - m) + col * m; return
        v = (u - D) / D; edge = b[0] + e_io3(v) * w
        mp = mk * colmask(b[0], b[2], edge); reg[:] = reg * (1 - mp) + arr * mp
        if v < 1:
            mb = mk * colmask(b[0], b[2], edge, invert=True); reg[:] = reg * (1 - mb) + col * mb


# ── 표지(영상) 장면: 로고 · COMPANY PROFILE · 제목이 차례로 (제목은 읽는 순간에 맞춤)
class CoverScene:
    def __init__(self, sc, at):
        lg = Image.open(f'{B.SITE}/img/logo_white.png').convert('RGBA'); lg = lg.resize((int(lg.width * 58 / lg.height), 58), Image.LANCZOS)
        self.logo = np.asarray(lg, dtype=np.float32) / 255.0
        self.fk = ImageFont.truetype(f'{FONTS}/Pretendard-Bold.otf', 25)
        ft = ImageFont.truetype(f'{FONTS}/Pretendard-ExtraBold.otf', 77)
        self.kicker, tt = sc['title']; self.lines = tt.split('\\N')
        self.tl = [self.text_img(l, ft, (255, 255, 255), -1) for l in self.lines]
        self.t_line = [max(0.85, at(self.lines[0].split()[0], 0.9) - 0.05), max(1.05, at(self.lines[1].split()[0], 1.6) - 0.05)]

    @staticmethod
    def text_img(s, font, rgb, spacing):
        asc, desc = font.getmetrics(); widths = [font.getlength(ch) for ch in s]
        im = Image.new('RGBA', (int(sum(widths) + spacing * (len(s) - 1) + 8), asc + desc + 4), rgb + (0,)); d = ImageDraw.Draw(im); x = 0
        for ch, cw in zip(s, widths): d.text((x + 2, 2), ch, font=font, fill=rgb + (255,)); x += cw + spacing
        return np.asarray(im, dtype=np.float32) / 255.0

    @staticmethod
    def put(base, rgba, X0, Y0, o, clip=None):
        arr = rgba[:, :, :3]; R = region(arr, int(round(X0)), int(round(Y0)), clip)
        if not R: return
        bs, as_ = R; a = o * rgba[:, :, 3:4][as_]; base[bs] = base[bs] * (1 - a) + arr[as_] * a

    def frame(self, base, t):
        u = (t - 0.25) / 0.7
        if u > 0: e = e_out3(u); self.put(base, self.logo, 150, 300 + (1 - e) * 16, e)
        u = (t - 0.55) / 1.1
        if u > 0: e = e_out3(u); self.put(base, self.text_img(self.kicker, self.fk, (0x8F, 0xC1, 0xFF), 6 + (1 - e) * 16), 148, 393, cl(u * 1.6))
        for i, im in enumerate(self.tl):
            u = (t - self.t_line[i]) / 0.8
            if u <= 0: continue
            e = e_out3(u); top = 440 + i * 92
            self.put(base, im, 148, top - 2 + (1 - e) * im.shape[0] * 0.9, min(1, u * 2.5), clip=(0, top - 4, W, top + im.shape[0]))
        return base


# ── 연출 도우미
def kicker(w, bg=None):            # 왼쪽 위 빨간 줄 + 영문 소제목
    G = [dict(k='ink', r=(81, 79.5, 118, 85), a='wipe', t=0.12, d=0.35), dict(k='ink', r=(126, 70, w, 95), a='rise', t=0.28, d=0.5, dy=10)]
    return [dict(g, bg=bg) for g in G] if bg else G


def titles(rects, t0=0.35, step=0.12):
    return [dict(k='ink', r=r, a='maskup', t=t0 + i * step, d=0.75) for i, r in enumerate(rects)]


def stagger(rects, t0, step=0.07, k='ink', a='rise', d=0.55, **kw):
    return [dict(k=k, r=r, a=a, t=t0 + i * step, d=d, **kw) for i, r in enumerate(rects)]


class Items:
    """쪽의 글 줄 · 작은 그림 · 작은 이미지 위치 (카드 안을 줄 단위로 나눌 때 씀)"""
    def __init__(self, page):
        self.it = []
        for b in page.get_text('dict')['blocks']:
            if b['type'] == 1: self.it.append(('img', fitz.Rect(b['bbox']))); continue
            for l in b['lines']:
                if ''.join(s['text'] for s in l['spans']).strip(): self.it.append(('txt', fitz.Rect(l['bbox'])))
        for x in page.get_drawings():
            if x['rect'].width < 1400: self.it.append(('drw', x['rect']))

    def bands(self, rect, exclude=(), maxh=60, inset=3):
        R = fitz.Rect(rect); ex = [fitz.Rect(e) for e in exclude]; rows = []
        for kind, r in self.it:
            c = fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
            if not R.contains(c) or any(e.contains(c) for e in ex): continue
            if kind != 'txt' and (r.height > maxh or r.width > R.width * 0.97): continue
            rows.append([max(r.y0, R.y0 + inset), min(r.y1, R.y1 - inset)])
        rows.sort(); m = []
        for y0, y1 in rows:
            if m and y0 <= m[-1][1] + 0.5: m[-1][1] = max(m[-1][1], y1)
            else: m.append([y0, y1])
        out = []
        for i, (y0, y1) in enumerate(m):
            top = y0 - 2.5 if i == 0 else max(y0 - 2.5, (m[i - 1][1] + y0) / 2)
            bot = y1 + 2.5 if i == len(m) - 1 else min(y1 + 2.5, (y1 + m[i + 1][0]) / 2)
            out.append((R.x0 + inset, max(top, R.y0 + inset - 0.5), R.x1 - inset, min(bot, R.y1 - inset + 0.5)))
        return out


def card(items, rect, t, photo=None, badge=None, cols=None, a='rise', d=0.5, step=0.06, D=0.45, dy=24, rows_a='rise', exclude=()):
    """카드가 먼저 놓이고 → 사진(파란 막) → 배지 → 안의 줄들이 차례로"""
    G = [dict(k='card', r=rect, a=a, t=t, d=d, dy=dy)]; ti = t + d * 0.8; ex = list(exclude)
    if photo:
        G.append(dict(k='photo', t=ti, D=D, corners='top', **photo)); ex.append(photo['r']); ti += 0.2
    if badge:
        G.append(dict(k='card', r=badge, a='pop', t=ti + 2 * D - 0.15, d=0.45, z=5)); ex.append(badge)
    rects = []
    for c in (cols or [rect]): rects += items.bands(c, ex)
    G += stagger(rects, ti, step, a=rows_a, d=0.5, dy=10)
    return G


def ph(r, place, xref, **kw): return dict(r=r, place=place, xref=xref, **kw)


# ── 장면별 연출 (쪽 좌표 1440×810). at('단어', 기본초): 그 단어를 읽기 시작하는 시각(장면 안, 초)
def page_groups(pno, at, items):
    G = []
    if pno == 2:
        G += kicker(306) + titles([(80, 147, 628, 208), (80, 208, 546, 267), (80, 267, 260, 326)])
        G += [dict(k='photo', r=(772.5, 96, 1357.5, 450.5), place=(772.5, 49.5, 1357.5, 488.2), xref=50, t=0.55)]
        G += stagger([(80, 345, 708, 371), (80, 376, 702, 402), (80, 406, 221, 432)], 1.0, 0.08, d=0.6)
        G += [dict(k='ink', r=(770, 455, 1030, 473), a='fade', t=1.6, d=0.6)]
        xs = [82.5, 408.75, 735.0, 1061.25]; plus = [163.23, 526.48, 804.48, 1145.73]; ns = [35, 750, 15, 40]
        t750 = at('750건이', 6.0)
        for i, x in enumerate(xs):
            t0 = 1.45 + 0.16 * i
            G.append(dict(k='ink', r=(x - 0.5, 515, x + 297, 520), a='wipe', t=t0, d=0.6))
            G.append(dict(k='count', r=(x - 1, 528, plus[i] - 0.3, 607), rr=(x - 1, 528, x + 160, 607), origin=(x, 589.5), size=63, color=BLUE, n=ns[i], a='fade', t=t0 + 0.1, d=0.15, cd=1.4,
                          pulses=[(t750, 0.8, 0.07)] if ns[i] == 750 else []))
            G.append(dict(k='ink', r=(plus[i] - 0.3, 530, plus[i] + 22, 570), a='pop', t=t0 + 1.35, d=0.5))
            G += stagger([(x - 1, 607, x + 175, 633), (x - 1, 635, x + 300, 677)], t0 + 0.45, 0.1, dy=12)
    elif pno == 3:
        G += kicker(242) + titles([(80, 137, 436, 197), (80, 197, 377, 256), (80, 256, 300, 316)])
        G += [dict(k='photo', r=(82.5, 349.5, 647.5, 702), place=(82.5, 349.5, 708.8, 702.0), xref=89, t=0.6)]
        G += stagger([(706, 140, 952, 163), (706, 184, 1335, 208), (706, 214, 1320, 238), (706, 245, 848, 268), (706, 289, 1322, 313), (706, 319, 975, 343),
                      (706, 363, 1349, 387), (706, 394, 1349, 418), (706, 425, 1335, 448), (706, 455, 909, 478)], 0.9, 0.06, dy=12)
        G += [dict(k='ink', r=(705, 500, 713.5, 563), a='wipe_tb', t=1.65, d=0.5)]
        G += stagger([(727, 503, 1037, 530), (727, 533, 982, 560)], 1.8, 0.1, dy=10) + [dict(k='ink', r=(706, 579, 978, 612), a='fade', t=2.1, d=0.6)]
        t1 = max(at('설비는', 0.7), 2.6); t2 = max(at('AI와', 6.5), t1 + 1.6)
        G += [dict(k='hl', r=(704, 288.5, 1324, 314), t=t1, d=0.55, off=t2), dict(k='hl', r=(704, 318.5, 977, 344), t=t1 + 0.5, d=0.35, off=t2),
              dict(k='hl', r=(704, 362.5, 1212, 388), t=t2, d=0.55)]
    elif pno == 4:
        G += kicker(285, GRAY) + [dict(g, bg=GRAY) for g in titles([(80, 107, 256, 168)])]
        G += [dict(k='card', r=(82, 193.8, 816, 675), a='rise', t=0.4, d=0.6, dy=20)]
        rows = [(196, 263.6), (265, 307.9), (309.4, 372.4), (374, 437.6), (439.2, 502.1), (503.6, 546.4), (548, 611.6), (613.2, 672.5)]
        G += stagger([(85, a + 0.6, 813, b - 0.4) for a, b in rows], 0.75, 0.07, dy=10)
        G += [dict(k='card', r=(852, 193.5, 1358.5, 310.5), a='slide', t=0.95, d=0.7), dict(k='card', r=(852, 322.5, 1358.5, 438.8), a='slide', t=1.1, d=0.7)]
        G += [dict(k='photo', r=(852.8, 452, 1357.5, 653.3), place=(852.8, 401.3, 1357.5, 684.0), xref=120, t=1.25), dict(k='ink', r=(850, 659, 1055, 676), a='fade', t=2.0, d=0.6)]
        t1 = max(at('본사와', 0.7), 2.1); t2 = max(at('ISO', 6.0), t1 + 1.5); t3 = max(at('슈나이더', 8.0), t2 + 1.0)
        G += [dict(k='hl', r=(84, 439.6, 814.2, 501.7), t=t1, d=0.55, off=t2), dict(k='hl', r=(84, 504, 814.2, 546), t=t2, d=0.5, off=t3),
              dict(k='hl', r=(84, 613.6, 814.2, 672.2), t=t3, d=0.55)]
    elif pno == 5:
        G += kicker(230) + titles([(80, 107, 470, 166.8), (80, 167, 457, 227)])
        cx = [97.5, 423.0, 747.75, 1073.25]; x0 = [82, 408, 733, 1058]
        T = [max(at('제어기기', 0.7), 0.7), at('제어시스템', 2.5), at('친환경', 4.3), at('2026년', 7.0)]
        G += [dict(k='line', r=(80.8, 334.6, 1358.5, 338.6), holes=[(c - 16, c + 16) for c in cx],
                   anchors=[(T[0] - 0.35, 80.8), (T[0], cx[0]), (T[1], cx[1]), (T[2], cx[2]), (T[3], cx[3]), (T[3] + 0.9, 1358.5)])]
        for i in range(4):
            G.append(dict(k='circle', r=(cx[i] - 15.2, 326.0, cx[i] + 15.2, 356.5), a='pop', t=T[i] - 0.05, d=0.55))
            x = x0[i]
            G += stagger([(x - 2, 368, x + 300, 424), (x - 2, 427, x + 300, 459), (x - 2, 464, x + 304, 513)], T[i] + 0.05, 0.1, dy=14)
            G.append(dict(k='ink', r=(x, 550.6, x + 300.5, 552.6), a='wipe', t=T[i] + 0.3, d=0.5))
            G += stagger([(x, 562 + 33 * b, x + 300, 589 + 33 * b) for b in range(3)], T[i] + 0.4, 0.09, dy=10)
        G.append(dict(k='ring', c=(cx[3], 341.25), r0=15, r1=38, ts=[T[3] + 0.15, T[3] + 0.85], d=1.2))
    elif pno == 6:
        G += kicker(232) + titles([(80, 107, 605, 167), (80, 167, 306, 227)]) + [dict(k='ink', r=(80, 245, 822, 272), a='rise', t=0.8, d=0.6, dy=12)]
        T = [max(at('직접', 1.1), 1.1), max(at('까다로운', 2.5), 1.6), max(at('데이터와', 4.0), 2.1)]
        for i, r in enumerate([(83, 305, 493, 627), (515, 305, 925, 627), (947, 305, 1357, 627)]): G += card(items, r, T[i])
        t2 = max(at('세', 6.5), T[2] + 1.2)
        G += [dict(k='ink', r=(80, 655, 207, 679), a='rise', t=t2, d=0.5, dy=10)]
        G += stagger([(219, 653, 453, 683.5), (467, 653, 523, 683.5), (537, 653, 644, 683.5), (658, 653, 725, 683.5), (739, 653, 822, 683.5)], t2 + 0.15, 0.08, k='card', a='pop', d=0.45)
    elif pno == 7:
        G += kicker(325) + titles([(80, 134, 648, 194), (80, 194, 479, 254)])
        G += stagger([(80, 273, 703, 298), (80, 303, 356, 328)], 0.85, 0.08, dy=12)
        G += [dict(k='photo', r=(788, 92, 1358, 430), place=(788, 47, 1358, 475), xref=139, t=0.6), dict(k='ink', r=(786, 436, 1042, 453), a='fade', t=1.6, d=0.6)]
        t_tag = max(at('온도', 5.0), 2.4)
        G += stagger([(82, 354, 220, 382), (226, 354, 310, 382), (316, 354, 386, 382), (391, 354, 504, 382), (510, 354, 555, 382), (561, 354, 645, 382), (82, 389, 178, 417)],
                     t_tag, 0.09, a='pop', d=0.45)
        G += [dict(k='card', r=(83, 485, 1357, 651), a='rise', t=1.3, d=0.55, dy=20)]
        G += stagger([(92, 496, 396, 640), (410, 496, 714, 640), (728, 496, 1033, 640), (1047, 496, 1350, 640)], 1.7, 0.14, dy=14)
    elif pno == 8:
        G += kicker(237) + titles([(80, 107, 485, 167), (80, 167, 466, 227)])
        T = [max(at('현장', 0.9), 0.9), at('제어반', 1.6), at('암호화', 2.4), at('데이터허브', 3.2), at('대시보드와', 4.0)]
        T = [max(T[i], T[0] + 0.35 * i) for i in range(5)]
        nodes = [(166, 261, 254, 350), (412, 253, 518, 358), (676, 261, 764, 350), (922, 253, 1028, 358), (1186, 261, 1274, 350)]
        for i in range(4):
            G.append(dict(k='ink', r=(254, 304.5, 422, 308.5) if i == 0 else [(508, 304.5, 676, 308.5), (764, 304.5, 932, 308.5), (1018, 304.5, 1186, 308.5)][i - 1],
                          a='wipe', t=T[i] + 0.15, d=max(0.3, T[i + 1] - T[i] - 0.1)))
        lx = [(130, 290), (380, 550), (636, 804), (900, 1050), (1160, 1300)]
        for i in range(5):
            G.append(dict(k='circle', r=nodes[i], a='pop', t=T[i], d=0.55))
            G += stagger([(lx[i][0], 362, lx[i][1], 391), (lx[i][0], 393, lx[i][1], 436)], T[i] + 0.12, 0.1, dy=10)
        tc, to = max(at('클라우드형과', 6.0), T[4] + 0.8), max(at('온프레미스형', 7.0), T[4] + 1.3)
        G += card(items, (83, 471, 709, 687), tc) + card(items, (731, 471, 1357, 687), to)
        G += [dict(k='ink', r=(80, 697, 660, 717), a='fade', t=to + 0.8, d=0.6)]
    elif pno == 9:
        G += kicker(338) + titles([(80, 107, 698, 167), (80, 167, 716, 227)])
        t1, t2 = max(at('제어', 1.0), 1.0), max(at('통신은', 2.6), 1.8)
        G += [dict(k='ink', r=(81, 262, 702, 326), a='rise', t=t1, d=0.55, dy=14), dict(k='ink', r=(741, 262, 1292, 326), a='rise', t=t2, d=0.55, dy=14),
              dict(k='ink', r=(81, 342, 702, 428), a='rise', t=t2 + 0.35, d=0.55, dy=14), dict(k='ink', r=(741, 342, 1292, 404), a='rise', t=t2 + 0.55, d=0.55, dy=14)]
        t3 = max(at('수집장비는', 5.5) - 1.0, t2 + 0.9)          # '수집장비는'을 읽을 때 게이트웨이 상자가 강조되도록
        G += [dict(k='card', r=(82.5, 471.5, 709.5, 646.5), a='rise', t=t3 - 0.3, d=0.5, dy=18)]
        G += [dict(k='ink', r=(105, 494, 260, 518), a='fade', t=t3 + 0.05, d=0.4)]
        lb = [(109.5, 546.5, 223.5, 601.5), (262.5, 546.5, 376.5, 601.5), (414.5, 525.5, 530.5, 621.5), (568.5, 546.5, 682.5, 601.5)]
        la = [(231, 560, 255, 589), (384, 560, 408, 589), (537, 560, 561, 589)]
        for i, r in enumerate(lb):
            G.append(dict(k='card', r=r, a='pop', t=t3 + 0.1 + 0.2 * i, d=0.45, z=2.5, pulses=[(t3 + 1.2, 0.7, 0.08)] if i == 2 else []))
            if i < 3: G.append(dict(k='ink', r=la[i], a='fade', t=t3 + 0.22 + 0.2 * i, d=0.3))
        t4 = t3 + 1.0
        G += [dict(k='card', r=(730.5, 471.5, 1357.5, 646.5), a='rise', t=t4, d=0.5, dy=18), dict(k='ink', r=(753, 494, 900, 518), a='fade', t=t4 + 0.3, d=0.4)]
        rb = [(757.5, 536.5, 922.5, 591.5), (961.5, 527.5, 1126.5, 600.5), (1165.5, 527.5, 1330.5, 600.5)]
        ra = [(929, 549, 955, 578), (1133, 549, 1159, 578)]
        for i, r in enumerate(rb):
            G.append(dict(k='card', r=r, a='pop', t=t4 + 0.35 + 0.2 * i, d=0.45, z=2.5, pulses=[(t4 + 1.3, 0.7, 0.07)] if i == 1 else []))
            if i < 2: G.append(dict(k='ink', r=ra[i], a='fade', t=t4 + 0.47 + 0.2 * i, d=0.3))
        G += [dict(k='ink', r=(80, 656, 430, 676), a='fade', t=t4 + 0.9, d=0.5)]
    elif pno == 10:
        G += kicker(230) + titles([(80, 107, 550, 167), (80, 167, 475, 227)])
        T = [max(at('조선', 0.9), 0.9), at('수소', 1.6), at('제조', 2.3), at('데이터센터까지', 3.0)]
        T = [max(T[i], T[0] + 0.3 * i) for i in range(4)]
        cards = [(83, 256, 387, 605), (406, 256, 711, 605), (729, 256, 1034, 605), (1053, 256, 1357, 605)]
        pho = [ph((83, 256, 387, 417), (83, 223, 387, 451), 165), ph((406, 256, 710, 417), (406, 223, 710, 451), 166),
               ph((730, 256, 1034, 417), (730, 223, 1034, 451), 167), ph((1053, 256, 1357, 417), (1053, 223, 1357, 451), 168)]
        for i in range(4): G += card(items, cards[i], T[i], photo=pho[i])
        tm = max(at('모터가', 4.5), T[3] + 1.0)
        G += stagger([(83 + 160.5 * i, 621.5, 234.5 + 160.5 * i, 678.5) for i in range(8)], tm, 0.07, k='card', a='pop', d=0.45)
        G += [dict(k='ink', r=(80, 688, 430, 708), a='fade', t=tm + 0.8, d=0.5)]
    elif pno == 11:
        G += kicker(312) + titles([(80, 107, 528, 167), (80, 167, 756, 227)])
        cards = [(83, 258, 494, 642), (514, 258, 926, 642), (946, 258, 1357, 642)]
        pho = [ph((83, 258, 494, 460), (83, 205, 494, 513), 174), ph((514, 258, 926, 460), (514, 205, 926, 513), 172), ph((946, 258, 1357, 460), (946, 244, 1357, 474), 173)]
        for i in range(3): G += card(items, cards[i], 0.85 + 0.3 * i, photo=pho[i])
        G += [dict(k='ink', r=(80, 652, 313, 672), a='fade', t=2.6, d=0.5)]
    elif pno == 12:
        G += kicker(355) + titles([(80, 105, 576, 160), (80, 160, 708, 215)], step=0.1)
        T = [max(at('충남병원선과', 0.7), 0.7), at('경남청정호의', 1.4), at('하이브리드', 2.0)]
        T = [max(T[i], T[0] + 0.3 * i) for i in range(3)]
        cards = [(82, 243, 492, 708), (515, 243, 924, 708), (947, 243, 1357, 708)]
        pho = [ph((83, 244, 492, 524), (43, 244, 531, 524), 180), ph((516, 244, 924, 524), (472, 244, 968, 524), 181), ph((948, 244, 1357, 524), (928, 244, 1378, 524), 182)]
        bad = [(96.5, 257.5, 180.5, 285.5), (529.5, 257.5, 613.5, 285.5), (961.5, 257.5, 1072.5, 285.5)]
        for i in range(3): G += card(items, cards[i], T[i], photo=pho[i], badge=bad[i], D=0.35, step=0.05, d=0.45)
        G += [dict(k='ink', r=(80, 729, 818, 749), a='fade', t=T[2] + 1.2, d=0.5)]
    elif pno == 13:
        G += kicker(492) + titles([(80, 105, 687, 160), (80, 160, 639, 215)], step=0.1)
        G += [dict(k='ink', r=(81.5, 242.5, 1006.5, 279.5), a='wipe', t=0.7, d=0.5)]
        G += stagger([(81.5, 279.5, 1006.5, 337), (81.5, 337, 1006.5, 376), (81.5, 376, 1006.5, 414), (81.5, 414, 1006.5, 472), (81.5, 472, 1006.5, 511)], 0.95, 0.08, dy=10)
        tc = max(at('중국과', 3.0), 2.0)
        G += stagger([(81.5, 526.5, 382.5, 601.5), (393.5, 526.5, 694.5, 601.5)], 1.6, 0.12, dy=14)
        G += [dict(k='ink', r=(705.5, 526.5, 1006.5, 601.5), a='rise', t=1.84, d=0.55, dy=14, pulses=[(max(tc, 2.5), 0.8, 0.06)])]
        G += [dict(k='photo', r=(1028, 243, 1358, 433), place=(1010, 243, 1376, 433), xref=801, t=0.8, D=0.4, epad=2),
              dict(k='photo', r=(1028, 447, 1358, 637), place=(1028, 418, 1358, 666), xref=802, t=1.1, D=0.4, epad=2)]
        G += [dict(k='ink', r=(1026, 642, 1313, 662), a='fade', t=2.0, d=0.5), dict(k='ink', r=(80, 729, 653, 749), a='fade', t=2.4, d=0.5)]
    elif pno == 14:
        G += kicker(325) + titles([(80, 105, 610, 160), (80, 160, 639, 215)], step=0.1)
        T = [max(at('에스케이', 0.7), 0.7), at('연료전지', 2.2)]
        T = [T[0], max(T[1], T[0] + 0.3)]; T.append(T[1] + 0.35)
        cards = [(82, 243, 492, 728), (515, 243, 924, 728), (947, 243, 1357, 728)]
        pho = [ph((83, 244, 492, 544), (29, 244, 546, 544), 1046), ph((516, 244, 924, 544), (454, 244, 987, 544), 1047), ph((948, 244, 1357, 544), (943, 244, 1363, 544), 1048)]
        for i in range(3): G += card(items, cards[i], T[i], photo=pho[i], badge=(96.5, 257.5, 210.5, 285.5) if i == 0 else None, D=0.4, step=0.05, d=0.45)
    elif pno == 15:
        G += kicker(365) + titles([(80, 105, 711, 160), (80, 160, 451, 215)], step=0.1)
        T = [max(at('현대자동차그룹', 0.7), 0.7), at('고려제강의', 2.0), at('해외', 3.0)]
        T = [T[0], max(T[1], T[0] + 0.3), max(T[2], T[0] + 0.6)]; T.append(T[2] + 0.3)
        cards = [(82, 243, 384, 662), (407, 243, 708, 662), (731, 243, 1033, 662), (1056, 243, 1357, 662)]
        pho = [ph((83, 244, 384, 494), (79, 244, 388, 494), 1134), ph((408, 244, 708, 494), (349, 244, 766, 494), 1135),
               ph((732, 244, 1033, 494), (731, 244, 1033, 494), 1136), ph((1057, 244, 1357, 494), (1057, 219, 1357, 519), 1137)]
        for i in range(4): G += card(items, cards[i], T[i], photo=pho[i], badge=(96.5, 257.5, 142.5, 285.5) if i == 0 else None, D=0.4, step=0.05, d=0.45)
    elif pno == 16:
        G += kicker(388) + titles([(80, 105, 448, 160), (80, 160, 433, 215)], step=0.1)
        t1 = max(at('포장기계와', 0.7), 0.7); t3 = max(at('SMR', 1.6), t1 + 0.6); t4 = max(at('특수기계의', 2.6), t3 + 0.3)
        T = [t1, t1 + 0.3, t3, t4]
        cards = [(82, 243, 384, 671), (407, 243, 708, 671), (731, 243, 1033, 671), (1056, 243, 1357, 671)]
        pho = [ph((83, 244, 384, 472), (83, 208, 384, 508), 1190), ph((408, 244, 708, 472), (406, 244, 710, 472), 1191),
               ph((732, 244, 1033, 472), (732, 188, 1033, 576), 1192), ph((1057, 244, 1357, 472), (1053, 244, 1361, 472), 1193)]
        for i in range(4): G += card(items, cards[i], T[i], photo=pho[i], badge=(745.5, 257.5, 797.5, 285.5) if i == 2 else None, D=0.4, step=0.05, d=0.45)
        G += [dict(k='ink', r=(80, 729, 838, 749), a='fade', t=T[3] + 1.0, d=0.5)]
    elif pno == 18:
        G += kicker(216) + titles([(80, 105, 404, 160), (80, 160, 479, 215)], step=0.1)
        grid = [(82 + 258 * c, 241 + 102 * r, 325 + 258 * c, 328 + 102 * r) for r in range(3) for c in range(5)]
        for i, g in enumerate(grid):
            rr, cc = divmod(i, 5)
            G.append(dict(k='card', r=(g[0] - 0.5, g[1] - 0.5, g[2] + 0.5, g[3] + 0.5), a='pop', t=0.75 + 0.07 * (rr + cc), d=0.5))
        ts = [max(at('750건의', 1.5), 1.5), at('7개국의', 3.0), at('6개', 4.5)]
        ts = [max(ts[0], 1.5), max(ts[1], ts[0] + 0.5), max(ts[2], ts[0] + 1.0)]
        stats = [(80.5, 551.5, 283.5, 683.5), (295.5, 551.5, 498.5, 683.5), (510.5, 551.5, 713.5, 683.5)]   # 흰 카드 테두리까지
        for i, r in enumerate(stats): G.append(dict(k='ink', r=r, a='rise', t=ts[i], d=0.55, dy=16, pulses=[(ts[i] + 0.45, 0.6, 0.05)]))
        tb = max(at('국내외', 6.5), ts[2] + 0.9)
        G += stagger([(726.5, 552.5, 927.5, 682.5), (941.5, 552.5, 1142.5, 682.5), (1156.5, 552.5, 1357.5, 682.5)], tb, 0.15, k='card', a='slide', d=0.6)
    elif pno == 19:
        G += kicker(278, GRAY) + [dict(g, bg=GRAY) for g in titles([(80, 107, 878, 168)])]
        ti = 0.8
        G += stagger([(80, 194, 480, 278), (80, 298, 480, 382), (80, 402, 480, 486)], ti, 0.25, dy=16, d=0.6)
        G += [dict(k='photo', r=(878, 196, 1358, 460), place=(878, 153, 1358, 513), xref=1386, t=0.7), dict(k='ink', r=(876, 465, 1099, 482), a='fade', t=1.7, d=0.5)]
        tc = max(at('데이터로', 3.0) - 0.6, ti + 1.0)
        for i, r in enumerate([(82, 505.5, 496.5, 690.5), (513.5, 505.5, 926.5, 690.5), (943.5, 505.5, 1358.5, 690.5)]): G += card(items, r, tc + 0.3 * i)
        G += [dict(k='ink', r=(80, 699, 693, 719), a='fade', t=tc + 1.3, d=0.5)]
    elif pno == 20:
        G += kicker(196) + titles([(80, 107, 905, 168)])
        G += [dict(k='card', r=(82.5, 195.5, 1357.5, 426.5), a='rise', t=0.5, d=0.55, dy=18)]
        T = [max(at('현장', 1.0), 1.0), at('제어반', 2.0), at('서버', 3.0), at('시운전까지', 4.0)]
        T = [max(T[i], T[0] + 0.5 * i) for i in range(4)]
        rows = [(214, 256.5), (258, 300), (302, 343), (345, 387)]; track = [(222, 254), (266, 297), (309, 340), (353, 384)]
        bars = [(353, 418), (418, 742), (742, 872), (872, 1132)]; txt_end = [640, 742, 1092, 1132]
        for i, (y0, y1) in enumerate(rows):
            G.append(dict(k='ink', r=(100, y0, 345, y1), a='rise', t=T[i], d=0.45, dy=8))
            G.append(dict(k='card', r=(bars[i][0], track[i][0], max(bars[i][1], txt_end[i]) + 2, track[i][1]), a='wipe', t=T[i] + 0.1, d=0.7, z=2, pad=0, bg=GRAY))   # 회색 트랙 위에서 막대가 자람
        G += [dict(k='ink', r=(100, 390, 1340, 414), a='fade', t=T[3] + 0.6, d=0.5), dict(k='ink', r=(80, 433, 720, 453), a='fade', t=T[3] + 0.8, d=0.5)]
        t5 = T[3] + 0.7
        G += [dict(k='ink', r=(80, 466, 245, 565), a='rise', t=t5, d=0.5, dy=12)]
        G += stagger([(250.5, 467.5, 518.5, 563.5), (530.5, 467.5, 798.5, 563.5), (809.5, 467.5, 1077.5, 563.5), (1089.5, 467.5, 1357.5, 563.5)], t5 + 0.1, 0.12, k='card', a='rise', d=0.5, dy=14)
        G += [dict(k='ink', r=(80, 579, 245, 676), a='rise', t=t5 + 0.6, d=0.5, dy=12)]
        G += stagger([(250.5, 581.5, 610.5, 674.5), (623.5, 581.5, 984.5, 674.5), (996.5, 581.5, 1357.5, 674.5)], t5 + 0.7, 0.12, k='card', a='rise', d=0.5, dy=14)
    elif pno == 21:
        G += kicker(252, GRAY) + [dict(g, bg=GRAY) for g in titles([(80, 107, 1116, 168)])] + [dict(k='ink', r=(80, 185, 952, 212), a='rise', t=0.8, d=0.5, dy=10, bg=GRAY)]
        G += card(items, (83, 240, 666, 515), 1.0, step=0.07)
        tot = max(at('OT', 4.0), 2.0)
        G += card(items, (687, 240, 1357, 515), tot, cols=[(687, 240, 1022, 515), (1023, 240, 1357, 515)], step=0.05)
        tm = [max(at('담당하고', 5.0), tot + 0.8), max(at('표준', 6.5), tot + 1.3)]
        for i, r in enumerate([(81.5, 535.5, 496.5, 694.5), (513.5, 535.5, 926.5, 694.5), (943.5, 535.5, 1358.5, 694.5)]):
            G += card(items, r, [tm[0], tm[1], tm[1] + 0.35][i], step=0.05)
    elif pno == 23:
        G += [dict(k='ink', r=(600, 147, 840, 197), a='rise', t=0.3, d=0.7, dy=14), dict(k='ink', r=(697, 221, 743, 228), a='wipe', t=0.7, d=0.45)]
        G += [dict(k='ink', r=(550, 250, 890, 311), a='maskup', t=max(at('설비를', 0.9), 0.9) - 0.05, d=0.75),
              dict(k='ink', r=(550, 311, 890, 370), a='maskup', t=max(at('데이터를', 1.8), 1.5) - 0.05, d=0.75)]
        tq = max(at('동인엔시스가', 3.0), 2.6)
        G += [dict(k='ink', r=(629, 413, 811, 595), a='pop', t=tq, d=0.6), dict(k='ink', r=(600, 608, 840, 641), a='rise', t=tq + 0.35, d=0.5, dy=10),
              dict(k='ink', r=(600, 641, 840, 663), a='fade', t=tq + 0.55, d=0.5)]
    return G


def check_overlap(G):
    rs = [(i, g['r']) for i, g in enumerate(G) if g['k'] in ('ink', 'count', 'line') or (g['k'] == 'card' and zof(g) >= 2)]
    for a in range(len(rs)):
        for b in range(a + 1, len(rs)):
            (i, r), (j, s) = rs[a], rs[b]
            if min(r[2], s[2]) - max(r[0], s[0]) > 0.6 and min(r[3], s[3]) - max(r[1], s[1]) > 0.6:
                print(f'  겹침 p{G[i].get("pno", "?")}:', G[i]['k'], tuple(round(v) for v in r), '↔', G[j]['k'], tuple(round(v) for v in s))


# ── 장면 하나를 영상 조각으로
def word_finder(sc):
    off = sc['nstart'] - sc['start']; words = sc.get('words', [])
    def at(w, default, nth=0):
        for test in (lambda t: t == w, lambda t: t.startswith(w), lambda t: w in t):
            hits = [a for a, b, t in words if test(t)]
            if len(hits) > nth: return off + hits[nth]
        print(f'  (장면 {sc.get("page", "표지")}: 단어 없음 "{w}" → {default}초)'); return default
    return at


def build_scene(sc, lang):
    at = word_finder(sc)
    if sc.get('video'): return None, CoverScene(sc, at)
    ps_doc = fitz.open(B.PDF[lang]); G = page_groups(sc['page'], at, Items(ps_doc[sc['page'] - 1]))
    for g in G: g['pno'] = sc['page']
    check_overlap(G)
    return G, PageScene(B.PDF[lang], sc['page'], G)


def render_scene(job):
    i, sc, lang, out, test, tdir = job
    G, scene = build_scene(sc, lang); frames = int(round(sc['dur'] * FPS))
    if sc.get('video'):
        dec = subprocess.Popen([B.FF, '-v', 'error', '-stream_loop', '-1', '-i', sc['video'], '-t', f"{sc['dur'] + 0.5:.3f}", '-an',
                                '-vf', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
        get = lambda: np.frombuffer(dec.stdout.read(W * H * 3), np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0
        n_read = [0]
        def draw(t):
            while n_read[0] < int(round(t * FPS)): get(); n_read[0] += 1
            n_read[0] += 1; return scene.frame(get(), t)
    else:
        draw = scene.frame
    if test:
        os.makedirs(tdir, exist_ok=True)
        for t in test:
            Image.fromarray((np.clip(draw(t), 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{tdir}/s{i:02d}_{t:05.2f}.png')
        if sc.get('video'): dec.kill()
        return None
    enc = subprocess.Popen([B.FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for f in range(frames): enc.stdin.write((np.clip(draw(f / FPS), 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    enc.stdin.close(); enc.wait()
    if sc.get('video'): dec.stdout.close(); dec.kill()
    if enc.returncode: raise SystemExit(f'인코딩 실패: {out}')
    return out


def prepare(lang, n=0):
    scenes = [dict(s) for s in (B.SCENES[lang][:n] if n else B.SCENES[lang])]
    work = f'{B.OUT}/motion_{lang}'; os.makedirs(f'{work}/tts', exist_ok=True); os.makedirs(f'{work}/seg', exist_ok=True)
    async def tts_all():
        for si, sc in enumerate(scenes): await tts_words(sc, B.VOICE[lang], B.RATE[lang], f'{work}/tts/s{si:02d}', lang)
    asyncio.run(tts_all())
    return scenes, B.timeline(scenes), work


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--scenes', type=int, default=0); ap.add_argument('--out', default=None); ap.add_argument('--test', default=None)
    a = ap.parse_args(); lang = LANG
    scenes, total, work = prepare(lang, a.scenes)
    print(f'[{lang}] 장면 {len(scenes)} | {total:.1f}초 | 장면 길이', [round(s["dur"], 1) for s in scenes])
    if a.test:
        for spec in a.test.split(';'):
            si, ts = spec.split(':'); render_scene((int(si), scenes[int(si)], lang, None, [float(x) for x in ts.split(',')], f'{B.OUT}/motion_test'))
        return
    from concurrent.futures import ProcessPoolExecutor
    jobs = [(i, sc, lang, f'{work}/seg/m{i:02d}.mp4', None, None) for i, sc in enumerate(scenes)]
    with ProcessPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as ex: segs = list(ex.map(render_scene, jobs))
    B.concat_xfade(segs, scenes, f'{work}/video.mp4')
    B.mix_audio(scenes, total, B.ensure_bgm(), f'{work}/audio.wav')
    B.write_ass(scenes, f'{work}/subs.ass')
    s = open(f'{work}/subs.ass', encoding='utf-8').read().splitlines()      # 표지 제목은 화면에서 직접 그리므로 자막 파일에서 뺌
    open(f'{work}/subs.ass', 'w', encoding='utf-8').write('\n'.join(l for l in s if ',Kicker,' not in l and ',Title,' not in l) + '\n')
    out = a.out or (f'{B.SITE}/video/company-intro_{lang}.mp4' if not a.scenes else f'{B.OUT}/motion_sample_{lang}.mp4')
    B.run([B.FF, '-v', 'error', '-y', '-i', f'{work}/video.mp4', '-i', f'{work}/audio.wav', '-vf', f"ass={work}/subs.ass:fontsdir={FONTS}",
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-maxrate', '860k', '-bufsize', '2000k', '-g', '60', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', out])
    poster = out[:-4] + '.jpg'
    B.run([B.FF, '-v', 'error', '-y', '-ss', '4.5', '-i', out, '-frames:v', '1', '-q:v', '3', poster])
    print('->', out, f'{os.path.getsize(out) / 1e6:.1f} MB |', poster)


if __name__ == '__main__':
    main()
