"""회사소개 영상 생성기 — 회사소개서(23장) 쪽 이미지 + 나레이션(TTS) + 자막(새김) + 배경음악 → video/company-intro_{kr,en}.mp4

※ 국문 영상(company-intro_kr.mp4)은 build_motion.py(모션판)가 만든다. 이 생성기(쪽 확대 방식)는 현재 영문 영상용.

사용: python3 _src/video/build_intro.py kr|en [--sample N] [--out 파일.mp4]
  --sample N : 앞 N개 장면만 만들어 시안 확인

흐름
  1. files/DONG-IN-ENSIS_Company-Profile_{KR,EN}.pdf 의 쪽을 장면으로 쓴다 (4에서 매 프레임 직접 그림)
  2. 장면마다 문장을 한 번에 TTS(edge-tts, 단어 시각 포함) → 앞뒤 무음 제거 → 문장별 자막 구간
  3. 장면 시간표: 말이 전환(크로스페이드) 중간부터 시작, 장면 사이 쉼 약 0.55초(LEAD+TAIL+PAUSE)
  4. 쪽을 매 프레임 PDF에서 직접 그려 느리게 확대/이동(소수점 위치라 끊김 없음) → xfade로 이어 붙임 (첫 장면은 video/hero_e.mp4 위에 로고·제목)
     나레이션은 문장 사이 긴 쉼(TTS가 1초 넘게 쉼)을 MAXP초로 줄인다
  5. 나레이션 음량 정규화(-16 LUFS) + 배경음(Mixkit 'Your Breath', 나레이션 중 자동 감쇠)
  6. ASS 자막(흰 쪽: 남색 글자+흰 테두리, 어두운 장면: 흰 글자) 새김, H.264 1080p, 25MB 이하

필요한 것: Python 3, pymupdf, numpy, edge-tts, imageio-ffmpeg(정적 ffmpeg), 인터넷(TTS·배경음 내려받기).
배경음은 bgm/ 에 없으면 Mixkit에서 내려받습니다(무료 라이선스, 출처 표기 불필요). bgm/·out/ 은 저장소에 올리지 않습니다.
국문 대본(SCENES['kr'])을 고치면 영문(SCENES['en'])도 같은 작업에서 고칩니다.
"""
import os, sys, json, wave, asyncio, subprocess, argparse, shutil, urllib.request
import numpy as np
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..', '..'))
FF = imageio_ffmpeg.get_ffmpeg_exe()
FONTS = f'{SITE}/_src/profile/fonts'
OUT = f'{HERE}/out'
BGM_URL, BGM_FILE = 'https://assets.mixkit.co/music/634/634.mp3', f'{HERE}/bgm/mixkit-your-breath-634.mp3'
W, H, FPS = 1920, 1080, 30
XF = 0.8          # 장면 전환(크로스페이드) 길이
PAUSE = 0.15      # 장면 사이 나레이션 쉼 (LEAD·TAIL과 합쳐 약 0.55초)
LEAD = 0.2        # 전환이 절반쯤 지난 뒤 말이 시작되기까지
TAIL = 0.2        # 말이 끝난 뒤 장면이 머무는 시간(전환 겹침 전)
MAXP = 0.5        # 한 장면 안에서 문장·구 사이 쉼의 최대 길이(초)
VOICE = {'kr': 'ko-KR-InJoonNeural', 'en': 'en-US-AndrewNeural'}
RATE = {'kr': '+4%', 'en': '+2%'}     # 3분 안팎에 맞추기 위한 읽기 속도
PDF = {'kr': f'{SITE}/files/DONG-IN-ENSIS_Company-Profile_KR.pdf', 'en': f'{SITE}/files/DONG-IN-ENSIS_Company-Profile_EN.pdf'}
HERO = f'{SITE}/video/hero_e.mp4'

