/* 동인엔시스 홈페이지 공통 스크립트 */

/* ▼▼ 문의 데이터 수신 주소 (Google Apps Script 웹 앱 URL) ▼▼
   구글 시트 설정 후 발급받은 주소를 따옴표 안에 붙여넣으세요.
   예: 'https://script.google.com/macros/s/XXXXXXXX/exec' */
var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbygbfBxlWOAlypmRuZYNpAKqsQj_k3d1cXGss7QZKwQzcqh6TbLe-6TOeKVornPand3/exec';
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
  if(v&&v.dataset.srcPc){var vm=window.innerWidth<768;if(vm&&v.dataset.posterM)v.poster=v.dataset.posterM;v.src=vm?v.dataset.srcM:v.dataset.srcPc;var p=v.play();if(p&&p.catch)p.catch(function(){});}

  // 첫 화면 나레이션 (기본 무음): 버튼을 누르면 영상을 처음으로 돌리고 나레이션을 한 번 읽음. 다시 누르면 멈춤
  // 배경음악은 2026.11에 뺐다(반복이 귀에 걸려서). 나레이션이 없는 영문에는 버튼을 두지 않는다
  var sb=document.getElementById('sndBtn'), narr=document.getElementById('heroNarr');
  if(sb&&narr){
    var setUI=function(state){var tx=sb.querySelector('.snd-tx');sb.setAttribute('aria-pressed',state?'true':'false');sb.setAttribute('aria-label',state?sb.dataset.labelOff:sb.dataset.labelOn);tx.textContent=state?sb.dataset.off:sb.dataset.on;};
    var wanted=false;
    var start=function(){
      if(!wanted) return;
      if(v){try{v.currentTime=0;}catch(e){} var p=v.play();if(p&&p.catch)p.catch(function(){});}
      try{narr.currentTime=0;}catch(e){}
      var q=narr.play();if(q&&q.catch)q.catch(function(){wanted=false;setUI(false);});
    };
    // 페이지가 다 뜬 뒤 작은 음원(약 200KB)을 미리 받아 두어, 눌렀을 때 영상과 같이 시작되게 함
    window.addEventListener('load',function(){setTimeout(function(){narr.preload='auto';narr.load();},1500);});
    sb.addEventListener('click',function(){
      if(wanted){wanted=false;narr.pause();setUI(false);return;}
      wanted=true;setUI(true);
      if(narr.readyState>=3) start(); else {narr.addEventListener('canplay',start,{once:true});narr.load();}
    });
    narr.addEventListener('ended',function(){wanted=false;setUI(false);});
  }

  // 문의 폼
  function track(name,params){ try{ if(window.gtag) gtag('event',name,params||{}); }catch(e){} }
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
        track('generate_lead',{form_type:multi.form_type||'',page_path:location.pathname});
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
  var small=window.matchMedia&&matchMedia('(max-width:600px)').matches, en=document.documentElement.lang==='en';
  var grid=document.querySelector('.media-grid'), more=null, openAll=false;
  if(small&&grid){ more=document.createElement('button'); more.type='button'; more.className='press-more';
    more.addEventListener('click',function(){ openAll=true; pick(cur); }); grid.parentNode.insertBefore(more,grid.nextSibling); }
  var cur='';
  function pick(cat){
    if(cat!==cur) openAll=false; cur=cat;
    tabs.forEach(function(t){ var on=t.dataset.cat===cat; t.classList.toggle('on',on); t.setAttribute('aria-selected',on); });
    var n=0, rest=0;
    cards.forEach(function(c){ var show=c.dataset.cat===cat; if(show){ n++; if(small&&!openAll&&n>1){ show=false; rest++; } }
      if(!show){ var v=c.querySelector('video'); if(v&&!v.paused) v.pause(); } c.hidden=!show; if(show) c.classList.add('in'); });
    if(more){ more.hidden=!rest; more.textContent=(en?'More videos':'영상 더 보기')+' ('+rest+')'; }
    if(grid) grid.setAttribute('data-n',n-rest);
  }
  tabs.forEach(function(t){ t.addEventListener('click',function(){ pick(t.dataset.cat); }); });
  pick(tabs[0].dataset.cat);
})();

