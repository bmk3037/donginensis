# ISO 매뉴얼 · 품질 서류

이 폴더의 PDF는 자료실(`resources.html`)의 "ISO 매뉴얼 · 서류" 탭에 표시됩니다.
직원용 바로가기: https://donginensis.com/resources.html#iso

- 현재: 통합경영 매뉴얼(DI-IMS-M-01), 통합 기록양식집(DI-IMS-F-01) Rev.00 — PDF(보기용)와 원본(docx/xlsx)
- ISO 기록 도구(`ISO-record-builder.html`): 기록 묶음 생성 · 명판·라벨 · FAT 시험 입력 · 기록 현황판 4개 탭으로 된 한 파일짜리 도구. `_src/iso/build_tool.py`가 만들며 직접 고치지 않습니다. 가상 예시 데이터만 들어 있습니다.
- 역할별 업무 안내서(`DI-IMS-G-01_역할별안내_Rev00.pdf`): 공통 기록 흐름 + 역할 5장(설계·생산·시험·품질·안전환경) + 교육 참석 확인서(QF-12 연결). `_src/iso/build_guides.py`로 만듭니다(크롬 필요).
- 기록양식집은 양식 33종 + 별지 2종(QF-06-1 I/O 점검표, QF-13-2 백업·복구 확인)이며, 엑셀 원본은 `_src/iso/`의 생성기로 만듭니다(`_src/iso/README.md`).
- 매뉴얼 원본은 `DI-IMS-M-01_Rev00.docx`를 Word로 직접 고칩니다. 고친 뒤 목차를 업데이트하고 PDF를 다시 저장합니다.
- 파일 추가 후 `resources.html`, `en/resources.html`의 `#docList`에 `data-cat="iso"` 카드 한 줄을 추가합니다.
- 공개 폴더입니다(누구나 열람 가능). 개인정보·단가 등이 들어간 문서는 올리지 않습니다. 작성된 기록(서명·실측값·건강진단 등)은 사내 공용 저장소에만 보관합니다.
