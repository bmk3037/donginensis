/* 동인엔시스 홈페이지 공통 스크립트 */

/* ▼▼ 문의 데이터 수신 주소 (Google Apps Script 웹 앱 URL) ▼▼
   구글 시트 설정 후 발급받은 주소를 따옴표 안에 붙여넣으세요.
   예: 'https://script.google.com/macros/s/XXXXXXXX/exec' */
var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz-5gQyEVbzcIJVwoBRAjziHYlpssIkicfuV1W4HFxTtcgdehbxJ-Z6VAyll9OWDAw/exec';
/* ▲▲ 여기만 바꾸면 됩니다 ▲▲ */

var CONTACT_EMAIL = 'dongin@donginmne.com';
var IS_EN = (document.documentElement.lang || '').indexOf('en') === 0;
var TXT = IS_EN ? {
  sending: 'Sending...',
  fail: 'Your message could not be sent. Please try again later, or contact us at <a href="mailto:'+CONTACT_EMAIL+'">'+CONTACT_EMAIL+'</a> or +82-51-862-3668.',
  subject: '[Website Inquiry] '
} : {
  sending: '전송 중...',
  fail: '전송에 실패했습니다. 잠시 후 다시 시도하시거나 <a href="mailto:'+CONTACT_EMAIL+'">'+CONTACT_EMAIL+'</a> 또는 051-862-3668로 연락 주십시오.',
  subject: '[홈페이지 문의] '
};

