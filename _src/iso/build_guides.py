"""역할별 업무 안내서(DI-IMS-G-01) PDF 생성.

    python3 _src/iso/build_guides.py

결과: files/iso/DI-IMS-G-01_역할별안내_Rev00.pdf
      (표지·결재 1쪽 + 공통 1쪽 + 역할 5쪽 + 교육 참석 확인서 1쪽 = 8쪽, 동인엔시스 문서 양식)
원본 HTML은 _src/iso/guides/guide.html에 같이 남긴다. PDF는 크롬(headless)으로 인쇄한다.
내용은 매뉴얼 DI-IMS-M-01 Rev.00(부록 E 포함)과 ISO 기록 도구를 따른다. 매뉴얼·도구가 바뀌면 같이 고친다.
"""
import base64
import glob
import html
import os
import shutil
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT_HTML = os.path.join(HERE, 'guides', 'guide.html')
OUT_PDF = os.path.join(ROOT, 'files', 'iso', 'DI-IMS-G-01_역할별안내_Rev00.pdf')
DOC = 'DI-IMS-G-01 Rev.00 · 2026.10.11'

E = html.escape

# ---------------------------------------------------------------- 내용
COMMON_FLOW = [
    ('수주', 'PF-00', '영업관리'), ('설계', 'QF-02 · QF-15', '설계·기술팀 총괄'), ('입고', 'QF-03', '생산관리·품질'),
    ('제작', 'QF-16 · QF-05', '생산관리·제조'), ('FAT', 'QF-06 · SF-02', '시험'), ('출하', 'PF-00 · QF-04', '품질·생산관리'),
    ('SAT', 'QF-07 · SF-03', '시운전'), ('종료', 'QF-08 · 백업', '프로그램·품질'),
]
COMMON_RULES = [
    ('회색 기울임 글은 예시', '기록이 아닙니다. 덮어쓰거나 지우고, 그대로 쓸 내용이면 글자색을 검정으로·기울임을 해제합니다.'),
    ('\'(예정)\' 날짜는 실제 날짜로', '도구가 넣은 예정일은 실제로 한 날로 고칩니다.'),
    ('\'해당없음 (자동)\'은 확인한다', '계약 조건으로 미리 채운 줄입니다. 계약서와 다르면 고쳐 씁니다.'),
    ('서명·날짜는 그날 직접', '이름이 미리 들어 있어도 서명 전에는 승인이 아닙니다. 몰아서 서명하지 않습니다.'),
    ('파일은 정해진 폴더·이름으로', '프로젝트: 01~08 폴더 / 회사 기록: 양식번호_연월(예: SF-01_202610)'),
]
TOOL_TABS = [
    ('01 기록 묶음 생성', '프로젝트 정보·BOM·I/O를 한 번 넣으면 프로젝트 기록 전부가 채워진 채 만들어짐'),
    ('02 명판·라벨', '판넬 LOT 명판(업체용 도안)과 A4 라벨지 인쇄'),
    ('03 FAT 시험 입력', '태블릿으로 판정을 누르면 QF-06 엑셀과 고객 성적서가 나옴'),
    ('04 기록 현황판', '공용 폴더를 고르면 프로젝트별 진행·빠진 기록·버전 불일치·지연을 보여 줌'),
    ('05 회사 연간 기록', '위험성평가·내부심사 등 회사 기록 기한과 양식 받기, 캘린더 알림'),
]

