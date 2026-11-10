/* 법제처(국가법령정보센터) 연동
   - 근거 법령 표기를 자동으로 클릭 가능한 링크로 바꿉니다.
   - config.js의 WORKER_URL이 설정되면: 클릭 시 Cloudflare Worker를 통해 법제처 Open API(DRF)에서
     해당 조문 본문을 불러와 팝오버로 보여 줍니다. (OC 인증키는 Worker의 Secret에만 보관)
   - WORKER_URL이 비어 있으면(토큰 0 모드): 클릭 시 국가법령정보센터의 현행 조문 페이지를 새 탭으로 엽니다.
   두 경우 모두 항상 '현행(최신)' 법령으로 연결됩니다. */
(function () {
  'use strict';
  const PI = window.PI || {};
  const CFG = window.APP_CONFIG || {};
  const apiBase = () => (CFG.WORKER_URL || '').trim().replace(/\/?$/, m => m ? '/' : '/');
  let apiOn = false;

  // 법령명 해석: 표기 키워드 → {kind:'법령'|'행정규칙', name, full}
  function resolve(kw) {
    const k = kw.replace(/\s+/g, '');
    if (/전자정부법/.test(k)) return { kind: '법령', name: '전자정부법', full: true };
    if (/개인정보보호법시행령/.test(k)) return { kind: '법령', name: '개인정보 보호법 시행령', full: true };
    if (/개인정보보호법/.test(k)) return { kind: '법령', name: '개인정보 보호법', full: true };
    if (/표준개인정보보호지침/.test(k)) return { kind: '행정규칙', name: '표준 개인정보 보호지침', full: true };
    if (/안전성확보조치기준/.test(k)) return { kind: '행정규칙', name: '개인정보의 안전성 확보조치 기준', full: true };
    if (/구축.?운영지침|구축·운영지침/.test(k)) return { kind: '행정규칙', name: '행정기관 및 공공기관 정보시스템 구축·운영 지침', full: true };
    if (k === '시행령' || k === '영') return { kind: '법령', name: '개인정보 보호법 시행령', full: false };
    if (k === '고시') return { kind: '행정규칙', name: '개인정보의 안전성 확보조치 기준', full: false };
    if (k === '법') return { kind: '법령', name: '개인정보 보호법', full: false };
    return null;
  }

  const RX = new RegExp(
    '(전자정부법|개인정보\\s*보호법\\s*시행령|개인정보\\s*보호법|표준\\s*개인정보\\s*보호지침|' +
    '개인정보의\\s*안전성\\s*확보조치\\s*기준|안전성\\s*확보조치\\s*기준|' +
    '행정기관[^,]*?구축[\\s·]*운영\\s*지침|구축[\\s·]*운영\\s*지침|시행령|고시|지침|법|영)' +
    '|제\\s*(\\d+)\\s*조(?:\\s*의\\s*(\\d+))?' +
    '|§\\s*(\\d+)', 'g');

  function deepLink(r, art) {
    let p = '/' + r.kind + '/' + r.name.replace(/\s+/g, '');
    if (art) p += '/제' + art.jo + '조' + (art.br ? '의' + art.br : '');
    return 'https://www.law.go.kr' + encodeURI(p);
  }

  function makeLink(txt, r, art) {
    const a = document.createElement('a');
    a.className = 'lawref';
    a.href = deepLink(r, art);
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = txt;
    a.dataset.kind = r.kind; a.dataset.name = r.name;
    if (art) { a.dataset.jo = art.jo; a.dataset.br = art.br || 0; }
    a.title = r.name + (art ? ' 제' + art.jo + '조' + (art.br ? '의' + art.br : '') : '') + ' — 국가법령정보센터';
    return a;
  }

  function linkifyTextNode(node) {
    const text = node.nodeValue;
    if (!text || !/[제법영고시§]/.test(text)) return;
    RX.lastIndex = 0;
    let m, last = 0, cur = null, made = false;
    const frag = document.createDocumentFragment();
    const addText = s => { if (s) frag.appendChild(document.createTextNode(s)); };
    while ((m = RX.exec(text))) {
      const tok = m[0], start = m.index;
      if (m[1]) {
        const r = resolve(m[1]);
        if (r) { cur = r; if (r.full) { addText(text.slice(last, start)); frag.appendChild(makeLink(tok, r, null)); last = start + tok.length; made = true; } }
      } else {
        const jo = m[2] || m[4];
        if (cur && jo) { addText(text.slice(last, start)); frag.appendChild(makeLink(tok, cur, { jo: +jo, br: m[3] ? +m[3] : 0 })); last = start + tok.length; made = true; }
      }
    }
    if (made) { addText(text.slice(last)); node.parentNode.replaceChild(frag, node); }
  }

  const SEL = '.chip.law, .lv-law, .law-cite';
  function linkifyLaws(root) {
    if (!root) return;
    const hosts = root.matches && root.matches(SEL) ? [root] : [];
    (root.querySelectorAll ? root.querySelectorAll(SEL) : []).forEach(h => hosts.push(h));
    hosts.forEach(h => {
      if (h.dataset.lawDone || h.closest('pre')) return;
      h.dataset.lawDone = '1';
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
      const nodes = []; let n; while ((n = walker.nextNode())) if (!n.parentNode.closest('a, pre, code')) nodes.push(n);
      nodes.forEach(linkifyTextNode);
    });
  }

  // ===== 조문 본문 팝오버 (API 모드) =====
  let pop;
  function closePop() { if (pop) { pop.remove(); pop = null; document.removeEventListener('click', onDoc, true); } }
  function onDoc(e) { if (pop && !pop.contains(e.target) && !e.target.closest('.lawref')) closePop(); }
  function showPop(anchor, state, data) {
    closePop();
    pop = document.createElement('div'); pop.className = 'law-pop';
    const head = data && data.article ? data.article : (anchor.dataset.name + (anchor.dataset.jo ? ' 제' + anchor.dataset.jo + '조' + (+anchor.dataset.br ? '의' + anchor.dataset.br : '') : ''));
    pop.innerHTML = `<div class="law-pop-h"><b>${esc(head)}</b><button type="button" class="law-pop-x" aria-label="닫기">✕</button></div>
      <div class="law-pop-b">${state === 'load' ? '<span class="law-pop-load">법제처에서 조문을 불러오는 중…</span>' : esc(data.content || '').replace(/\n/g, '<br>')}</div>
      <a class="law-pop-src" href="${anchor.href}" target="_blank" rel="noopener">국가법령정보센터에서 원문 전체 보기 →</a>`;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8)) + 'px';
    pop.querySelector('.law-pop-x').addEventListener('click', closePop);
    setTimeout(() => document.addEventListener('click', onDoc, true), 0);
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  document.addEventListener('click', e => {
    const a = e.target.closest('.lawref'); if (!a) return;
    if (!apiOn || !a.dataset.jo || e.metaKey || e.ctrlKey || e.shiftKey) return; // 토큰 0 모드 또는 새 탭 요청 → 기본 동작(링크)
    e.preventDefault();
    showPop(a, 'load');
    const u = apiBase() + 'law?kind=' + encodeURIComponent(a.dataset.kind) + '&name=' + encodeURIComponent(a.dataset.name) + '&jo=' + a.dataset.jo + '&branch=' + (a.dataset.br || 0);
    fetch(u).then(r => r.json()).then(d => {
      if (!pop) return;
      if (d && d.ok && d.content) showPop(a, 'ok', d);
      else { closePop(); window.open(a.href, '_blank', 'noopener'); }
    }).catch(() => { closePop(); window.open(a.href, '_blank', 'noopener'); });
  });

  // ===== 상태 확인 =====
  function health() {
    if (!(CFG.WORKER_URL || '').trim()) return;
    fetch(apiBase() + 'health').then(r => r.json()).then(d => {
      apiOn = !!(d && d.law);
      document.documentElement.dataset.lawApi = apiOn ? 'on' : 'off';
    }).catch(() => { apiOn = false; });
  }

  // 레슨 이동마다 새로 그려진 근거 법령을 링크로 변환
  window.addEventListener('lessonroute', e => {
    const sec = document.getElementById(e.detail && e.detail.id);
    linkifyLaws(sec || document.body);
  });
  PI.linkifyLaws = linkifyLaws;
  window.PI = PI;
  health();
  document.addEventListener('DOMContentLoaded', () => linkifyLaws(document.body));
})();