(function(){
  // 헤더 스크롤 · 모바일 메뉴
  var hd=document.getElementById('hd'),mn=document.getElementById('mnav'),mb=document.getElementById('mbtn');
  function sc(){ if(hd) hd.classList.toggle('on',window.scrollY>40||(mn&&mn.classList.contains('open'))); }
  window.addEventListener('scroll',sc,{passive:true});sc();
  if(mb&&mn){
    mb.addEventListener('click',function(){var o=mn.classList.toggle('open');mb.setAttribute('aria-expanded',o);sc();});
    mn.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mn.classList.remove('open');sc();});});
  }

  // 등장 애니메이션
  var els=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.1});
    els.forEach(function(el){io.observe(el);});
  }else{els.forEach(function(el){el.classList.add('in');});}

  // 히어로 영상 (메인)
  var v=document.getElementById('heroVideo');
  if(v&&v.dataset.srcPc){v.src=window.innerWidth<768?v.dataset.srcM:v.dataset.srcPc;var p=v.play();if(p&&p.catch)p.catch(function(){});}

  // 히어로 배경음 (소리 켜기 버튼, 기본 무음)
  // Web Audio로 미리 받아 둔 음원을 끊김 없이 반복 재생, 영상 반복 시점에만 부드럽게 위치 보정
  var sb=document.getElementById('sndBtn'), bgm=document.getElementById('heroBgm');
  if(sb&&bgm){
    var VOL=0.45, LOOP=10, AC=window.AudioContext||window.webkitAudioContext;
    var ctx=null, gain=null, buf=null, src=null, t0=0, off0=0, on=false, bufP=null, lastVT=0;
    var setUI=function(state){var tx=sb.querySelector('.snd-tx');sb.setAttribute('aria-pressed',state?'true':'false');sb.setAttribute('aria-label',state?sb.dataset.labelOff:sb.dataset.labelOn);tx.textContent=state?sb.dataset.off:sb.dataset.on;};
    var loadBuf=function(){if(!bufP&&AC&&window.fetch){bufP=fetch(bgm.getAttribute('src')).then(function(r){return r.arrayBuffer();});}return bufP;};
    // 페이지가 다 뜬 뒤 작은 음원(약 160KB)을 미리 받아 둠
    window.addEventListener('load',function(){setTimeout(loadBuf,1500);});
    var vpos=function(){return v&&v.currentTime?v.currentTime%LOOP:0;};
    var startSrc=function(pos){
      if(src){try{src.stop();}catch(e){}}
      src=ctx.createBufferSource();src.buffer=buf;src.loop=true;src.loopStart=0;src.loopEnd=Math.min(LOOP,buf.duration);
      src.connect(gain);t0=ctx.currentTime;off0=pos;src.start(0,pos);
    };
    var apos=function(){return (off0+ctx.currentTime-t0)%LOOP;};
    var fadeTo=function(to,sec){var n=ctx.currentTime;gain.gain.cancelScheduledValues(n);gain.gain.setValueAtTime(gain.gain.value,n);gain.gain.linearRampToValueAtTime(to,n+sec);};
    var turnOn=function(){
      if(!AC){bgm.volume=VOL;var p=bgm.play();if(p&&p.catch)p.catch(function(){});return;}
      if(!ctx){ctx=new AC();gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);}
      if(ctx.state==='suspended')ctx.resume();
      var go=function(){if(!on)return;startSrc(vpos());fadeTo(VOL,1.2);};
      if(buf){go();return;}
      loadBuf().then(function(ab){return new Promise(function(res,rej){ctx.decodeAudioData(ab,res,rej);});}).then(function(b){buf=b;go();}).catch(function(){var p=bgm.play();if(p&&p.catch)p.catch(function(){});});
    };
    var turnOff=function(){
      if(!ctx){bgm.pause();return;}
      fadeTo(0,0.6);setTimeout(function(){if(!on&&ctx.state==='running')ctx.suspend();},700);
    };
    sb.addEventListener('click',function(){on=!on;setUI(on);if(on)turnOn();else turnOff();});
    // 영상이 처음으로 돌아갈 때만 박자 확인, 0.2초 이상 어긋났으면 살짝 줄였다가 다시 맞춤
    if(v)v.addEventListener('timeupdate',function(){
      var t=v.currentTime, wrapped=t<lastVT-1; lastVT=t;
      if(!wrapped||!on||!src||!ctx||ctx.state!=='running')return;
      var d=Math.abs(apos()-vpos()); d=Math.min(d,LOOP-d);
      if(d>0.2){fadeTo(0,0.15);setTimeout(function(){if(on){startSrc(vpos());fadeTo(VOL,0.4);}},160);}
    });
  }

  // 문의 폼
  document.querySelectorAll('form.iq').forEach(function(f){
    var params=new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign'].forEach(function(k){
      var el=f.querySelector('[name='+k+']'); if(el&&params.get(k)) el.value=params.get(k);
    });
    var ref=f.querySelector('[name=referrer]'); if(ref) ref.value=document.referrer||'';

    f.addEventListener('submit',function(ev){
      ev.preventDefault();
      var err=f.querySelector('.iq-msg.err'); if(err) err.remove();
      if(f.querySelector('[name=website]').value){ return; } // 스팸 차단(자동 입력 봇)
      if(!f.checkValidity()){ f.reportValidity(); return; }

      var fd=new FormData(f), data=new URLSearchParams();
      var multi={};
      fd.forEach(function(val,key){ if(multi[key]!==undefined){multi[key]+=', '+val;} else {multi[key]=val;} });
      Object.keys(multi).forEach(function(k){data.append(k,multi[k]);});
      data.append('page',location.pathname);
      data.append('submitted_at',new Date().toISOString());

      var btn=f.querySelector('button[type=submit]'); btn.disabled=true; btn.textContent=TXT.sending;

      function done(){
        f.style.display='none';
        var ok=f.parentNode.querySelector('.iq-msg.ok'); if(ok) ok.style.display='block';
        ok&&ok.scrollIntoView({behavior:'smooth',block:'center'});
      }
      function fail(){
        btn.disabled=false; btn.textContent=btn.dataset.label||'';
        var m=document.createElement('div'); m.className='iq-msg err';
        m.innerHTML=TXT.fail;
        f.insertBefore(m,f.firstChild);
      }

      if(!FORM_ENDPOINT){ // 수신 주소 설정 전: 메일 작성창으로 대체
        var lines=[]; multi.page=location.pathname;
        Object.keys(multi).forEach(function(k){ if(['website','agree','utm_source','utm_medium','utm_campaign','referrer'].indexOf(k)<0) lines.push(k+': '+multi[k]); });
        location.href='mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent(TXT.subject+(multi.form_type||'')+' - '+(multi.company||''))+'&body='+encodeURIComponent(lines.join('\n'));
        btn.disabled=false; btn.textContent=btn.dataset.label||'';
        return;
      }
      fetch(FORM_ENDPOINT,{method:'POST',mode:'no-cors',body:data}).then(done).catch(fail);
    });
  });
})();