ROLES = [
    {
        'name': '설계 · PLC 프로그램', 'who': '설계 책임자 · 프로그램 담당 · 기술팀 총괄 하희천 이사(기준·변경 승인)',
        'tasks': [
            ('수주 직후', '고객 사양서·PO 검토 결과를 영업관리에 전달하고 BOM·I/O 리스트를 생산관리에 준다', '01 탭 입력 자료', '02_설계기준'),
            ('설계 착수', '입력·출력·검토·검증 계획과 결과를 남긴다', 'QF-02', '02_설계기준'),
            ('발주·제작 전', '전선·토크·시험값·조건을 정하고 기술팀 총괄 승인을 받는다', 'QF-15', '02_설계기준'),
            ('승인도 계약', '제출본·고객 코멘트·승인 메일을 보관한다', 'QF-02 고객 승인도 줄', '02_설계기준/고객승인도'),
            ('도면 승인', '승인된 PDF·DWG만 같은 Rev로 넣는다 (파일명 끝 _Rev1)', '도면_승인본', '02_설계기준/도면_승인본'),
            ('도면 변경', 'QF-02 변경 줄 작성 → 01 탭 도면 Rev 변경 → 묶음 다시 생성, 이전 Rev는 구본으로', 'QF-02', '02_설계기준/도면_구본'),
            ('PLC 판넬 투입', '시험 통과 버전만 버전 폴더로 보관하고 QF-08에 한 줄 적는다', 'QF-08', '07_PLC/릴리스/V1.0_날짜_FAT'),
        ],
        'tool': ['01 탭: 도면 Rev·I/O Rev·PLC Ver를 정확히 입력', '04 탭: 도면·PLC 버전 경고가 뜨면 바로 정리',
                 '부품 대체(동등품)도 변경으로 처리 — QF-02 부품 대체 줄'],
        'dont': ['승인 전 도면(작업중)을 현장·제작에 주지 않는다', '릴리스 폴더에 없는 버전을 판넬에 넣지 않는다',
                 'Force·시뮬레이션을 켠 채 출하하지 않는다'],
        'qa': [('이 판넬은 어떤 도면으로 만들었나요?', 'QF-16의 도면 Rev 칸과 도면_승인본의 같은 Rev 파일을 보여 줍니다.'),
               ('프로그램을 바꾼 이력은?', 'QF-08 버전 줄과 07_PLC/릴리스의 버전 폴더, 재시험 기록(QF-06)을 보여 줍니다.')],
    },
    {
        'name': '생산관리 · 제조', 'who': '생산관리 책임자 · 배선 작업자 · 숙련 확인자(QF-12 승인)',
        'tasks': [
            ('프로젝트 시작', '01 탭에 프로젝트·판넬·담당자·일정을 넣고 묶음을 만들어 공용 폴더에 푼다', '01 탭', '프로젝트 폴더'),
            ('판넬 LOT', '제조번호(프로젝트번호-순번)가 곧 판넬 LOT. 명판·라벨을 만든다', '02 탭', '명판 업체 · A4 라벨지'),
            ('자재 입고', '모델·정격·수량·외관·성적서 확인, 합격품만 불출 (부품 LOT는 매기지 않음)', 'QF-03', '03_구매입고'),
            ('일용직 투입일', '작업 전 채용 시 교육 1시간 → 05 탭 \'일용직 투입 교육 기록\'에 이름만 적어 QF-12 받기·서명. 숙련자 지도 아래 작업만', 'QF-12', '회사기록 QF-12_일자_일용직투입교육'),
            ('공정 진행', '공정마다 일자·작업자·판정·인계를 적는다', 'QF-16', '04_제작'),
            ('배선 완료', '작업자 자주검사 → 숙련자 확인 둘 다 적합해야 시험으로 넘긴다', 'QF-05', '04_제작'),
            ('출하', '판넬 LOT별 출하일·납품처를 적고 포장 상태를 확인한다', 'QF-04 · QF-16', '05_FAT출하'),
            ('외주·공급자', '신규 업체는 평가 후 발주, 외주 현장배선은 안전 협의', 'QF-10 · SF-09 · SF-03', '회사기록 / 06_SAT인수'),
        ],
        'tool': ['01 탭 \'제조번호 자동 채우기\'로 LOT 부여 (한 번 쓴 번호는 다시 쓰지 않음)',
                 '02 탭: 처음 한 번은 \'칸 테두리 인쇄\'로 라벨지 위치를 맞춘다', '05 탭: 공급자 연간 재평가(QF-10) 양식 받기'],
        'dont': ['불합격·보류품을 불출하지 않는다 (\'부적합\' 표시 후 격리, QF-09)', '숙련자 확인 전에 시험으로 넘기지 않는다',
                 '공정 기록을 나중에 몰아서 적지 않는다'],
        'qa': [('이 판넬의 차단기는 어디서 들어왔나요?', '판넬 LOT → BOM(도면 Rev) → QF-03 입고 기록(발주·입고번호)으로 거슬러 보여 줍니다.'),
               ('배선 작업자 자격은?', 'QF-05의 작업자·숙련자 이름과 QF-12의 업무범위 승인을 보여 줍니다.')],
    },
    {
        'name': '시험 · 시운전', 'who': '시험 담당 · 시운전 담당 · 통전 감시자',
        'tasks': [
            ('통전 전', '정전·잠금 확인, 감시자 배치, 시험구역 통제 후 승인받고 통전한다', 'SF-02', '05_FAT출하'),
            ('시험 전', '기준(QF-15)과 계측기 교정 유효기한(QF-11)을 확인한다', 'QF-15 · QF-11', '—'),
            ('FAT', '03 탭에서 항목·I/O 점마다 결과를 적고 판정을 누른다 (시각 자동 기록)', '03 탭 → QF-06 · QF-06-1', '05_FAT출하'),
            ('불합격', '조치·재시험 내용을 적고 다시 판정한다 (큰 문제는 NCR)', 'QF-06 · QF-09', '08_NCR_AS'),
            ('FAT 종료', 'QF-06 엑셀과 서명한 고객 성적서(PDF)를 저장한다', '03 탭 출력', '05_FAT출하'),
            ('SAT', '현장 통전 확인 후 시나리오대로 시험, 미결은 담당·기한, 고객 인수 확인', 'QF-07 · SF-02 · SF-03', '06_SAT인수'),
        ],
        'tool': ['03 탭: 태블릿과 PC가 다르면 \'시험 기록 저장(.json)\'으로 옮긴다',
                 '판정 버튼은 실제로 확인한 순간에 누른다 (나중에 몰아서 누르지 않음)', '04 탭: FAT 버전과 PLC 릴리스가 다르면 재시험 여부 확인'],
        'dont': ['통전 중에 배선을 고치지 않는다 (정전·재확인 후)', '교정 기한이 지난 계측기를 쓰지 않는다',
                 '불합격을 조치 기록 없이 합격으로 바꾸지 않는다'],
        'qa': [('절연저항 기준은 어디서 정했나요?', '승인된 QF-15 기준표와 QF-06의 기준값 칸을 보여 줍니다.'),
               ('이 계측기는 교정됐나요?', 'QF-06의 계측기 번호와 QF-11의 교정일·차기일·성적서를 보여 줍니다.')],
    },
    {
        'name': '품질 (관리책임자)', 'who': '문선기 차장 · 품질 담당 (대표이사 백민기는 승인)',
        'tasks': [
            ('결재', '각 기록의 검토란 확인: 예시·예정 남김, 해당없음(자동) 근거, 서명·일자', '모든 양식', '—'),
            ('입고·출하', '입고 판정 확인, 출하 전 QF-06 합격·NCR 종결·최종 PLC·포장 확인 후 출하 승인', 'QF-03 · PF-00', '05_FAT출하'),
            ('부적합', '접수·격리·원인·시정조치·효과 확인까지 관리한다', 'QF-09', '08_NCR_AS'),
            ('매주', '04 현황판으로 빠진 기록·예시 남음·지연·도면/PLC 불일치를 확인하고 담당에게 알린다', '04 탭', '공용 폴더'),
            ('문서관리', '매뉴얼·양식 배포·회수, 저장 경로·백업 담당 등록', 'QF-13 · QF-13-2', '회사기록'),
            ('연 1회', '내부심사(심사 6주 전), 경영검토 준비(3주 전), 고객 만족 정리', 'MF-01 · MF-02 · QF-14', '회사기록'),
        ],
        'tool': ['04 탭: \'예시·예정 남은 승인 문서\', \'작성됐는데 상태 미작성\' 칸이 0인지 확인',
                 '05 탭: 사후심사 예정일을 넣고 캘린더(.ics)를 회사 공용 캘린더에 등록', '04 탭 \'현황 요약 엑셀\'은 경영검토 자료로 쓴다'],
        'dont': ['품질 승인 전 출하하지 않는다', '자기 업무를 내부심사하지 않는다 (독립 심사원 배정)',
                 '예시가 남은 기록을 승인하지 않는다'],
        'qa': [('기록은 어떻게 관리하나요?', '매뉴얼 5.1·부록 E, QF-13 저장 경로·백업, 04 현황판 요약을 보여 줍니다.'),
               ('부적합은 어떻게 처리했나요?', 'QF-09의 원인·시정조치·효과 확인과 관련 재검사 기록을 보여 줍니다.')],
    },
    {
        'name': '안전 · 환경', 'who': '안전 왕리홍 대리 · 환경 성문기 과장',
        'tasks': [
            ('2026.10.31까지', '최초 위험성평가 — 현장 근로자·비정규직과 함께 P·S 평가, 결과 공유 (법정)', 'SF-01', '회사기록 SF-01_202610'),
            ('분기 (3·6·9·12월)', '근로자 협의 (비정규직 포함, 기존 회의 안건 가능), 의견·조치 공유', 'MF-06', '회사기록 MF-06_연월'),
            ('1월', '교육 계획·건강진단 대상·안전보건 예산 편성', 'SF-05 · SF-06 · SF-07', '회사기록'),
            ('6월 · 12월', '반기 점검 한 번에: 이행점검(법정)·관리담당자·관리감독자 평가, 예산 집행·교육 실적·법규 최신성 확인, 대표 보고', 'SF-08 · SF-04 · SF-07 · MF-05', '회사기록'),
            ('11월', '법정 의무교육: 직장 내 성희롱 예방·장애인 인식개선 (전 직원)', 'QF-12', '회사기록 QF-12_연월_의무교육'),
            ('연 1회', '위험성평가 재평가, 비상훈련, 환경측면 재평가, 법규 준수평가', 'SF-01 · MF-06 · EF-01 · MF-05', '회사기록'),
            ('매월 15일까지', '전달 일용직 근로내용확인신고(고용·산재) — 경영관리가 신고, 접수증 보관', '4대보험 신고', '회사기록 근로내용_연월'),
            ('사고 시 즉시', '작업중지·전원 차단 → 구호·119 → 보고 → 현장 보존', 'SF-10', '회사기록'),
        ],
        'tool': ['05 탭 \'지금 받아야 할 양식\'에서 양식 받기 — 담당자·기간·결재란이 채워져 나옴',
                 'SF-01은 공정·위험요인이 적혀 있음: 회의에서 P·S 점수만 매긴다', '05 탭 명단을 한 번 적으면 교육·검진·외주 평가·교정 기한 자동'],
        'dont': ['위험성평가 점수를 사무실에서 혼자 매기지 않는다 (근로자 참여 증거)', '법정 기한(★)을 넘기지 않는다',
                 '폐기물을 섞어 버리지 않는다 (분리·위탁 처리 증빙)'],
        'qa': [('근로자가 참여했나요?', 'SF-01의 참여 근로자 서명과 MF-06 협의 기록, 결과 공유(게시·회의) 증거를 보여 줍니다.'),
               ('반기 점검은 했나요?', 'SF-08 반기 점검표와 대표 보고일, 미흡 조치 기록을 보여 줍니다.')],
    },
]

