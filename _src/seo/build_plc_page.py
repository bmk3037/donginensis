"""「PLC 프로그램 개발」 페이지(국문 plc-programming.html · 영문 en/plc-programming.html) 생성.

머리(head 공통 부분)·머리 메뉴·꼬리말은 제조기업 도입 페이지(manufacturing.html)에서 그대로 가져오고, 본문만 여기서 만든다.
문구를 고칠 때는 이 파일을 고치고 다시 실행한다: python3 _src/seo/build_plc_page.py
사실 확인된 내용만 쓴다(홈페이지·회사소개서에 있는 실적·브랜드·절차). 기종별 대응 여부는 「문의 시 확인」으로 둔다.
"""
import html, json, os, re

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NAME = 'plc-programming.html'

KO = dict(
    lang='ko', src='manufacturing.html', out=NAME, form_lang='KO', root='',
    title='PLC 프로그램 개발 · 제어반 제작부터 시운전까지 | (주)동인엔시스',
    desc='PLC 프로그램 개발을 제어반을 만드는 회사가 직접 합니다. 운전 로직·인터록 설계, 인버터 연동, MQTT 데이터 연동, 공장검사와 현장 시운전까지. 부산·양산 35년 제어반 제작 (주)동인엔시스.',
    keywords='PLC 프로그램 개발, PLC 프로그래밍, PLC 프로그램 외주, PLC 제어반, 자동제어반, 제어반 제작, 인버터 제어, 시운전, Schneider SI, 부산 PLC, 동인엔시스',
    kicker='PLC Programming',
    h1='PLC 프로그램 개발,<br><span class="rl">제어반을 만드는 회사</span>가 직접 합니다.',
    lead='(주)동인엔시스는 1991년부터 제어반을 설계·제작하며 PLC·인버터 프로그램과 공장검사, 현장 시운전까지 자체 수행해 왔습니다. 신규 설비의 PLC 프로그램 개발부터 기존 제어반 교체에 따른 프로그램 작업까지 한 회사가 맡습니다.',
    cta=('PLC 프로그램 개발 문의 →', 'tel:0518623668', '전화 상담 051-862-3668'),
    check_k='Check', check_h='이런 경우<br><span class="b">맡겨 주십시오</span>',
    checks=['신규 설비의 PLC 제어반과 PLC 프로그래밍을 함께 맡길 곳이 필요하다', '노후 제어반을 교체하면서 PLC 프로그램도 새로 정리해야 한다',
            '인버터·모터 운전 로직과 인터록을 정확하게 구성해야 한다', '설비 운전 데이터를 MES·클라우드로 보내도록 PLC를 구성하고 싶다',
            '공장검사와 현장 시운전까지 책임질 업체가 필요하다', '선박·수소처럼 까다로운 현장의 제어 경험이 필요하다'],
    scope_k='Scope', scope_h='PLC 프로그램 개발<br><span class="b">작업 범위</span>',
    img_alt='동인엔시스 PLC 제어반과 모터 시험 설비', img_cap='제어반과 모터를 함께 시험하는 지능형 제어반 TestBench',
    scope=[('01', '제어 로직 설계·프로그램', '운전 순서, 인터록, 알람, 비상정지 로직을 설계하고 PLC 프로그램으로 구현합니다.'),
           ('02', '인버터·모터 운전 제어', 'PLC와 인버터를 연동해 모터·펌프·송풍기의 기동·정지와 속도 제어를 구성합니다.'),
           ('03', '설비 데이터 연동', 'PLC에서 MQTT로 운전 데이터를 보내고 TLS로 통신 구간을 보호합니다. MES·관제 시스템은 REST API로 연결합니다.'),
           ('04', '공장검사 · 현장 시운전', '제작한 제어반과 프로그램을 공장에서 먼저 검사하고, 현장 시운전과 운영 교육까지 진행합니다.')],
    brand_k='Brands', brand_h='제어반에 써 온<br><span class="b">주요 브랜드</span>',
    brands=['Schneider Electric (공식 SI 파트너)', 'SIEMENS', 'ABB', 'Fuji Electric', 'Phoenix Contact', 'Danfoss', 'Eaton'],
    brand_note='대상 PLC 기종과 현재 프로그램 상태를 알려 주시면 대응 가능 여부를 확인해 드립니다.',
    proc_k='Process', proc_h='진행 절차',
    proc=[('STEP 1', '현장 확인', '대상 설비·기존 제어반·운전 방식 확인'), ('STEP 2', '제어 설계', '입출력(I/O) 목록, 운전 순서·인터록 정리'),
          ('STEP 3', '프로그램 개발 · 제작', 'PLC·인버터 프로그램, 제어반 제작·배선'), ('STEP 4', '공장검사', '출하 전 동작·인터록·알람 시험'),
          ('STEP 5', '현장 시운전', '현장 시운전, 운영 교육, 사후관리')],
    why_k='Why DONG-IN ENSIS', why_h='제어반 35년,<br><span class="b">현장에서 검증한 제어</span>',
    why=[('35<sup>+</sup>', 'Years · 1991년 설립'), ('750<sup>+</sup>', '제어시스템 프로젝트'), ('SI', 'Schneider Electric 공식 SI 파트너')],
    why_txt=[('설계부터 시운전까지 한 회사', '제어반 설계·제작·배선, PLC 프로그램, 공장검사, 현장 시운전을 나누지 않고 한 회사가 책임집니다.'),
             ('까다로운 현장의 레퍼런스', '국내 에너지 기업의 액화수소충전소, 대형 조선소의 FGSS 시험설비, 친환경 선박 전기추진 제어 등을 수행했습니다.'),
             ('데이터까지 이어지는 제어', '지능형 제어반으로 설비 제어와 운전 데이터 수집을 함께 하고, 별도 수집장비 없이 클라우드로 연결합니다.')],
    links=[('지능형 제어반 도입 안내 →', 'manufacturing.html'), ('IT기업 OT 협업 →', 'partner.html'), ('적용 분야 →', 'applications.html')],
    faq_k='FAQ', faq_h='자주 묻는 질문',
    faq=[('어떤 PLC를 다루나요?', 'Schneider Electric 공식 SI 파트너이며, 제어반에 SIEMENS·ABB·Fuji Electric 등 여러 브랜드를 써 왔습니다. 대상 기종과 현재 프로그램 상태를 알려 주시면 대응 가능 여부를 확인해 드립니다.'),
         ('기존 제어반을 교체하면서 프로그램도 새로 해야 하나요?', '현장 확인에서 기존 제어반 구성과 운전 방식을 살펴, 기존 운전 방식을 유지할 부분과 새로 정리할 부분을 제안해 드립니다.'),
         ('PLC 프로그램 개발 후 설비 데이터 수집도 할 수 있나요?', '네. 지능형 제어반으로 구성하면 PLC가 설비를 제어하면서 운전 데이터를 MQTT로 클라우드나 고객사 서버에 보냅니다. 별도 수집장비가 필요 없습니다.'),
         ('공장검사와 시운전은 어떻게 하나요?', '제작한 제어반과 프로그램은 출하 전에 공장에서 동작·인터록·알람을 먼저 시험합니다. 이후 현장 시운전과 운영 교육을 진행합니다.'),
         ('기간과 비용은 어느 정도인가요?', '설비 수, 입출력(I/O) 규모, 제어 복잡도, 제어반 제작 여부에 따라 달라집니다. 현장 확인 후 구성안과 함께 견적을 드립니다. 지능형 제어반 표준 구축 기간은 9~15주입니다.')],
    iq_k='Inquiry', iq_h='PLC 프로그램 개발<br><span class="b">문의</span>',
    iq_lead='설비와 작업 내용을 남겨 주시면 담당 엔지니어가 검토 후 연락드립니다.',
    iq_side=[('회신', '영업일 기준 1~2일 이내 연락드립니다.'), ('검토 내용', '대응 가능 여부, 권장 구성, 예상 일정'), ('전화 상담', '<a href="tel:0518623668">051-862-3668</a>')],
    f=dict(company='회사명', name='담당자명', position='부서 / 직책', phone='연락처', email='이메일', region='설비 소재지 (시·도)', region_ph='예: 경남 김해',
           ctl='PLC 기종 · 현재 제어 방식', ctl_ph='예: Schneider M241, 릴레이 제어 등', work='작업 종류 (복수 선택)',
           works=['신규 PLC 프로그램 개발', '제어반 제작 + 프로그램', '노후 제어반 교체', '인버터·모터 제어', '데이터 연동(MES·클라우드)', '견적 요청'],
           msg='문의 내용', msg_ph='설비 구성, 작업 범위, 희망 일정 등을 자유롭게 적어 주십시오.', submit='문의하기',
           ok='<b>문의가 접수되었습니다.</b>검토 후 영업일 기준 1~2일 이내에 연락드리겠습니다.'),
)