// 적용 분야 갤러리 확대 보기
(function(){
  var items=[].slice.call(document.querySelectorAll('.gal button'));
  if(!items.length) return;
  var lb=document.createElement('div'); lb.className='lb'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true');
  lb.innerHTML='<button class="x" aria-label="close">&times;</button><button class="pv" aria-label="previous">&#8249;</button><figure><img alt=""><figcaption></figcaption></figure><button class="nx" aria-label="next">&#8250;</button>';
  document.body.appendChild(lb);
  var img=lb.querySelector('img'), cap=lb.querySelector('figcaption'), cur=0;
  function show(i){ cur=(i+items.length)%items.length; var b=items[cur], f=b.closest('figure');
    img.src=b.querySelector('img').src; img.alt=b.querySelector('img').alt; var fc=f&&f.querySelector('figcaption'); cap.textContent=fc?[].map.call(fc.children,function(x){return x.textContent.trim();}).filter(Boolean).join(' · '):''; }
  function close(){ lb.classList.remove('open'); document.body.style.overflow=''; }
  items.forEach(function(b,i){ b.addEventListener('click',function(){ show(i); lb.classList.add('open'); document.body.style.overflow='hidden'; }); });
  lb.querySelector('.x').addEventListener('click',close);
  lb.querySelector('.pv').addEventListener('click',function(e){e.stopPropagation();show(cur-1);});
  lb.querySelector('.nx').addEventListener('click',function(e){e.stopPropagation();show(cur+1);});
  lb.addEventListener('click',function(e){ if(e.target===lb) close(); });
  document.addEventListener('keydown',function(e){ if(!lb.classList.contains('open')) return; if(e.key==='Escape') close(); if(e.key==='ArrowLeft') show(cur-1); if(e.key==='ArrowRight') show(cur+1); });
})();

// 홍보영상 분류 탭
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.vtabs button'));
  if(!tabs.length) return;
  var cards=[].slice.call(document.querySelectorAll('.media-grid .vcard[data-cat]'));
  function pick(cat){
    tabs.forEach(function(t){ var on=t.dataset.cat===cat; t.classList.toggle('on',on); t.setAttribute('aria-selected',on); });
    cards.forEach(function(c){ var show=c.dataset.cat===cat; if(!show){ var v=c.querySelector('video'); if(v&&!v.paused) v.pause(); } c.hidden=!show; if(show) c.classList.add('in'); });
  }
  tabs.forEach(function(t){ t.addEventListener('click',function(){ pick(t.dataset.cat); }); });
  pick(tabs[0].dataset.cat);
})();

// 보도자료 목록: 최신 5건만 보이고 나머지는 '더 보기'로 펼침 (보도자료 전체 페이지처럼 data-all이 있으면 모두 표시)
(function(){
  var list=document.querySelector('.press-list:not([data-all])');
  if(!list) return;
  var items=[].slice.call(list.children), LIMIT=5;
  if(items.length<=LIMIT) return;
  var en=document.documentElement.lang==='en';
  items.slice(LIMIT).forEach(function(li){ li.hidden=true; });
  var btn=document.createElement('button');
  btn.type='button'; btn.className='press-more';
  btn.textContent=(en?'Show more':'더 보기')+' ('+(items.length-LIMIT)+')';
  btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',function(){
    items.forEach(function(li){ li.hidden=false; });
    btn.remove();
  });
  list.parentNode.insertBefore(btn,list.nextSibling);
})();