# ---------------------------------------------------------------- 화면 (동인엔시스 문서 양식: 매뉴얼 표지 + 기록양식집 본문)
BLUE, INK, MUTED, LABEL, LINE, PRE = '#1857a5', '#263445', '#55657a', '#e8eef6', '#8a9bb0', '#f4f6f9'
TOTAL = 8
DOCLINE = '동인엔시스 | DI-IMS-G-01 | Rev.00 | 제정 2026.10.11 | 시행: 대표 승인일'


def logo_tag(cls='logo'):
    with open(os.path.join(ROOT, 'img', 'logo_color.png'), 'rb') as f:
        b = base64.b64encode(f.read()).decode()
    return '<img class="%s" src="data:image/png;base64,%s" alt="동인엔시스">' % (cls, b)


def frame(no, body):
    return ('<section class="pg"><div class="run">역할별 업무 안내서 | DI-IMS-G-01 Rev.00</div>%s'
            '<div class="ft">동인엔시스 | DI-IMS-G-01 Rev.00 | 페이지 %d / 전체 %d</div></section>' % (body, no, TOTAL))


def page(title, target, body, no):
    head = ('%s<h1>%s</h1><p class="docline">%s · 대상: %s</p>' % (logo_tag(), E(title), E(DOCLINE), E(target)))
    return frame(no, head + body)


