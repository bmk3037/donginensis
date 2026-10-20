"""회사소개 영상 나레이션(TTS) — 단어 시각까지 받아 자막과 화면 움직임을 실제로 읽는 순간에 맞춘다.

엔진 (환경변수 TTS_ENGINE)
  edge     : Microsoft Edge 음성(edge-tts, 무료) — 기본값
  typecast : 타입캐스트(유료, 글자 수만큼 크레딧 사용). 필요한 환경변수
             TYPECAST_API_KEY   API 키 (저장소·코드에 적지 않는다)
             TYPECAST_VOICE_KR  국문 목소리 voice_id (tc_…)
             TYPECAST_VOICE_EN  영문 목소리 voice_id (tc_…)
             TYPECAST_MODEL     ssfm-v30(기본) 또는 ssfm-v21

목소리 고르기 (타입캐스트)
  python3 _src/video/narration.py voices kr            남성 목소리 목록
  python3 _src/video/narration.py sample kr tc_… [tc_…]  대본 첫 장면을 읽힌 샘플 → out/voice_samples/
"""
import base64, json, os, ssl, sys, urllib.error, urllib.request

ENGINE = os.environ.get('TTS_ENGINE', 'edge').strip().lower()
TC_API = 'https://api.typecast.ai'
TC_MODEL = os.environ.get('TYPECAST_MODEL', 'ssfm-v30')
LANG3 = {'kr': 'kor', 'en': 'eng'}


def tc_voice(lang):
    v = os.environ.get('TYPECAST_VOICE_' + lang.upper(), '').strip()
    if not v: raise SystemExit(f'TYPECAST_VOICE_{lang.upper()} 환경변수(타입캐스트 voice_id)가 없습니다. narration.py voices {lang} 로 고르세요.')
    return v


def engine_sig(lang, voice, rate):
    """캐시 구분용: 엔진·목소리·속도가 바뀌면 다시 만든다"""
    return f'typecast:{TC_MODEL}:{tc_voice(lang)}:{tempo(rate)}' if ENGINE == 'typecast' else f'edge:{voice}:{rate}'


def tempo(rate):   # edge 속도 표기 '+4%' → 타입캐스트 audio_tempo 1.04
    try: return round(1 + float(rate.strip('%')) / 100, 3)
    except ValueError: return 1.0


def tc_request(path, body=None, method=None):
    key = os.environ.get('TYPECAST_API_KEY', '').strip()
    if not key: raise SystemExit('TYPECAST_API_KEY 환경변수가 없습니다. 환경 설정의 비밀값(환경변수)에 넣은 뒤 새 세션에서 실행하세요.')
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(TC_API + path, data=data, method=method or ('POST' if data else 'GET'),
                                 headers={'X-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json'})
    ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE') or None)
    try:
        with urllib.request.urlopen(req, timeout=180, context=ctx) as r: return r.read()
    except urllib.error.HTTPError as e:
        detail = e.read()[:500].decode('utf-8', 'replace')
        raise RuntimeError(f'타입캐스트 오류 {e.code}: {detail}') from None


def tc_synth(text, lang, rate, out_path, voice_id=None):
    """타입캐스트로 읽고 wav 저장 → [(시작초, 끝초, 단어)]"""
    body = {'text': text, 'model': TC_MODEL, 'voice_id': voice_id or tc_voice(lang), 'language': LANG3[lang],
            'prompt': ({'emotion_type': 'preset', 'emotion_preset': 'normal', 'emotion_intensity': 1} if TC_MODEL == 'ssfm-v30'
                       else {'emotion_preset': 'normal', 'emotion_intensity': 1}),
            'output': {'audio_format': 'wav', 'audio_tempo': tempo(rate)}}
    try:
        raw = tc_request('/v1/text-to-speech/with-timestamps?granularity=word', body)
    except RuntimeError as e:          # granularity를 본문으로 받는 경우
        if not any(c in str(e) for c in ('400', '422')): raise
        raw = tc_request('/v1/text-to-speech/with-timestamps', dict(body, granularity='word'))
    d = json.loads(raw)
    open(out_path, 'wb').write(base64.b64decode(d['audio']))
    return [(float(w['start']), float(w['end']), w['text']) for w in (d.get('words') or [])]


async def edge_synth(text, voice, rate, out_path):
    import edge_tts
    words = []
    with open(out_path, 'wb') as f:
        async for ch in edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary').stream():
            if ch['type'] == 'audio': f.write(ch['data'])
            elif ch['type'] == 'WordBoundary': words.append((ch['offset'] / 1e7, (ch['offset'] + ch['duration']) / 1e7, ch['text']))
    return words