# 장면: page(1~23) 또는 video(b-roll), lines = 자막 한 줄씩 (한 장면의 문장은 한 번에 읽어 자연스럽게 이어짐)
SCENES = {'kr': [
    dict(video=HERO, lines=['설비를 제어하고, 데이터를 연결하다.', '1991년부터 현장의 제어반을 만들어 온 회사, 동인엔시스입니다.'], motion='none',
         title=('COMPANY PROFILE 2026', '설비를 제어하고,\\N데이터를 연결하다.'), nosub={0}, minlen=7.0),
    dict(page=2, lines=['동인엔시스는 35년 동안 산업과 선박 현장의 제어반을 직접 설계·제작해 왔습니다.',
                        '750건이 넘는 프로젝트 경험 위에서, 이제 제어반을 설비의 데이터 인프라로 바꾸고 있습니다.'], motion='in'),
    dict(page=3, lines=['설비는 이미 PLC와 인버터로 제어되지만, 그 데이터는 제어반 밖으로 나오지 못하고 있습니다.',
                        'AI와 스마트공장이 제 역할을 하려면, 현장 설비의 데이터가 먼저 필요합니다.'], motion='out'),
    dict(page=4, lines=['본사와 친환경기술연구소는 부산에, 생산 공장은 양산과 기장에 있습니다.',
                        'ISO 통합경영체계를 갖추고, 슈나이더 일렉트릭 공식 SI 파트너입니다.'], motion='in'),
    dict(page=5, lines=['제어기기 공급으로 출발해 제어시스템 설계·제작, 친환경 선박과 수소 연구개발을 거쳐,',
                        '2026년 지능형 제어반을 출시하며 산업설비 데이터 사업에 진출했습니다.'], motion='pan'),
    dict(page=6, lines=['직접 설계·제작하는 제조 기반, 까다로운 현장 경험, 그리고 데이터와 예측제어 연구소.',
                        '이 세 가지가 지능형 제어반을 만드는 힘입니다.'], motion='in'),
    dict(page=7, lines=['지능형 제어반은 PLC로 설비를 제어하면서 운전 데이터를 함께 수집합니다.',
                        '온도·전류·진동 데이터를 별도 장비 없이 클라우드나 고객사 서버까지 안전하게 보냅니다.'], motion='out'),
    dict(page=8, lines=['현장 설비에서 제어반, 암호화 전송, 데이터허브, 대시보드와 AI까지 끊김 없이 이어집니다.',
                        '클라우드형과 온프레미스형 모두 같은 데이터 구조와 API로 제공됩니다.'], motion='pan'),
    dict(page=9, lines=['제어 권한은 현장 PLC에 그대로 두고, 통신은 TLS로 암호화하며, 수집장비는 하나도 늘리지 않습니다.'], motion='in'),
    dict(page=10, lines=['조선·해양, 수소·에너지, 제조, 데이터센터까지. 모터가 도는 모든 현장이 지능형 제어반의 무대입니다.'], motion='out'),
    dict(page=11, lines=['친환경 선박과 수소 설비, 가장 까다로운 현장에서 검증했습니다.'], motion='in'),
    dict(page=12, lines=['충남병원선과 경남청정호의 하이브리드 추진 통합제어,'], motion='pan'),
    dict(page=13, lines=['LNG 연료공급시스템 제어를 중국과 일본 조선소 신조선에 반복 공급하고,'], motion='in'),
    dict(page=14, lines=['SK E&S 액화수소충전소와 연료전지 발전소 CCUS 설비 제어,'], motion='out'),
    dict(page=15, lines=['현대자동차그룹 미국 공장과 고려제강의 해외 생산라인, 압축기 OEM,'], motion='pan'),
    dict(page=16, lines=['포장기계와 SMR 연료교체기 같은 특수기계의 다축 서보 제어까지.'], motion='in'),
    dict(page=18, lines=['750건의 프로젝트, 7개국의 생산라인, 6개 선급의 선박.', '국내외 고객과 함께 현장을 만들어 왔습니다.'], motion='out'),
    dict(page=19, lines=['제조기업에는 설비 고장을 감이 아니라 데이터로 대비하는 길을 엽니다.'], motion='in'),
    dict(page=20, lines=['현장 분석부터 제어반 제작, 서버 구성, 시운전까지 한 회사가 끝까지 맡습니다.'], motion='pan'),
    dict(page=21, lines=['IT기업에는 스마트공장·AI 팩토리 프로젝트의 OT 구간을 담당하고, 표준 API로 현장 데이터를 제공합니다.'], motion='in'),
    dict(page=23, lines=['설비를 제어하고, 데이터를 연결하다. 동인엔시스가 함께하겠습니다.', '자세한 내용은 홈페이지에서 확인하실 수 있습니다.'], motion='none', minlen=9.0),
], 'en': [
    dict(video=HERO, lines=['Controlling equipment, connecting data.', 'DONG-IN ENSIS has built control panels for the field since 1991.'], motion='none',
         title=('COMPANY PROFILE 2026', 'Controlling equipment,\\Nconnecting data.'), nosub={0}, minlen=7.0),
    dict(page=2, lines=['For 35 years, DONG-IN ENSIS has designed and built control panels for industrial and marine sites in-house.',
                        'Building on more than 750 projects, we are now turning control panels into data infrastructure for equipment.'], motion='in'),
    dict(page=3, lines=['Equipment is already controlled by PLCs and drives, but the data they generate never leaves the control panel.',
                        'For AI and smart factories to work, field equipment data must come first.'], motion='out'),
    dict(page=4, lines=['Our head office and Eco-Technology Research Center are in Busan, with factories in Yangsan and Gijang.',
                        'We run an ISO integrated management system and are an official Schneider Electric SI partner.'], motion='in'),
    dict(page=5, lines=['From control equipment supply to control system engineering, green ship and hydrogen R&D,',
                        'and in 2026, the launch of the Intelligent Control Panel and our entry into the industrial data business.'], motion='pan'),
    dict(page=6, lines=['In-house design and manufacturing, experience at demanding sites, and a research center for data and predictive control.',
                        'These three foundations are what make the Intelligent Control Panel possible.'], motion='in'),
    dict(page=7, lines=['The Intelligent Control Panel controls equipment with a PLC while collecting operating data.',
                        'Temperature, current and vibration data reach the cloud or customer servers securely, with no extra devices.'], motion='out'),
    dict(page=8, lines=['From field equipment to the panel, encrypted transmission, the DataHub, dashboards and AI, everything is connected without a break.',
                        'Cloud and on-premise options share the same data structure and API.'], motion='pan'),
    dict(page=9, lines=['Control stays with the field PLC, the link is encrypted with TLS, and not a single collection device is added.'], motion='in'),
    dict(page=10, lines=['Shipbuilding and marine, hydrogen and energy, manufacturing and data centers. Wherever motors run, the Intelligent Control Panel has a place.'], motion='out'),
    dict(page=11, lines=['Green ships and hydrogen facilities: proven at the most demanding sites.'], motion='in'),
    dict(page=12, lines=['Hybrid propulsion and integrated control for the Chungnam Hospital Ship and Gyeongnam Cheongjeong,'], motion='pan'),
    dict(page=13, lines=['LNG fuel gas supply system control delivered again and again for newbuilds at shipyards in China and Japan,'], motion='in'),
    dict(page=14, lines=['control systems for the SK E&S liquid hydrogen station and a fuel cell power plant CCUS facility,'], motion='out'),
    dict(page=15, lines=['overseas production lines for Hyundai Motor Group in the USA and for Kiswire, and compressor OEMs,'], motion='pan'),
    dict(page=16, lines=['and multi-axis servo control for special machines such as packaging machinery and an SMR refueling machine.'], motion='in'),
    dict(page=18, lines=['750 projects, production lines in 7 countries, and vessels under 6 classification societies.', 'We have built sites together with customers in Korea and abroad.'], motion='out'),
    dict(page=19, lines=['For manufacturers, we open the way to prepare for equipment failure with data instead of guesswork.'], motion='in'),
    dict(page=20, lines=['From site survey to panel build, server setup and commissioning, one company takes it all the way.'], motion='pan'),
    dict(page=21, lines=['For IT companies, we take care of the OT scope in smart factory and AI factory projects and provide field data through a standard API.'], motion='in'),
    dict(page=23, lines=['Controlling equipment, connecting data. DONG-IN ENSIS will be with you.', 'Learn more at donginensis.com.'], motion='none', minlen=9.0),
]}
SUB_TEXT = {  # 자막 표기가 TTS 읽기와 달라야 할 때
    '자세한 내용은 홈페이지에서 확인하실 수 있습니다.': '자세한 내용은 donginensis.com에서 확인하실 수 있습니다.',
}
TTS_TEXT = {  # TTS 읽기가 자막 표기와 달라야 할 때 (약어·주소 발음)
    'SK E&S 액화수소충전소와 연료전지 발전소 CCUS 설비 제어,': '에스케이 이앤에스 액화수소충전소와 연료전지 발전소 씨씨유에스 설비 제어,',
    '제어 권한은 현장 PLC에 그대로 두고, 통신은 TLS로 암호화하며, 수집장비는 하나도 늘리지 않습니다.': '제어 권한은 현장 피엘씨에 그대로 두고, 통신은 티엘에스로 암호화하며, 수집장비는 하나도 늘리지 않습니다.',
    'Learn more at donginensis.com.': 'Learn more at dong-in-ensis dot com.',
    'control systems for the SK E&S liquid hydrogen station and a fuel cell power plant CCUS facility,': 'control systems for the S K E and S liquid hydrogen station and a fuel cell power plant C C U S facility,',
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-2000:]); raise SystemExit(f'ffmpeg failed: {" ".join(cmd)[:200]}')