def table(head, rows, widths=None, cls='tbl'):
    cols = ''.join('<col style="width:%s">' % w for w in widths) if widths else ''
    th = ''.join('<th>%s</th>' % E(h) for h in head)
    tr = ''.join('<tr>%s</tr>' % ''.join('<td%s>%s</td>' % (' class="lab"' if k == 0 else '', E(c)) for k, c in enumerate(r)) for r in rows)
    return '<table class="%s"><colgroup>%s</colgroup><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (cls, cols, th, tr)


def cover_page():
    body = ('<div class="cover">%s<h1 class="ct">역할별 업무 안내서</h1><div class="cl"></div>'
            '<p class="cs">통합경영(ISO 9001 · 14001 · 45001) 기록 — 누가, 언제, 무엇을, 어디에</p>'
            '<p class="cs">적용 범위: 제어반의 설계, 제조 및 시운전 · 매뉴얼 DI-IMS-M-01 Rev.00 부록 E와 함께 사용</p>'
            '<table class="tbl info"><colgroup><col style="width:24%%"><col></colgroup><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody>'
            '<tr><td class="lab">문서번호</td><td>DI-IMS-G-01</td></tr>'
            '<tr><td class="lab">개정 / 시행일</td><td>Rev.00 / 제정 2026.10.11 / 시행: 대표 승인일</td></tr>'
            '<tr><td class="lab">구성</td><td>공통 기록 흐름 1쪽 · 역할별 5쪽(설계·PLC / 생산관리·제조 / 시험·시운전 / 품질 / 안전·환경) · 교육 참석 확인서 1쪽</td></tr></tbody></table>'
            '<table class="tbl sign"><thead><tr><th>구분</th><th>작성</th><th>검토</th><th>승인</th></tr></thead><tbody>'
            '<tr><td class="lab">담당</td><td>문선기 차장 (품질)</td><td>하희천 이사 (기술팀 총괄)</td><td>백민기 대표이사</td></tr>'
            '<tr class="tall"><td class="lab">서명</td><td></td><td></td><td></td></tr>'
            '<tr><td class="lab">일자</td><td></td><td></td><td>승인일 = 시행일</td></tr></tbody></table>'
            '<p class="cn">※ 이 안내서는 매뉴얼의 기록 요구를 역할별로 요약한 것입니다. 매뉴얼·양식과 다르면 매뉴얼을 따르며, 매뉴얼이 바뀌면 함께 개정합니다. '
            '교육에 사용하고 마지막 쪽 참석 확인서를 QF-12에 첨부합니다.</p></div>' % logo_tag('clogo'))
    return frame(1, body)


