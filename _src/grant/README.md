# 지원사업 서류 도구 (대금청구·결과보고서)

## 브라우저 도구 (설치 없음) — 평소에는 이것

ISO 기록 도구와 같은 방식의 **한 파일짜리 HTML**입니다. 크롬·엣지로 열면 됩니다(엑셀·압축·PDF 라이브러리를 불러올 때만 인터넷 사용).

- 파일: `tool/dist/지원사업-서류도구.html` (홈페이지 게시본 `files/grant/grant-docs-builder.html`, 자료실에는 링크하지 않음)
- **01 사업 정보**: 사업·기업·청구, 과제·성과지표, 보고서 문장, 결재란.
  - **사업계획서 읽기**(`tool/plan.js`, AI 없이 브라우저 안에서): .hwp·.hwpx·.docx·.pdf 를 넣으면 표의 「이름칸→값칸」, 「이름: 값」 문장, 사업비 표(단위 천원 등 반영), 세부과제·성과지표 표, 목적·기대효과·사업화 계획 단락을 찾아 **빈칸에만** 채운다(채운 칸은 색 표시, 이미 적은 칸은 그대로 두고 알려 줌). 양식마다 칸 이름이 달라 다 찾지는 못하므로 찾지 못한 칸을 목록으로 보여 준다. 배포용·암호 한글 문서와 스캔 PDF 는 못 읽는다. PDF 는 처음 읽을 때 pdf.js 를 받아 온다.
  - 더 정확하게 하려면 Claude 에게 계획서를 주고 받은 JSON 을 "불러오기"(화면의 「더 정확하게: Claude 에게 맡기기」).
- **02 증빙 자료**: 요청자료 목록(담당·마감·요청 내용), 자료마다 사진·파일 끌어놓기, 촬영일(EXIF) 읽기, 요청자료 체크리스트 엑셀.
- **03 서류 만들기**: 결과보고서·사진대지(회사 서식 워드), 기관 양식(.docx) 빈칸 자동 채우기, 제출 전 점검, 묶음 zip(서류 + `증빙/E01_…` 원본 파일 + 사업 저장 JSON).
- **바탕화면 아이콘**: 상단 바의 「바탕화면에 설치」 — ISO 기록 도구와 같은 방식(크롬·엣지 웹 앱 설치, 안 되면 바로가기 `.url` 파일). 아이콘은 ISO 도구의 「동」과 구분되는 파란 바탕 서류·빨간 확인 표시(원본 `tool/icon.svg`, 게시 `files/grant/icon-192·512·180.png`, `icon.ico`), 이름은 「지원사업 서류 도구」. 설치는 홈페이지 주소(`https://donginensis.com/files/grant/grant-docs-builder.html`)로 열었을 때만 됩니다. 웹 앱 정보 `files/grant/grant-tool.webmanifest`, 오프라인 캐시 `files/grant/grant-sw.js`(빌드 때 판 번호 자동 갱신).
- 입력과 사진은 그 브라우저에 자동 저장되고, 밖으로 보내지 않습니다. 다른 PC 로 옮길 때는 묶음 zip 을 "불러오기"로 엽니다.
- 한글 양식은 한글에서 "다른 이름으로 저장 → 워드(.docx)"로 바꿔 넣습니다.
- 다시 만들기: `python3 _src/grant/build_tool.py` (화면: `tool/page.html`, `tool/app.js`, `tool/docx.js`, `tool/media.js`, `tool/samples.js`, `tool/grant.css`; 화면 서식은 `_src/iso/tool/app.css` 를 함께 씀)

## 명령어 도구 (Claude 가 쓰는 쪽)

아래 `grant.py` 는 Claude 가 사업계획서를 읽고 정리하거나(`export` 로 브라우저 도구용 JSON), 한글 양식을 워드로 바꿀 때 씁니다.

사업계획서와 기관 양식을 넣으면 **요청자료 체크리스트 → 양식 채우기 → 결과보고서·사진대지 → 제출 전 점검**까지 한 번에 만듭니다.
결과물은 모두 **워드(DOCX)·엑셀과 PDF**이며, 자체 작성 문서는 **동인엔시스 문서 서식**(통합경영 매뉴얼 DI-IMS-M-01 과 같은 틀)으로 나옵니다.
Claude Code 에서 "성장사다리 대금청구 서류 만들어줘" 처럼 말하고 파일을 올리면 `.claude/skills/grant-docs` 절차대로 진행합니다.

## 무엇을 해 주나