EN = dict(
    lang='en', src='en/manufacturing.html', out='en/' + NAME, form_lang='EN', root='../',
    title='PLC Programming & Control Panel Building | DONG-IN ENSIS',
    desc='PLC programming by a control panel maker: control logic, interlocks, drive integration, MQTT data links, factory testing and commissioning. Busan, Korea.',
    keywords='PLC programming, PLC program development, PLC control panel, control panel manufacturer Korea, drive control, commissioning, Schneider SI partner, DONG-IN ENSIS',
    kicker='PLC Programming',
    h1='PLC programming,<br><span class="rl">by the company that builds the panel.</span>',
    lead='Since 1991 DONG-IN ENSIS has designed and built control panels and done its own PLC and drive programming, factory testing and site commissioning. From PLC programming for new equipment to program work for panel replacement, one company handles it all.',
    cta=('Ask about PLC programming →', 'tel:+82518623668', 'Call +82-51-862-3668'),
    check_k='Check', check_h='When to<br><span class="b">call us</span>',
    checks=['You need one partner for both the control panel and the PLC program', 'You are replacing an aging panel and need the PLC program reorganized',
            'Drive and motor sequences and interlocks must be set up precisely', 'You want the PLC to send equipment data to MES or the cloud',
            'You need a supplier responsible through factory testing and commissioning', 'You need control experience from demanding marine or hydrogen sites'],
    scope_k='Scope', scope_h='What our PLC<br><span class="b">programming covers</span>',
    img_alt='DONG-IN ENSIS PLC control panel and motor test rig', img_cap='Intelligent Control Panel TestBench with panels and motors',
    scope=[('01', 'Control logic design & programming', 'We design operating sequences, interlocks, alarms and emergency stop logic and implement them in the PLC program.'),
           ('02', 'Drive & motor control', 'We link the PLC with drives to start, stop and control the speed of motors, pumps and blowers.'),
           ('03', 'Equipment data links', 'The PLC publishes operating data over MQTT with TLS protection, and MES or monitoring systems connect through a REST API.'),
           ('04', 'Factory testing & commissioning', 'Panels and programs are tested in our factory before shipment, then commissioned on site with operator training.')],
    brand_k='Brands', brand_h='Main brands<br><span class="b">in our panels</span>',
    brands=['Schneider Electric (official SI partner)', 'SIEMENS', 'ABB', 'Fuji Electric', 'Phoenix Contact', 'Danfoss', 'Eaton'],
    brand_note='Tell us the PLC model and the state of the current program, and we will confirm whether we can take it on.',
    proc_k='Process', proc_h='How we work',
    proc=[('STEP 1', 'Site review', 'Equipment, existing panel and operating method'), ('STEP 2', 'Control design', 'I/O list, sequences and interlocks'),
          ('STEP 3', 'Programming & build', 'PLC and drive programs, panel building and wiring'), ('STEP 4', 'Factory test', 'Operation, interlock and alarm tests before shipment'),
          ('STEP 5', 'Commissioning', 'Site commissioning, operator training and support')],
    why_k='Why DONG-IN ENSIS', why_h='35 years of panels,<br><span class="b">control proven on site</span>',
    why=[('35<sup>+</sup>', 'Years · since 1991'), ('750<sup>+</sup>', 'Control system projects'), ('SI', 'Schneider Electric official SI partner')],
    why_txt=[('One company from design to commissioning', 'Panel design, building and wiring, PLC programming, factory testing and site commissioning are handled by one company.'),
             ('References in demanding sites', 'Liquid hydrogen charging stations for a major Korean energy company, FGSS test facilities for a leading shipbuilder, and hybrid electric propulsion control for eco-friendly vessels.'),
             ('Control that leads to data', 'With the Intelligent Control Panel, equipment control and data collection happen in one panel and connect to the cloud without an extra gateway.')],
    links=[('Intelligent Control Panel for manufacturers →', 'manufacturing.html'), ('OT partnership for IT companies →', 'partner.html'), ('Applications →', 'applications.html')],
    faq_k='FAQ', faq_h='Frequently asked questions',
    faq=[('Which PLCs do you work with?', 'We are an official Schneider Electric SI partner and have used SIEMENS, ABB, Fuji Electric and other brands in our panels. Tell us the PLC model and the state of the current program, and we will confirm whether we can take it on.'),
         ('Do we need a new program when replacing an existing panel?', 'During the site review we check the existing panel and operating method, then propose which parts to keep and which to reorganize.'),
         ('Can you also collect equipment data after programming?', 'Yes. With the Intelligent Control Panel, the PLC controls the equipment and sends operating data over MQTT to the cloud or your server, with no extra gateway.'),
         ('How do factory testing and commissioning work?', 'Panels and programs are tested in our factory for operation, interlocks and alarms before shipment, followed by site commissioning and operator training.'),
         ('How long does it take and what does it cost?', 'It depends on the number of machines, I/O size, control complexity and whether a panel is built. We quote with a proposed configuration after the site review. A standard Intelligent Control Panel project takes 9–15 weeks.')],
    iq_k='Inquiry', iq_h='Ask about<br><span class="b">PLC programming</span>',
    iq_lead='Tell us about your equipment and the work needed, and an engineer will review it and get back to you.',
    iq_side=[('Reply', 'Within 1–2 business days.'), ('We review', 'Feasibility, recommended setup, expected schedule'), ('Phone', '<a href="tel:+82518623668">+82-51-862-3668</a>')],
    f=dict(company='Company', name='Name', position='Department / Position', phone='Phone', email='E-mail', region='Site location', region_ph='e.g. Busan, Korea',
           ctl='PLC model · current control', ctl_ph='e.g. Schneider M241, relay control', work='Type of work (select all that apply)',
           works=['New PLC program', 'Panel building + program', 'Aging panel replacement', 'Drive & motor control', 'Data link (MES, cloud)', 'Quotation'],
           msg='Message', msg_ph='Equipment, scope of work, preferred schedule, etc.', submit='Send inquiry',
           ok='<b>Thank you. We have received your inquiry.</b>We will contact you within 1–2 business days.'),
)