def common_page():
    flow = table(['단계', '수주', '설계', '입고', '제작', 'FAT', '출하', 'SAT', '종료'],
                 [['기록'] + [b for a, b, c in COMMON_FLOW], ['담당'] + [c for a, b, c in COMMON_FLOW]],
                 ['10%'] + ['11.25%'] * 8, 'tbl flow')
    rules = table(['No', '원칙', '내용'], [[str(k + 1), a, b] for k, (a, b) in enumerate(COMMON_RULES)], ['7%', '30%', '63%'], 'tbl no1')
    tabs = table(['ISO 기록 도구 탭', '하는 일'], TOOL_TABS, ['28%', '72%'])
    others = table(['역할', '하는 일'], [
        ['대표이사', '매뉴얼·양식 승인과 출력본 서명 / 연 1회 경영검토(MF-02) 주재 / 예산(SF-07) 승인 / 반기 안전 이행점검(SF-08) 보고 확인'],
        ['영업관리', '수주 전 계약·납기·고객 요구 검토(PF-00) / 고객 승인도·SAT·외주 여부를 01 탭 체크로 알림 / SAT 후 고객 의견(QF-14)']],
        ['18%', '82%'])
    body = ('<h2>프로젝트 기록 흐름 (판넬 1면 기준)</h2>%s'
            '<p class="note">프로젝트 기록은 공용 폴더의 프로젝트 폴더(01_수주고객 ~ 08_NCR_AS)에 둡니다. LOT 번호는 판넬에만 매기며 제조번호가 곧 판넬 LOT입니다.</p>'
            '<h2>모두가 지키는 원칙</h2>%s<h2>ISO 기록 도구 (자료실 → ISO → ISO 기록 도구, 크롬)</h2>%s<h2>그 밖의 역할</h2>%s'
            % (flow, rules, tabs, others))
    return page('공통 — 기록이 흐르는 길', '전 직원', body, 2)