| 단계 | 결과물 |
|---|---|
| 사업계획서·공고문 읽기 | 사업 정보, 과제·성과지표, 제출서류 목록 정리 (`project.yaml`) |
| 요청자료 체크리스트 | `요청자료_체크리스트.xlsx` — 담당자별로 찍을 사진·받을 문서, 제출 여부 |
| 기관 양식 채우기 | 대금청구서 등 **DOCX·XLSX 양식을 그대로** 채움 (표 칸·날짜 빈칸·사진 칸). 한글(HWP·HWPX) 양식은 워드로 변환해서 채움 |
| 자체 문서 | 결과보고서·컨설팅보고서 등 — 회사 서식 DOCX + PDF (로고 표지·결재란·파란 표·머리말/꼬리말) |
| 사진대지 | 증빙 사진을 2장씩, 사진 번호·설명·촬영일(EXIF)과 함께 |
| 점검 | 빠진 자료, 확인 안 된 값, 사업비 합계, 정부지원금 초과 청구, 사업기간 밖 촬영 사진 |

## 폴더

```
_src/grant/
  grant.py            명령어
  grantkit/           기능 (추출·한글→워드 변환·양식·문서·체크리스트·점검)
  grantkit/assets/    회사 서식 틀(dongin_template.docx: 매뉴얼에서 본문만 비움)·로고
  example/            가상 예시 (project.yaml, fill/, docs/, make_sample.py)
  projects/<이름>/     실제 사업 자료 — git 에 올라가지 않음
    input/plan        사업계획서
    input/notice      공고문·협약서·정산 안내
    input/forms       기관 양식
    evidence          증빙 (E01_정면.jpg 처럼 자료 ID 로 시작, 또는 evidence/E01/ 폴더)
    project.yaml      사업 정보·과제·증빙목록·서류목록
    fill/*.yaml       양식별 채울 값
    docs/*.yaml       자체 작성 문서 내용
    output/           완성본
```

## 명령

```bash
cd _src/grant
pip install -r requirements.txt
python3 grant.py new 2026_성장사다리        # 폴더 만들기
python3 grant.py extract 2026_성장사다리    # 문서 → 텍스트
python3 grant.py scan 2026_성장사다리       # 양식 빈칸 분석 + fill/*.yaml 초안
python3 grant.py checklist 2026_성장사다리  # 요청자료 체크리스트
python3 grant.py status 2026_성장사다리     # 받은 자료 / 빠진 자료
python3 grant.py fill 2026_성장사다리       # 양식 채우기
python3 grant.py build 2026_성장사다리      # 결과보고서 등 자체 문서
python3 grant.py photos 2026_성장사다리     # 사진대지
python3 grant.py check 2026_성장사다리      # 제출 전 점검
python3 grant.py pack 2026_성장사다리       # output 전체 zip
```

예시로 전체 흐름 보기: `python3 example/make_sample.py` 후 `fill`, `build`, `photos`, `checklist`, `check` 를 `예시` 프로젝트로 실행.

## 양식 채우기 명세 (fill/*.yaml)

```yaml
양식: 대금청구서.hwp
출력: 01_대금청구서
채우기:
  사업명 > right: "{{사업.사업명}}"
  청구금액 > right: "{{청구.청구금액|청구금액}}"      # 금 이천일백만원정 (₩21,000,000)
  입금계좌 > right: "{{청구.계좌.은행}} {{청구.계좌.계좌번호}}\n예금주: {{청구.계좌.예금주}}"
셀:
  - {표: 1, 행: 2, 열: 3, 값: "..."}                 # 라벨로 못 찾을 때 주소 지정 (scan 결과 기준)
바꾸기:
  "2026년    월    일": "{{청구.청구일|날짜:%Y년 %m월 %d일}}"
그림:
  - {파일: "evidence/E01_*", 라벨: "현장 사진 > right", 폭mm: 55}
```

필터: `|원` `|콤마` `|한글금액` `|청구금액` `|날짜` `|날짜:%Y년 %m월 %d일`

## 알아둘 점

- **한글 양식**: 워드로 변환해서 채웁니다(`work/converted/`). 문단·표·병합 칸·칸 너비·배경색·글자 크기/굵기·정렬·그림은 옮기지만, 도형·글상자·각주·쪽 배치는 옮기지 않습니다. 기관이 한글 원본 제출을 요구하면 변환본 내용을 한글 양식에 옮겨 붙이세요.
- **문장 바꾸기**: 양식의 문장이 글자 서식별로 여러 조각이면 조각을 합쳐 바꾸므로 그 문단의 서식은 첫 조각 서식으로 통일됩니다.
- **회사 서식**: 매뉴얼 서식이 바뀌면 `grantkit/assets/dongin_template.docx` 를 지우고 다시 실행하면 `files/iso/DI-IMS-M-01_Rev00.docx` 에서 새로 만듭니다.
- **증빙 사진은 실물**이어야 합니다. 3D 렌더링·AI 이미지·홍보 이미지는 증빙으로 쓰지 않습니다.
- **촬영일**은 사진 EXIF 에서 읽습니다. 메신저로 받은 사진은 촬영일이 지워지니 원본 파일로 받으세요.
- **보관**: `projects/` 는 공개 저장소에 올라가지 않도록 제외되어 있습니다. 클라우드 세션이 끝나면 사라지므로 완성본과 `project.yaml`·`fill/`·`docs/` 를 따로 보관하세요.