def body(L):
    e = html.escape
    f = L['f']
    checks = ''.join(f'<div class="check-item">{e(c)}</div>' for c in L['checks'])
    scope = ''.join(f'<li><span class="ic">{n}</span><div><b>{e(t)}</b><span>{e(d)}</span></div></li>' for n, t, d in L['scope'])
    brands = ''.join(f'<span>{e(b)}</span>' for b in L['brands'])
    proc = ''.join(f'<div class="proc-item"><div class="w">{s}</div><h4>{e(t)}</h4><p>{e(d)}</p></div>' for s, t, d in L['proc'])
    why = ''.join(f'<div class="why-num"><b>{n}</b><span>{e(t)}</span></div>' for n, t in L['why'])
    why_txt = ''.join(f'<div class="rv"><h4>{e(t)}</h4><p>{e(d)}</p></div>' for t, d in L['why_txt'])
    links = ''.join(f'<a href="{h}">{e(t)}</a>' for t, h in L['links'])
    faq = ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in L['faq'])
    side = ''.join(f'<li><b>{e(t)}</b>{d}</li>' for t, d in L['iq_side'])
    works = ''.join(f'<label><input type="checkbox" name="interest" value="{e(w)}"> {e(w)}</label>' for w in f['works'])
    agree = AGREE[L['lang']]
    return f'''
<section class="sub-hero">
  <div class="wrap">
    <div class="kicker">{L['kicker']}</div>
    <h1>{L['h1']}</h1>
    <p>{e(L['lead'])}</p>
    <div class="hero-cta" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:34px">
      <a href="#inquiry" class="btn btn-white">{e(L['cta'][0])}</a>
      <a href="{L['cta'][1]}" class="btn btn-ghost">{e(L['cta'][2])}</a>
    </div>
  </div>
</section>

<section class="sec prob">
  <div class="wrap">
    <div class="rv">
      <div class="kicker">{L['check_k']}</div>
      <h2 class="h2">{L['check_h']}</h2>
    </div>
    <div class="check-grid rv">
      {checks}
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap prod-grid">
    <figure class="prod-img rv">
      <img src="{L['root']}img/control-panel.jpg" alt="{e(L['img_alt'])}" loading="lazy">
      <figcaption>{e(L['img_cap'])}</figcaption>
    </figure>
    <div class="rv">
      <div class="kicker">{L['scope_k']}</div>
      <h2 class="h2">{L['scope_h']}</h2>
      <ul class="feat">{scope}</ul>
    </div>
  </div>
</section>

<section class="sec prob">
  <div class="wrap">
    <div class="rv">
      <div class="kicker">{L['brand_k']}</div>
      <h2 class="h2">{L['brand_h']}</h2>
    </div>
    <div class="data rv" style="margin-top:28px">{brands}</div>
    <p class="fine2 rv" style="margin-top:14px">{e(L['brand_note'])}</p>
  </div>
</section>

<section class="sec proc">
  <div class="wrap">
    <div class="rv">
      <div class="kicker">{L['proc_k']}</div>
      <h2 class="h2">{L['proc_h']}</h2>
    </div>
    <div class="proc-grid rv" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">{proc}</div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="rv">
      <div class="kicker">{L['why_k']}</div>
      <h2 class="h2">{L['why_h']}</h2>
    </div>
    <div class="why-grid rv" style="grid-template-columns:repeat(3,1fr)">{why}</div>
    <div class="why-txt">{why_txt}</div>
    <div class="corp rv">{links}</div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="rv">
      <div class="kicker">{L['faq_k']}</div>
      <h2 class="h2">{L['faq_h']}</h2>
    </div>
    <div class="faq rv">{faq}</div>
  </div>
</section>

<section class="sec form-sec" id="inquiry">
  <div class="wrap form-wrap">
    <div class="form-side rv">
      <div class="kicker">{L['iq_k']}</div>
      <h2 class="h2">{L['iq_h']}</h2>
      <p class="lead">{e(L['iq_lead'])}</p>
      <ul>{side}</ul>
    </div>
    <div class="rv">
      <form class="iq" novalidate>
        <input type="hidden" name="form_type" value="PLC 프로그램 개발"><input type="hidden" name="lang" value="{L['form_lang']}">
        <input type="hidden" name="utm_source"><input type="hidden" name="utm_medium"><input type="hidden" name="utm_campaign"><input type="hidden" name="referrer">
        <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="row">
          <div class="fld"><label class="t" for="company">{f['company']}<i>*</i></label><input type="text" id="company" name="company" required autocomplete="organization"></div>
          <div class="fld"><label class="t" for="name">{f['name']}<i>*</i></label><input type="text" id="name" name="name" required autocomplete="name"></div>
        </div>
        <div class="row">
          <div class="fld"><label class="t" for="position">{f['position']}</label><input type="text" id="position" name="position"></div>
          <div class="fld"><label class="t" for="phone">{f['phone']}<i>*</i></label><input type="tel" id="phone" name="phone" required autocomplete="tel"></div>
        </div>
        <div class="fld"><label class="t" for="email">{f['email']}<i>*</i></label><input type="email" id="email" name="email" required autocomplete="email"></div>
        <div class="row">
          <div class="fld"><label class="t" for="region">{f['region']}</label><input type="text" id="region" name="region" placeholder="{e(f['region_ph'])}"></div>
          <div class="fld"><label class="t" for="control_type">{f['ctl']}</label><input type="text" id="control_type" name="control_type" placeholder="{e(f['ctl_ph'])}"></div>
        </div>
        <div class="fld"><label class="t">{f['work']}</label><div class="opts">{works}</div></div>
        <div class="fld"><label class="t" for="message">{f['msg']}</label><textarea id="message" name="message" placeholder="{e(f['msg_ph'])}"></textarea></div>
        {agree}
        <button type="submit" class="btn btn-blue" data-label="{e(f['submit'])}">{e(f['submit'])}</button>
      </form>
      <div class="iq-msg ok" style="display:none">{f['ok']}</div>
    </div>
  </div>
</section>
'''


