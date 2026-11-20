# 회사소개 영상 원본 (소스)

`video/company-intro_kr.mp4`(2분 30초, 1080p)와 미리보기 `.jpg`를 만드는 생성기입니다. 영문 영상은 대표 요청으로 내렸다(2026.11.19, 국문만 올림). `build_intro.py en`은 다시 필요할 때를 위해 남겨 둔다.

| 결과물 | 생성 명령 | 방식 |
|---|---|---|
| `video/company-intro_kr.mp4` + `.jpg` | `python3 _src/video/build_motion.py` | 모션판 — 제목·사진·카드·숫자·연혁이 나레이션에 맞춰 차례로 등장 |
| (영문, 내림) | `python3 _src/video/build_intro.py en` | 쪽 전체가 천천히 확대·이동 — 2026.11.19 홈페이지에서 내림 |
| `profile.html` + `img/profile-motion/` · `video/profile-narr_kr.mp3` · `video/profile-cover.mp4` | `TTS_ENGINE=files TTS_FILES_DIR=<녹음 폴더> python3 _src/video/build_profile_motion.py --site` (빼면 `out/profile_motion/` 시안) | 모션 회사소개서(웹) — 영상과 같은 page_groups 연출을 브라우저에서 재생 |
| 앞 N장면 시안 | `python3 _src/video/build_motion.py --scenes 5` → `_src/video/out/motion_sample_kr.mp4` | |
| 정지 화면 점검 | `python3 _src/video/build_motion.py --test 5:0.7,2.0` → `_src/video/out/motion_test/` | |

## 모션판(`build_motion.py`)
- 나레이션·자막·배경음악·장면 시간표는 `build_intro.py`의 `SCENES['kr']`를 그대로 씁니다. 음성은 단어 시각(edge-tts WordBoundary)까지 받아 자막과 화면 움직임을 실제로 읽는 순간에 맞춥니다.
- 쪽을 그린 뒤 요소마다 떼어 내 프레임마다 다시 합성합니다. 다 그려진 화면은 원본 쪽과 같습니다(사진은 원본 이미지를 꺼내 쓰므로 미세한 보간 차이만 있음).
- 장면별 연출은 `page_groups()`에 쪽 좌표(1440×810)로 적혀 있습니다. 회사소개서 쪽 배치가 바뀌면 이 좌표도 고쳐야 합니다. 카드 안의 글 줄은 자동으로 나눕니다(`Items.bands`).
- 렌더링은 4개 프로세스로 6분쯤 걸립니다.

## 나레이션 음성(`narration.py`)
- 2026.11.19 국문 회사소개 영상은 대표가 타입캐스트 화면에서 녹음한 장면별 파일(01~21.mp3)로 다시 만들었다(151초). 쓰는 법: `TTS_ENGINE=files TTS_FILES_DIR=<녹음 폴더> python3 _src/video/build_motion.py`. 단어 시각은 받아쓰기(faster-whisper)로 구해 대본 단어에 맞춘다. 녹음 원본은 저장소에 올리지 않는다.
- 문장 사이 쉼을 줄이며 잘라 붙인 곳은 30ms 겹쳐 잇는다(예전 영상의 말끝 잘림·틱 소리 원인).
- 기본은 Microsoft Edge 음성(edge-tts, 무료)이고, `TTS_ENGINE=typecast`로 타입캐스트 음성을 쓸 수 있습니다. 두 생성기(`build_motion.py`, `build_intro.py`) 모두 이 설정을 따릅니다.
- 타입캐스트에 필요한 환경변수: `TYPECAST_API_KEY`(저장소에 적지 않음), `TYPECAST_VOICE_KR`·`TYPECAST_VOICE_EN`(목소리 voice_id), 선택 `TYPECAST_MODEL`(기본 ssfm-v30).
- 목소리 고르기: `python3 _src/video/narration.py voices kr` → 후보 voice_id로 `python3 _src/video/narration.py sample kr tc_… tc_…` (대본 첫 장면을 읽힌 샘플이 `out/voice_samples/`에 생김).
- 타입캐스트는 단어 시각을 함께 받아(with-timestamps) 자막과 화면 움직임을 맞춥니다. 장면별 결과는 `out/…/tts/`에 엔진·목소리·속도와 함께 저장돼, 같은 설정으로 다시 만들 때는 크레딧을 쓰지 않습니다.
- 예: `TTS_ENGINE=typecast python3 _src/video/build_motion.py` (국문) · `TTS_ENGINE=typecast python3 _src/video/build_intro.py en` (영문)

