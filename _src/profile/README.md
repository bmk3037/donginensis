# 회사소개서 PDF 원본 (소스)

홈페이지 `files/` 폴더의 PDF를 만드는 원본입니다. 내용을 고치려면 이 폴더의 파이썬 파일에서 문구를 바꾸고 다시 생성하면 됩니다.

| 결과물 | 원본 | 생성 명령 |
|---|---|---|
| `files/DONG-IN-ENSIS_Hydrogen-Profile_KR.pdf` (수소전문기업 사업분야, 20장) | `build_hydrogen.py` | `python3 build_hydrogen.py` → `out/h2_profile.pdf` |
| 회사소개서 12~14쪽 Major Reference (국문·영문) | `build_reference.py` | `python3 build_reference.py` → `out/ref_KR.pdf`, `out/ref_EN.pdf` |
| `files/DONG-IN-ENSIS_Company-Profile_KR.pdf` (회사소개서 국문, 23장) | `build_profile_refs.py` | `python3 build_profile_refs.py` → `base/profile_base_KR.pdf`(원본 없는 16장) 사이에 실적 7장을 끼워 `files/`에 저장 |
| `files/DONG-IN-ENSIS_Sales-Profile_KR.pdf` (영업용 회사소개서 · 전기제어시스템 설계·제작, 18장) | `build_sales.py` | `python3 build_sales.py [base\|marine\|plant\|machine] [--to "OOO 귀중"] [--contact "담당자 줄"]` → `out/sales_<변형>.pdf`. 자료실에는 `base`를 복사해 올림. 제출처별 변형(marine · plant · machine)은 홈페이지에 올리지 않고 직접 보냄 |
| `files/DONG-IN-ENSIS_IT-Partner-Proposal_KR.pdf` (IT 파트너 제안서 · MES·AI·디지털트윈 솔루션 기업용, 8장) | `build_partner.py` | `python3 build_partner.py` → `out/partner_KR.pdf`. 디자인은 `build_sales.py`의 CSS·헬퍼를 그대로 씀 |
| `files/partner/DONG-IN-ENSIS_Data-Integration-Overview_KR.pdf` (데이터 연동 개요, A4 2쪽) | `build_overview.py` | `python3 build_overview.py` → `out/overview_KR.pdf` |
| `files/DONG-IN-ENSIS_Sales-Profile_Briefing-Script_KR.pdf` (영업용 브리핑 대본, 6쪽) | `briefing/briefing_script.md` | `python3 briefing/make_script_pdf.py` (markdown 패키지 필요) |

- 필요한 것: Python 3, Playwright(Chromium).
- 서체는 `fonts/`(Pretendard, OFL 라이선스)를 씁니다.
- 사진·로고는 `crops/`(기존 회사소개서에서 추출), 홈페이지 이미지는 `img/`를 씁니다. 영업용 소개서 사진·고객 로고는 `sales/`(원본 49쪽 회사소개서에서 추출)를 씁니다.
- 회사소개서 국문 5쪽 연혁의 "지능형 제어반 사업 본격화"는 2026.10에 PyMuPDF로 "지능형 제어반 출시 · 데이터 사업 진출"로 고쳤습니다(글자 치환 후 글꼴 서브셋). 홈페이지 연혁과 맞춥니다.
- 회사소개서 본문(1~11쪽, 19~23쪽)은 별도 원본 없이 `base/profile_base_KR.pdf`(국문) · `base/profile_base_EN.pdf`(영문)로만 관리합니다. 실적 7장(12~18쪽)은 `build_sales.py`의 실적 페이지를 재사용합니다.
- 영문 회사소개서(19장)는 `build_reference.py`의 Major Reference 3장을 `base/profile_base_EN.pdf` 11쪽 뒤에 끼운 것입니다. 국문 통합본의 실적 4장(에너지 · 플랜트·OEM · 서보 · 실적표)은 아직 영문이 없습니다.
- 이 폴더(`_src`)는 홈페이지에 공개되지 않습니다.
