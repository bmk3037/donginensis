"""메인 첫 화면 국문 나레이션 (video/hero_narr_kr.mp3) 만들기 — 타입캐스트로 읽힌 한 파일을 새 영상(hero_f) 장면에 맞춰 놓는다.

쓰는 법:  python3 _src/video/build_hero_narr.py <타입캐스트 음성 파일(mp3/wav)>

대본 (2026.11.14, 타입캐스트):
  설비를 움직이는 제어반이, 이제 데이터까지 모읍니다.            → 펌프실 제어반 → 문 연 내부
  온도와 전류, 진동을 24시간 기록하고, 기준을 벗어나면 바로 알려 드립니다. → 모터 센서 → 엔지니어와 태블릿
  공장에서 바다 위 선박까지, 동인엔시스 지능형 제어반입니다.      → 공장 야경 → 선박 기관실

- 읽는 흐름이 끊기지 않게 문장 사이 쉼(무음)에서만 세 덩어리로 자르고, 덩어리마다 장면에 맞는 시각에 놓는다.
- 음성을 다시 만들면 무음 위치가 달라지므로 CUTS(자를 시각)와 PLACE(말이 시작되는 시각)를 다시 맞춘다.
  무음 위치 보기: ffmpeg -i 파일 -af silencedetect=noise=-35dB:d=0.08 -f null -
- 원본 음성 파일은 저장소에 올리지 않는다. 필요한 것: ffmpeg.
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1]
OUT = os.path.join(ROOT, 'video', 'hero_narr_kr.mp3')
# 원본에서 자를 구간 (시작, 끝, 그 안에서 말이 시작되는 시각) — 문장 사이 무음 한가운데에서 자른다
CUTS = [(0.30, 3.245, 0.36),      # 설비를 움직이는 제어반이, 이제 데이터까지 모읍니다.
        (3.245, 8.34, 3.40),      # 온도와 전류, 진동을 24시간 기록하고, 기준을 벗어나면 바로 알려 드립니다.
        (8.34, 12.74, 8.63)]      # 공장에서 바다 위 선박까지, 동인엔시스 지능형 제어반입니다.
# 영상에서 각 덩어리의 말이 시작되는 시각(초). 장면: 0 펌프실 / 3 내부 / 5.5 센서 / 9 엔지니어 / 12 공장 / 14.5 선박
PLACE = [1.2, 6.2, 12.6]
FADE = 0.02


def main():
    fc, labels = [], []
    for i, ((a, b, onset), t) in enumerate(zip(CUTS, PLACE)):
        d = b - a; delay = round((t - (onset - a)) * 1000)
        fc.append(f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d={FADE},afade=t=out:st={d - FADE:.3f}:d={FADE},adelay={delay}:all=1[a{i}]')
        labels.append(f'[a{i}]')
    fc.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=44100[o]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', ';'.join(fc), '-map', '[o]',
                    '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', OUT], check=True)
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT], capture_output=True, text=True)
    print(OUT, r.stdout.strip(), '초', os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
