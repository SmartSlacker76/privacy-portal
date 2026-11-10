/* 프라이버시 디펜더 — 공공부문 실무형 CTF 200제 엔진
   데이터: window.CTF200 (assets/data/ctf200.js)
   문항유형(q.kind): select / match / order / finderr / console / form / multi
   저장: 진행·점수만 localStorage (닉네임·답안 미전송) */
(function () {
  'use strict';
  var D = window.CTF200 || { meta: {}, levels: {}, problems: [] };
  var PROBS = D.problems || [];
  var LV = D.levels || {};
  var CHS = (D.meta && D.meta.chapters) || [];
  var KEY = 'ctf200-progress';

  // ---- helpers (self-contained) ----
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function reduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, '').replace(/[.,·]/g, ''); }

  var state = load();
  if (!state.score) state.score = 0;
  if (!state.cleared) state.cleared = {};        // id -> true
  if (!state.nick) state.nick = '';

  var root = $('#cdApp');
  if (!root) return;

  // ====== 사운드(정답/오답) — 선택적, 사용자 제스처 내에서만 ======
  var actx = null, sndOn = true;
  function tone(freqs, dur) {
    if (!sndOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      freqs.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(f, t + i * dur);
        o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, t + i * dur);
        g.gain.exponentialRampToValueAtTime(0.18, t + i * dur + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * dur + dur);
        o.start(t + i * dur); o.stop(t + i * dur + dur + 0.02);
      });
    } catch (e) { }
  }
  var okSound = function () { tone([660, 880, 1180], 0.12); };
  var noSound = function () { tone([320, 240], 0.14); };

  // ====== 라우팅 ======
  function go(view, arg) { render(view, arg); window.scrollTo(0, 0); }

  function render(view, arg) {
    if (!state.nick) return renderGate();
    if (view === 'chapter') return renderChapter(arg);
    if (view === 'mission') return renderMission(arg);
    return renderBoard();
  }

  // ====== 닉네임 게이트 ======
  function renderGate() {
    root.innerHTML =
      '<section class="cd-gate">' +
      '<div class="cd-badge">🛡️ 프라이버시 디펜더</div>' +
      '<h1>공공부문 실무형 CTF <b>200제</b></h1>' +
      '<p class="cd-lead">수사 → 판단 → 기록 → 승인 → 공개 → 개선. 공공기관 개인정보 보호·정보보안을 사건으로 풀어요. 닉네임을 정하면 시작!</p>' +
      '<div class="cd-row"><input id="cdNick" maxlength="16" placeholder="닉네임 (예: 혼디탐정)" aria-label="닉네임"><button class="cd-btn primary" id="cdStart">시작하기</button></div>' +
      '<p class="cd-fine">닉네임·답안은 저장·전송하지 않아요(진행·점수는 이 브라우저에만 보관).</p>' +
      '</section>';
    var start = function () { var v = ($('#cdNick').value || '').trim(); if (!v) { $('#cdNick').focus(); return; } state.nick = v; save(state); okSound(); go('board'); };
    $('#cdStart').addEventListener('click', start);
    $('#cdNick').addEventListener('keydown', function (e) { if (e.key === 'Enter') start(); });
  }

  // ====== 보드(10 챕터) ======
  function chProbs(ch) { return PROBS.filter(function (p) { return p.ch === ch; }); }
  function clearedCount(ch) { return chProbs(ch).filter(function (p) { return state.cleared[p.id]; }).length; }
  function fullCount(ch) { return chProbs(ch).filter(function (p) { return p.status === 'full'; }).length; }

  function renderBoard() {
    var totalFull = PROBS.filter(function (p) { return p.status === 'full'; }).length;
    var clearedAll = Object.keys(state.cleared).length;
    var cards = CHS.map(function (c) {
      var done = clearedCount(c.ch), full = fullCount(c.ch), total = chProbs(c.ch).length;
      var pct = total ? Math.round(done / total * 100) : 0;
      var ready = full > 0;
      return '<button class="cd-ch' + (ready ? '' : ' soon') + '" data-ch="' + c.ch + '">' +
        '<div class="cd-ch-emoji">' + esc(c.emoji) + '</div>' +
        '<div class="cd-ch-body"><div class="cd-ch-no">CHAPTER ' + c.ch + '</div>' +
        '<b>' + esc(c.title) + '</b><span class="cd-ch-sub">' + esc(c.sub) + '</span>' +
        '<div class="cd-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="cd-ch-meta">' + (ready ? ('플레이 가능 ' + full + '제 · 클리어 ' + done + '/' + total) : ('설계 완료 ' + total + '제 · 콘텐츠 준비 중')) + '</div>' +
        '</div><div class="cd-ch-go">' + (ready ? '▶' : '설계표') + '</div></button>';
    }).join('');

    root.innerHTML =
      '<section class="cd-head">' +
      '<div><div class="cd-badge sm">🛡️ 프라이버시 디펜더</div><h1>CTF 200제 챌린지 보드</h1>' +
      '<p class="cd-lead">10개 챕터 × 레벨 1~5. 사건을 수사하듯 풀어요. <b>' + esc(state.nick) + '</b> 디펜더 · 점수 <b id="cdScore">' + state.score + '</b>점 · 전체 클리어 ' + clearedAll + '/' + PROBS.length + '</p></div>' +
      '<div class="cd-head-btns">' +
      '<button class="cd-btn" id="cdRandAll">🎲 전체 랜덤 출제</button>' +
      '<button class="cd-btn" id="cdDisc">⚖ 비위·징계 기준</button>' +
      '<label class="cd-snd"><input type="checkbox" id="cdSnd" checked> 🔔 효과음</label>' +
      '<button class="cd-btn ghost" id="cdReset">진행 초기화</button></div>' +
      '</section>' +
      '<div class="cd-grid">' + cards + '</div>' +
      '<p class="cd-note">※ 전 10챕터 200문제가 모두 플레이 가능해요. 분야 배분·레벨 1~5·평가 3중 매핑을 지키며 사건으로 익혀요.</p>';

    $('#cdSnd').checked = sndOn;
    $('#cdSnd').addEventListener('change', function () { sndOn = this.checked; });
    $$('.cd-ch', root).forEach(function (b) { b.addEventListener('click', function () { go('chapter', +b.getAttribute('data-ch')); }); });
    $('#cdRandAll').addEventListener('click', function () {
      var pool = PROBS.filter(function (p) { return p.status === 'full'; });
      if (!pool.length) return;
      var pick = shuffle(pool)[0];
      okSound(); go('mission', { id: pick.id, random: 'all' });
    });
    $('#cdDisc').addEventListener('click', showDisciplineRef);
    $('#cdReset').addEventListener('click', function () {
      if (!confirm('진행 상황과 점수를 초기화할까요?')) return;
      state.score = 0; state.cleared = {}; save(state); go('board');
    });
  }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // ====== 챕터 상세 ======
  function renderChapter(ch) {
    var c = CHS.filter(function (x) { return x.ch === ch; })[0] || {};
    var list = chProbs(ch);
    var byLevel = {};
    list.forEach(function (p) { (byLevel[p.level] = byLevel[p.level] || []).push(p); });
    var levelsHtml = [1, 2, 3, 4, 5].map(function (lv) {
      var ps = byLevel[lv] || []; var meta = LV[String(lv)] || {};
      var items = ps.map(function (p) {
        var done = state.cleared[p.id];
        var playable = p.status === 'full';
        return '<button class="cd-m' + (playable ? '' : ' soon') + (done ? ' done' : '') + '" data-id="' + p.id + '">' +
          '<span class="cd-m-ico">' + esc(p.emoji || '🔎') + '</span>' +
          '<span class="cd-m-t"><b>' + esc(p.title.replace(/^\[[^\]]*\]\s*/, '')) + '</b>' +
          '<small>' + esc(p.area) + ' · ' + esc(p.qtype) + ' · ' + (p.pt || meta.pt || 0) + '점</small></span>' +
          '<span class="cd-m-s">' + (done ? '✓ 클리어' : (playable ? '▶ 도전' : '설계')) + '</span></button>';
      }).join('');
      return '<div class="cd-lv"><div class="cd-lv-h"><span class="cd-lv-no">LV ' + lv + '</span><b>' + esc(meta.name || '') + '</b><span class="cd-lv-pt">' + (meta.pt || 0) + '점</span></div>' + items + '</div>';
    }).join('');

    root.innerHTML =
      '<div class="cd-crumb"><button class="cd-link" id="cdBack">← 보드</button> / CHAPTER ' + ch + '</div>' +
      '<section class="cd-ch-head"><div class="cd-ch-emoji big">' + esc(c.emoji) + '</div>' +
      '<div><h1>' + esc(c.title) + '</h1><p class="cd-lead">' + esc(c.sub) + '</p>' +
      '<button class="cd-btn" id="cdRandCh">🎲 이 챕터 랜덤 출제</button></div></section>' +
      '<div class="cd-levels">' + levelsHtml + '</div>';

    $('#cdBack').addEventListener('click', function () { go('board'); });
    $('#cdRandCh').addEventListener('click', function () {
      var pool = chProbs(ch).filter(function (p) { return p.status === 'full'; });
      if (!pool.length) { alert('이 챕터는 콘텐츠 준비 중이에요. 1챕터를 먼저 플레이해 보세요.'); return; }
      okSound(); go('mission', { id: shuffle(pool)[0].id, random: 'ch', ch: ch });
    });
    $$('.cd-m', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id');
        var p = PROBS.filter(function (x) { return x.id === id; })[0];
        if (p && p.status !== 'full') return showBlueprint(p);
        go('mission', { id: id, ch: ch });
      });
    });
  }

  // ====== 설계표(블루프린트) 모달 ======
  function showBlueprint(p) {
    var m = p.map || {}, law = p.law || {};
    var html = '<div class="cd-modal" role="dialog" aria-modal="true"><div class="cd-modal-box">' +
      '<button class="cd-x" aria-label="닫기">✕</button>' +
      '<div class="cd-bp-tag">설계표 · ' + esc(p.id) + '</div>' +
      '<h2>' + esc(p.title) + '</h2>' +
      '<table class="cd-bp"><tr><th>분야</th><td>' + esc(p.area) + '</td></tr>' +
      '<tr><th>레벨</th><td>LV ' + p.level + ' · ' + esc((LV[String(p.level)] || {}).name || '') + ' (' + (p.pt || 0) + '점)</td></tr>' +
      '<tr><th>문항유형</th><td>' + esc(p.qtype) + '</td></tr>' +
      '<tr><th>법적근거</th><td>' + esc(law.name || '') + ' ' + esc(law.article || '') + ' ' + esc(law.para || '') + '</td></tr>' +
      '<tr><th>PIA 매핑</th><td>' + esc(m.pia || '-') + '</td></tr>' +
      '<tr><th>보호수준 매핑</th><td>' + esc(m.plevel || '-') + '</td></tr>' +
      '<tr><th>사이버 매핑</th><td>' + esc(m.cyber || '-') + '</td></tr>' +
      '<tr><th>매핑유형</th><td>' + esc(m.type || '-') + ' · ' + esc(m.reason || '') + '</td></tr>' +
      '<tr><th>검증상태</th><td>' + esc(p.verify || '확인 필요') + '</td></tr></table>' +
      '<p class="cd-fine">이 문제는 설계가 확정됐고 인터랙티브 콘텐츠가 순차 공개돼요.</p>' +
      '</div></div>';
    var wrap = document.createElement('div'); wrap.innerHTML = html; var node = wrap.firstChild;
    document.body.appendChild(node);
    function close() { node.remove(); }
    node.addEventListener('click', function (e) { if (e.target === node) close(); });
    $('.cd-x', node).addEventListener('click', close);
    document.addEventListener('keydown', function esckey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esckey); } });
  }

  // ====== 공무원 개인정보 비위유형·징계 기준 (참고) ======
  var DISC_TYPES = [
    { t: '개인정보 부정이용 및 무단열람', d: '직무와 무관하게 개인정보를 조회·열람하거나 사적으로 이용', s: '파면·해임 ~ 정직(고의·중대)', p: '법 제71조·제72조' },
    { t: '개인정보 유출·누설', d: '동의·근거 없이 제3자 제공, 외부 반출·판매, 업무상 알게 된 개인정보 누설(제59조)', s: '파면·해임(고의) / 강등·정직', p: '법 제71조(5년↓·5천만원↓)' },
    { t: '직무상 비밀 누설', d: '직무상 알게 된 비밀을 누설', s: '해임 ~ 정직', p: '형법·국가공무원법' },
    { t: '영상정보 임의조작·목적 외 사용', d: 'CCTV를 임의 조작하거나 설치 목적 외로 이용', s: '정직 ~ 감봉', p: '법 제72조(3년↓·3천만원↓)' },
    { t: '안전조치 의무 소홀로 인한 유출', d: '접근통제·암호화 등 안전조치 소홀로 개인정보 유출', s: '정직 ~ 견책(과실 정도)', p: '법 제73조(2년↓·2천만원↓)' },
    { t: '공공기관 개인정보 부정 변경·말소', d: '부정한 목적으로 처리된 개인정보를 변경·말소해 업무 방해 등', s: '파면·해임', p: '법 제70조(10년↓·1억원↓)' }
  ];
  // 지방공무원 징계규칙 별표1 — 비위 정도 × 과실 양정 매트릭스
  var DISC_YANGJEONG = [
    ['비위 정도 심하고 고의가 있는 경우', '파면'],
    ['비위 정도 심하고 중과실 / 약하고 고의', '해임'],
    ['비위 정도 심하고 경과실 / 약하고 중과실', '강등 ~ 정직'],
    ['비위 정도 약하고 경과실', '감봉 ~ 견책']
  ];
  function showDisciplineRef() {
    var rows = DISC_TYPES.map(function (x) {
      return '<tr><td><b>' + esc(x.t) + '</b><br><span class="cd-disc-d">' + esc(x.d) + '</span></td><td>' + esc(x.s) + '</td><td>' + esc(x.p) + '</td></tr>';
    }).join('');
    var yang = DISC_YANGJEONG.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>'; }).join('');
    var html = '<div class="cd-modal" role="dialog" aria-modal="true"><div class="cd-modal-box wide">' +
      '<button class="cd-x" aria-label="닫기">✕</button>' +
      '<div class="cd-bp-tag" style="color:#c4321b">⚖ 공무원 개인정보·보안 비위·징계 기준</div>' +
      '<h2>개인정보 비위유형 · 징계 · 벌칙</h2>' +
      '<p class="cd-fine">근거: 지방공무원 징계업무편람(2023, 행정안전부), 「지방공무원 징계규칙」 별표1 징계기준, 「보안업무규정」 등 보안법령 관련 비위행위자 처리지침, 개인정보보호 법규 위반 비위 징계처리지침, 개인정보 보호법 제70~73조.</p>' +
      '<table class="cd-disc"><tr><th>비위유형</th><th>징계(양정 예시)</th><th>형사 벌칙</th></tr>' + rows + '</table>' +
      '<h3 class="cd-disc-h">📏 징계양정 기준 (비위 정도 × 과실) — 징계규칙 별표1</h3>' +
      '<table class="cd-disc"><tr><th>비위의 정도 및 과실</th><th>징계</th></tr>' + yang + '</table>' +
      '<h3 class="cd-disc-h">👥 비위행위자·감독자 문책 / 수사기관 통보</h3>' +
      '<div class="cd-disc-note"><b>문책 구분</b> 같은 사건의 담당자(비위행위자)와 감독자는 업무 성질·관련도·고의/중과실 유무에 따라 문책 순위를 나눠 책임을 물어요(징계규칙 제4조 별표 문책기준). <b>수사기관 통보</b> 공소제기·기소유예는 징계의결 요구, 혐의없음·죄가안됨은 내부종결 원칙(명백한 징계사유는 예외)이에요(규칙 제3조).</div>' +
      '<div class="cd-disc-note"><b>징계 종류</b> 중징계(파면·해임·강등·정직) / 경징계(감봉·견책). <b>최근 동향</b> 2026년 개인정보 유출 과징금·과태료 급증, 공공기관 유출 패널티 확대. 개인정보 무단열람·유출은 접속기록으로 드러나며 징계와 형사책임이 함께 따를 수 있어요.</div>' +
      '</div></div>';
    var wrap = document.createElement('div'); wrap.innerHTML = html; var node = wrap.firstChild;
    document.body.appendChild(node);
    function close() { node.remove(); }
    node.addEventListener('click', function (e) { if (e.target === node) close(); });
    $('.cd-x', node).addEventListener('click', close);
    document.addEventListener('keydown', function esckey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esckey); } });
  }

  // ====== 모션그래픽 (NVR 타임라인 / 로그 스트림) ======
  function motionBlock(p) {
    var mo = p.motion; if (!mo) return '';
    var noanim = reduced() ? ' noanim' : '';
    if (mo.type === 'nvr') {
      var chans = (mo.channels || ['CH1 로비', 'CH2 복도', 'CH3 주차장', 'CH4 출입구']);
      var rows = chans.map(function (c, i) {
        return '<div class="nvr-ch"><span class="nvr-ch-name">' + esc(c) + '</span><span class="nvr-track"><i class="nvr-seg" style="left:' + (8 + i * 11) + '%;width:' + (28 + (i % 3) * 14) + '%"></i></span></div>';
      }).join('');
      return '<div class="cd-motion nvr' + noanim + '" role="img" aria-label="NVR 영상저장장치 타임라인 모형">' +
        '<div class="nvr-head"><span class="nvr-rec">● REC</span><span class="nvr-title">' + esc(mo.label || 'NVR · 영상저장장치') + '</span><span class="nvr-date">' + esc(mo.date || '2026-11-05') + '</span></div>' +
        '<div class="nvr-screen"><div class="nvr-scan"></div><div class="nvr-cam">' + esc(mo.cam || '🎥') + '</div><div class="nvr-time">' + esc(mo.clock || '02:14:07') + '</div></div>' +
        '<div class="nvr-channels">' + rows + '</div>' +
        '<div class="nvr-bar"><i class="nvr-play"></i></div>' +
        '<div class="nvr-hint">타임라인을 훑어 영상 존재·이상 구간을 확인하는 모형이에요.</div></div>';
    }
    if (mo.type === 'log') {
      var lines = mo.lines || [];
      var body = lines.map(function (l, i) {
        return '<div class="logln' + (l.bad ? ' bad' : '') + '" style="animation-delay:' + (i * 0.12) + 's">' +
          '<span class="log-t">' + esc(l.t || '') + '</span><span class="log-u">' + esc(l.u || '') + '</span><span class="log-m">' + esc(l.m || '') + '</span>' +
          (l.bad ? '<span class="log-alert">⚠</span>' : '') + '</div>';
      }).join('');
      return '<div class="cd-motion log' + noanim + '" role="img" aria-label="접속기록 로그 스트림 모형">' +
        '<div class="log-head"><span class="log-dot r"></span><span class="log-dot y"></span><span class="log-dot g"></span><span class="log-ttl">' + esc(mo.label || 'access.log — 실시간 점검') + '</span></div>' +
        '<div class="log-body">' + body + '</div></div>';
    }
    return '';
  }

  // ====== 미션(사건) ======
  function renderMission(arg) {
    var p = PROBS.filter(function (x) { return x.id === arg.id; })[0];
    if (!p) return go('board');
    var sc = p.scene || {}, law = p.law || {}, m = p.map || {};
    var ev = (p.evidence || []).map(function (e) {
      return '<div class="cd-ev"><b>' + esc(e.label) + '</b><span>' + esc(e.v) + '</span></div>';
    }).join('');
    var mapChips = [['PIA', m.pia], ['보호수준', m.plevel], ['사이버', m.cyber]].filter(function (x) { return x[1] && x[1] !== '-'; })
      .map(function (x) { return '<span class="cd-chip">' + x[0] + ': ' + esc(x[1]) + '</span>'; }).join('');
    // 실제 사건 배너
    var realHtml = p.realcase ? ('<div class="cd-real"><span class="cd-real-ico" aria-hidden="true">📰</span><div><b>실제 사건 — ' + esc(p.realcase.title) + '</b><p>' + esc(p.realcase.body) + '</p><span class="cd-real-src">출처: ' + esc(p.realcase.src) + '</span></div></div>') : '';
    // 모션그래픽(NVR/로그)
    var motionHtml = motionBlock(p);

    root.innerHTML =
      '<div class="cd-crumb"><button class="cd-link" id="cdBack">← ' + (arg.ch ? ('CHAPTER ' + arg.ch) : '보드') + '</button> / ' + esc(p.id) + '</div>' +
      '<section class="cd-mission">' +
      '<div class="cd-m-head"><span class="cd-lvtag lv' + p.level + '">LV ' + p.level + ' · ' + esc((LV[String(p.level)] || {}).name || '') + '</span>' +
      '<span class="cd-qt">' + esc(p.qtype) + '</span><span class="cd-pt">' + (p.pt || 0) + '점</span></div>' +
      '<h1>' + esc(p.emoji || '🔎') + ' ' + esc(p.title.replace(/^\[[^\]]*\]\s*/, '')) + '</h1>' +
      '<div class="cd-scene"><div class="cd-scene-row"><span>🎬 배경</span>' + esc(sc.setting || '') + '</div>' +
      (sc.chars ? '<div class="cd-scene-row"><span>👥 등장</span>' + esc(sc.chars) + '</div>' : '') +
      (sc.timeline ? '<div class="cd-scene-row"><span>⏱ 전개</span>' + esc(sc.timeline) + '</div>' : '') +
      (p.risk ? '<div class="cd-scene-row risk"><span>⚠ 위험</span>' + esc(p.risk) + '</div>' : '') + '</div>' +
      realHtml +
      motionHtml +
      (ev ? '<div class="cd-evs"><div class="cd-evs-h">🧷 증거</div>' + ev + '</div>' : '') +
      (p.formref ? '<div class="cd-formref"><span aria-hidden="true">📋</span> <b>공식 서식</b> ' + esc(p.formref) + '</div>' : '') +
      '<div class="cd-q" id="cdQ"></div>' +
      '<div class="cd-hints"><button class="cd-hint-btn" data-h="1">💡 힌트 1 (관찰)</button><button class="cd-hint-btn" data-h="2">💡 힌트 2 (개념)</button><button class="cd-hint-btn" data-h="3">💡 힌트 3 (판단)</button><div id="cdHintOut" class="cd-hint-out" hidden></div></div>' +
      '<div class="cd-actions"><button class="cd-btn primary" id="cdSubmit">제출</button><button class="cd-btn ghost" id="cdReveal" hidden>정답·해설 보기</button></div>' +
      '<div id="cdResult" class="cd-result" hidden></div>' +
      '<div class="cd-lawbar"><span class="cd-law-main">⚖ ' + esc(law.name || '') + ' ' + esc(law.article || '') + (law.para && law.para !== '-' ? ' ' + esc(law.para) : '') + '</span>' +
        (law.eff && law.eff !== '현행' ? '<span class="cd-law-eff">시행 ' + esc(law.eff) + '</span>' : '') +
        '<span class="cd-law-verify" title="' + esc(p.verify || '') + '">✔ 법제처 현행본 대조</span></div>' +
      '<div class="cd-mapline">' + mapChips + '</div>' +
      '</section>';

    $('#cdBack').addEventListener('click', function () { arg.ch ? go('chapter', arg.ch) : go('board'); });

    var hintUsed = 0;
    $$('.cd-hint-btn', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var h = +b.getAttribute('data-h'); var out = $('#cdHintOut');
        var txt = (p.hints || [])[h - 1] || '힌트가 없어요.';
        out.hidden = false; out.innerHTML = '<b>힌트 ' + h + '</b> ' + esc(txt);
        hintUsed = Math.max(hintUsed, h); b.classList.add('used');
      });
    });

    var q = p.q || {};
    var checker = mountQuestion($('#cdQ'), q);  // returns function -> {ok, detail}

    var solved = false;
    $('#cdSubmit').addEventListener('click', function () {
      if (solved) return;
      var r = checker();
      if (r.ok) {
        solved = true;
        var gain = Math.max(0, (p.pt || 0) - hintUsed * Math.round((p.pt || 0) * 0.1));
        var first = !state.cleared[p.id];
        if (first) { state.cleared[p.id] = true; state.score += gain; save(state); }
        okSound();
        showResult(p, true, gain, first);
      } else {
        noSound();
        var out = $('#cdResult'); out.hidden = false; out.className = 'cd-result bad';
        out.innerHTML = '<b>❌ 아직 아니에요.</b> ' + esc(r.detail || '단서를 다시 보고, 힌트를 단계별로 열어 보세요.') + ' <span class="cd-retry">다시 시도할 수 있어요.</span>';
      }
    });
    $('#cdReveal').addEventListener('click', function () { showResult(p, state.cleared[p.id] === true, 0, false); });
  }

  function showResult(p, ok, gain, first) {
    var s = p.solve || {};
    var checklist = (s.checklist || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var improve = (s.improve || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var out = $('#cdResult'); out.hidden = false; out.className = 'cd-result good';
    out.innerHTML =
      '<div class="cd-flag">🏁 <b>' + esc(p.flag || 'FLAG{CLEAR}') + '</b>' + (first && gain ? '<span class="cd-gain">+' + gain + '점</span>' : '') + '</div>' +
      '<div class="cd-solve">' +
      (s.legal ? '<div class="cd-sol"><b>⚖ 법령 해설</b><p>' + esc(s.legal) + '</p></div>' : '') +
      (s.tech ? '<div class="cd-sol"><b>🔧 실무·기술</b><p>' + esc(s.tech) + '</p></div>' : '') +
      (checklist ? '<div class="cd-sol"><b>✅ 점검 포인트</b><ul>' + checklist + '</ul></div>' : '') +
      (improve ? '<div class="cd-sol"><b>🛠 개선 조치</b><ul>' + improve + '</ul></div>' : '') +
      (s.source ? '<div class="cd-sol src"><b>📚 출처</b> ' + esc(s.source) + '</div>' : '') +
      (p.discipline ? '<div class="cd-sol disc"><b>⚖ 공무원 비위·징계·벌칙</b><p><span class="cd-disc-type">' + esc(p.discipline.type) + '</span> → 징계 ' + esc(p.discipline.level) + ' · ' + esc(p.discipline.penalty) + '</p><span class="cd-disc-more">보드의 ‘⚖ 비위·징계 기준’에서 전체 유형을 볼 수 있어요.</span></div>' : '') +
      '</div>' +
      '<div class="cd-next"><button class="cd-btn" id="cdToBoard">보드로</button>' + nextBtn(p) + '</div>';
    $('#cdSubmit').disabled = true; $('#cdReveal').hidden = true;
    var tb = $('#cdToBoard'); if (tb) tb.addEventListener('click', function () { go('board'); });
    var nb = $('#cdNextM'); if (nb) nb.addEventListener('click', function () { go('mission', { id: nb.getAttribute('data-id'), ch: p.ch }); });
    // score 표시 갱신
  }
  function nextBtn(p) {
    var list = chProbs(p.ch).filter(function (x) { return x.status === 'full'; });
    var idx = list.map(function (x) { return x.id; }).indexOf(p.id);
    if (idx >= 0 && idx < list.length - 1) return '<button class="cd-btn primary" id="cdNextM" data-id="' + list[idx + 1].id + '">다음 미션 ▶</button>';
    return '';
  }

  // ====== 문항유형 렌더러 ======
  // 반환: function() -> {ok:boolean, detail?:string}
  function mountQuestion(host, q) {
    var kind = q.kind || 'select';
    if (kind === 'select') return mSelect(host, q);
    if (kind === 'match') return mMatch(host, q);
    if (kind === 'order') return mOrder(host, q);
    if (kind === 'finderr') return mFindErr(host, q);
    if (kind === 'console') return mConsole(host, q);
    if (kind === 'form') return mForm(host, q);
    if (kind === 'multi') return mMulti(host, q);
    host.innerHTML = '<p>지원되지 않는 유형</p>'; return function () { return { ok: false }; };
  }

  function mSelect(host, q) {
    var multi = !!q.multi;
    var opts = q.options || [];
    host.innerHTML = '<p class="cd-prompt">' + (q.prompt || '') + '</p>' +
      '<div class="cd-opts" role="group">' + opts.map(function (o, i) {
        return '<button class="cd-opt" data-i="' + i + '" aria-pressed="false">' +
          '<span class="cd-opt-mark">' + (multi ? '☐' : '○') + '</span><span>' + esc(o.t) + '</span></button>';
      }).join('') + '</div>' + (multi ? '<p class="cd-hint-inline">해당하는 것을 모두 선택하세요.</p>' : '');
    var sel = {};
    $$('.cd-opt', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = b.getAttribute('data-i');
        if (multi) { sel[i] = !sel[i]; }
        else { sel = {}; $$('.cd-opt', host).forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); x.querySelector('.cd-opt-mark').textContent = '○'; }); sel[i] = true; }
        b.classList.toggle('on', !!sel[i]); b.setAttribute('aria-pressed', sel[i] ? 'true' : 'false');
        b.querySelector('.cd-opt-mark').textContent = sel[i] ? (multi ? '☑' : '●') : (multi ? '☐' : '○');
      });
    });
    return function () {
      var ok = opts.every(function (o, i) { return (!!sel[i]) === (!!o.ok); });
      var any = Object.keys(sel).some(function (k) { return sel[k]; });
      return { ok: ok && any, detail: multi ? '정답 조합이 아직 맞지 않아요.' : '' };
    };
  }

  function mMatch(host, q) {
    var left = q.left || [], right = q.right || [], ans = q.answer || [];
    var ropts = right.map(function (r, i) { return '<option value="' + i + '">' + esc(r) + '</option>'; }).join('');
    host.innerHTML = '<p class="cd-prompt">' + (q.prompt || '') + '</p>' +
      '<div class="cd-match">' + left.map(function (l, i) {
        return '<div class="cd-match-row"><span class="cd-match-l">' + esc(l) + '</span>' +
          '<select class="cd-sel" data-i="' + i + '" aria-label="' + esc(l) + ' 연결"><option value="">— 선택 —</option>' + ropts + '</select></div>';
      }).join('') + '</div>';
    return function () {
      var ok = left.every(function (l, i) { var v = $('.cd-sel[data-i="' + i + '"]', host).value; return v !== '' && +v === ans[i]; });
      return { ok: ok, detail: '연결이 모두 맞아야 해요.' };
    };
  }

  function mOrder(host, q) {
    var items = q.items || [], correct = q.order || items.map(function (_, i) { return i; });
    var picked = [];
    host.innerHTML = '<p class="cd-prompt">' + (q.prompt || '') + '</p>' +
      '<div class="cd-order-pool" id="cdPool">' + shuffle(items.map(function (t, i) { return { t: t, i: i }; })).map(function (o) {
        return '<button class="cd-ord" data-i="' + o.i + '">' + esc(o.t) + '</button>';
      }).join('') + '</div>' +
      '<div class="cd-order-seq" id="cdSeq" aria-live="polite"><span class="cd-order-ph">여기에 순서대로 쌓여요</span></div>' +
      '<button class="cd-btn ghost sm" id="cdOrdReset" type="button">순서 지우기</button>';
    function draw() {
      var seq = $('#cdSeq', host);
      seq.innerHTML = picked.length ? picked.map(function (i, n) { return '<span class="cd-ord-chip">' + (n + 1) + '. ' + esc(items[i]) + '</span>'; }).join('') : '<span class="cd-order-ph">여기에 순서대로 쌓여요</span>';
      $$('.cd-ord', host).forEach(function (b) { b.disabled = picked.indexOf(+b.getAttribute('data-i')) >= 0; });
    }
    $$('.cd-ord', host).forEach(function (b) { b.addEventListener('click', function () { picked.push(+b.getAttribute('data-i')); draw(); }); });
    $('#cdOrdReset', host).addEventListener('click', function () { picked = []; draw(); });
    return function () {
      if (picked.length !== correct.length) return { ok: false, detail: '모든 카드를 순서대로 놓아 주세요.' };
      var ok = picked.every(function (v, n) { return v === correct[n]; });
      return { ok: ok, detail: '순서가 아직 맞지 않아요.' };
    };
  }

  function mFindErr(host, q) {
    var segs = q.segments || [];
    var sel = {};
    host.innerHTML = '<p class="cd-prompt">' + (q.prompt || '') + '</p>' +
      '<div class="cd-finderr">' + segs.map(function (s, i) {
        return '<button class="cd-seg" data-i="' + i + '" aria-pressed="false">' + esc(s.t) + '</button>';
      }).join('') + '</div><p class="cd-hint-inline">잘못된 부분을 모두 눌러 표시하세요.</p>';
    $$('.cd-seg', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = b.getAttribute('data-i'); sel[i] = !sel[i];
        b.classList.toggle('mark', !!sel[i]); b.setAttribute('aria-pressed', sel[i] ? 'true' : 'false');
      });
    });
    return function () {
      var ok = segs.every(function (s, i) { return (!!sel[i]) === (!!s.wrong); });
      var any = Object.keys(sel).some(function (k) { return sel[k]; });
      return { ok: ok && any, detail: '표시한 오류가 정답과 일치하지 않아요.' };
    };
  }

  function mConsole(host, q) {
    var tg = q.toggles || [];
    var st = {};
    host.innerHTML = '<p class="cd-prompt">' + (q.prompt || '') + '</p>' +
      '<div class="cd-console">' + tg.map(function (t, i) {
        return '<div class="cd-sw-row"><span>' + esc(t.label) + '</span>' +
          '<button class="cd-sw" data-i="' + i + '" role="switch" aria-checked="false" aria-label="' + esc(t.label) + '"><span class="cd-sw-knob"></span><span class="cd-sw-txt">OFF</span></button></div>';
      }).join('') + '</div>';
    $$('.cd-sw', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = b.getAttribute('data-i'); st[i] = !st[i];
        b.classList.toggle('on', !!st[i]); b.setAttribute('aria-checked', st[i] ? 'true' : 'false');
        b.querySelector('.cd-sw-txt').textContent = st[i] ? 'ON' : 'OFF';
      });
    });
    return function () {
      var ok = tg.every(function (t, i) { return (!!st[i]) === (!!t.should); });
      return { ok: ok, detail: '스위치 상태가 기준과 달라요.' };
    };
  }

  function mForm(host, q) {
    var fs = q.fields || [];
    host.innerHTML = '<p class="cd-prompt">' + (q.prompt || '') + '</p>' +
      '<div class="cd-form">' + fs.map(function (f, i) {
        return '<label class="cd-field"><span>' + esc(f.label) + '</span>' +
          '<input class="cd-inp" data-i="' + i + '" placeholder="' + esc(f.ph || '') + '" autocomplete="off"></label>';
      }).join('') + '</div>';
    return function () {
      var bad = null;
      var ok = fs.every(function (f, i) {
        var v = norm($('.cd-inp[data-i="' + i + '"]', host).value);
        var ans = (f.answer || []).map(norm);
        var good = ans.some(function (a) { return a && v === a; });
        if (!good && bad === null) bad = f.label;
        return good;
      });
      return { ok: ok, detail: bad ? ('‘' + bad + '’ 칸을 다시 확인해 보세요.') : '' };
    };
  }

  function mMulti(host, q) {
    var steps = q.steps || [];
    host.innerHTML = '<p class="cd-prompt">' + (q.prompt || '') + '</p>' +
      steps.map(function (s, i) { return '<div class="cd-step"><div class="cd-step-no">STEP ' + (i + 1) + '</div><div class="cd-step-body" id="cdStep' + i + '"></div></div>'; }).join('');
    var checkers = steps.map(function (s, i) { return mountQuestion($('#cdStep' + i, host), s); });
    return function () {
      for (var i = 0; i < checkers.length; i++) {
        var r = checkers[i]();
        if (!r.ok) return { ok: false, detail: 'STEP ' + (i + 1) + '이(가) 아직 맞지 않아요.' };
      }
      return { ok: true };
    };
  }

  // 시작
  go('board');
})();