def read_wav(p):
    with wave.open(p) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2: x = x.reshape(-1, 2).mean(1)
    return sr, x


def write_wav(p, sr, x):
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def compress_pauses(sr, x, cues, maxp=MAXP, thr=0.012):
    """말 사이의 긴 쉼을 maxp초로 줄인다(무음 구간의 가운데를 잘라 냄). 자막 구간 시각도 같이 옮긴다. → (소리, 구간, 잘라 낸 길이)"""
    win = int(sr * 0.01); n = len(x) // win
    quiet = np.sqrt((x[:n * win].reshape(n, win) ** 2).mean(1)) < thr
    cuts = []; s = None
    for k in range(n + 1):
        v = bool(quiet[k]) if k < n else False
        if v and s is None: s = k
        if not v and s is not None:
            if (k - s) * 0.01 > maxp + 0.05: cuts.append((s * win + int(maxp / 2 * sr), k * win - int(maxp / 2 * sr)))
            s = None
    if not cuts: return x, cues, 0.0
    pieces = []; removed = []; pos = 0
    for a, b in cuts: pieces.append(x[pos:a]); removed.append((a / sr, (b - a) / sr)); pos = b
    pieces.append(x[pos:]); y = np.concatenate(pieces)
    def remap(t): return t - sum(min(d, max(0.0, t - ts)) for ts, d in removed)
    return y, [(remap(a), remap(b)) for a, b in cues], sum(d for _, d in removed)


