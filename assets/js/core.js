/* 공통: 라우터, 테마, 바이트 유틸, 흐름 재생기(FlowPlayer) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = new TextEncoder(), dec = new TextDecoder();
  const toHex = b => Array.from(b, v => v.toString(16).padStart(2, '0')).join('');
  const fromHex = h => Uint8Array.from((h.replace(/[^0-9a-f]/gi, '').match(/../g) || []).map(v => parseInt(v, 16)));
  const toB64 = b => btoa(String.fromCharCode(...b));
  const fromB64 = s => Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0));
  const rand = n => crypto.getRandomValues(new Uint8Array(n));
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem('piedu:' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('piedu:' + k, v); } catch (e) { /* 저장소 사용 불가 */ } }
  };

  /** 바이트 → hexdump HTML. spans: [{from,to,cls}] */
  function hexdump(bytes, spans = [], width = 16) {
    const cls = i => { for (const s of spans) if (i >= s.from && i < s.to) return s.cls; return ''; };
    let html = '';
    for (let o = 0; o < bytes.length; o += width) {
      let hx = '', asc = '';
      for (let i = o; i < o + width; i++) {
        if (i < bytes.length) {
          const c = cls(i), v = bytes[i], ch = v >= 32 && v < 127 ? String.fromCharCode(v) : '·';
          hx += `<span class="${c}">${v.toString(16).padStart(2, '0')}</span> `;
          asc += `<span class="${c}">${esc(ch)}</span>`;
        } else hx += '   ';
      }
      html += `<div class="ln"><span class="off">${o.toString(16).padStart(4, '0')}</span><span>${hx}</span><span>${asc}</span></div>`;
    }
    return `<div class="hexdump">${html || '<span class="b-mut">(비어 있음)</span>'}</div>`;
  }

  /* ---------------- 흐름 재생기 ---------------- */
  /**
   * new FlowPlayer(el, { nodes:[{id,label,sub,x,y,w,h,zone}], zones:[{label,x,y,w,h}], steps:[{from,to,pkt,state,title,html,fields,inspectorTitle,law,danger,blocked,extra}], W,H, title, toolbar })
   */
  class FlowPlayer {
    constructor(el, cfg) {
      this.el = el; this.cfg = cfg; this.i = 0; this.timer = null; this.anim = null;
      el.classList.add('flow');
      el.innerHTML = `
        <div class="flow-top"><div class="row" style="gap:10px"><b style="font-size:14px">${esc(cfg.title || '')}</b></div><div class="flow-tools row"></div></div>
        <div class="flow-body">
          <div class="flow-stage"></div>
          <div class="flow-side"><div class="eyebrow step-law"></div><h3 class="step-title"></h3><div class="narr"></div><div class="inspector-slot"></div></div>
        </div>
        <div class="flow-ctrl">
          <button class="btn" data-a="prev" aria-label="이전 단계">◀ 이전</button>
          <button class="btn primary" data-a="next" aria-label="다음 단계">다음 ▶</button>
          <button class="btn" data-a="play" aria-label="자동 재생">자동 재생</button>
          <div class="steps-dots"></div>
          <span class="count"></span>
        </div>`;
      if (cfg.toolbar) $('.flow-tools', el).append(cfg.toolbar);
      el.addEventListener('click', e => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'prev') this.go(this.i - 1);
        if (a.dataset.a === 'next') this.go(this.i + 1);
        if (a.dataset.a === 'play') this.toggle(a);
        if (a.dataset.a === 'dot') this.go(+a.dataset.i);
      });
      this.load(cfg.steps);
    }
    load(steps) {
      this.stop(); this.cfg.steps = steps; this.i = 0; this.draw(); this.go(0, true);
    }
    draw() {
      const { nodes, zones = [], W = 720, H = 300 } = this.cfg;
      const edges = new Set();
      this.cfg.steps.forEach(s => { if (s.from && s.to && s.from !== s.to) edges.add([s.from, s.to].sort().join('|')); });
      const N = Object.fromEntries(nodes.map(n => [n.id, n]));
      const c = n => [n.x + (n.w || 120) / 2, n.y + (n.h || 54) / 2];
      let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(this.cfg.title || '흐름도')}">`;
      zones.forEach(z => { svg += `<g class="node zone"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="12"/></g><text class="zone-label" x="${z.x + 10}" y="${z.y + 16}">${esc(z.label)}</text>`; });
      edges.forEach(k => { const [a, b] = k.split('|'); if (!N[a] || !N[b]) return; const [x1, y1] = c(N[a]), [x2, y2] = c(N[b]); svg += `<line class="edge" data-e="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; });
      nodes.forEach(n => {
        const w = n.w || 120, h = n.h || 54;
        svg += `<g class="node" data-n="${n.id}"><rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="10"/>` +
          `<text x="${n.x + w / 2}" y="${n.y + (n.sub ? h / 2 - 3 : h / 2 + 5)}" text-anchor="middle">${esc(n.label)}</text>` +
          (n.sub ? `<text class="sub" x="${n.x + w / 2}" y="${n.y + h / 2 + 14}" text-anchor="middle">${esc(n.sub)}</text>` : '') + `</g>`;
      });
      svg += `<g class="pkt" opacity="0"><g class="pony-run" transform="translate(0,-26)"><g class="p-figure"><line class="p-arm a" x1="2" y1="-4" x2="9" y2="2"/><line class="p-leg a" x1="-1" y1="4" x2="-7" y2="12"/><path class="p-body" d="M-5,-10 q6,-3 11,2 q2,8 -2,14 l-9,-1 q-4,-8 0,-15 Z"/><line class="p-leg b" x1="2" y1="5" x2="9" y2="12"/><line class="p-arm b" x1="0" y1="-5" x2="-7" y2="-1"/><circle class="p-head" cx="4" cy="-14" r="6"/><path class="p-hair" d="M-1,-16 q2,-7 9,-5 q4,2 3,6 q-2,-4 -7,-4 q-4,0 -5,3 Z"/></g></g><rect x="-46" y="-6" width="92" height="20" rx="6"/><text x="0" y="8" text-anchor="middle"></text></g></svg>`;
      $('.flow-stage', this.el).innerHTML = svg;
      this.N = N; this.center = c;
      $('.steps-dots', this.el).innerHTML = this.cfg.steps.map((s, i) => `<button data-a="dot" data-i="${i}" aria-label="${i + 1}단계: ${esc(s.title)}"></button>`).join('');
    }
    go(i, instant) {
      const steps = this.cfg.steps; if (i < 0 || i >= steps.length) { this.stop(); return; }
      this.i = i; const s = steps[i], el = this.el;
      $$('.node', el).forEach(g => g.classList.remove('active', 'danger'));
      [s.from, s.to].forEach(id => { const g = $(`.node[data-n="${id}"]`, el); if (g) g.classList.add(s.danger ? 'danger' : 'active'); });
      $$('.edge', el).forEach(e => e.classList.remove('live', 'blocked'));
      if (s.from && s.to) { const e = $(`.edge[data-e="${[s.from, s.to].sort().join('|')}"]`, el); if (e) e.classList.add(s.blocked ? 'blocked' : 'live'); }
      $('.step-law', el).innerHTML = (s.law || []).map(l => `<span class="chip law">${esc(l)}</span>`).join('');
      $('.step-title', el).textContent = `${i + 1}. ${s.title}`;
      $('.narr', el).innerHTML = s.html || '';
      const slot = $('.inspector-slot', el);
      slot.innerHTML = s.fields ? `<div class="inspector"><div class="ih"><span>${esc(s.inspectorTitle || '패킷 내용')}</span><span class="chip ${s.state === 'enc' ? 'enc' : s.state === 'ok' ? 'ok' : 'plain'}">${s.state === 'enc' ? '암호화' : s.state === 'ok' ? '차단/안전' : '평문'}</span></div><dl>${s.fields.map(f => `<dt>${esc(f[0])}</dt><dd class="${f[2] || ''}">${esc(f[1])}</dd>`).join('')}</dl></div>` : '';
      if (s.extra) slot.insertAdjacentHTML('beforeend', s.extra);
      $$('.steps-dots button', el).forEach((b, k) => k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'));
      $('.count', el).textContent = `${i + 1} / ${steps.length}`;
      $('[data-a="prev"]', el).disabled = i === 0;
      $('[data-a="next"]', el).disabled = i === steps.length - 1;
      this.animate(s, instant);
      if (this.cfg.onStep) this.cfg.onStep(s, i);
    }
    animate(s, instant) {
      const g = $('.pkt', this.el); cancelAnimationFrame(this.anim);
      if (!s.pkt) { g.setAttribute('opacity', 0); return; }
      g.setAttribute('class', 'pkt ' + (s.state || 'plain'));
      $('text', g).textContent = s.pkt;
      const w = Math.max(60, s.pkt.length * 7.4 + 18); const r = $('rect', g); r.setAttribute('x', -w / 2); r.setAttribute('width', w);
      const A = this.N[s.from], B = this.N[s.to || s.from]; if (!A) return;
      const [x1, y1] = this.center(A), [x2, y2] = this.center(B);
      const stopAt = s.blocked ? 0.55 : 1;
      const pr = $('.pony-run', g); if (pr) pr.setAttribute('transform', `translate(0,-26) scale(${x2 < x1 ? -1 : 1},1)`);
      g.setAttribute('opacity', 1);
      if (instant || reduced() || A === B) { const t = A === B ? 0 : stopAt; g.setAttribute('transform', `translate(${x1 + (x2 - x1) * t},${y1 + (y2 - y1) * t - (A === B ? 44 : 30)})`); return; }
      const t0 = performance.now(), D = 900;
      const step = now => {
        let t = Math.min(1, (now - t0) / D); const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; const p = e * stopAt;
        g.setAttribute('transform', `translate(${x1 + (x2 - x1) * p},${y1 + (y2 - y1) * p - 30})`);
        if (t < 1) this.anim = requestAnimationFrame(step);
      };
      this.anim = requestAnimationFrame(step);
    }
    toggle(btn) { if (this.timer) this.stop(); else { if (this.i >= this.cfg.steps.length - 1) this.go(0); btn.textContent = '정지'; this.timer = setInterval(() => { if (this.i >= this.cfg.steps.length - 1) this.stop(); else this.go(this.i + 1); }, 3200); } }
    stop() { clearInterval(this.timer); this.timer = null; const b = $('[data-a="play"]', this.el); if (b) b.textContent = '자동 재생'; }
  }

  /** 취약/안전 토글 세그먼트 */
  function vulnToggle(onChange, init = 'vuln', labels = ['취약한 구현', '안전한 구현']) {
    const d = document.createElement('div'); d.className = 'seg vuln'; d.setAttribute('role', 'group');
    d.innerHTML = `<button type="button" data-v="vuln">${labels[0]}</button><button type="button" data-v="safe">${labels[1]}</button>`;
    const set = v => { $$('button', d).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); onChange(v); };
    d.addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(b.dataset.v); });
    setTimeout(() => set(init));
    return d;
  }
  function seg(options, onChange, init) {
    const d = document.createElement('div'); d.className = 'seg'; d.setAttribute('role', 'group');
    d.innerHTML = options.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join('');
    const set = v => { $$('button', d).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); onChange(v); };
    d.addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(b.dataset.v); });
    setTimeout(() => set(init || options[0][0]));
    return d;
  }

  /* ---------------- 라우터 ---------------- */
  const inits = {}; const done = new Set();
  function onLesson(id, fn) { (inits[id] = inits[id] || []).push(fn); }
  function route() {
    const lessons = $$('.lesson');
    let id = (location.hash || '#home').slice(1);
    if (!lessons.some(l => l.id === id)) id = 'home';
    lessons.forEach(l => l.hidden = l.id !== id);
    $$('.rail nav a').forEach(a => a.getAttribute('href') === '#' + id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    document.body.classList.remove('nav-open');
    const sec = document.getElementById(id);
    if (!done.has(id) && inits[id]) { done.add(id); inits[id].forEach(fn => { try { fn(sec); } catch (e) { console.error(e); } }); }
    const t = sec.querySelector('h1'); document.title = (id === 'home' ? '' : (t ? t.textContent + ' · ' : '')) + '개인정보 보호 실험실';
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    window.dispatchEvent(new CustomEvent('lessonroute', { detail: { id } }));
  }
  function buildPager() {
    const links = $$('.rail nav a');
    links.forEach((a, k) => {
      const sec = document.getElementById(a.getAttribute('href').slice(1)); if (!sec) return;
      const prev = links[k - 1], next = links[k + 1];
      const p = document.createElement('nav'); p.className = 'pager'; p.setAttribute('aria-label', '레슨 이동');
      p.innerHTML = (prev ? `<a href="${prev.getAttribute('href')}"><small>← 이전</small>${esc(prev.firstChild.textContent.trim())}</a>` : '<span></span>') +
        (next ? `<a href="${next.getAttribute('href')}" style="text-align:right"><small>다음 →</small>${esc(next.firstChild.textContent.trim())}</a>` : '<span></span>');
      sec.append(p);
    });
  }

  /* ---------------- 테마 ---------------- */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    $$('.theme-row button').forEach(b => b.setAttribute('aria-pressed', b.dataset.theme === (t || 'system')));
    store.set('theme', t || 'system');
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildPager();
    applyTheme(store.get('theme') || 'system');
    $$('.theme-row button').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme)));
    const menu = $('#menuBtn'); if (menu) menu.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    const scrim = $('.scrim'); if (scrim) scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
    window.addEventListener('hashchange', route);
    route();
  });

  window.PI = { $, $$, esc, enc, dec, toHex, fromHex, toB64, fromB64, rand, hexdump, FlowPlayer, vulnToggle, seg, onLesson, store, reduced };
})();
