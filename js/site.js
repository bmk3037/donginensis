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