def ensure_bgm():
    if not os.path.exists(BGM_FILE):
        os.makedirs(os.path.dirname(BGM_FILE), exist_ok=True)
        print('배경음 내려받는 중:', BGM_URL); urllib.request.urlretrieve(BGM_URL, BGM_FILE)
    return BGM_FILE


async def tts_scene(sc, voice, rate, base):
    """장면의 문장들을 한 번에 읽고, 단어 시각으로 문장별 자막 구간을 구한다. 앞뒤 무음은 잘라 낸다."""
    import edge_tts
    text = ' '.join(TTS_TEXT.get(l, l) for l in sc['lines'])
    mp3, wav, meta = f'{base}.mp3', f'{base}.wav', f'{base}.json'
    if not (os.path.exists(meta) and json.load(open(meta)).get('text') == text and json.load(open(meta)).get('rate') == rate):
        words = []
        with open(mp3, 'wb') as f:
            async for ch in edge_tts.Communicate(text, voice, rate=rate).stream():
                if ch['type'] == 'audio': f.write(ch['data'])
                elif ch['type'] == 'WordBoundary': words.append((ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7, ch['text']))
        run([FF, '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '48000', wav + '.raw.wav'])
        sr, x = read_wav(wav + '.raw.wav')
        idx = np.where(np.abs(x) > 0.012)[0]; a = max(0, int(idx[0] - 0.08 * sr)); b = min(len(x), int(idx[-1] + 0.12 * sr))
        run([FF, '-v', 'error', '-y', '-i', wav + '.raw.wav', '-af', f'atrim={a / sr:.3f}:{b / sr:.3f},asetpts=PTS-STARTPTS', wav]); os.remove(wav + '.raw.wav')
        counts = [len(TTS_TEXT.get(l, l).split()) for l in sc['lines']]; cues = []
        if words and sum(counts) == len(words):          # 문장 경계 = 단어 수로 나눔
            k = 0
            for c in counts:
                cues.append((max(0.0, words[k][0] - a / sr), words[k + c - 1][1] - a / sr)); k += c
        else:                                            # 단어 수가 다르면 글자 수 비례
            total = (b - a) / sr; L = [len(l) for l in sc['lines']]; t = 0.0
            for n in L: d = total * n / sum(L); cues.append((t, t + d)); t += d
        json.dump(dict(text=text, rate=rate, cues=cues, dur=(b - a) / sr), open(meta, 'w'))
    m = json.load(open(meta)); sr, x = read_wav(wav)
    y, cues, cut = compress_pauses(sr, x, m['cues'])          # 문장 사이 긴 쉼 줄이기
    write_wav(f'{base}_c.wav', sr, y)
    sc['wav'] = f'{base}_c.wav'; sc['ndur'] = len(y) / sr; sc['rel_cues'] = cues; sc['cut'] = round(cut, 2)


async def tts_all(scenes, voice, rate, tdir):
    os.makedirs(tdir, exist_ok=True)
    for si, sc in enumerate(scenes): await tts_scene(sc, voice, rate, f'{tdir}/s{si:02d}')


def timeline(scenes):
    """장면 길이와 절대 시각. 장면 i는 앞 장면과 XF만큼 겹친다(전환). 말은 전환 중간부터 시작."""
    t = 0.0
    for i, sc in enumerate(scenes):
        sc['dur'] = max(XF / 2 + LEAD + sc['ndur'] + TAIL + PAUSE + XF / 2, sc.get('minlen', 0))
        sc['start'] = t - XF * i
        sc['nstart'] = sc['start'] + (XF / 2 if i else 0.0) + LEAD
        sc['cues'] = [(sc['nstart'] + a, sc['nstart'] + b, line) for (a, b), line in zip(sc['rel_cues'], sc['lines'])]
        t += sc['dur']
    return t - XF * (len(scenes) - 1)


def ass_time(s):
    return f'{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}'


def write_ass(scenes, path):
    hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Pretendard SemiBold,44,&H00111B2E,&H00111B2E,&H00FFFFFF,&H40FFFFFF,0,0,0,0,100,100,0,0,1,2.4,0,2,160,160,30,1
Style: SubDark,Pretendard SemiBold,44,&H00FFFFFF,&H00FFFFFF,&H00111B2E,&H60000000,0,0,0,0,100,100,0,0,1,2.4,1,2,160,160,30,1
Style: Title,Pretendard ExtraBold,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,-1,0,1,0,0,7,0,0,0,1
Style: Kicker,Pretendard Bold,30,&H00FFC18F,&H00FFC18F,&H00000000,&H00000000,0,0,0,0,100,100,6,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for sc in scenes:
        if sc.get('title'):
            k, t = sc['title']; a = sc['start'] + 0.6; b = sc['start'] + sc['dur'] - XF
            ev.append(f'Dialogue: 1,{ass_time(a)},{ass_time(b)},Kicker,,0,0,0,,{{\\pos(150,392)\\fad(600,500)}}{k}')
            ev.append(f'Dialogue: 1,{ass_time(a)},{ass_time(b)},Title,,0,0,0,,{{\\pos(150,440)\\fad(600,500)}}{t}')
        for li, (a, b, line) in enumerate(sc['cues']):
            if li in sc.get('nosub', ()): continue
            nxt = sc['cues'][li + 1][0] if li + 1 < len(sc['cues']) else b + 0.6
            st = 'SubDark' if (sc.get('video') or sc.get('page') == 1) else 'Sub'   # 어두운 배경(영상·표지)은 흰 글자, 흰 쪽(마무리 포함)은 남색 글자
            ev.append(f'Dialogue: 0,{ass_time(a - 0.1)},{ass_time(min(b + 0.5, nxt - 0.05))},{st},,0,0,0,,{{\\fad(120,160)}}{SUB_TEXT.get(line, line)}')
    open(path, 'w', encoding='utf-8').write(hdr + '\n'.join(ev) + '\n')


def ease(u): return u * u * (3 - 2 * u)   # 천천히 시작해 천천히 멈춤


def camera(kind, u):
    """장면 진행도 u(0~1) → (배율, 화면 중심의 가로 위치 비율)"""
    e = ease(u)
    if kind == 'in':  return 1.0 + 0.08 * e, 0.5
    if kind == 'out': return 1.08 - 0.08 * e, 0.5
    if kind == 'pan': z = 1.07; return z, 0.5 / z + (1 - 1 / z) * e   # 왼쪽 끝에서 오른쪽 끝으로
    return 1.0, 0.5


def render_scene(job):
    """쪽 한 장면을 매 프레임 PDF에서 직접 그려 ffmpeg로 보낸다. 위치가 소수점 단위라 ffmpeg zoompan처럼 픽셀 단위로 튀지 않는다."""
    import pymupdf as fitz
    pdf, pno, kind, frames, out = job
    page = fitz.open(pdf)[pno - 1]; pw, ph = page.rect.width, page.rect.height; base = W / pw
    p = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for f in range(frames):
        zf, cxf = camera(kind, f / max(frames - 1, 1)); z = base * zf
        x0, y0 = pw * cxf - W / 2 / z, ph / 2 - H / 2 / z                  # 화면 왼쪽 위의 쪽 좌표
        M = fitz.Matrix(z, 0, 0, z, 2 - x0 * z, 2 - y0 * z)                 # 그 점이 기기 좌표 (2,2)에 오도록
        clip = fitz.Rect(x0 - 2 / z, y0 - 2 / z, x0 + (W + 2) / z, y0 + (H + 2) / z)
        pix = page.get_pixmap(matrix=M, clip=clip, alpha=False)
        a = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)
        sy, sx = 2 - pix.y, 2 - pix.x; fr = a[sy:sy + H, sx:sx + W]
        if fr.shape != (H, W, 3):   # 쪽 가장자리에서 1px 모자라면 흰색으로 채움
            fr = np.pad(fr, ((0, H - fr.shape[0]), (0, W - fr.shape[1]), (0, 0)), constant_values=255)
        p.stdin.write(np.ascontiguousarray(fr).tobytes())
    p.stdin.close(); p.wait()
    if p.returncode: raise SystemExit(f'render failed: {out}')
    return out


def build_segments(scenes, lang, sdir):
    os.makedirs(sdir, exist_ok=True); segs = []; jobs = []
    for i, sc in enumerate(scenes):
        out = f'{sdir}/seg{i:02d}_{sc["dur"]:.2f}.mp4'; segs.append(out)
        if os.path.exists(out): continue
        frames = int(round(sc['dur'] * FPS))
        if sc.get('video'):
            run([FF, '-v', 'error', '-y', '-stream_loop', '-1', '-i', sc['video'], '-i', f'{SITE}/img/logo_white.png', '-t', f"{sc['dur']:.3f}", '-an',
                 '-filter_complex', f'[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}[bg];[1:v]scale=-1:58[lg];[bg][lg]overlay=150:300:format=auto',
                 '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', out])
        else:
            jobs.append((PDF[lang], sc['page'], sc['motion'], frames, out))
    if jobs:
        from concurrent.futures import ProcessPoolExecutor
        with ProcessPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as ex: list(ex.map(render_scene, jobs))
    return segs


def concat_xfade(segs, scenes, out):
    if len(segs) == 1: shutil.copy(segs[0], out); return
    ins = sum([['-i', s] for s in segs], []); fc = []; prev = '[0:v]'; off = 0.0
    for i in range(1, len(segs)):
        off += scenes[i - 1]['dur'] - XF
        o = f'[v{i}]' if i < len(segs) - 1 else '[v]'
        fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{o}'); prev = o
    run([FF, '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[v]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', str(FPS), out])


def mix_audio(scenes, total, bgm, out):
    n = len(scenes)
    ins = sum([['-i', sc['wav']] for sc in scenes], [])
    fc = [f'[{i}:a]adelay={int(sc["nstart"] * 1000)}|{int(sc["nstart"] * 1000)}[n{i}]' for i, sc in enumerate(scenes)]
    fc.append(''.join(f'[n{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:dropout_transition=0,apad=whole_dur={total:.3f},loudnorm=I=-16:LRA=9:TP=-1.5[nar]')
    ins += ['-stream_loop', '-1', '-i', bgm]
    fc.append(f'[{n}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.55,afade=t=in:d=1.5,afade=t=out:st={total - 3.5:.2f}:d=3.5,atrim=0:{total:.3f}[bg]')
    fc.append('[nar]asplit=2[nar1][nar2]')
    fc.append('[bg][nar2]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=900:makeup=1[bgd]')   # 나레이션 중 배경음 자동 감쇠
    fc.append('[bgd]volume=0.32[bgq]')
    fc.append('[nar1][bgq]amix=inputs=2:normalize=0[a]')
    run([FF, '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fc), '-map', '[a]', '-t', f'{total:.3f}', '-ac', '2', '-ar', '48000', out])


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('lang', choices=['kr', 'en']); ap.add_argument('--sample', type=int, default=0)
    ap.add_argument('--out', default=None); ap.add_argument('--poster', default=None)
    a = ap.parse_args(); lang = a.lang
    if lang == 'kr' and not a.sample and not a.out:   # 국문 영상은 모션판(build_motion.py)이 만든다
        raise SystemExit('국문 영상은 build_motion.py(모션판)로 만듭니다. 쪽 확대 방식 국문판이 꼭 필요하면 --out 파일을 지정하세요.')
    scenes = [dict(s) for s in (SCENES[lang][:a.sample] if a.sample else SCENES[lang])]
    work = f'{OUT}/work_{lang}'; os.makedirs(work, exist_ok=True)
    bgm = ensure_bgm()
    asyncio.run(tts_all(scenes, VOICE[lang], RATE[lang], f'{work}/tts'))
    total = timeline(scenes)
    json.dump(scenes, open(f'{work}/timeline.json', 'w'), ensure_ascii=False, indent=1, default=list)
    print(f'[{lang}] scenes {len(scenes)} | total {total:.1f}s | narration {sum(sc["ndur"] for sc in scenes):.1f}s (쉼 {sum(sc["cut"] for sc in scenes):.1f}s 줄임) | per scene', [round(sc['dur'], 1) for sc in scenes])
    write_ass(scenes, f'{work}/subs.ass')
    segs = build_segments(scenes, lang, f'{work}/seg')
    concat_xfade(segs, scenes, f'{work}/video.mp4')
    mix_audio(scenes, total, bgm, f'{work}/audio.wav')
    out = a.out or (f'{SITE}/video/company-intro_{lang}.mp4' if not a.sample else f'{OUT}/sample_{lang}.mp4')
    # 25MiB 이하(Cloudflare 정적 파일 한도)로: 평균 0.86Mbps 상한
    run([FF, '-v', 'error', '-y', '-i', f'{work}/video.mp4', '-i', f'{work}/audio.wav', '-vf', f"ass={work}/subs.ass:fontsdir={FONTS}",
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-maxrate', '860k', '-bufsize', '2000k', '-g', '60', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', out])
    poster = a.poster or (out[:-4] + '.jpg')
    run([FF, '-v', 'error', '-y', '-ss', '4.5', '-i', out, '-frames:v', '1', '-q:v', '3', poster])
    print('->', out, f'{os.path.getsize(out) / 1e6:.1f} MB |', poster)


if __name__ == '__main__':
    main()
