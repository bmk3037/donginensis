# 회사소개 영상 원본 (소스)

`video/company-intro_kr.mp4` · `video/company-intro_en.mp4`(각 3분 안팎, 1080p)와 미리보기 `.jpg`를 만드는 생성기입니다.

| 결과물 | 생성 명령 | 방식 |
|---|---|---|
| `video/company-intro_kr.mp4` + `.jpg` | `python3 _src/video/build_motion.py` | 모션판 — 제목·사진·카드·숫자·연혁이 나레이션에 맞춰 차례로 등장 |
| `video/company-intro_en.mp4` + `.jpg` | `python3 _src/video/build_intro.py en` | 쪽 전체가 천천히 확대·이동 (영문 모션판은 대표 요청으로 보류, 2026.10) |
| 앞 N장면 시안 | `python3 _src/video/build_motion.py --scenes 5` → `_src/video/out/motion_sample_kr.mp4` | |
| 정지 화면 점검 | `python3 _src/video/build_motion.py --test 5:0.7,2.0` → `_src/video/out/motion_test/` | |

## 모션판(`build_motion.py`)
- 나레이션·자막·배경음악·장면 시간표는 `build_intro.py`의 `SCENES['kr']`를 그대로 씁니다. 음성은 단어 시각(edge-tts WordBoundary)까지 받아 자막과 화면 움직임을 실제로 읽는 순간에 맞춥니다.
- 쪽을 그린 뒤 요소마다 떼어 내 프레임마다 다시 합성합니다. 다 그려진 화면은 원본 쪽과 같습니다(사진은 원본 이미지를 꺼내 쓰므로 미세한 보간 차이만 있음).
- 장면별 연출은 `page_groups()`에 쪽 좌표(1440×810)로 적혀 있습니다. 회사소개서 쪽 배치가 바뀌면 이 좌표도 고쳐야 합니다. 카드 안의 글 줄은 자동으로 나눕니다(`Items.bands`).
- 렌더링은 4개 프로세스로 6분쯤 걸립니다.

## 나레이션 음성(`narration.py`)
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

## 메인 첫 화면 영상 (`video/hero_d*.mp4`, 2026.10)
- 남색 미니어처 디오라마 사진 6장(멈춘 현장 → 제어반 → 바로 연결 → 이상 감지 → 산업단지 → 마무리)을 천천히 확대하며 이어 붙인 19초 반복 영상. PC는 주제를 가로 70%, 모바일(720×1280)은 세로 70% 자리에 둬서 제목 자리를 비운다. 원본 사진은 구글 드라이브에 둔다.
- 장면 경계는 국문 나레이션(`video/hero_narr_kr.mp3`, 타입캐스트) 줄 시작 시각에 맞췄다. 「소리 켜기」를 누르면 영상을 처음으로 돌리고 나레이션을 한 번 읽으며, 그동안 배경음(`hero_bgm_v2.mp3`)을 낮춘다(`js/site.js`, `data-narr`). 영문은 배경음만.
- 영상 길이(19초)와 배경음 반복(10초)이 달라 위치 보정은 끈다(`data-sync="0"`). 첫 장면만 AI 클립으로 바꿀 때는 같은 길이·위치로 맞춰 넣는다.
- 이전 영상 `hero_e*.mp4`는 영문 회사소개 영상 첫 장면(`build_intro.py`)에서 계속 쓴다.