## 쪽 확대 방식(`build_intro.py`, 현재 영문)

- 장면은 회사소개서 PDF(`files/DONG-IN-ENSIS_Company-Profile_KR.pdf` · `_EN.pdf`)의 쪽을 그대로 씁니다. 소개서를 고쳐 다시 만들면 영상도 다시 만듭니다.
- 쪽의 느린 확대·이동은 매 프레임을 PDF에서 소수점 위치로 직접 그려 만듭니다(ffmpeg zoompan은 정수 픽셀로 반올림해 화면이 툭툭 끊겨 보임). 4개 프로세스로 나눠 그리며 언어당 6분쯤 걸립니다.
- 국문 음성은 문장 사이에서 1초 넘게 쉬므로, 한 장면 안의 쉼은 0.5초(`MAXP`)로 줄이고 장면 사이 쉼은 약 0.55초로 둡니다.
- 나레이션은 Microsoft Edge 음성(edge-tts, 국문 InJoon · 영문 Andrew)으로 만들고, 문장별 자막은 음성의 단어 시각에 맞춥니다. 대본은 `build_intro.py`의 `SCENES`(국문·영문)에 있습니다.
- 배경음악은 Mixkit 무료 음원 "Your Breath"(상업 이용 가능, 출처 표기 불필요)이며 없으면 자동으로 내려받습니다(`bgm/`, 저장소에 올리지 않음).
- 필요한 것: Python 3, `pymupdf numpy edge-tts imageio-ffmpeg`, 인터넷. 작업 파일은 `out/`(저장소에 올리지 않음).
- 25MB 이하로 인코딩합니다(Cloudflare 정적 파일 한도).

## 메인 첫 화면 영상 — 실사풍 (`video/hero_f*.mp4`, 2026.11)
- 같은 기준 제어반으로 만든 연출 사진 6장(펌프실 제어반 → 문 연 내부 → 모터 센서 → 엔지니어와 태블릿 → 공장 야경 → 선박 기관실)을 천천히 확대하며 잇는 19초 반복 영상. `build_hero.py m <세로 사진 폴더>` / `build_hero.py pc <가로 사진 폴더>`로 만든다. 원본 사진은 저장소에 올리지 않는다.
- 모바일(`hero_f_m.mp4`, 720×1480)은 2026.11.14 적용. 글은 위, 사진은 아래에 두도록 9:16 사진 위에 어두운 여백을 덧댔고, CSS에서 영상을 첫 화면 아래쪽에 붙인다(`.hero video`, 767px 이하). PC(`hero_f.mp4`, 1920×1080)도 같은 날 적용했다. 아래 `hero_d*.mp4`(미니어처판)는 더 쓰지 않아 저장소에서 뺐다.
- 실제 촬영으로 보일 수 있어 화면에 「연출 영상」 표시(`.hero-cap`)를 둔다.
- 국문 나레이션(`video/hero_narr_kr.mp3`)도 2026.11.14 새 장면에 맞춰 바꿨다. 타입캐스트로 읽힌 한 파일을 `build_hero_narr.py <음성 파일>`이 문장 사이 쉼에서 세 덩어리로 잘라 장면 시각에 놓는다(대본은 그 파일 머리말). 배경음악(`hero_bgm_v2.mp3`)은 같은 날 뺐다: 국문은 「나레이션 듣기」 버튼으로 나레이션만 한 번 읽고(`#heroNarr`, `js/site.js`), 나레이션이 없는 영문에는 버튼을 두지 않는다. 아래 미니어처판 설명의 배경음 내용은 예전 기록이다.
- 2026.11.14 오후: 사진 확대판을 움직이는 클립판으로 바꿨다. 사진 12장을 영상 생성 도구(Veo)로 5초씩 움직이게 만든 클립(`h24~h29.mp4`, `v24~v29.mp4`)을 `build_hero_clips.py pc|m <클립 폴더>`로 이어 붙인다. 클립 화면은 자르거나 확대하지 않고, 구석의 생성 도구 표시도 그대로 둔다. PC는 원본이 720p라 1600×900으로 만든다. 클립이 없을 때는 사진 확대판 `build_hero.py`를 쓴다.
- 2026.11.15: 문 앞면을 [키패드][선택스위치][초록 등][빨간 등]으로 고쳤다(원래 등이 초록 하나뿐이었음). 원본 클립이 없어 완성 영상 위에서 `fix_hero_lamps.py pc|m <입력 mp4> <출력 mp4>`로 고친다: 장면 0·2·3·5마다 선택스위치를 추적해 원래 스위치·초록 등을 지우고, 둘을 반 칸 왼쪽으로 옮긴 뒤 오른쪽에 초록 등을 빨갛게 바꾼 등을 놓는다(초록이 깜빡여도 빨강은 켜진 채). 장면이 겹치는 0.5초는 앞뒤 프레임의 고친 차이를 옮겨 더한다. 필요한 것: opencv-python, numpy, ffmpeg. 클립으로 다시 만들 때는 클립(또는 사진)부터 등 2개로 고쳐야 한다. 페이지의 영상 주소는 `?v=3`.

