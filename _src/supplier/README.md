# 공급기업 서류 원본

`files/supplier/`의 설명서를 만드는 생성기입니다. 서식은 통합경영 매뉴얼(DI-IMS-M-01)과 같습니다: 표지(로고·빨간 선·문서정보 표), 머리말 "문서명 | 문서번호 Rev", 꼬리말 "동인엔시스 | 문서번호 | 페이지 X / 전체 N", DI Blue #1857A5 제목·표 머리행.

| 파일 | 내용 |
|---|---|
| `common.js` | 공통 서식(글꼴·색·표·제목·흐름도 상자)과 Word 저장 |
| `DI-SF-01.js` | 스마트공장 공급기업 솔루션 설명서 내용 |
| `DI-DS-01.js` | 산업설비 OT 데이터 활용서비스 설명서(데이터바우처) 내용 |

로고는 `_src/iso/logo.png`를 씁니다.

## 고치는 방법

1. `DI-SF-01.js` 또는 `DI-DS-01.js`에서 문구·표를 고칩니다.
2. Word 원본(맑은 고딕): `npm install docx` 후 `node _src/supplier/DI-SF-01.js "Malgun Gothic" DI-SF-01_Rev00.docx`
3. PDF(Pretendard, CI 가이드 기준): `node _src/supplier/DI-SF-01.js Pretendard tmp.docx` → `soffice --headless --convert-to pdf tmp.docx` → `files/supplier/DI-SF-01_Rev00.pdf`로 저장
4. 쪽수가 바뀌면 `resources.html`, `en/resources.html` 카드의 쪽수를 고칩니다.

개정할 때는 내용 파일의 `REV`를 올리고 파일 이름도 맞춥니다.
