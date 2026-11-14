"""메인 첫 화면 영상 (video/hero_f*.mp4) 만들기 — 움직이는 클립 6개(각 5초)를 이어 붙인 19초 반복 영상.

쓰는 법:
  python3 _src/video/build_hero_clips.py pc <클립 폴더>   # h24.mp4 ~ h29.mp4 (가로) → video/hero_f.mp4   1600×900
  python3 _src/video/build_hero_clips.py m  <클립 폴더>   # v24.mp4 ~ v29.mp4 (세로) → video/hero_f_m.mp4 720×1480

- 클립은 연출 사진(같은 기준 제어반)을 영상 생성 도구로 5초씩 움직이게 만든 것. 원본 클립은 저장소에 올리지 않는다.
- 클립 화면은 자르거나 확대하지 않고 그대로 쓴다(생성 도구 표시가 화면 구석에 있으면 그대로 둔다).
- 장면 순서·시각은 국문 나레이션(video/hero_narr_kr.mp3) 줄 시작 시각에 맞춘다. 마지막 장면이 첫 장면으로 겹쳐 넘어가 끊김 없이 반복된다.
- 클립이 없는 장면이 생기면 사진 확대판 build_hero.py 를 쓴다.
- 필요한 것: Python 3, pillow, numpy, ffmpeg.
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

MODE = sys.argv[1] if len(sys.argv) > 1 else 'pc'
SRC = sys.argv[2] if len(sys.argv) > 2 else '.'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRE, (SW, SH) = ('v', (720, 1280)) if MODE == 'm' else ('h', (1280, 720))
PAD = 200 if MODE == 'm' else 0          # 모바일: 위에 어두운 여백을 덧대 제목 자리를 만든다 (CSS에서 영상을 아래에 붙임)
OUT = os.path.join(ROOT, 'video', 'hero_f_m.mp4' if MODE == 'm' else 'hero_f.mp4')
POSTER = OUT.replace('.mp4', '_poster.jpg')
FPS, TOTAL, XF = 24, 19.0, 0.5
# (클립 번호, 시작 시각, 밝기 보정)
SCENES = [(24, 0.0, 1.0), (25, 3.0, 1.0), (26, 5.5, 1.0), (27, 9.0, 1.0), (29, 12.0, 1.12), (28, 14.5, 1.0)]


def load(n, gain):
    """클립을 통째로 읽어 (프레임 수, 높이, 너비, 3) 배열로 돌려준다."""
    cmd = ['ffmpeg', '-v', 'error', '-i', os.path.join(SRC, f'{PRE}{n}.mp4'), '-vf', f'fps={FPS},scale={SW}:{SH}:flags=lanczos',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, SH, SW, 3)
    if gain != 1.0:
        lut = (np.clip((np.arange(256) / 255.0) ** (1 / gain), 0, 1) * 255).astype(np.uint8)
        a = lut[a]
    return a


def main():
    starts = [s for _, s, _ in SCENES]
    ends = starts[1:] + [TOTAL]
    n = len(SCENES)
    H = SH + PAD
    vf = 'scale=1600:900:flags=lanczos,unsharp=5:5:0.4:5:5:0.0' if MODE == 'pc' else 'null'   # 원본이 720p라 1600×900까지만 키운다
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{H}', '-r', str(FPS), '-i', '-',
           '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', os.environ.get('HERO_CRF', '30' if MODE == 'm' else '28'),
           '-pix_fmt', 'yuv420p', '-x264-params', 'aq-mode=3:keyint=72', '-movflags', '+faststart', OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    cache = {}

    def clip(i):
        if i not in cache:
            for k in [k for k in cache if k not in (i, (i - 1) % n)]:
                del cache[k]                       # 메모리 절약: 지금 장면과 바로 앞 장면만 들고 있는다
            cache[i] = load(SCENES[i][0], SCENES[i][2])
        return cache[i]

    def shot(i, t):
        # 장면 i는 (시작-XF) ~ 끝 동안 클립의 처음부터 재생된다. 첫 장면의 앞 XF초는 영상 끝과 이어진다.
        s0 = starts[i] - XF
        u = (t - s0) % TOTAL if i == 0 else t - s0
        c = clip(i)
        return c[min(max(int(round(u * FPS)), 0), len(c) - 1)].astype(np.float32)

    for fi in range(round(TOTAL * FPS)):
        t = fi / FPS
        k = max(i for i in range(n) if starts[i] <= t)
        a = shot(k, t)
        if t > ends[k] - XF:                       # 장면 끝 XF초 동안 다음 장면과 겹침
            w = (t - (ends[k] - XF)) / XF; w = w * w * (3 - 2 * w)
            a = a * (1 - w) + shot((k + 1) % n, t) * w
        a = np.clip(a + 0.5, 0, 255).astype(np.uint8)
        if PAD:                                    # 맨 윗줄(어두운 바탕) 색을 위로 늘려 여백을 만든다
            top = a[:4].mean(axis=0, keepdims=True).astype(np.uint8)
            a = np.concatenate([np.repeat(top, PAD, axis=0), a], axis=0)
        if fi == 0:
            im = Image.fromarray(a)
            if MODE == 'pc':
                im = im.resize((1600, 900), Image.LANCZOS)
            im.save(POSTER, quality=82, optimize=True, progressive=True)
        p.stdin.write(a.tobytes())
    p.stdin.close(); p.wait()
    print(OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
