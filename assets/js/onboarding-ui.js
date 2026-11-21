/* 신규 직원 온보딩 화면 — 직무 선택 · 첫날 행동수칙 · 실행 플레이북 · 오늘의 상황 퀴즈
 * 브라우저 안에서만 동작합니다. 진행 상황은 이 기기의 localStorage 에만 저장하고, 서버로 보내지 않습니다.
 * 조문 원문은 Worker(/law)로만 조회하며 인증키(OC)는 브라우저에 두지 않습니다.
 */
(function () {
  'use strict';
  var W = window, D = document;
  var OB = W.ONBOARDING, CAT = W.LIB_CATALOG || { docs: [] }, LAW = W.HondiLawAPI || null;
  var AG = (W.APP_CONFIG || {}).AGENCY || {};
  var docById = {}; CAT.docs.forEach(function (d) { docById[d.id] = d; });
  var KEY = 'onboarding-v1';

  /* ---------- 저장(이 기기에만) ---------- */
  function load() { try { return JSON.parse(W.localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var state = load();
  state.done = state.done || {}; state.quiz = state.quiz || {};
  function save() { try { W.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경에서도 화면은 동작 */ } }

  /* ---------- 작은 도구 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stripExt(n) { return String(n || '').replace(/\.(pdf|zip|hwp|hwpx)$/i, '').replace(/_/g, ' '); }
  function short(n, max) { n = stripExt(n); return n.length > max ? n.slice(0, max - 1) + '…' : n; }
  function yearText(d) { return d && d.year && d.year !== '미표기' ? d.year : '발행연도 미표기'; }
  function refBadge(r) {
    var d = docById[r.d]; if (!d) return '';
    var title = stripExt(d.name) + ' · ' + yearText(d) + ' · ' + r.p + '쪽' + (d.pub ? ' · ' + d.pub : '');
    return '<span class="ob-ref" title="' + esc(title) + '">' + esc(short(d.name, 30)) + ' <em>(' + esc(yearText(d)) + ', p.' + esc(r.p) + ')</em></span>';
  }
  function lawLabel(l) { return '「' + l.n + '」 제' + l.jo + '조' + (l.b ? '의' + l.b : '') + (l.hang ? '제' + l.hang + '항' : ''); }
  function lawKey(l) { return [l.k, l.n, l.jo, l.b || 0, l.hang || 0].join('|'); }
  function citeBtn(l) { return '<button type="button" class="ob-cite" data-cite="' + esc(lawKey(l)) + '" title="눌러서 조문 원문 보기">' + esc(lawLabel(l)) + '</button>'; }
  function basis(x) {
    var parts = (x.law || []).map(citeBtn).concat((x.ref || []).map(refBadge));
    return parts.length ? '<div class="ob-basis"><span class="ob-basis-k">근거</span> ' + parts.join(' ') + '</div>' : '';
  }
  function askLink(q, label) { return '<a class="ob-ask" href="chatbot.html?mode=staff&amp;q=' + encodeURIComponent(q) + '">' + esc(label || q) + '</a>'; }
  function topicLink(id, label) { return '<a class="ob-ask" href="chatbot.html?mode=staff&amp;topic=' + encodeURIComponent(id) + '">' + esc(label) + '</a>'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dayNumber(iso) { var p = iso.split('-').map(Number); return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000); }

  /* ---------- 오늘의 문항: 날짜로 정해서 같은 날엔 같은 문제 ---------- */
  function dailyQuiz(iso, bank, n) {
    bank = bank || OB.QUIZ; n = n || 2;
    // 시작 위치는 하루 2문항 기준으로 고정해, '한 문제 더'를 눌러도 오늘의 앞 문항이 바뀌지 않게 합니다
    var len = bank.length, start = ((dayNumber(iso) * 2) % len + len) % len, out = [];
    for (var i = 0; i < n && i < len; i++) out.push(bank[(start + i) % len]);
    return out;
  }

  /* ---------- 조문 원문 보기(해당 항목 바로 아래) ---------- */
  var CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  function paragraph(text, hang) {
    if (!hang || hang > 20) return null;
    var a = text.indexOf(CIRCLED[hang - 1]); if (a < 0) return null;
    var b = hang < 20 ? text.indexOf(CIRCLED[hang], a + 1) : -1;
    return text.slice(a, b > a ? b : undefined).trim();
  }
  var lawCache = {};
  function showLaw(btn) {
    var p = btn.getAttribute('data-cite').split('|');
    var l = { k: p[0], n: p[1], jo: Number(p[2]), b: Number(p[3]) || 0, hang: Number(p[4]) || 0 };
    var host = btn.closest('.ob-basis'), box = host.nextElementSibling;
    if (box && box.classList.contains('ob-law') && box.getAttribute('data-key') === lawKey(l)) { box.remove(); return; }
    if (box && box.classList.contains('ob-law')) box.remove();
    var link = LAW ? LAW.link({ kind: l.k, name: l.n, jo: l.jo, branch: l.b }) : 'https://www.law.go.kr/';
    var a = '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">국가법령정보센터에서 보기</a>';
    box = D.createElement('div'); box.className = 'ob-law'; box.setAttribute('data-key', lawKey(l)); box.setAttribute('role', 'region'); box.setAttribute('aria-label', lawLabel(l) + ' 원문');
    box.innerHTML = '<p class="ob-law-t"><b>' + esc(lawLabel(l)) + '</b> <button type="button" class="ob-law-x" aria-label="닫기">닫기</button></p><div class="ob-law-b">법제처에서 현행 조문을 불러오는 중…</div>';
    host.after(box);
    var body = box.querySelector('.ob-law-b');
    function fail() { body.innerHTML = '법제처 원문을 지금 불러오지 못했습니다. ' + a + '에서 현행 조문을 확인하세요.'; }
    if (!LAW || !LAW.enabled()) { fail(); return; }
    var ck = [l.k, l.n, l.jo, l.b].join('|');
    var pr = lawCache[ck] || (lawCache[ck] = LAW.article({ kind: l.k, name: l.n, jo: l.jo, branch: l.b }));
    pr.then(function (r) {
      var full = String(r.content || ''), para = paragraph(full, l.hang);
      body.innerHTML = (para ? '<div class="ob-law-hl">' + esc(para).replace(/\n/g, '<br>') + '</div><details><summary>조문 전체 보기</summary><div>' + esc(full).replace(/\n/g, '<br>') + '</div></details>'
        : '<div>' + esc(full).replace(/\n/g, '<br>') + '</div>') + '<p class="ob-muted">출처: ' + esc(r.source) + ' · 조회 시점 현행 원문 · ' + a + '</p>';
    }).catch(function () { delete lawCache[ck]; fail(); });
  }

  /* ---------- 진행 체크 ---------- */
  function checkItem(id, html, extra) {
    var on = !!state.done[id];
    return '<li class="ob-step' + (on ? ' on' : '') + '"><label><input type="checkbox" data-done="' + esc(id) + '"' + (on ? ' checked' : '') + '><span>' + html + '</span></label>' + (extra || '') + '</li>';
  }
  function countDone(prefix, total) {
    var n = 0; Object.keys(state.done).forEach(function (k) { if (k.indexOf(prefix) === 0 && state.done[k]) n++; });
    return Math.min(n, total);
  }
  function meter(prefix, total) {
    var n = countDone(prefix, total);
    return '<span class="ob-meter" data-meter="' + esc(prefix) + '" data-total="' + total + '">' + n + ' / ' + total + ' 완료</span>';
  }
  function refreshMeters() {
    D.querySelectorAll('[data-meter]').forEach(function (m) {
      var t = Number(m.getAttribute('data-total')); m.textContent = countDone(m.getAttribute('data-meter'), t) + ' / ' + t + ' 완료';
    });
  }

  /* ---------- 1. 직무 선택 ---------- */
  function renderRole() {
    var box = D.getElementById('obRole');
    var cur = OB.ROLES.filter(function (r) { return r.id === state.role; })[0];
    var btns = '<div class="ob-roles" role="group" aria-label="내 직무 선택">' + OB.ROLES.map(function (r) {
      return '<button type="button" data-role="' + r.id + '" aria-pressed="' + (cur && cur.id === r.id) + '"><b>' + esc(r.label) + '</b><span>' + esc(r.desc) + '</span></button>';
    }).join('') + '</div>';
    if (!cur) { box.innerHTML = btns + '<p class="ob-muted">직무를 고르면 그 업무에서 자주 생기는 상황과 바로 물어볼 질문을 보여 드립니다.</p>'; return; }
    box.innerHTML = btns +
      '<div class="ob-card"><h3>' + esc(cur.label) + ' 업무에서 먼저 챙길 3가지</h3><ol class="ob-tips">' +
      cur.tips.map(function (t) { return '<li>' + esc(t.t) + basis(t) + '</li>'; }).join('') + '</ol>' +
      '<p class="ob-sub">상담 챗봇에 바로 물어보기</p><div class="ob-asks">' + cur.qs.map(function (q) { return askLink(q); }).join('') + '</div></div>';
  }

  /* ---------- 2. 첫날 행동수칙 ---------- */
  function renderCode() {
    var c = OB.CODE, box = D.getElementById('obCode');
    box.innerHTML = '<p class="ob-muted">' + esc(c.note) + ' ' + meter('code:', c.items.length) + '</p><ol class="ob-steps">' +
      c.items.map(function (t, i) { return checkItem('code:' + i, esc(t)); }).join('') + '</ol>' + basis({ ref: c.ref });
  }

  /* ---------- 3. 실행 플레이북 ---------- */
  function contactLine(who) {
    var a = AG[who.agency] || {}, has = a.dept || a.tel || a.url, parts = [];
    if (a.dept) parts.push(esc(a.dept));
    if (a.tel) parts.push('<a href="tel:' + esc(String(a.tel).replace(/[^0-9+]/g, '')) + '">' + esc(a.tel) + '</a>');
    if (a.url && /^https:\/\//.test(a.url)) parts.push('<a href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer">바로가기</a>');
    return '<li><b>' + esc(who.role) + '</b> → ' + esc(who.who) + (has ? ' · ' + parts.join(' · ') : '') + (who.ref ? basis({ ref: who.ref }) : '') + '</li>';
  }
  function reportBox() {
    var R = OB.REPORT;
    return '<div class="ob-report"><p class="ob-sub">보고 경로</p><ul class="ob-rlist">' + R.inside.map(contactLine).join('') + '</ul>' +
      '<p class="ob-sub">외부 창구</p><ul class="ob-rlist">' + R.outside.map(function (o) {
        var link = o.tel ? '<a href="tel:' + esc(o.tel) + '">' + esc(o.label) + '</a>' : '<a href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">' + esc(o.label) + '</a>';
        if (o.tel && o.url) link += ' · <a href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">누리집</a>';
        return '<li>' + link + ' <span class="ob-muted">' + esc(o.note) + '</span>' + basis({ ref: o.ref }) + '</li>';
      }).join('') + '</ul></div>';
  }
  function stepsHtml(prefix, steps) {
    return '<ol class="ob-steps">' + steps.map(function (s, i) { return checkItem(prefix + i, esc(s.t), basis(s)); }).join('') + '</ol>';
  }
  function renderPlaybooks() {
    var box = D.getElementById('obPlay');
    var cur = state.pb || OB.PLAYBOOKS[0].id;
    var pb = OB.PLAYBOOKS.filter(function (p) { return p.id === cur; })[0] || OB.PLAYBOOKS[0];
    var tabs = '<div class="ob-tabs" role="tablist" aria-label="플레이북 선택">' + OB.PLAYBOOKS.map(function (p) {
      return '<button type="button" role="tab" data-pb="' + p.id + '" aria-selected="' + (p.id === pb.id) + '"><b>' + esc(p.title) + '</b><span>' + esc(p.sub) + '</span></button>';
    }).join('') + '</div>';
    var body = '<p class="ob-when"><b>이럴 때</b> ' + esc(pb.when) + '</p>';
    if (pb.cases) {
      var cc = pb.cases.filter(function (c) { return c.id === state.pbCase; })[0] || pb.cases[0];
      body += '<div class="ob-cases" role="group" aria-label="사고 유형">' + pb.cases.map(function (c) {
        return '<button type="button" data-case="' + c.id + '" aria-pressed="' + (c.id === cc.id) + '">' + esc(c.label) + '</button>';
      }).join('') + '</div>' +
        '<h3>' + esc(cc.label) + ' ' + meter(pb.id + ':' + cc.id + ':', cc.steps.length) + '</h3>' + stepsHtml(pb.id + ':' + cc.id + ':', cc.steps) + reportBox();
    } else {
      body += '<h3>단계별 점검 ' + meter(pb.id + ':', pb.steps.length) + '</h3>' + stepsHtml(pb.id + ':', pb.steps);
    }
    body += '<p class="ob-sub">하지 말아야 할 것</p><ul class="ob-dont">' + pb.dont.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
      '<p class="ob-foot">더 자세한 기준·사례·처벌은 ' + topicLink(pb.topic, '상담 챗봇에서 보기') + ' <button type="button" class="ob-reset" data-reset="' + esc(pb.id) + '">체크 초기화</button></p>';
    box.innerHTML = tabs + '<div class="ob-card" role="tabpanel">' + body + '</div>';
  }

  /* ---------- 4. 오늘의 상황 퀴즈 ---------- */
  function renderQuiz() {
    var box = D.getElementById('obQuiz'), day = today();
    var extra = Number(state.quizExtra && state.quizExtra.day === day ? state.quizExtra.n : 0);
    var list = dailyQuiz(day, OB.QUIZ, 2 + extra);
    var solved = 0, right = 0;
    Object.keys(state.quiz).forEach(function (k) { solved++; if (state.quiz[k].ok) right++; });
    box.innerHTML = '<p class="ob-muted">' + esc(day) + ' · 오늘의 문항 ' + list.length + '개 · 지금까지 ' + solved + '문항 중 ' + right + '문항 정답 (이 기기에만 저장)</p>' +
      list.map(function (q, i) {
        var mine = state.quiz[q.id], picked = mine ? mine.pick : -1;
        var opts = q.opts.map(function (o, j) {
          var cls = mine ? (j === q.a ? ' good' : (j === picked ? ' miss' : '')) : '';
          return '<button type="button" class="ob-opt' + cls + '" data-q="' + esc(q.id) + '" data-pick="' + j + '"' + (mine ? ' disabled' : '') + '>' + esc(o) + '</button>';
        }).join('');
        var ex = mine ? '<div class="ob-ex ' + (mine.ok ? 'good' : 'miss') + '"><b>' + (mine.ok ? '정답이에요.' : '다시 볼까요? 정답은 "' + esc(q.opts[q.a]) + '"입니다.') + '</b> ' + esc(q.ex) + basis(q) +
          '<p class="ob-foot">' + (q.topic ? topicLink(q.topic, '상담 챗봇에서 자세히 보기') : askLink(q.q, '상담 챗봇에서 자세히 보기')) + '</p></div>' : '';
        return '<div class="ob-card ob-q"><p class="ob-qt"><span>Q' + (i + 1) + '</span> ' + esc(q.q) + '</p><div class="ob-opts">' + opts + '</div>' + ex + '</div>';
      }).join('') +
      (list.length < OB.QUIZ.length ? '<button type="button" class="ob-more" data-more="1">한 문제 더 풀기</button>' : '');
  }

  /* ---------- 이벤트 ---------- */
  D.addEventListener('click', function (ev) {
    var t = ev.target.closest('button'); if (!t) return;
    if (t.matches('.ob-cite')) { showLaw(t); return; }
    if (t.matches('.ob-law-x')) { t.closest('.ob-law').remove(); return; }
    if (t.hasAttribute('data-role')) { state.role = t.getAttribute('data-role'); save(); renderRole(); return; }
    if (t.hasAttribute('data-pb')) { state.pb = t.getAttribute('data-pb'); save(); renderPlaybooks(); return; }
    if (t.hasAttribute('data-case')) { state.pbCase = t.getAttribute('data-case'); save(); renderPlaybooks(); return; }
    if (t.hasAttribute('data-reset')) {
      var pre = t.getAttribute('data-reset') + ':'; Object.keys(state.done).forEach(function (k) { if (k.indexOf(pre) === 0) delete state.done[k]; });
      save(); renderPlaybooks(); return;
    }
    if (t.hasAttribute('data-pick')) {
      var id = t.getAttribute('data-q'), q = OB.QUIZ.filter(function (x) { return x.id === id; })[0], pick = Number(t.getAttribute('data-pick'));
      if (!q || state.quiz[id]) return;
      state.quiz[id] = { pick: pick, ok: pick === q.a, day: today() }; save(); renderQuiz();
      var card = D.querySelector('.ob-opt[data-q="' + id + '"]'); if (card) card.closest('.ob-q').querySelector('.ob-ex').focus && card.closest('.ob-q').scrollIntoView({ block: 'nearest' });
      return;
    }
    if (t.hasAttribute('data-more')) {
      var day = today(), cur = state.quizExtra && state.quizExtra.day === day ? state.quizExtra.n : 0;
      state.quizExtra = { day: day, n: cur + 1 }; save(); renderQuiz(); return;
    }
  });
  D.addEventListener('change', function (ev) {
    var c = ev.target; if (!c.matches('input[data-done]')) return;
    var id = c.getAttribute('data-done');
    if (c.checked) state.done[id] = 1; else delete state.done[id];
    c.closest('.ob-step').classList.toggle('on', c.checked); save(); refreshMeters();
  });

  W.OnboardingUI = { dailyQuiz: dailyQuiz, paragraph: paragraph };
  if (D.getElementById('obRole')) { renderRole(); renderCode(); renderPlaybooks(); renderQuiz(); }
})();
