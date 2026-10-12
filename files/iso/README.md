# ISO 매뉴얼 · 품질 서류

이 폴더의 PDF는 자료실(`resources.html`)의 "ISO 매뉴얼 · 서류" 탭에 표시됩니다.
직원용 바로가기: https://donginensis.com/resources.html#iso

- 현재: 통합경영 매뉴얼(DI-IMS-M-01), 통합 기록양식집(DI-IMS-F-01) Rev.00 — PDF(보기용)
- ISO 기록 도구(`ISO-record-builder.html`): 기록 묶음 생성 · 명판·라벨 · FAT 시험 입력 · 기록 현황판 5개 탭(회사 연간 기록 포함)으로 된 한 파일짜리 도구. `_src/iso/build_tool.py`가 만들며 직접 고치지 않습니다. 가상 예시 데이터만 들어 있습니다.
- 바탕화면 아이콘: 도구 위쪽 「바탕화면 아이콘 만들기」가 홈페이지 도구로 바로 접속하는 인터넷 바로가기(`ISO 기록 도구.url`)를 바탕화면에 저장한다(설치 없음). `iso-tool.webmanifest`·`iso-sw.js`(`_src/iso/tool/sw.js`로 build_tool.py가 만듦)는 한 번 연 뒤 인터넷 없이도 열리게 하는 오프라인 캐시용이다.
- 역할별 업무 안내서(`DI-IMS-G-01_역할별안내_Rev00.pdf`): 공통 기록 흐름 + 역할 5장(설계·생산·시험·품질·안전환경) + 교육 참석 확인서(QF-12 연결). `_src/iso/build_guides.py`로 만듭니다(크롬 필요).
- ISO 기록 도구 사용 안내(`DI-IMS-G-02_도구사용안내_Rev00.pdf`): 시작하기 + 탭별 화면 캡처·단계별 사용법(01~05) + 자주 묻는 질문·파일 이름 규칙. 직원 배포용. `_src/iso/build_usage_guide.py`로 만듭니다(화면 캡처는 `_src/iso/guides/shots/`).
- 기록양식집은 양식 33종 + 별지 2종(QF-06-1 I/O 점검표, QF-13-2 백업·복구 확인)이며, 엑셀 원본은 `_src/iso/`의 생성기로 만듭니다(`_src/iso/README.md`).
- 자료실에는 PDF와 도구만 올립니다. 편집 원본(매뉴얼 `DI-IMS-M-01_Rev00.docx`, 양식집 `DI-IMS-F-01_Rev00.xlsx`)은 `_src/iso/source/`에 두고 링크하지 않습니다. 매뉴얼은 Word로 고친 뒤 목차를 업데이트하고 PDF를 이 폴더에 다시 저장합니다.
- 파일 추가 후 `resources.html`, `en/resources.html`의 `#docList`에 `data-cat="iso"` 카드 한 줄을 추가합니다.
- 공개 폴더입니다(누구나 열람 가능). 개인정보·단가 등이 들어간 문서는 올리지 않습니다. 작성된 기록(서명·실측값·건강진단 등)은 사내 공용 저장소에만 보관합니다.
