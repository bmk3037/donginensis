# 랜딩 영상(hero_f) 제어반 문 앞면: [키패드][선택스위치][초록] → [키패드][선택스위치][초록][빨강]
# 원본 클립이 없어 완성 영상 위에서 고친다. 장면마다 선택 스위치를 추적 → 원래 스위치·초록 등을 지우고(inpaint)
# 스위치·초록 등을 반 칸 왼쪽으로, 그 오른쪽에 빨간 등(초록 등을 빨갛게 바꾼 것)을 놓는다.
#   python _src/video/fix_hero_lamps.py pc|m <입력 mp4> <출력 mp4> [--test t1,t2,...]
#   (2026.11.15 적용. 입력은 등이 하나인 예전 hero_f*.mp4 — 이미 고친 영상에 다시 돌리면 안 된다)
import os, sys, subprocess, numpy as np, cv2
MODE, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TEST = [float(x) for x in sys.argv[5].split(',')] if len(sys.argv) > 5 and sys.argv[4] == '--test' else None
W, H = (1600, 900) if MODE == 'pc' else (720, 1480)
FPS, TOTAL, XF = 24, 19.0, 0.5
STARTS = [0.0, 3.0, 5.5, 9.0, 12.0, 14.5]; ENDS = STARTS[1:] + [TOTAL]
# 제어반 문 앞면이 보이는 장면: (장면 번호, 기준 시각, 선택스위치 중심, 초록 등 중심)
REF = {'pc': [(0, 1.0, (1227.3, 239.6), (1269.4, 238.7)), (2, 7.0, (1283.0, 268.0), (1323.0, 268.0)),
              (3, 10.5, (1236.7, 240.0), (1279.3, 239.7)), (5, 16.0, (1152.0, 308.5), (1184.6, 308.7))],
       'm': [(0, 1.0, (211.5, 1034.0), (245.0, 1033.8)), (2, 7.0, (590.0, 975.0), (619.0, 974.0)),
             (3, 10.5, (208.5, 1033.8), (241.5, 1034.0)), (5, 16.0, (304.3, 1053.0), (330.0, 1053.3))]}[MODE]

