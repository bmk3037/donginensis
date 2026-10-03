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

## 배치 규칙

- 1장 양식(`mode='single'`): A4 한 장에 맞춰 인쇄합니다.
- 대장 양식(`mode='register'`): 빈 행을 마지막 쪽 끝까지 채우고, 행이 늘면 여러 장으로 나뉘며 표 머리글이 반복됩니다.
- 회색 칸은 미리 적힌 기준, 흰 칸은 입력 칸입니다. 판정 칸은 선택 목록이며 불합격·미흡 등은 붉게 표시됩니다.
- 자동 계산: QF-10 평균·등급, QF-12 종합, SF-01 위험도·판정, SF-07 집행률·합계, SF-09 총점·판정, EF-01 점수·중요 판정, QF-11 차기일 경과 표시.
- 이 폴더(`_src`)는 홈페이지에 공개되지 않습니다.