// 적용 사례 사진: 칸 비율과 다른 사진은 자르지 않고 통째로 보여 줌 (남는 자리는 같은 사진을 흐리게)
(function(){
  [].forEach.call(document.querySelectorAll('.gal button img'),function(img){
    var go=function(){ var b=img.parentNode, r=img.naturalWidth/img.naturalHeight, box=b.clientWidth/b.clientHeight;
      if(r&&box&&Math.abs(r/box-1)>0.06){ b.classList.add('fill'); b.style.backgroundImage='url("'+img.currentSrc.replace(/"/g,'%22')+'")'; } };
    if(img.complete&&img.naturalWidth) go(); else img.addEventListener('load',go,{once:true});
  });
})();

// 메인 주요 실적: 휴대폰에서는 3건만 보이고 나머지는 '더 보기'로 펼침
(function(){
  var box=document.querySelector('.home-refs'), small=window.matchMedia&&matchMedia('(max-width:600px)').matches;
  if(!box||!small) return;
  var rows=[].slice.call(box.querySelectorAll('.ref-tbl tbody tr')), LIMIT=3;
  if(rows.length<=LIMIT) return;
  var en=document.documentElement.lang==='en', wrap=box.querySelector('.tblw');
  rows.slice(LIMIT).forEach(function(r){ r.hidden=true; });
  var btn=document.createElement('button');
  btn.type='button'; btn.className='press-more';
  btn.textContent=(en?'More references':'실적 더 보기')+' ('+(rows.length-LIMIT)+')';
  btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',function(){ rows.forEach(function(r){ r.hidden=false; }); btn.remove(); });
  wrap.parentNode.insertBefore(btn,wrap.nextSibling);
})();

// 보도자료 목록: 최신 5건만 보이고 나머지는 '더 보기'로 펼침 (보도자료 전체 페이지처럼 data-all이 있으면 모두 표시)
(function(){
  var list=document.querySelector('.press-list:not([data-all])');
  if(!list) return;
  var items=[].slice.call(list.children), LIMIT=(window.matchMedia&&matchMedia('(max-width:600px)').matches)?3:5;
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
  // 휴대폰에서는 첫 화면(제목·버튼)을 가리지 않도록, 조금 내려 읽은 뒤에 띄움
  if(window.matchMedia&&matchMedia('(max-width:600px)').matches){
    var shown=false, onS=function(){ if(shown||window.scrollY<700) return; shown=true; p.classList.add('on'); window.removeEventListener('scroll',onS); setTimeout(close,3000); }; // 3초 뒤 저절로 닫힘
    window.addEventListener('scroll',onS,{passive:true});
  } else setTimeout(function(){ p.classList.add('on'); setTimeout(close,3000); },1800); // 뜬 뒤 3초 후 저절로 닫힘
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

// 마케팅 분석: 전화·메일·SNS 클릭과 자료 내려받기를 구글 애널리틱스(GA4) 이벤트로 기록
(function(){
  var SNS=[['youtube.com','youtube'],['instagram.com','instagram'],['threads.com','threads'],['threads.net','threads'],['blog.naver.com','naver_blog'],['map.naver.com','naver_place'],['naver.me','naver_place']];
  function area(a){ var e=a.closest('header,footer,.mnav,.mbar,.ch-grid,form'); return e?(e.className.split(' ')[0]||e.tagName.toLowerCase()):'body'; }
  document.addEventListener('click',function(ev){
    var a=ev.target.closest&&ev.target.closest('a[href]'); if(!a||!window.gtag) return;
    var h=a.getAttribute('href')||'', p={page_path:location.pathname,link_area:area(a)};
    try{
      if(h.indexOf('tel:')===0){ p.phone=h.slice(4); gtag('event','phone_click',p); return; }
      if(h.indexOf('mailto:')===0){ gtag('event','email_click',p); return; }
      for(var i=0;i<SNS.length;i++){ if(h.indexOf(SNS[i][0])>=0){ p.channel=SNS[i][1]; gtag('event','sns_click',p); return; } }
      if(/\.pdf(\?|#|$)/i.test(h)){ p.file_name=h.split('/').pop().split(/[?#]/)[0]; gtag('event','doc_download',p); }
    }catch(e){}
  });
})();

// 휴대폰 아래 고정 띠: 전화 상담 · 문의하기 (모든 페이지 공통, 비공개 자료실 제외)
(function(){
  if(!document.querySelector('footer.ft')||/(members|internal)\.html$/.test(location.pathname)) return;
  var en=document.documentElement.lang==='en';
  var own=document.getElementById('inquiry')||document.getElementById('contact');
  var hd=document.querySelector('#hd .hd-r a.btn');
  var href=own?('#'+own.id):(hd?hd.getAttribute('href'):'index.html#contact');
  var bar=document.createElement('div'); bar.className='mbar'; bar.setAttribute('role','navigation'); bar.setAttribute('aria-label',en?'Quick contact':'빠른 연락');
  bar.innerHTML='<a class="tel" href="tel:'+(en?'+82518623668':'0518623668')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1z"/></svg>'+(en?'Call us':'전화 상담')+'</a>'+
    '<a class="iqb" href="'+href+'">'+(en?'Send inquiry':'문의하기')+'</a>';
  document.body.appendChild(bar); document.body.classList.add('has-mbar');
  // 문의 양식이 화면에 보이는 동안과 휴대폰 메뉴가 열린 동안에는 숨김(입력·보내기 버튼을 가리지 않게)
  var form=own&&own.querySelector('form'), mn=document.getElementById('mnav'), inView=false;
  function sync(){ bar.classList.toggle('off',inView||!!(mn&&mn.classList.contains('open'))); }
  if(form&&'IntersectionObserver' in window){ new IntersectionObserver(function(es){ inView=es[0].isIntersecting; sync(); },{threshold:.15}).observe(form); }
  var mb=document.getElementById('mbtn'); if(mb) mb.addEventListener('click',function(){ setTimeout(sync,0); });
})();

// 문의 양식이 화면에 보이는 동안에는 미니 팝업을 숨김(입력 칸·보내기 버튼을 가리지 않게)
(function(){
  var forms=document.querySelectorAll('form.iq'); if(!forms.length||!('IntersectionObserver' in window)) return;
  var seen=0;
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ seen+=e.isIntersecting?1:-1; }); if(seen<0) seen=0;
    var st=document.querySelector('.pop-stack'); if(st) st.classList.toggle('hide',seen>0);
  },{threshold:.1});
  [].forEach.call(forms,function(f){ io.observe(f); });
})();
