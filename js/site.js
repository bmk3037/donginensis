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
  // data-narr가 있으면 켤 때 영상을 처음으로 돌리고 나레이션을 한 번 읽음(그동안 배경음은 낮춤)
  // data-sync="0"이면 영상 길이와 배경음 반복 길이가 달라 위치 보정을 하지 않음
  var sb=document.getElementById('sndBtn'), bgm=document.getElementById('heroBgm');
  if(sb&&bgm){
    var VOL=0.45, DUCK=0.16, LOOP=10, SYNC=bgm.dataset.sync!=='0', NARR=bgm.dataset.narr, AC=window.AudioContext||window.webkitAudioContext;
    var ctx=null, gain=null, buf=null, src=null, t0=0, off0=0, on=false, bufP=null, lastVT=0;
    var nbuf=null, nsrc=null, nP=null;
    var setUI=function(state){var tx=sb.querySelector('.snd-tx');sb.setAttribute('aria-pressed',state?'true':'false');sb.setAttribute('aria-label',state?sb.dataset.labelOff:sb.dataset.labelOn);tx.textContent=state?sb.dataset.off:sb.dataset.on;};
    var loadBuf=function(){if(!bufP&&AC&&window.fetch){bufP=fetch(bgm.getAttribute('src')).then(function(r){return r.arrayBuffer();});}return bufP;};
    var loadNarr=function(){if(!nP&&NARR&&AC&&window.fetch){nP=fetch(NARR).then(function(r){return r.arrayBuffer();});}return nP;};
    // 페이지가 다 뜬 뒤 작은 음원(배경음 약 160KB, 나레이션 약 170KB)을 미리 받아 둠
    window.addEventListener('load',function(){setTimeout(function(){loadBuf();loadNarr();},1500);});
    var vpos=function(){return v&&v.currentTime?v.currentTime%LOOP:0;};
    var startSrc=function(pos){
      if(src){try{src.stop();}catch(e){}}
      src=ctx.createBufferSource();src.buffer=buf;src.loop=true;src.loopStart=0;src.loopEnd=Math.min(LOOP,buf.duration);
      src.connect(gain);t0=ctx.currentTime;off0=pos;src.start(0,pos);
    };
    var apos=function(){return (off0+ctx.currentTime-t0)%LOOP;};
    var fadeTo=function(to,sec){var n=ctx.currentTime;gain.gain.cancelScheduledValues(n);gain.gain.setValueAtTime(gain.gain.value,n);gain.gain.linearRampToValueAtTime(to,n+sec);};
    var decode=function(ab){return new Promise(function(res,rej){ctx.decodeAudioData(ab,res,rej);});};
    var stopNarr=function(){if(nsrc){try{nsrc.stop();}catch(e){}nsrc=null;}};
    var playNarr=function(){
      // 영상을 처음으로 돌리고 나레이션을 한 번 읽음, 읽는 동안 배경음을 낮췄다가 끝나면 되돌림
      stopNarr();
      if(v){v.currentTime=0;lastVT=0;var p=v.play();if(p&&p.catch)p.catch(function(){});}
      startSrc(0);
      nsrc=ctx.createBufferSource();nsrc.buffer=nbuf;nsrc.connect(ctx.destination);
      var n=ctx.currentTime;gain.gain.cancelScheduledValues(n);gain.gain.setValueAtTime(0,n);
      gain.gain.linearRampToValueAtTime(DUCK,n+0.6);
      gain.gain.setValueAtTime(DUCK,n+nbuf.duration);gain.gain.linearRampToValueAtTime(VOL,n+nbuf.duration+1.2);
      nsrc.start(n);
    };
    var turnOn=function(){
      if(!AC){bgm.volume=VOL;var p=bgm.play();if(p&&p.catch)p.catch(function(){});return;}
      if(!ctx){ctx=new AC();gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);}
      if(ctx.state==='suspended')ctx.resume();
      var go=function(){if(!on)return;if(nbuf){playNarr();return;}startSrc(vpos());fadeTo(VOL,1.2);};
      var fail=function(){var p=bgm.play();if(p&&p.catch)p.catch(function(){});};
      var getBuf=buf?Promise.resolve(buf):loadBuf().then(decode).then(function(b){buf=b;return b;});
      var getNarr=(!NARR||nbuf)?Promise.resolve(nbuf):loadNarr().then(decode).then(function(b){nbuf=b;return b;}).catch(function(){return null;});
      getBuf.then(function(){return getNarr;}).then(go).catch(fail);
    };
    var turnOff=function(){
      if(!ctx){bgm.pause();return;}
      stopNarr();fadeTo(0,0.6);setTimeout(function(){if(!on&&ctx.state==='running')ctx.suspend();},700);
    };
    sb.addEventListener('click',function(){on=!on;setUI(on);if(on)turnOn();else turnOff();});
    // 영상이 처음으로 돌아갈 때만 박자 확인, 0.2초 이상 어긋났으면 살짝 줄였다가 다시 맞춤
    if(v)v.addEventListener('timeupdate',function(){
      var t=v.currentTime, wrapped=t<lastVT-1; lastVT=t;
      if(!SYNC||!wrapped||!on||!src||!ctx||ctx.state!=='running')return;
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
    var openedAt=Date.now(); // 스팸 차단: 폼이 열린 시각

    f.addEventListener('submit',function(ev){
      ev.preventDefault();
      var err=f.querySelector('.iq-msg.err'); if(err) err.remove();
      if(f.querySelector('[name=website]').value){ return; } // 스팸 차단(자동 입력 봇)
      if(!f.checkValidity()){ f.reportValidity(); return; }
      // 스팸 차단: 너무 빠른 제출(자동 입력)과 짧은 시간 반복 제출은 보내지 않음
      var elapsed=Date.now()-openedAt, last=0; try{ last=+localStorage.getItem('iqLastSent')||0; }catch(e){}
      if(elapsed<3000||Date.now()-last<60000){ f.style.display='none'; var ok0=f.parentNode.querySelector('.iq-msg.ok'); if(ok0) ok0.style.display='block'; return; }

      var fd=new FormData(f), data=new URLSearchParams();
      var multi={};
      fd.forEach(function(val,key){ if(multi[key]!==undefined){multi[key]+=', '+val;} else {multi[key]=val;} });
      Object.keys(multi).forEach(function(k){data.append(k,multi[k]);});
      data.append('page',location.pathname);
      data.append('submitted_at',new Date().toISOString());
      data.append('elapsed_ms',String(elapsed));

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
      fetch(FORM_ENDPOINT,{method:'POST',mode:'no-cors',body:data}).then(function(){ try{ localStorage.setItem('iqLastSent',String(Date.now())); }catch(e){} done(); }).catch(fail);
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
  // 자료실: 분류(폴더)만 보이고, 누르면 해당 자료 목록이 열림. 검색하면 맞는 폴더가 자동으로 열림
  var board=document.getElementById('docBoard');
  if(!board) return;
  var panels=[].slice.call(board.querySelectorAll('section.rpanel'));
  var q=document.getElementById('dq'), cnt=document.getElementById('dcount'), empty=document.getElementById('dempty');
  var en=document.documentElement.lang==='en', lock=board.querySelector('.rlock');
  function setOpen(p,open){ p.querySelector('.rp-b').hidden=!open; p.querySelector('.rp-h').setAttribute('aria-expanded',open); p.classList.toggle('open',open); }
  panels.forEach(function(p){ p.querySelector('.rp-h').addEventListener('click',function(){ var o=!p.classList.contains('open'); p.dataset.user=o?'1':''; setOpen(p,o); }); });
  function apply(){
    var kw=(q.value||'').trim().toLowerCase(), total=0;
    panels.forEach(function(p){
      var n=0;
      [].forEach.call(p.querySelectorAll('.rrow'),function(r){ var ok=!kw||r.textContent.toLowerCase().indexOf(kw)>-1; r.hidden=!ok; if(ok) n++; });
      p.querySelector('.rp-n').textContent=n; p.hidden=n===0; total+=n;
      setOpen(p, kw ? n>0 : p.dataset.user==='1');
    });
    if(lock) lock.hidden=!!kw;
    cnt.textContent=en?(total+' document'+(total===1?'':'s')):('총 '+total+'건');
    if(empty) empty.hidden=total>0;
  }
  q.addEventListener('input',apply);
  apply();
  // resources.html#cert 처럼 주소 끝 분류는 그 폴더를 열고 이동 (랜딩 바로가기용)
  var hs=(location.hash||'').slice(1); if(hs==='smartfactory'||hs==='datavoucher') hs='supplier';
  var p0=document.getElementById('cat-'+hs);
  if(p0){ p0.dataset.user='1'; setOpen(p0,true); setTimeout(function(){ p0.scrollIntoView({behavior:'smooth',block:'start'}); p0.classList.add('hl'); setTimeout(function(){ p0.classList.remove('hl'); },1800); },250); }
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

// 메인 미니 팝업(회사소개서 · 디지털트윈 시연)을 오른쪽 아래에 위아래로 쌓는 자리
function popStack(){
  var st=document.querySelector('.pop-stack');
  if(!st){ st=document.createElement('div'); st.className='pop-stack'; document.body.appendChild(st); }
  return st;
}

// 회사소개서 미니 팝업: 메인 페이지를 열 때마다 잠시 뒤 오른쪽 아래에 작게 띄움
(function(){
  var sec=document.getElementById('profile'); if(!sec) return;
  var en=document.documentElement.lang==='en';
  var links=sec.querySelectorAll('.prof-btns a'), th=sec.querySelector('.prof-stack .s1');
  if(links.length<2||!th) return;
  // 페이지 수는 같은 영역의 숫자 칸(.prof-meta 첫 칸)을 그대로 읽음 → PDF 장수가 바뀌면 index.html 숫자만 고치면 됨
  var pm=sec.querySelector('.prof-meta b'), pn=(pm&&/^\d+$/.test(pm.textContent.trim()))?pm.textContent.trim():'';
  var p=document.createElement('aside');
  p.className='prof-pop'; p.setAttribute('aria-label',en?'Company profile':'회사소개서');
  p.innerHTML='<button type="button" class="pp-x" aria-label="'+(en?'Close':'닫기')+'">×</button>'+
    '<a class="pp-th" href="#profile"><img src="'+th.getAttribute('src')+'" alt=""></a>'+
    '<div class="pp-tx"><small>COMPANY PROFILE 2026</small><b>'+(en?'Company profile':'회사소개서')+'</b><span>'+(pn?(en?pn+' pages · PDF':pn+'장 · PDF'):'PDF')+'</span>'+
    '<div class="pp-btns"><a href="'+links[0].getAttribute('href')+'" target="_blank" rel="noopener">'+(en?'English':'국문')+'</a>'+
    '<a href="'+links[1].getAttribute('href')+'" target="_blank" rel="noopener">'+(en?'Korean':'영문')+'</a>'+
    (links[2]?'<a href="'+links[2].getAttribute('href')+'" target="_blank" rel="noopener">'+(en?'Hydrogen':'수소전문기업')+'</a>':'')+'</div></div>';
  popStack().appendChild(p);
  function close(){ p.classList.remove('on'); setTimeout(function(){ p.remove(); },400); }
  p.querySelector('.pp-x').addEventListener('click',close);
  p.querySelector('.pp-th').addEventListener('click',function(){ close(); });
  setTimeout(function(){ p.classList.add('on'); },1800);
})();

// 디지털트윈 시연 미니 팝업: 회사소개서 팝업 위에 같은 모양으로 (메인의 「디지털트윈 시연 보기」 버튼에서 주소·그림을 읽음)
(function(){
  var a=document.querySelector('a[data-pop-thumb]'); if(!a) return;
  var en=document.documentElement.lang==='en';
  var p=document.createElement('aside');
  p.className='prof-pop'; p.setAttribute('aria-label',en?'Digital twin demo':'디지털트윈 시연');
  p.innerHTML='<button type="button" class="pp-x" aria-label="'+(en?'Close':'닫기')+'">×</button>'+
    '<a class="pp-th" href="'+a.getAttribute('href')+'"><img src="'+a.getAttribute('data-pop-thumb')+'" alt=""></a>'+
    '<div class="pp-tx"><small>DIGITAL TWIN DEMO</small><b>'+(en?'Digital twin demo':'디지털트윈 시연')+'</b><span>'+(en?'3D control panel · simulated data':'3D 지능형제어반 · 모의 데이터')+'</span>'+
    '<div class="pp-btns"><a href="'+a.getAttribute('href')+'">'+(en?'Open 3D view':'3D로 보기')+'</a></div></div>';
  popStack().insertBefore(p,popStack().firstChild);
  function close(){ p.classList.remove('on'); setTimeout(function(){ p.remove(); },400); }
  p.querySelector('.pp-x').addEventListener('click',close);
  setTimeout(function(){ p.classList.add('on'); },2400);
})();

// 메인 첫 화면: 데이터가 흐르는 빛줄기(캔버스) · 마우스 시차 · 지표 숫자 세기
(function(){
  var hero=document.querySelector('.hero'), fx=document.querySelector('.hero-fx');
  if(!hero||!fx||!fx.getContext) return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // 지표 첫 숫자(35) 세기
  var b=hero.querySelector('.note b'), m=b&&b.textContent.match(/^(\d+)(.*)$/);
  if(m){var N=+m[1], rest=m[2]; b.textContent='0'+rest; setTimeout(function(){var s=performance.now();(function st(n){var u=Math.min(1,(n-s)/1300);b.textContent=Math.round(N*(1-Math.pow(1-u,4)))+rest;if(u<1)requestAnimationFrame(st);})(s);},1700);}
  var g=fx.getContext('2d'), W=0, H=0, paths=[], pk=[], vis=true, start=performance.now(), last=0;
  function size(){var d=Math.min(2,window.devicePixelRatio||1);W=fx.clientWidth;H=fx.clientHeight;fx.width=W*d;fx.height=H*d;g.setTransform(d,0,0,d,0,0);
    paths=[];var n=W<768?4:7;for(var i=0;i<n;i++){var y0=H*(.18+.66*i/(n-1))+(Math.random()-.5)*H*.08,y1=H*(.12+.76*Math.random());
      paths.push([-60,y0,W*.35,y0+(Math.random()-.5)*H*.35,W*.68,y1+(Math.random()-.5)*H*.35,W+60,y1]);}}
  function at(p,s){var u=1-s,a=u*u*u,b2=3*u*u*s,c=3*u*s*s,e=s*s*s;return[a*p[0]+b2*p[2]+c*p[4]+e*p[6],a*p[1]+b2*p[3]+c*p[5]+e*p[7]];}
  function fade(x){var r=(x/W-.38)/.3;r=r<0?0:r>1?1:r*r*(3-2*r);return W<768?r*.45:r;}   // 휴대폰은 글자가 넓어 더 흐리게   // 글자 쪽(왼쪽)은 흐리게
  function frame(now){
    if(!vis){last=0;return;}
    var dt=last?Math.min(.05,(now-last)/1000):0; last=now; var k=Math.min(1,(now-start-1200)/1800); if(k<0)k=0;
    g.clearRect(0,0,W,H); g.globalCompositeOperation='lighter';
    paths.forEach(function(p){g.beginPath();for(var s=0;s<=1.0001;s+=.04){var q=at(p,s);s?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);}g.strokeStyle='rgba(120,180,255,'+(.11*k*fade(W*.75))+')';g.lineWidth=1;g.stroke();});
    if(k>0&&Math.random()<dt*(W<768?5:11)) pk.push({p:paths[Math.random()*paths.length|0],s:0,v:.12+Math.random()*.16,len:.05+Math.random()*.05});
    pk=pk.filter(function(o){o.s+=o.v*dt;return o.s-o.len<1;});
    pk.forEach(function(o){
      for(var j=0;j<10;j++){var s=o.s-o.len*j/10;if(s<0||s>1)continue;var q=at(o.p,s),a=(1-j/10)*k*fade(q[0]);if(a<=0)continue;
        g.beginPath();g.arc(q[0],q[1],j?1.6:2.6,0,6.283);g.fillStyle='rgba(160,215,255,'+a+')';g.fill();}
      var h=at(o.p,Math.min(1,o.s)),ha=.55*k*fade(h[0]);if(ha>0){var gr=g.createRadialGradient(h[0],h[1],0,h[0],h[1],22);gr.addColorStop(0,'rgba(120,190,255,'+ha+')');gr.addColorStop(1,'rgba(120,190,255,0)');g.fillStyle=gr;g.fillRect(h[0]-22,h[1]-22,44,44);}
    });
    g.globalCompositeOperation='source-over'; requestAnimationFrame(frame);
  }
  size(); window.addEventListener('resize',size);
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){var was=vis;vis=es[0].isIntersecting&&!document.hidden;if(vis&&!was)requestAnimationFrame(frame);}).observe(hero);
  document.addEventListener('visibilitychange',function(){var was=vis;vis=!document.hidden;if(vis&&!was)requestAnimationFrame(frame);});
  requestAnimationFrame(frame);
  // 마우스를 움직이면 글자와 빛줄기가 살짝 반대로 움직임(데스크톱)
  if(window.matchMedia&&matchMedia('(pointer: fine)').matches){
    var wrap=hero.querySelector('.wrap'), tx=0, ty=0, cx=0, cy=0, on=false;
    hero.addEventListener('mousemove',function(e){var r=hero.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;if(!on){on=true;requestAnimationFrame(mv);}});
    function mv(){cx+=(tx-cx)*.08;cy+=(ty-cy)*.08;wrap.style.transform='translate3d('+(-cx*10).toFixed(2)+'px,'+(-cy*6).toFixed(2)+'px,0)';fx.style.transform='translate3d('+(cx*18).toFixed(2)+'px,'+(cy*12).toFixed(2)+'px,0)';
      if(Math.abs(tx-cx)+Math.abs(ty-cy)>.001)requestAnimationFrame(mv);else on=false;}
  }
})();
