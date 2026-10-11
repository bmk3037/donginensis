# 통합 기록양식집(DI-IMS-F-01) 원본

`files/iso/DI-IMS-F-01_Rev00.xlsx`와 PDF를 만드는 생성기입니다.

| 파일 | 내용 |
|---|---|
| `forms_data.py` | 양식별 제목·담당·머리 입력란·표 열·미리 적힌 기준·선택 목록·자동 계산 수식 |
| `build_forms.py` | 공통 배치(머리 입력란, 표, 결재란, 인쇄 설정)와 엑셀 저장 |
| `logo.png` | 양식 왼쪽 위 로고 |

## 고치는 방법

1. `forms_data.py`에서 문구·행·열을 고칩니다. 열 너비는 비율만 맞으면 되고 용지 폭에 맞게 자동으로 늘어납니다.
2. 엑셀 생성: `pip install openpyxl pillow` 후 `python3 _src/iso/build_forms.py`
3. PDF 생성: `soffice --headless --convert-to pdf --outdir files/iso files/iso/DI-IMS-F-01_Rev00.xlsx`
   - LibreOffice Calc가 필요합니다. 맑은 고딕이 없는 환경에서는 `_src/profile/fonts`의 Pretendard로 대체하면 한글이 깨지지 않습니다(fontconfig 별칭).
   - 엑셀과 같은 열 너비로 인쇄되도록 Carlito 글꼴(Calibri 호환)이 있어야 합니다.
4. 양식을 추가·삭제하면 매뉴얼 부록 C, `forms_data.py`의 `FORMS` 목록, `resources.html`의 쪽수·종수를 함께 고칩니다.

## ISO 기록 묶음 생성기 (프로젝트별 양식 자동 채우기)

`tool/` 폴더는 브라우저에서 쓰는 생성기입니다. 프로젝트 정보·BOM·I/O 리스트·시험 기준표를 넣으면
프로젝트 폴더(01_수주고객 ~ 08_NCR_AS)와 양식 엑셀(PF-00, QF-02~16, SF-02·03)을 채워 zip으로 저장합니다.
실측값·판정·서명 칸은 비워 둡니다.

| 파일 | 내용 |
|---|---|
| `tool/engine.js` | 양식 배치 엔진(`build_forms.py`의 자바스크립트판) |
| `tool/project.js` | BOM·I/O·기준표 읽기, 만들 문서 목록, zip 생성 |
| `tool/samples.js` | 예시 데이터(가상의 인버터 제어반 2면) |
| `tool/app.js`, `tool/app.css`, `tool/page.html` | 화면 |
| `build_tool.py` | 위 파일과 `forms_data.py`의 양식 정의를 묶어 한 파일로 만든다 |

- 다시 만들기: `python3 _src/iso/build_tool.py` → `tool/dist/ISO-기록생성기.html`
- 프로젝트 저장·복원과 판넬 수량별 문서 검증: `node _src/iso/tool/check_project.cjs`
- 쓰는 법: 이 HTML 파일을 회사 공용 저장소에 두고 크롬·엣지로 엽니다(엑셀 라이브러리를 인터넷에서 불러오므로 인터넷 연결 필요).
- 회사 BOM·I/O 파일은 브라우저 안에서만 처리되고 밖으로 보내지 않습니다. 실제 프로젝트 파일이나 생성 결과는 이 저장소에 올리지 않습니다.
- `forms_data.py`의 양식을 고치면 `build_forms.py`와 `build_tool.py`를 둘 다 다시 실행합니다.

## 배치 규칙

- 1장 양식(`mode='single'`): A4 한 장에 맞춰 인쇄합니다.
- 대장 양식(`mode='register'`): 빈 행을 마지막 쪽 끝까지 채우고, 행이 늘면 여러 장으로 나뉘며 표 머리글이 반복됩니다.
- 회색 칸은 미리 적힌 기준, 흰 칸은 입력 칸입니다. 판정 칸은 선택 목록이며 불합격·미흡 등은 붉게 표시됩니다.
- 자동 계산: QF-10 평균·등급, QF-12 종합, SF-01 위험도·판정, SF-07 집행률·합계, SF-09 총점·판정, EF-01 점수·중요 판정, QF-11 차기일 경과 표시.
- 이 폴더(`_src`)는 홈페이지에 공개되지 않습니다.
