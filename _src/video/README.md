# 회사소개 영상 원본 (소스)

`video/company-intro_kr.mp4` · `video/company-intro_en.mp4`(각 3분 안팎, 1080p)와 미리보기 `.jpg`를 만드는 생성기입니다.

| 결과물 | 생성 명령 |
|---|---|
| `video/company-intro_kr.mp4` + `.jpg` | `python3 _src/video/build_intro.py kr` |
| `video/company-intro_en.mp4` + `.jpg` | `python3 _src/video/build_intro.py en` |
| 앞 N장면 시안 | `python3 _src/video/build_intro.py kr --sample 3` → `_src/video/out/sample_kr.mp4` |

- 장면은 회사소개서 PDF(`files/DONG-IN-ENSIS_Company-Profile_KR.pdf` · `_EN.pdf`)의 쪽을 그대로 씁니다. 소개서를 고쳐 다시 만들면 영상도 다시 만듭니다.
- 나레이션은 Microsoft Edge 음성(edge-tts, 국문 InJoon · 영문 Andrew)으로 만들고, 문장별 자막은 음성의 단어 시각에 맞춥니다. 대본은 `build_intro.py`의 `SCENES`(국문·영문)에 있습니다.
- 배경음악은 Mixkit 무료 음원 "Your Breath"(상업 이용 가능, 출처 표기 불필요)이며 없으면 자동으로 내려받습니다(`bgm/`, 저장소에 올리지 않음).
- 필요한 것: Python 3, `pymupdf numpy edge-tts imageio-ffmpeg`, 인터넷. 작업 파일은 `out/`(저장소에 올리지 않음).
- 25MB 이하로 인코딩합니다(Cloudflare 정적 파일 한도).