def role_page(r, no):
    tasks = table(['때', '할 일', '양식·도구', '저장 위치'], r['tasks'], ['15%', '45%', '19%', '21%'], 'tbl tasks')
    tool = table(['도구에서 이렇게'], [[x] for x in r['tool']], ['100%'], 'tbl list')
    dont = table(['하지 않는 것'], [[x] for x in r['dont']], ['100%'], 'tbl list')
    qa = table(['심사 질문', '이렇게 답합니다 (보여 줄 기록)'], r['qa'], ['36%', '64%'])
    body = ('<table class="tbl who"><tbody><tr><td class="lab">담당</td><td>%s</td></tr></tbody></table>'
            '<h2>언제 · 무엇을 · 어디에</h2>%s<div class="two"><div>%s</div><div>%s</div></div><h2>심사 때</h2>%s'
            % (E(r['who']), tasks, tool, dont, qa))
    return page(r['name'], r['name'], body, no)


def training_page():
    info = ('<table class="tbl info"><colgroup><col style="width:17%%"><col style="width:33%%"><col style="width:17%%"><col style="width:33%%"></colgroup><tbody>'
            '<tr><td class="lab">교육/평가명</td><td>통합경영 기록·ISO 기록 도구 역할별 교육</td><td class="lab">구분</td><td>교육</td></tr>'
            '<tr><td class="lab">일자·시간</td><td>2026.  .   (  :  ~  :  )</td><td class="lab">장소</td><td></td></tr>'
            '<tr><td class="lab">강사·평가자</td><td>문선기 차장 (품질)</td><td class="lab">관련 기록</td><td>QF-12 교육 역량 평가에 첨부</td></tr>'
            '<tr><td class="lab">교육 내용</td><td colspan="3">매뉴얼 Rev.00 시행(2026.10.01)과 부록 E 기록 도구 운용, 역할별 기록(이 안내서 2~7쪽), 예시·예정 삭제와 서명 원칙, 법정 안전보건 기한</td></tr></tbody></table>')
    rows = ''.join('<tr><td class="c">%d</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' % i for i in range(1, 15))
    att = ('<table class="tbl att"><colgroup><col style="width:6%%"><col style="width:16%%"><col style="width:13%%"><col style="width:17%%"><col style="width:16%%"><col style="width:17%%"><col></colgroup>'
           '<thead><tr><th>No</th><th>성명</th><th>고용구분</th><th>담당업무</th><th>이해 확인<br>(적합/미흡)</th><th>서명</th><th>비고</th></tr></thead><tbody>%s</tbody></table>' % rows)
    sign = ('<table class="tbl sign"><thead><tr><th>구분</th><th>작성 (강사)</th><th>검토 (품질)</th><th>승인 (대표이사)</th></tr></thead><tbody>'
            '<tr class="tall"><td class="lab">성명·서명</td><td>문선기 차장</td><td>하희천 이사</td><td>백민기 대표이사</td></tr>'
            '<tr><td class="lab">일자</td><td></td><td></td><td></td></tr></tbody></table>')
    body = ('%s%s<p class="note">이해 확인: 참석자가 자기 역할의 기록 2가지(언제·어디에)를 말로 설명하면 적합. 비정규직 포함. 스캔하여 회사기록 폴더에 '
            'QF-12_연월_역할교육.pdf로 저장하면 05 탭에서 완료로 확인됩니다.</p>%s' % (info, att, sign))
    return page('교육 참석 확인서', 'QF-12 교육 실적 연결', body, TOTAL)


