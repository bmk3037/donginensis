"""메인 첫 화면 국문 나레이션 (video/hero_narr_kr.mp3) 만들기 — 새 영상(hero_f) 장면 시각에 맞춘다.

쓰는 법:  python3 _src/video/build_hero_narr.py [작업 폴더]

- 음성: Microsoft Edge 음성(edge-tts, 국문 InJoon — 회사소개 영상과 같은 목소리). 줄마다 따로 읽혀 장면 시작 시각에 놓는다.
- 줄이 장면 길이보다 길면 읽는 속도를 조금씩 올려 다시 읽힌다.
- 대본을 바꾸면 영상 장면(build_hero_clips.py 의 SCENES 시작 시각)과 맞는지 확인한다.
- 필요한 것: Python 3, edge-tts, ffmpeg, 인터넷.
"""
import asyncio, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '_src', 'video', 'out', 'hero_narr')
OUT = os.path.join(ROOT, 'video', 'hero_narr_kr.mp3')
VOICE, TOTAL = 'ko-KR-InJoonNeural', 19.0
# (장면 시작 시각, 읽을 문장) — 장면: 펌프실 제어반 / 문 연 내부 / 모터 센서 / 엔지니어와 태블릿 / 공장 야경 / 선박 기관실
LINES = [(0.0, '설비를 움직이는 제어반이,'),
         (3.0, '이제 데이터까지 모읍니다.'),
         (5.5, '온도와 전류, 진동을 스물네 시간 기록하고,'),
         (9.0, '기준을 벗어나면 바로 알려 드립니다.'),
         (12.0, '공장에서 바다 위 선박까지,'),
         (14.5, '동인엔시스 지능형 제어반입니다.')]
LEAD = 0.3      # 장면이 바뀌고 이만큼 뒤에 읽기 시작
TAIL = 18.4     # 마지막 줄은 이 시각 전에 끝난다(반복 지점 앞에 숨 돌릴 틈)


def dur(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(r.stdout.strip())


async def say(text, rate, path):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate=f'{rate:+d}%', proxy=os.environ.get('HTTPS_PROXY') or None).save(path)
    # 앞뒤 무음 잘라내기
    trimmed = path.replace('.mp3', '.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-af',
                    'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
                    '-ar', '44100', '-ac', '1', trimmed], check=True)
    return trimmed, dur(trimmed)


async def main():
    os.makedirs(WORK, exist_ok=True)
    parts = []
    for i, (t0, text) in enumerate(LINES):
        start = t0 + LEAD
        limit = (LINES[i + 1][0] if i + 1 < len(LINES) else TAIL) - start - (0.15 if i + 1 < len(LINES) else 0)
        for rate in (0, 4, 8, 12, 16):
            wav, d = await say(text, rate, os.path.join(WORK, f'l{i}.mp3'))
            if d <= limit: break
        print(f'{start:5.1f}s  {d:4.2f}s / {limit:4.2f}s  속도 {rate:+d}%  {text}')
        if d > limit: raise SystemExit('줄이 장면보다 깁니다: ' + text)
        parts.append((start, wav))
    ins = sum((['-i', w] for _, w in parts), [])
    fc = ';'.join(f'[{i}:a]adelay={round(s * 1000)}:all=1[a{i}]' for i, (s, _) in enumerate(parts))
    fc += ';' + ''.join(f'[a{i}]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=44100[o]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', fc, '-map', '[o]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '80k', OUT], check=True)
    print(OUT, round(dur(OUT), 2), '초', os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    asyncio.run(main())