// 자료실: 분류별 접기·펼치기 + 분류 탭 + 검색
(function(){
  var list=document.getElementById('docList');
  if(!list) return;
  var cards=[].slice.call(list.querySelectorAll('.doc'));
  var tabs=[].slice.call(document.querySelectorAll('.dtabs button'));
  var q=document.getElementById('dq'), cnt=document.getElementById('dcount'), empty=document.getElementById('dempty');
  var en=document.documentElement.lang==='en', cat='all';
  // 분류 탭 순서대로 그룹(제목 + 접히는 목록)을 만들고 자료를 옮겨 담음
  var groups=[];
  tabs.forEach(function(t){
    var c=t.dataset.cat; if(c==='all') return;
    var items=cards.filter(function(d){ return d.dataset.cat===c; });
    if(!items.length){ t.hidden=true; return; }
    var g=document.createElement('section'); g.className='dgrp'; g.dataset.cat=c;
    var h=document.createElement('button'); h.type='button'; h.className='dgrp-h'; h.setAttribute('aria-expanded','false');
    h.innerHTML='<b></b><span class="dgrp-n"></span><i aria-hidden="true"></i>';
    h.querySelector('b').textContent=t.textContent.trim();
    var body=document.createElement('div'); body.className='docs dgrp-b'; body.hidden=true;
    items.forEach(function(d){ body.appendChild(d); });
    g.appendChild(h); g.appendChild(body); list.appendChild(g);
    h.addEventListener('click',function(){ setOpen(g,body.hidden); });
    groups.push({el:g,head:h,body:body,items:items,tab:t});
  });
  list.classList.add('grouped');
  function setOpen(g,open){ var o=groups.filter(function(x){return x.el===g;})[0]; o.body.hidden=!open; o.head.setAttribute('aria-expanded',open); g.classList.toggle('open',open); }
  function apply(keepOpen){
    var kw=(q.value||'').trim().toLowerCase(), total=0;
    groups.forEach(function(o){
      var n=0;
      o.items.forEach(function(d){ var ok=!kw||d.textContent.toLowerCase().indexOf(kw)>-1; d.hidden=!ok; if(ok) n++; });
      var show=(cat==='all'||o.el.dataset.cat===cat)&&n>0;
      o.el.hidden=!show; o.head.querySelector('.dgrp-n').textContent=n;
      if(show){ total+=n; if(!keepOpen) setOpen(o.el, cat!=='all'||!!kw); }
    });
    cnt.textContent=en?(total+' document'+(total===1?'':'s')):('총 '+total+'건');
    empty.hidden=total>0;
  }
  function pick(t){
    cat=t.dataset.cat;
    tabs.forEach(function(x){ var on=x===t; x.classList.toggle('on',on); x.setAttribute('aria-selected',on); });
    apply();
  }
  tabs.forEach(function(t){ t.addEventListener('click',function(){ pick(t); }); });
  q.addEventListener('input',function(){ apply(); });
  // resources.html#iso 처럼 주소 끝의 분류로 바로 열기 (직원용 바로가기)
  var hs=(location.hash||'').slice(1); if(hs==='smartfactory'||hs==='datavoucher') hs='supplier';
  var start=tabs.filter(function(t){ return t.dataset.cat===hs && !t.hidden; })[0];
  if(start) pick(start); else apply();
})();