def sm(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def weight(i, t):
    s, e = STARTS[i], ENDS[i]
    if i == 0 and t >= TOTAL - XF: return sm((t - (TOTAL - XF)) / XF)        # 끝에서 첫 장면이 겹쳐 들어옴
    if s <= t <= e - XF: return 1.0
    if e - XF < t < e: return 1 - sm((t - (e - XF)) / XF)
    if s - XF < t < s: return sm((t - (s - XF)) / XF)
    return 0.0

def read_all(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)

def track(frames, i, t0, S0, G0):
    """선택 스위치를 여러 배율 템플릿 매칭으로 따라간다 → 프레임별 (x, y, 배율), 매끈하게 다듬은 값."""
    L = float(np.hypot(G0[0] - S0[0], G0[1] - S0[1])); hs = max(6, int(round(0.42 * L)))
    gray = lambda f: cv2.cvtColor(f, cv2.COLOR_RGB2GRAY).astype(np.float32)
    k0 = int(round(t0 * FPS)); tpl0 = cv2.getRectSubPix(gray(frames[k0]), (2 * hs + 1, 2 * hs + 1), S0)
    ks = [k for k in range(len(frames)) if weight(i, k / FPS) > 0.0]
    te = lambda k: k / FPS - (TOTAL if (i == 0 and k / FPS >= TOTAL - XF) else 0.0)   # 첫 장면이 끝에서 겹쳐 들어오는 0.5초는 클립 시간상 시작 전
    res = {}
    for direction in (1, -1):                    # 기준 프레임에서 앞뒤로
        x, y, s = S0[0], S0[1], 1.0
        seq = [k for k in ks if (te(k) >= t0 if direction == 1 else te(k) < t0)]
        seq = sorted(seq, key=te, reverse=(direction == -1))
        for k in seq:
            g = gray(frames[k]); best = (-2, x, y, s)
            R = int(0.5 * L + 6)
            for sc in np.arange(s - 0.03, s + 0.0301, 0.01):
                tp = cv2.resize(tpl0, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC); th, tw = tp.shape
                x0, y0 = int(x - R - tw / 2), int(y - R - th / 2)
                win = g[max(0, y0):y0 + th + 2 * R, max(0, x0):x0 + tw + 2 * R]
                if win.shape[0] < th or win.shape[1] < tw: continue
                m = cv2.matchTemplate(win, tp, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(m)
                if mv > best[0]: best = (mv, max(0, x0) + ml[0] + (tw - 1) / 2, max(0, y0) + ml[1] + (th - 1) / 2, sc)
            sc_, x_, y_, s_ = best[0], best[1], best[2], best[3]
            if sc_ > 0.45: x, y, s = x_, y_, s_
            res[k] = (x, y, s, sc_)
    # 매끈하게: 확실한 프레임(겹침 아닌 구간, 점수 0.6 이상)으로 2차식 맞추고 전체에 적용
    good = [k for k in ks if weight(i, k / FPS) >= 0.99 and res[k][3] >= 0.6]
    tt = np.array([te(k) for k in good])
    fit = [np.polyfit(tt, [res[k][j] for k in good], 2) for j in range(3)]
    sm_ = {k: tuple(np.polyval(fit[j], te(k)) for j in range(3)) for k in ks}
    err = np.median([np.hypot(res[k][0] - sm_[k][0], res[k][1] - sm_[k][1]) for k in good])
    print(f'shot {i}: frames {len(ks)} good {len(good)} median fit err {err:.2f}px  scale {min(v[2] for v in sm_.values()):.3f}~{max(v[2] for v in sm_.values()):.3f}', flush=True)
    if os.environ.get('DBG'):
        for k in ks:
            if weight(i, k / FPS) < 0.99: print(f'  k{k} w{weight(i, k / FPS):.2f} raw ({res[k][0]:.1f},{res[k][1]:.1f},{res[k][2]:.3f}) sc{res[k][3]:.2f}  fit ({sm_[k][0]:.1f},{sm_[k][1]:.1f},{sm_[k][2]:.3f})')
    return sm_, (G0[0] - S0[0], G0[1] - S0[1])

def soft_disc(h, w, cx, cy, r_in, r_out):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); d = np.hypot(xx - cx, yy - cy)
    return np.clip((r_out - d) / max(r_out - r_in, 1e-3), 0, 1)

HOLD = {}; FULL = True
def edit(f, k, i, S, dv):
    """한 프레임 고치기. f: uint8 HxWx3, S: 스위치 중심, dv: 스위치→초록 벡터(현재 배율)."""
    L = float(np.hypot(*dv)); dx, dy = dv
    G = (S[0] + dx, S[1] + dy)
    Sn, Gn, Rn = (S[0] - 0.5 * dx, S[1] - 0.5 * dy), (S[0] + 0.5 * dx, S[1] + 0.5 * dy), (S[0] + 1.5 * dx, S[1] + 1.5 * dy)
    pad = int(L * 1.3) + 6
    x0, x1 = int(min(S[0], Sn[0]) - pad), int(max(G[0], Rn[0]) + pad); y0, y1 = int(S[1] - pad), int(S[1] + pad)
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W, x1), min(H, y1)
    roi = f[y0:y1, x0:x1].copy(); rh, rw = roi.shape[:2]
    lc = lambda p: (p[0] - x0, p[1] - y0)
    hs = int(round(0.47 * L)) + 1; size = (2 * hs + 1, 2 * hs + 1)
    fl = roi.astype(np.float32)
    spr_s = cv2.getRectSubPix(fl, size, lc(S)); spr_g = cv2.getRectSubPix(fl, size, lc(G))
    # 빨간 등: 초록 기운이 있는 곳만 R↔G 바꿈. 깜빡여 어두워진 프레임은 마지막 밝은 모양을 씀(빨간 등은 계속 켜짐)
    gr = spr_g[..., 1] - np.maximum(spr_g[..., 0], spr_g[..., 2])
    lum = spr_g[..., 0] * 0.3 + spr_g[..., 1] * 0.59 + spr_g[..., 2] * 0.11
    sz = spr_g.shape[0]
    # 문 색 밝기(등 둘레 고리) — 밝은 문에서 문까지 빨갛게 칠하지 않도록 '문보다 밝은 곳'만 심지로 본다
    yq, xq = np.mgrid[0:roi.shape[0], 0:roi.shape[1]].astype(np.float32)
    dgq, dsq = np.hypot(xq - lc(G)[0], yq - lc(G)[1]), np.hypot(xq - lc(S)[0], yq - lc(S)[1])
    rq = (dgq > 0.62 * L) & (dgq < 0.95 * L) & (dsq > 0.62 * L)
    dl = float(np.median(fl[rq] @ np.float32([0.3, 0.59, 0.11]))) if rq.any() else 150.0
    gr_s = np.clip(gr / 35.0, 0, 1)
    kb = np.maximum(np.clip(gr / 35.0, 0, 1) * soft_disc(sz, sz, hs, hs, 0.30 * L, 0.38 * L),       # 등 렌즈(초록)
                    np.maximum(soft_disc(sz, sz, hs, hs, 0.17 * L, 0.23 * L),                         # 등 몸체
                               np.clip((lum - dl - 25) / 40, 0, 1) * soft_disc(sz, sz, hs, hs, 0.36 * L, 0.46 * L)))   # 하얗게 날아간 심지
    kb = cv2.GaussianBlur(kb, (0, 0), 0.8)[..., None]
    kg = cv2.GaussianBlur(gr_s, (0, 0), 0.8)[..., None]                                   # 문에 번진 초록빛 → 같은 세기의 붉은빛
    mn = np.minimum(spr_g[..., 0], spr_g[..., 2])
    swap = np.stack([np.minimum(255, spr_g[..., 1] * 1.02), mn * 0.97, mn * 0.95], -1)
    red = np.stack([np.minimum(255, lum * 1.08 + 12), lum * 0.40, lum * 0.36], -1)
    red = (spr_g * (1 - kg) + swap * kg) * (1 - kb) + red * kb      # 렌즈: 초록 (60,230,120) → 빨강 (191,66,60), 흰 심지는 밝은 빨강
    cen = spr_g[hs - 2:hs + 3, hs - 2:hs + 3, 1].mean(); key = i
    pk = HOLD.get(key)
    if FULL:                                        # 겹침 구간이 아닐 때만 '켜진 모양 유지'
        if pk is None or cen >= 0.85 * pk[0]: HOLD[key] = (max(cen, pk[0] if pk else 0), red, size)
        elif pk[2] == size: red = pk[1]
    # 문 색(스위치·등 둘레 고리의 중간값) → 문이 아닌 것(태블릿 등)이 덮은 곳은 칠하지 않음
    yy, xx = np.mgrid[0:rh, 0:rw].astype(np.float32)
    ds, dg = np.hypot(xx - lc(S)[0], yy - lc(S)[1]), np.hypot(xx - lc(G)[0], yy - lc(G)[1])
    ring = ((ds > 0.62 * L) & (ds < 0.95 * L) & (dg > 0.62 * L)) | ((dg > 0.62 * L) & (dg < 0.95 * L) & (ds > 0.62 * L))
    door = np.median(fl[ring], axis=0)
    occ = (np.abs(fl - door).max(2) > 48) & (ds > 0.55 * L) & (np.hypot(xx - lc(S)[0] - 0.06 * L, yy - lc(S)[1] - 0.08 * L) > 0.66 * L) & (dg > 0.6 * L)
    occ = cv2.dilate(occ.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2).astype(np.float32)
    # 원래 스위치·초록 등 지우기
    dsh = np.hypot(xx - lc(S)[0] - 0.06 * L, yy - lc(S)[1] - 0.08 * L)   # 스위치 그림자(오른쪽 아래)까지
    m = ((ds < 0.52 * L) | (dsh < 0.64 * L) | (dg < 0.58 * L)).astype(np.uint8) * 255
    bg = cv2.inpaint(roi, m, max(3, int(L * 0.15)), cv2.INPAINT_TELEA).astype(np.float32)
    bg = bg + np.random.default_rng(k).normal(0, 0.8, bg.shape).astype(np.float32)   # 영상 결 맞춤
    out = bg
    for spr, P, rin, rout in ((spr_s, Sn, 0.38, 0.47), (spr_g, Gn, 0.36, 0.47), (red, Rn, 0.36, 0.47)):
        px, py = lc(P); M = np.float32([[1, 0, px - hs], [0, 1, py - hs]])
        layer = cv2.warpAffine(spr, M, (rw, rh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        a = soft_disc(rh, rw, px, py, rin * L, rout * L) * (1 - occ)
        out = out * (1 - a[..., None]) + layer * a[..., None]
    # 고친 부분만 원본에 섞기(바깥 가장자리 부드럽게)
    reg = np.maximum.reduce([soft_disc(rh, rw, *lc(p), 0.60 * L, 0.75 * L) for p in (Sn, S, Gn, G, Rn)]) * (1 - occ)
    res = fl * (1 - reg[..., None]) + out * reg[..., None]
    g = f.copy(); g[y0:y1, x0:x1] = np.clip(res + 0.5, 0, 255).astype(np.uint8)
    return g

def anchor(i, k, tr):
    """겹침 프레임 k에 쓸, 같은 장면의 가장 가까운 '겹치지 않는' 프레임."""
    pure = [kk for kk in tr if weight(i, kk / FPS) >= 0.99]
    t = k / FPS
    if i == 0 and t >= TOTAL - XF: return min(pure)          # 끝에서 겹쳐 들어오는 첫 장면 → 0초 프레임
    e = ENDS[i]
    return max(pure) if t > e - XF else min(pure)

_DL = {}
def delta(frames, i, ka, tr, dv0):
    if (i, ka) not in _DL:
        x, y, s = tr[ka]; a = frames[ka]
        e = edit(a.copy(), ka, i, (x, y), (dv0[0] * s, dv0[1] * s))
        _DL[(i, ka)] = (e.astype(np.float32) - a.astype(np.float32), (x, y, s))
    return _DL[(i, ka)]

def lap(a):
    g = a.astype(np.float32) @ np.float32([0.299, 0.587, 0.114]) if a.ndim == 3 else a
    return cv2.Laplacian(cv2.GaussianBlur(g, (0, 0), 0.7), cv2.CV_32F)

def refine(F, Aa, ax, ay, as_, x, y, s, w, dv):
    """겹침 프레임: 앞뒤 프레임(Aa)을 w만큼 빼 봤을 때 원래 스위치·등 테두리가 가장 덜 남는 위치·밝기를 찾는다."""
    L = float(np.hypot(*dv)) * s
    xs = [x - 0.5 * dv[0] * s, x + 1.5 * dv[0] * s]; ys = [y - 0.5 * dv[1] * s, y + 1.5 * dv[1] * s]
    x0, x1 = int(max(0, min(xs) - 1.1 * L)), int(min(W, max(xs) + 1.1 * L))
    y0, y1 = int(max(0, min(ys) - 1.1 * L)), int(min(H, max(ys) + 1.1 * L))
    Lf = lap(F[y0:y1, x0:x1]); sc = s / as_
    def score(px, py):
        M = np.float32([[sc, 0, px - sc * ax - x0], [0, sc, py - sc * ay - y0]])
        La = lap(cv2.warpAffine(Aa, M, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE))
        g = float(np.clip((Lf * La).sum() / (w * (La * La).sum() + 1e-6), 0.6, 1.4))
        return float(((Lf - w * g * La) ** 2).sum()), g
    best = (score(x, y)[0], x, y)
    for step, rng in ((0.5, 2.0), (0.125, 0.5)):
        cx, cy = best[1], best[2]
        for dx in np.arange(-rng, rng + 1e-6, step):
            for dy in np.arange(-rng, rng + 1e-6, step):
                e = score(cx + dx, cy + dy)[0]
                if e < best[0]: best = (e, cx + dx, cy + dy)
    return best[1], best[2], score(best[1], best[2])[1]

def main():
    frames = read_all(SRC); n = len(frames); print('frames', n, flush=True)
    tracks = [(i, *track(frames, i, t0, S0, G0)) for i, t0, S0, G0 in REF]
    ks = range(n) if TEST is None else [int(round(t * FPS)) for t in TEST]
    outs = {}
    for k in ks:
        f = frames[k].copy(); t = k / FPS
        for i, tr, dv0 in tracks:
            w = weight(i, t)
            if w <= 0.0 or k not in tr: continue
            x, y, s = tr[k]
            if w >= 0.99:
                f = edit(f, k, i, (x, y), (dv0[0] * s, dv0[1] * s))
            else:
                # 겹침 구간: 화면 = w·이 장면 + (1-w)·다른 장면. 바로 옆 '겹치지 않는' 프레임에서 고친 차이(edit−원본)를 구해
                # 지금 위치로 옮겨 w만큼 더한다 → 다른 장면 그림은 건드리지 않는다
                ka = anchor(i, k, tr)
                dlt, (ax, ay, as_) = delta(frames, i, ka, tr, dv0)
                x, y, g = refine(frames[k], frames[ka], ax, ay, as_, x, y, s, w, dv0)
                if os.environ.get('DBG'): print(f'  k{k} shot{i} w{w:.2f} refine dx{x - tr[k][0]:+.2f} dy{y - tr[k][1]:+.2f} g{g:.2f}', flush=True)
                sc = s / as_; M = np.float32([[sc, 0, x - sc * ax], [0, sc, y - sc * ay]])
                dd = cv2.warpAffine(dlt, M, (W, H), flags=cv2.INTER_LINEAR)
                # 원래 스위치·초록 등 자리: 빼고 남은 것(=다른 장면 + 어긋남 테두리)을 흐리게 해 테두리를 없앤다
                L = float(np.hypot(*dv0)) * s; m = int(1.2 * L)
                xs_ = [x, x + dv0[0] * s]; ys_ = [y, y + dv0[1] * s]
                x0, x1 = int(max(0, min(xs_) - m)), int(min(W, max(xs_) + m)); y0, y1 = int(max(0, min(ys_) - m)), int(min(H, max(ys_) + m))
                Aw = cv2.warpAffine(frames[ka].astype(np.float32), np.float32([[sc, 0, x - sc * ax - x0], [0, sc, y - sc * ay - y0]]), (x1 - x0, y1 - y0),
                                    flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
                R = f[y0:y1, x0:x1].astype(np.float32) - w * g * Aw          # = 다른 장면 + 어긋남 찌꺼기
                Mo = np.maximum(soft_disc(y1 - y0, x1 - x0, xs_[0] - x0 + 0.06 * L, ys_[0] - y0 + 0.05 * L, 0.62 * L, 0.80 * L),
                                soft_disc(y1 - y0, x1 - x0, xs_[1] - x0, ys_[1] - y0, 0.58 * L, 0.76 * L))
                if os.environ.get('XFM', 'blur') == 'blur':
                    Ri = cv2.GaussianBlur(R, (0, 0), max(1.5, 0.08 * L))
                else:
                    R8 = np.clip((R + 128) / 2 + 0.5, 0, 255).astype(np.uint8)
                    Ri = cv2.inpaint(R8, (Mo > 0.02).astype(np.uint8), max(3, int(0.15 * L)), cv2.INPAINT_TELEA).astype(np.float32) * 2 - 128
                    Ri = cv2.GaussianBlur(Ri, (0, 0), 1.0)
                Mo *= min(1.0, w / 0.15)
                # 원래 스위치·등의 윤곽(테두리가 남는 곳)에만 적용 → 다른 장면(배관·문 열린 칸)의 결은 살린다
                ga = cv2.GaussianBlur(Aw @ np.float32([0.299, 0.587, 0.114]), (0, 0), 1.0)
                gm = np.hypot(cv2.Sobel(ga, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(ga, cv2.CV_32F, 0, 1, ksize=3)) / 8
                Em = cv2.GaussianBlur(cv2.dilate(np.clip(gm / 6.0, 0, 1), np.ones((3, 3), np.uint8), iterations=2), (0, 0), 1.5)
                Mo *= np.clip(Em * 1.5, 0, 1)
                # 다른 장면의 선명한 윤곽(이 장면 무늬로 설명 안 되는 결)은 그대로 둔다
                sg = max(1.5, 0.08 * L); gR = R @ np.float32([0.299, 0.587, 0.114])
                hA = cv2.GaussianBlur(np.abs(ga - cv2.GaussianBlur(ga, (0, 0), sg)), (0, 0), 1.5) * w * g
                hR = cv2.GaussianBlur(np.abs(gR - cv2.GaussianBlur(gR, (0, 0), sg)), (0, 0), 1.5)
                Mo *= np.clip(1 - (hR - 1.2 * hA - 2) / (hA + 4), 0, 1) * min(1.0, w / 0.25)
                f = f.astype(np.float32) + w * g * dd
                f[y0:y1, x0:x1] += Mo[..., None] * (Ri - R)
                f = np.clip(f + 0.5, 0, 255).astype(np.uint8)
        outs[k] = f
    if TEST is not None:
        for k, f in outs.items(): cv2.imwrite(os.path.join(os.path.dirname(OUT), f'test_{MODE}_{k / FPS:05.2f}.png'), cv2.cvtColor(f, cv2.COLOR_RGB2BGR))
        return
    crf = os.environ.get('HERO_CRF', '29' if MODE == 'm' else '27')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an',
                          '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-x264-params', 'aq-mode=3:keyint=72',
                          '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
    for k in range(n): p.stdin.write(outs[k].tobytes())
    p.stdin.close(); p.wait()
    cv2.imwrite(OUT.replace('.mp4', '_poster.jpg'), cv2.cvtColor(outs[0], cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 82, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
    print('OUT', OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB', flush=True)

if __name__ == '__main__':
    main()