## 메인 첫 화면 영상 (`video/hero_d*.mp4`, 2026.10)
- 남색 미니어처 디오라마 사진 6장(멈춘 현장 → 제어반 → 바로 연결 → 이상 감지 → 산업단지 → 마무리)을 천천히 확대하며 이어 붙인 19초 반복 영상. PC는 주제를 가로 70%, 모바일(720×1280)은 세로 70% 자리에 둬서 제목 자리를 비운다. 원본 사진은 구글 드라이브에 둔다.
- 장면 경계는 국문 나레이션(`video/hero_narr_kr.mp3`, 타입캐스트) 줄 시작 시각에 맞췄다. 「소리 켜기」를 누르면 영상을 처음으로 돌리고 나레이션을 한 번 읽으며, 그동안 배경음(`hero_bgm_v2.mp3`)을 낮춘다(`js/site.js`, `data-narr`). 영문은 배경음만.
- 영상 길이(19초)와 배경음 반복(10초)이 달라 위치 보정은 끈다(`data-sync="0"`). 첫 장면만 AI 클립으로 바꿀 때는 같은 길이·위치로 맞춰 넣는다.
- 이전 영상 `hero_e.mp4`는 회사소개 영상 첫 장면이 제어반 장면으로 바뀌고 영문 영상도 내리면서 쓰는 곳이 없어 저장소에서 뺐다(2026.11.19).

## 모션 회사소개서(`build_profile_motion.py`, 2026.11.19)
- `profile.html`은 국문 회사소개서를 웹에서 움직이게 보여 준다(국문 PDF 링크를 대체). 연출은 `build_motion.py`의 `page_groups()`를 그대로 쓰고, 화면은 `profile_motion_template.html`의 스크립트가 그린다.
- 쪽마다 완성 화면(`pNN.webp`)을 평소에 보여 주고, 화면에 들어오면 바탕(`pNN_b.webp`) 위에 요소 묶음(`pNN_a.webp`)·사진(`pNN_phK.webp`)을 차례로 띄운 뒤 완성 화면으로 돌아간다. 글자 요소는 곱하기(multiply)로 겹쳐 원본과 같아진다.
- 「나레이션과 함께 보기」는 영상과 같은 녹음(배경음 없음)·자막·시각으로 장면을 넘긴다. 녹음 폴더가 영상 만들 때와 다르면 멈춘다(시각이 어긋나지 않게).
- 회사소개서 PDF·page_groups·나레이션이 바뀌면 영상(`build_motion.py`)과 이 페이지를 함께 다시 만든다. 그림 파일은 `?v=` 버전(스크립트의 `VER`)을 올려 캐시를 바꾼다.
- 클래스 이름 주의: 나레이션 화면은 `.pv`, 사진 안쪽 상자는 `.phv`(겹치면 사진이 맨 위로 올라와 배지를 가린다).
- 공유 미리보기(카카오톡 등): `img/og_profile.jpg`(1200×630, 회사소개서 표지). 표지가 바뀌면 `p01.webp`에서 다시 잘라 만들고 `og:image`의 `?v=`를 올린다.