CSS = """
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Pretendard', 'Malgun Gothic', 'IBM Plex Sans KR', sans-serif; color: %(ink)s; font-size: 9.8pt; line-height: 1.5;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { width: 210mm; height: 297mm; padding: 14mm 15mm 16mm; position: relative; page-break-after: always; overflow: hidden; }
.pg:last-child { page-break-after: auto; }
.run { position: absolute; top: 6mm; right: 15mm; font-size: 7.5pt; color: %(muted)s; }
.ft { position: absolute; left: 0; right: 0; bottom: 7mm; text-align: center; font-size: 7.5pt; color: %(muted)s; }
.logo { height: 7mm; display: block; }
h1 { margin: 3.5mm 0 1mm; font-size: 17pt; color: %(blue)s; font-weight: 800; letter-spacing: -0.02em; }
.docline { margin: 0 0 4mm; font-size: 8.2pt; color: %(muted)s; }
h2 { font-size: 10.5pt; color: %(ink)s; margin: 4.5mm 0 1.8mm; font-weight: 700; }
h2::before { content: '■ '; color: %(blue)s; }
.tbl { width: 100%%; border-collapse: collapse; table-layout: fixed; }
.tbl th { background: %(blue)s; color: #fff; font-weight: 700; font-size: 9pt; padding: 1.8mm 2mm; text-align: center; border: 0.25mm solid %(line)s; }
.tbl td { border: 0.25mm solid %(line)s; padding: 1.8mm 2.2mm; vertical-align: middle; word-break: keep-all; overflow-wrap: anywhere; }
.tbl td.lab { background: %(label)s; font-weight: 600; }
.tasks td:nth-child(3) { background: %(pre)s; color: %(blue)s; font-weight: 600; }
.tasks td:nth-child(4) { font-size: 8.3pt; color: %(muted)s; }
.flow td { text-align: center; font-size: 8.4pt; } .flow tr:first-child td:not(.lab) { background: %(pre)s; color: %(blue)s; font-weight: 700; }
.no1 td:first-child { text-align: center; } .no1 td:nth-child(2) { font-weight: 600; }
.list td.lab { background: #fff; font-weight: 400; }
.list td::before { content: '· '; color: %(blue)s; font-weight: 700; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 4mm; }
.who td.lab { width: 16%%; text-align: center; }
.info { margin: 0 0 4mm; } .info td.lab { text-align: center; }
.sign { margin-top: 4mm; } .sign td { text-align: center; } .sign tr.tall td { height: 14mm; }
.att { margin-top: 3mm; } .att td { height: 8.4mm; } .att td.c { text-align: center; color: %(muted)s; background: %(label)s; }
.note { margin: 2mm 0 0; font-size: 8.4pt; color: %(muted)s; }
.cover { padding-top: 40mm; text-align: center; }
.clogo { height: 18mm; }
.ct { font-size: 22pt; color: %(ink)s; margin: 5mm 0 4mm; }
.cl { width: 70mm; height: 0.8mm; background: #e83e30; margin: 0 auto 6mm; }
.cs { margin: 0 0 2mm; font-size: 10pt; color: %(ink)s; }
.cover .tbl { margin-top: 8mm; text-align: left; }
.cn { text-align: left; font-size: 9pt; margin-top: 5mm; }
""" % dict(ink=INK, blue=BLUE, muted=MUTED, label=LABEL, line=LINE, pre=PRE)


def build_html():
    pages = [cover_page(), common_page()] + [role_page(r, i + 3) for i, r in enumerate(ROLES)] + [training_page()]
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>역할별 업무 안내서 %s</title><style>%s</style></head><body>%s</body></html>'
            % (DOC, CSS, ''.join(pages)))


def chrome():
    for c in ['google-chrome', 'chromium', 'chromium-browser'] + glob.glob('/opt/pw-browsers/chromium*/*/headless_shell') + glob.glob('/opt/pw-browsers/chromium*/*/chrome'):
        p = shutil.which(c) or (c if os.path.exists(c) else None)
        if p:
            return p
    raise SystemExit('크롬을 찾지 못했습니다. 크롬이 있는 PC에서 실행하거나 guide.html을 크롬으로 열어 PDF로 저장하세요.')


def main():
    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write(build_html())
    subprocess.run([chrome(), '--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
                    '--print-to-pdf=' + OUT_PDF, 'file://' + OUT_HTML], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('saved', OUT_PDF)


if __name__ == '__main__':
    main()
