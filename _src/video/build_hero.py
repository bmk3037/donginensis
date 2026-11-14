"""메인 첫 화면 영상 (video/hero_f*.mp4) 만들기 — 실사풍 사진 6장을 천천히 확대하며 잇는 19초 반복 영상.

쓰는 법:
  python3 _src/video/build_hero.py m  <세로 사진 폴더>   # 모바일 720×1480 → video/hero_f_m.mp4
  python3 _src/video/build_hero.py pc <가로 사진 폴더>   # PC 1920×1080     → video/hero_f.mp4

- 사진 폴더에는 24.png ~ 29.png (챗지피티로 만든 연출 사진, 같은 기준 제어반)를 둔다. 원본 사진은 저장소에 올리지 않는다.
- 장면 순서·시각은 국문 나레이션(video/hero_narr_kr.mp3) 줄 시작 시각(0·3·5.5·9·12·14.5초)에 맞춘다.
- 첫 장면(=포스터)은 제어반이 보이는 24번. 마지막 장면이 첫 장면으로 겹쳐 넘어가 끊김 없이 반복된다.
- 필요한 것: Python 3, pillow, numpy, ffmpeg.
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

MODE = sys.argv[1] if len(sys.argv) > 1 else 'm'
SRC = sys.argv[2] if len(sys.argv) > 2 else '.'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W, H = (720, 1480) if MODE == 'm' else (1920, 1080)   # 모바일은 9:16 사진 위에 어두운 여백 200px를 덧대 제목 자리를 만든다
PAD_M = 200
OUT = os.path.join(ROOT, 'video', 'hero_f_m.mp4' if MODE == 'm' else 'hero_f.mp4')
POSTER = OUT.replace('.mp4', '_poster.jpg')
FPS, TOTAL, XF = 30, 19.0, 0.7
# (사진 번호, 시작 시각, 확대 시작→끝, 밝기 보정) — 주제가 있는 쪽(가로: 오른쪽, 세로: 아래쪽)을 중심으로 확대
SCENES = [(24, 0.0, 1.00, 1.07, 1.00), (25, 3.0, 1.07, 1.00, 1.00), (26, 5.5, 1.00, 1.07, 1.00),
          (27, 9.0, 1.06, 1.00, 1.00), (29, 12.0, 1.00, 1.06, 1.18), (28, 14.5, 1.08, 1.00, 1.00)]
CX, CY = (0.50, 0.76) if MODE == 'm' else (0.72, 0.56)   # 확대 중심(주제 위치)


def load(n, gain):
    im = Image.open(os.path.join(SRC, f'{n}.png')).convert('RGB')
    # 출력 비율로 가운데 맞춰 자르고, 확대 여유를 두고 2배 크기로 키워 둔다(움직임이 떨리지 않게)
    sw, sh = im.size
    if MODE == 'm':
        # 위쪽 여백: 사진 맨 윗줄(어두운 바탕)을 세로로 늘려 이어 붙인다
        pad = round(sh * PAD_M / (H - PAD_M))
        cv = Image.new('RGB', (sw, sh + pad))
        cv.paste(im.crop((0, 0, sw, 4)).resize((sw, pad), Image.BILINEAR), (0, 0)); cv.paste(im, (0, pad))
        im = cv; sw, sh = im.size
    if sw / sh > W / H:
        nw = round(sh * W / H); x0 = round((sw - nw) * CX); im = im.crop((x0, 0, x0 + nw, sh))
    else:
        nh = round(sw * H / W); y0 = round((sh - nh) * CY); im = im.crop((0, y0, sw, y0 + nh))
    im = im.resize((W * 2, H * 2), Image.LANCZOS)
    if gain != 1.0:
        a = np.asarray(im).astype(np.float32) / 255.0
        im = Image.fromarray((np.clip(a ** (1 / gain), 0, 1) * 255).astype(np.uint8))
    return im


def frame(im, z):
    # 확대 z배: 중심(CX,CY)을 기준으로 잘라 출력 크기로 줄인다(소수점 좌표, 부드러운 보간)
    sw, sh = im.size
    cw, ch = sw / z, sh / z
    x0 = (sw - cw) * CX; y0 = (sh - ch) * CY
    return np.asarray(im.transform((W, H), Image.AFFINE, (cw / W, 0, x0, 0, ch / H, y0), resample=Image.BICUBIC), dtype=np.float32)


def main():
    ims = [load(n, g) for n, _, _, _, g in SCENES]
    starts = [s for _, s, _, _, _ in SCENES]
    ends = starts[1:] + [TOTAL]
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', os.environ.get('HERO_CRF', '29' if MODE == 'm' else '27'), '-pix_fmt', 'yuv420p',
           '-x264-params', 'aq-mode=3:keyint=90', '-movflags', '+faststart', OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    rng = np.random.default_rng(7)
    grain = rng.normal(0, 0.8, (H, W, 1)).astype(np.float32)   # 어두운 바탕의 띠(계단) 무늬를 막는 아주 약한 입자
    n = len(SCENES)
    for fi in range(round(TOTAL * FPS)):
        t = fi / FPS
        k = max(i for i in range(n) if starts[i] <= t)

        def shot(i, tt):
            # 장면 i는 (시작-XF) ~ 끝 동안 움직인다. tt는 0~TOTAL 기준 시각(첫 장면의 앞부분은 영상 끝과 이어짐)
            s0 = starts[i] - XF; d = ends[i] - s0
            u = (tt - s0) % TOTAL if i == 0 and tt > ends[0] else tt - s0
            u = min(max(u / d, 0), 1)
            z0, z1 = SCENES[i][2], SCENES[i][3]
            return frame(ims[i], z0 + (z1 - z0) * u)

        a = shot(k, t)
        nxt = (k + 1) % n
        if t > ends[k] - XF:                      # 장면 끝 XF초 동안 다음 장면과 겹침
            w = (t - (ends[k] - XF)) / XF; w = w * w * (3 - 2 * w)
            a = a * (1 - w) + shot(nxt, t if nxt else t) * w
        a = np.clip(a + grain, 0, 255).astype(np.uint8)
        if fi == 0:
            Image.fromarray(a).save(POSTER, quality=82, optimize=True, progressive=True)
        p.stdin.write(a.tobytes())
    p.stdin.close(); p.wait()
    print(OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
