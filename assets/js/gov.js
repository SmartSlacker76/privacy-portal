/* 공공 누리집 공통 뼈대 — 본문 바로가기 · 상단 띠 · 헤더/GNB · 빵부스러기 · 푸터
 * 각 페이지는 본문만 유지하고, 이 스크립트가 공통 영역을 붙입니다. */
(function () {
  var NAV = [
    { h:'index.html',       t:'홈',            g:'' },
    { h:'pia-guide.html',   t:'영향평가 길라잡이', g:'학습' },
    { h:'learn.html',       t:'학습 둘러보기',      g:'학습' },
    { h:'ctf.html',         t:'게임으로 배우는 정보보호', g:'학습' },
    { h:'security-ox.html', t:'OX퀴즈로 풀며 배우는 정보보안', g:'학습' },
    { h:'policy.html',      t:'처리방침 진단',   g:'점검·도구' },
    { h:'consent.html',     t:'동의서 생성',     g:'점검·도구' },
    { h:'law-search.html',  t:'법령 검색',      g:'점검·도구' },
    { h:'chatbot.html',     t:'뭐든 물어봅써',   g:'점검·도구' },
    { h:'cyber-guide.html', t:'사이버 보안 길라잡이', g:'보안' },
    { h:'n2sf-guide.html',  t:'N2SF',         g:'보안' },
    { h:'port-lookup.html', t:'패킷의 여행',       g:'보안' },
    { h:'grow.html',        t:'나의 성장',      g:'보안' }
  ];
  /* 분야별 드롭다운: 큰 범주를 먼저 보여주고 관련 자료를 단계적으로 탐색합니다. */
  var NAV_GROUPS = [
    {title:'개인정보 보호',items:['learn.html','pia-guide.html','policy.html','consent.html']},
    {title:'사이버보안',items:['cyber-guide.html','n2sf-guide.html','port-lookup.html']},
    {title:'교육·실습',items:['ctf.html','security-ox.html','grow.html']},
    {title:'자료·도구',items:['law-search.html','chatbot.html']}
  ];
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase() || 'index.html';
  var cur = NAV.filter(function (n) { return n.h === here; })[0];
  /* 홈페이지/분야별 화면에 동일한 프레임워크 디자인을 가장 마지막에 적용합니다. */
  if (!document.querySelector('link[data-framework-theme]')) {
    var frameworkStyle=document.createElement('link');
    frameworkStyle.rel='stylesheet';
    frameworkStyle.href='assets/css/framework-2026.css?v=20261119-2';
    frameworkStyle.setAttribute('data-framework-theme','2026');
    document.head.appendChild(frameworkStyle);
  }
  if (!document.querySelector('link[data-gradient-editorial]')) {
    var editorialStyle=document.createElement('link');
    editorialStyle.rel='stylesheet';
    editorialStyle.href='assets/css/gradient-editorial.css?v=20261119-anthropic-2';
    editorialStyle.setAttribute('data-gradient-editorial','2026');
    document.head.appendChild(editorialStyle);
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* 본문 바로가기 */
  var skip = el('a', 'g-skip', '본문 바로가기');
  skip.href = '#g-main';

  /* 상단 안내 띠 — 공공기관 사칭이 아니라 '교육·실무 지원용'임을 밝힙니다 */
  var strip = el('div', 'g-strip',
    '<div class="in"><span>🛡 <b>요망진 간세다리와 혼디 지킴이 SECURITY &amp; PRIVACY LEARNING LAB</b> — 개인정보 보호 교육·실무 지원 누리집입니다.</span>' +
    '<span class="sep">|</span><span>공식 행정 서비스가 아니며, 법령 해석은 소관 기관의 확인이 필요합니다.</span></div>');

  /* 헤더 */
  var head = el('header', 'g-head');
  var gnb = '<a class="g-menu-home" href="index.html"' + (here === 'index.html' ? ' aria-current="page"' : '') + '>홈</a>' +
    NAV_GROUPS.map(function(g,i){
      var active=g.items.indexOf(here)>=0;
      return '<details class="g-nav-group"' + (active ? ' data-active="true"' : '') + '>' +
        '<summary>' + g.title + '<span class="g-nav-chevron" aria-hidden="true">⌄</span></summary>' +
        '<div class="g-nav-panel"><p class="g-nav-title">'+g.title+' <span>바로가기</span></p>' +
        g.items.map(function(h){return '<a href="'+h+'"' + (h === here?' aria-current="page"':'') + '>'+n_t(h)+'<span aria-hidden="true">↗</span></a>';}).join('')+'</div></details>';
    }).join('')+
    '<a class="g-menu-chat" href="chatbot.html"' + (here === 'chatbot.html'?' aria-current="page"':'') + '>AI·실무 도우미</a>';
  function n_h(h) { return h; }
  function n_t(h) { var f = NAV.filter(function (n) { return n.h === h; })[0]; return f ? f.t : h; }
  head.innerHTML =
    '<div class="in">' +
      '<a class="g-brand" href="index.html" title="홈으로 이동" aria-label="홈으로 이동 — 요망진 간세다리와 혼디 지킴이"><span class="em g-mascot" aria-hidden="true"><img src="assets/security-ox/ganse-security.webp" alt="" width="58" height="58" decoding="async"></span>' +
      '<span class="tx"><b class="g-brand-ko"><span>요망진 간세다리와</span><span>혼디 지킴이</span></b><span>SECURITY &amp; PRIVACY <strong>LEARNING LAB</strong></span></span><span class="g-home-pill" aria-hidden="true">⌂ 홈</span></a>' +
      '<button class="g-burger" type="button" id="gBurger" aria-expanded="false" aria-label="전체 메뉴 열기">☰</button>' +
      '<nav class="g-gnb" id="gGnb" aria-label="주요 메뉴">' + gnb + '</nav>' +
      '<div class="g-tools"><div class="g-tt" role="group" aria-label="화면 테마">' +
        '<button type="button" data-theme="system">시스템</button>' +
        '<button type="button" data-theme="light">밝게</button>' +
        '<button type="button" data-theme="dark">어둡게</button>' +
      '</div><button class="g-palette-switch" id="gPaletteSwitch" type="button" title="네이비·샌드 / 내추럴 테마 전환" aria-label="배색 전환">◈ <span>배색</span></button></div>' +
    '</div>';

  /* 빵부스러기 */
  var crumb = null;
  if (here !== 'index.html') {
    crumb = el('nav', 'g-crumb');
    crumb.setAttribute('aria-label', '현재 위치');
    crumb.innerHTML = '<a href="index.html">홈</a><span>›</span>' +
      (cur && cur.g ? '<span style="opacity:1;margin:0">' + cur.g + '</span><span>›</span>' : '') +
      '<b>' + (cur ? cur.t : document.title.split('·')[0].trim()) + '</b>';
  }

  /* 푸터 */
  var foot = el('footer', 'g-foot',
    '<div class="in">' +
      '<div class="links">' + NAV.slice(1).map(function (n) {
        return '<a href="' + n.h + '">' + n.t + '</a>';
      }).join('') + '</div>' +
      '<div class="cols">' +
        '<div><h3>요망진 간세다리와 혼디 지킴이 · SECURITY &amp; PRIVACY LEARNING LAB</h3>' +
          '<p>“마음 놓앙 간세부립서, 정보보호는 혼디 지켜드리쿠다.”<br>' +
          '개인정보 보호 담당자의 실무를 돕기 위한 교육·점검 도구 모음입니다. 모든 점검과 생성은 이용자의 <b>브라우저 안에서만</b> 이뤄지며 입력 내용은 서버에 저장되지 않습니다.</p>' +
          '<p>법령 원문은 국가법령정보센터(law.go.kr) 현행본, 안내서는 개인정보보호위원회·개인정보 포털(privacy.go.kr) 자료를 근거로 합니다.</p></div>' +
        '<div><h3>도움받을 곳</h3>' +
          '<p>개인정보침해 신고센터 ☎ 118 (privacy.kisa.or.kr)<br>' +
          '개인정보 분쟁조정위원회 ☎ 1833-6972 (kopico.go.kr)<br>' +
          '개인정보보호위원회 법령해석 지원센터 ☎ 02-2100-3043</p>' +
          '<p class="note"><b>안내</b> 이 누리집의 진단 결과·생성 문서는 자동 작성된 <b>초안</b>입니다. 공개·시행 전에는 반드시 기관의 개인정보 보호책임자 검토를 거치시기 바랍니다.</p></div>' +
      '</div>' +
    '</div>');

  /* 삽입 */
  var body = document.body;
  body.insertBefore(skip, body.firstChild);
  body.insertBefore(strip, skip.nextSibling);
  body.insertBefore(head, strip.nextSibling);
  if (crumb) body.insertBefore(crumb, head.nextSibling);

  /* 페이지 머리(H1) — 본문에 h1이 없으면 보충합니다 */
  var LEAD = {
    'policy.html': ['개인정보 처리방침 자가 진단',
      '기관명과 처리방침 주소만 넣으면 「개인정보 보호법」(2026.9.11. 시행)과 「개인정보 처리방침 작성지침」(2026.4.) 기준으로 자동 점검하고, 개선 방법·근거 조문, 개선된 처리방침(안), 신구대조표, 계층별(어린이·청소년·어르신) 처리방침, 생성형 AI 서비스 처리방침까지 만들어 드립니다. 보고서는 PDF·한글(HWPX)·워드(DOCX)로 받을 수 있어요.']
  };

  // 본문 앵커
  var main = document.querySelector('.sp-wrap, .pc-wrap, .portal, main');
  if (main) { if (!main.id) main.id = 'g-main'; if (main.tagName !== 'MAIN') main.setAttribute('role', 'main'); }
  else { var anchor = el('div'); anchor.id = 'g-main'; body.insertBefore(anchor, (crumb || head).nextSibling); }

  if (main && !main.querySelector('h1') && LEAD[here]) {
    var ph = el('div', 'g-page-h', '<h1>' + LEAD[here][0] + '</h1><p>' + LEAD[here][1] + '</p>');
    main.insertBefore(ph, main.firstChild);
  }

  body.appendChild(foot);

  /* 메뉴는 키보드·터치·모바일에서 동일하게 펼칠 수 있습니다. */
  var navDetails = head.querySelectorAll('.g-nav-group');
  Array.prototype.forEach.call(navDetails,function(menu){
    menu.addEventListener('toggle',function(){
      if(menu.open) Array.prototype.forEach.call(navDetails,function(other){if(other!==menu)other.open=false;});
    });
  });
  head.addEventListener('keydown',function(ev){
    if(ev.key==='Escape') {
      Array.prototype.forEach.call(navDetails,function(menu){menu.open=false;});
      if(document.activeElement && document.activeElement.blur)document.activeElement.blur();
    }
  });
  document.addEventListener('click',function(ev){
    if(!head.contains(ev.target))Array.prototype.forEach.call(navDetails,function(menu){menu.open=false;});
  });

  /* 동작 */
  var burger = document.getElementById('gBurger');
  if (burger) burger.addEventListener('click', function () {
    var on = body.classList.toggle('g-open');
    burger.setAttribute('aria-expanded', String(on));
    burger.setAttribute('aria-label', on ? '전체 메뉴 닫기' : '전체 메뉴 열기');
  });
  function syncTheme() {
    var p = (window.HondiTheme && window.HondiTheme.get()) || 'system';
    Array.prototype.forEach.call(head.querySelectorAll('.g-tt button'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === p));
    });
  }
  Array.prototype.forEach.call(head.querySelectorAll('.g-tt button'), function (b) {
    b.addEventListener('click', function () {
      if (window.HondiTheme) window.HondiTheme.set(b.dataset.theme);
      syncTheme();
    });
  });
  syncTheme();
  var paletteButton=document.getElementById('gPaletteSwitch');
  function syncPaletteButton(){
    if(!paletteButton)return;
    var p=window.HondiPalette ? window.HondiPalette.get() : 'modern';
    paletteButton.setAttribute('aria-pressed',String(p==='natural'));
    paletteButton.setAttribute('title',p==='natural'?'현재 내추럴 배색 · 네이비 배색으로 전환':'현재 네이비·샌드 배색 · 내추럴 배색으로 전환');
    paletteButton.setAttribute('aria-label',p==='natural'?'배색: 내추럴, 네이비로 변경':'배색: 네이비, 내추럴로 변경');
    paletteButton.querySelector('span').textContent=p==='natural'?'내추럴':'네이비';
  }
  if(paletteButton) paletteButton.addEventListener('click',function(){
    if(window.HondiPalette)window.HondiPalette.set(window.HondiPalette.get()==='natural'?'modern':'natural');
    syncPaletteButton();
  });
  syncPaletteButton();
  (function(){function sync(){var h=document.querySelector('.g-head');if(h)document.documentElement.style.setProperty('--pa-head',Math.round(h.getBoundingClientRect().height)+'px');}addEventListener('load',sync);addEventListener('resize',sync);setTimeout(sync,0);})();
})();