async def tts_words(sc, voice, rate, base, lang='kr'):
    """장면 문장들을 한 번에 읽고 → 앞뒤 무음 제거 → 문장 사이 긴 쉼 줄이기.
    sc에 wav · ndur(초) · rel_cues(문장별 자막 구간) · words(단어 시각) · cut을 채운다."""
    import numpy as np
    import build_intro as B
    lines = [B.TTS_TEXT.get(l, l) for l in sc['lines']]; text = ' '.join(lines)
    wav, meta = f'{base}.wav', f'{base}.json'; sig = engine_sig(lang, voice, rate)
    m = json.load(open(meta)) if os.path.exists(meta) else {}
    if not (m.get('text') == text and m.get('engine') == sig):
        if ENGINE == 'typecast': src = f'{base}.tc.wav'; words = tc_synth(text, lang, rate, src)
        else: src = f'{base}.mp3'; words = await edge_synth(text, voice, rate, src)
        B.run([B.FF, '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '48000', wav + '.raw.wav'])
        sr, x = B.read_wav(wav + '.raw.wav')
        idx = np.where(np.abs(x) > 0.012)[0]; a = max(0, int(idx[0] - 0.08 * sr)); b = min(len(x), int(idx[-1] + 0.12 * sr))
        B.run([B.FF, '-v', 'error', '-y', '-i', wav + '.raw.wav', '-af', f'atrim={a / sr:.3f}:{b / sr:.3f},asetpts=PTS-STARTPTS', wav]); os.remove(wav + '.raw.wav')
        words = [[max(0.0, s - a / sr), e - a / sr, w] for s, e, w in words]
        json.dump(dict(text=text, rate=rate, engine=sig, words=words, dur=(b - a) / sr), open(meta, 'w'), ensure_ascii=False)
        m = json.load(open(meta))
    sr, x = B.read_wav(wav)
    starts, p = [], 0
    for l in lines: starts.append(p); p += len(l) + 1
    pos, tagged = 0, []
    for s, e, w in m['words']:                      # 단어 → 몇 번째 문장인지(글자 위치로)
        i = text.find(w, pos); i = pos if i < 0 else i; pos = i + len(w)
        tagged.append((s, e, w, max(k for k in range(len(starts)) if starts[k] <= i)))
    cues = []
    for li in range(len(lines)):
        ws = [t for t in tagged if t[3] == li]
        if ws: cues.append((ws[0][0], ws[-1][1]))
        else:                                        # 단어 시각이 없으면 글자 수 비례
            tot = m['dur']; L = [len(l) for l in lines]; s0 = tot * sum(L[:li]) / sum(L); cues.append((s0, s0 + tot * L[li] / sum(L)))
    y, rem, cut = B.compress_pauses(sr, x, cues + [(s, e) for s, e, _, _ in tagged])
    B.write_wav(f'{base}_c.wav', sr, y)
    sc['wav'] = f'{base}_c.wav'; sc['ndur'] = len(y) / sr; sc['rel_cues'] = rem[:len(cues)]; sc['cut'] = round(cut, 2)
    sc['words'] = [(a, b, t[2]) for (a, b), t in zip(rem[len(cues):], tagged)]


# ── 목소리 고르기
def list_voices(lang, gender='male'):
    d = json.loads(tc_request('/v3/voices'))
    items = d if isinstance(d, list) else (d.get('voices') or d.get('items') or d.get('result') or [])
    out = []
    for v in items:
        if gender and v.get('gender') not in (gender, None): continue
        names = v.get('voice_name') or {}
        name = names.get(LANG3[lang]) or names.get('eng') or next(iter(names.values()), '') if isinstance(names, dict) else str(names)
        models = [m.get('version') or m.get('name') or m for m in (v.get('models') or [])]
        out.append((v.get('voice_id'), name, v.get('age'), ','.join(v.get('use_cases') or []), ','.join(map(str, models))))
    return out


if __name__ == '__main__':
    import asyncio
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'voices':
        lang = sys.argv[2] if len(sys.argv) > 2 else 'kr'
        for row in list_voices(lang): print('\t'.join(str(c) for c in row))
    elif cmd == 'sample':
        import build_intro as B
        lang, ids = sys.argv[2], sys.argv[3:]
        sc = B.SCENES[lang][1]; text = ' '.join(B.TTS_TEXT.get(l, l) for l in sc['lines'])
        d = f'{B.OUT}/voice_samples'; os.makedirs(d, exist_ok=True)
        for vid in ids:
            w = tc_synth(text, lang, B.RATE[lang], f'{d}/{lang}_{vid}.wav', voice_id=vid)
            B.run([B.FF, '-v', 'error', '-y', '-i', f'{d}/{lang}_{vid}.wav', '-b:a', '128k', f'{d}/{lang}_{vid}.mp3'])
            print(vid, f'{d}/{lang}_{vid}.mp3', f'단어 {len(w)}개')
    else:
        print(__doc__)
