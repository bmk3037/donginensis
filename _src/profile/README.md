# 회사소개서 PDF 원본 (소스)

홈페이지 `files/` 폴더의 PDF를 만드는 원본입니다. 내용을 고치려면 이 폴더의 파이썬 파일에서 문구를 바꾸고 다시 생성하면 됩니다.

| 결과물 | 원본 | 생성 명령 |
|---|---|---|
| `files/DONG-IN-ENSIS_Hydrogen-Profile_KR.pdf` (수소전문기업 사업분야, 20장) | `build_hydrogen.py` | `python3 build_hydrogen.py` → `out/h2_profile.pdf` |
| 회사소개서 12~14쪽 Major Reference (국문·영문) | `build_reference.py` | `python3 build_reference.py` → `out/ref_KR.pdf`, `out/ref_EN.pdf` |

- 필요한 것: Python 3, Playwright(Chromium).
- 서체는 `fonts/`(Pretendard, OFL 라이선스)를 씁니다.
- 사진·로고는 `crops/`(기존 회사소개서에서 추출), 홈페이지 이미지는 `img/`를 씁니다.
- 회사소개서 본문(1~11쪽, 15~19쪽)은 별도 원본 없이 PDF로만 관리합니다.
- Major Reference 3장은 기존 16장 PDF의 11쪽 뒤에 끼워 넣고, 그 뒤 쪽번호를 +3 한 것입니다.
- 이 폴더(`_src`)는 홈페이지에 공개되지 않습니다.