AGREE = {}


def build(L):
    src = open(os.path.join(SITE, L['src']), encoding='utf-8').read()
    # 개인정보 동의 문구는 원본 페이지 것을 그대로
    AGREE[L['lang']] = re.search(r'<div class="agree">.*?</div>', src, re.S).group(0)
    head_end = src.index('</header>') + len('</header>\n')
    foot_start = src.index('<footer class="ft">')
    head, foot = src[:head_end], src[foot_start:]
    old = L['src'].split('/')[-1]
    # 머리: 제목·설명·키워드·주소·짝 주소·og, FAQ 구조화 데이터 교체
    head = re.sub(r'<title>.*?</title>', f'<title>{L["title"]}</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{L["desc"]}">', head)
    head = re.sub(r'<meta name="keywords" content="[^"]*">', f'<meta name="keywords" content="{L["keywords"]}">', head)
    head = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{L["title"]}">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{L["desc"]}">', head)
    hd = head.index('</head>')  # 주소 바꾸기는 <head> 안에서만(머리 메뉴의 제조기업 도입 링크는 그대로)
    head = head[:hd].replace(old, NAME) + head[hd:]
    # 언어 바꾸기 링크(ENG/KOR)는 이 페이지의 짝으로
    head = head.replace('href="en/' + old + '"', 'href="en/' + NAME + '"').replace('href="../' + old + '"', 'href="../' + NAME + '"')
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in L['faq']]}
    head = re.sub(r'<script type="application/ld\+json" data-faq>.*?</script>',
                  '<script type="application/ld+json" data-faq>' + json.dumps(faq, ensure_ascii=False) + '</script>', head, flags=re.S)
    out = head + body(L) + '\n' + foot
    open(os.path.join(SITE, L['out']), 'w', encoding='utf-8').write(out)
    print('->', L['out'])


if __name__ == '__main__':
    build(KO)
    build(EN)