// 회사소개 연혁: 2021년 이후만 먼저 보이고, 이전 연혁은 버튼으로 펼침
(function(){
  var hist=document.querySelector('.hist');
  if(!hist) return;
  var CUT=2021, en=document.documentElement.lang==='en';
  var old=[].slice.call(hist.querySelectorAll('.hist-row')).filter(function(r){
    var y=parseInt((r.querySelector('.y')||{}).textContent,10); return y && y<CUT;
  });
  if(!old.length) return;
  old.forEach(function(r){ r.hidden=true; });
  var first=old[old.length-1].querySelector('.y').textContent.trim().slice(0,4), last=old[0].querySelector('.y').textContent.trim().slice(0,4);
  var btn=document.createElement('button');
  btn.type='button'; btn.className='hist-more'; btn.setAttribute('aria-expanded','false');
  function label(open){ btn.innerHTML=(open?(en?'Hide earlier history':'이전 연혁 접기'):(en?'Show earlier history':'이전 연혁 보기')+' <span>'+last+' ~ '+first+'</span>')+'<i aria-hidden="true"></i>'; }
  label(false);
  btn.addEventListener('click',function(){
    var open=btn.getAttribute('aria-expanded')!=='true';
    old.forEach(function(r){ r.hidden=!open; if(open) r.classList.add('in'); });
    btn.setAttribute('aria-expanded',open); btn.classList.toggle('open',open); label(open);
    if(!open) hist.scrollIntoView({behavior:'smooth',block:'start'});
  });
  hist.parentNode.insertBefore(btn,hist.nextSibling);
})();

// 자주 묻는 질문: 5개까지 보이고 나머지는 '더 보기'로 펼침
(function(){
  var LIMIT=5, en=document.documentElement.lang==='en';
  [].forEach.call(document.querySelectorAll('.faq'),function(faq){
    var items=[].slice.call(faq.querySelectorAll(':scope > details'));
    if(items.length<=LIMIT) return;
    items.slice(LIMIT).forEach(function(d){ d.hidden=true; });
    var btn=document.createElement('button');
    btn.type='button'; btn.className='press-more faq-more';
    btn.textContent=(en?'Show more questions':'질문 더 보기')+' ('+(items.length-LIMIT)+')';
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',function(){ items.forEach(function(d){ d.hidden=false; }); btn.remove(); });
    faq.parentNode.insertBefore(btn,faq.nextSibling);
    // 다른 곳에서 숨겨진 질문으로 이동해 오면 펼침
    try{ if(location.hash&&faq.querySelector(location.hash+'[hidden]')) btn.click(); }catch(e){}
  });
})();

// 회사소개서 미니 팝업: 메인 페이지를 열 때마다 잠시 뒤 오른쪽 아래에 작게 띄움
(function(){
  var sec=document.getElementById('profile'); if(!sec) return;
  var en=document.documentElement.lang==='en';
  var links=sec.querySelectorAll('.prof-btns a'), th=sec.querySelector('.prof-stack .s1');
  if(links.length<2||!th) return;
  var p=document.createElement('aside');
  p.className='prof-pop'; p.setAttribute('aria-label',en?'Company profile':'회사소개서');
  p.innerHTML='<button type="button" class="pp-x" aria-label="'+(en?'Close':'닫기')+'">×</button>'+
    '<a class="pp-th" href="#profile"><img src="'+th.getAttribute('src')+'" alt=""></a>'+
    '<div class="pp-tx"><small>COMPANY PROFILE 2026</small><b>'+(en?'Company profile':'회사소개서')+'</b><span>'+(en?'19 pages · PDF':'19장 · PDF')+'</span>'+
    '<div class="pp-btns"><a href="'+links[0].getAttribute('href')+'" target="_blank" rel="noopener">'+(en?'English':'국문')+'</a>'+
    '<a href="'+links[1].getAttribute('href')+'" target="_blank" rel="noopener">'+(en?'Korean':'영문')+'</a>'+
    (links[2]?'<a href="'+links[2].getAttribute('href')+'" target="_blank" rel="noopener">'+(en?'Hydrogen':'수소전문기업')+'</a>':'')+'</div></div>';
  document.body.appendChild(p);
  function close(){ p.classList.remove('on'); setTimeout(function(){ p.remove(); },400); }
  p.querySelector('.pp-x').addEventListener('click',close);
  p.querySelector('.pp-th').addEventListener('click',function(){ close(); });
  setTimeout(function(){ p.classList.add('on'); },1800);
})();
