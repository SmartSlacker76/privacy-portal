/* 실전 OX 퀴즈 페이지 — ?topic=<주제 ID> 로 들어오면 그 주제 문제를 먼저 보여 줍니다.
   문제·해설·근거는 assets/data/counsel-coach.js 의 OX 목록만 씁니다. 기록은 챗봇과 같은 localStorage 키(coach-ox)에 둡니다. */
(function () {
  'use strict';
  var W = window, D = document, CO = W.COUNSEL_COACH, Coach = W.CounselCoach;
  var CAT = W.LIB_CATALOG || { docs: [] }, docById = {}; CAT.docs.forEach(function (d) { docById[d.id] = d; });
  var topicById = {}; (W.COUNSEL_TOPICS || []).forEach(function (t) { topicById[t.id] = t; });
  var listBox = D.getElementById('qpList'), sel = D.getElementById('qpTopic'), scoreEl = D.getElementById('qpScore');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() { try { return JSON.parse(W.localStorage.getItem('coach-ox') || '{}') || {}; } catch (e) { return {}; } }
  function save(all) { try { W.localStorage.setItem('coach-ox', JSON.stringify(all)); } catch (e) { } }
  function lawLink(l) { return 'https://www.law.go.kr/' + (l.k === '행정규칙' ? '행정규칙' : '법령') + '/' + encodeURIComponent(l.n.replace(/\s+/g, '')) + '/제' + l.jo + '조' + (l.b ? '의' + l.b : ''); }
  function refHtml(x) {
    var parts = (x.law || []).map(function (l) { return '<a href="' + esc(lawLink(l)) + '" target="_blank" rel="noopener noreferrer">' + esc(Coach.citeOf(l)) + ' ↗</a>'; })
      .concat((x.ref || []).map(function (r) { var d = docById[r.d]; return d ? esc(String(d.name).replace(/\.(pdf|zip)$/i, '').replace(/_/g, ' ')) + ' ' + r.p + '쪽' : ''; }).filter(Boolean));
    return parts.length ? '<p class="qp-ref">근거: ' + parts.join(' · ') + '</p>' : '';
  }
  function card(x) {
    var mine = load()[x.id], t = topicById[x.topic];
    return '<article class="qp-card" data-id="' + esc(x.id) + '">' + (t ? '<span class="qp-tag">' + esc(t.title) + '</span>' : '') + '<p class="qp-q">' + esc(x.s) + '</p>' +
      '<div class="qp-pick">' + ['O', 'X'].map(function (o) { return '<button type="button" data-pick="' + o + '"' + (mine ? ' disabled' : '') + (mine && mine.pick === o ? ' class="sel"' : '') + ' aria-label="' + (o === 'O' ? '맞다' : '아니다') + '">' + o + '</button>'; }).join('') +
      '<span class="qp-vd" aria-live="polite">' + (mine ? verdict(mine.pick === x.a, x) : '') + '</span></div>' +
      '<div class="qp-a"' + (mine ? '' : ' hidden') + '><p><b>정답 ' + esc(x.a) + '</b> · ' + esc(x.ex) + '</p>' + refHtml(x) +
      (t ? '<p class="qp-ref"><a href="chatbot.html?mode=coach&amp;topic=' + encodeURIComponent(t.id) + '">이 주제 다시 배우기 →</a></p>' : '') + '</div></article>';
  }
  function verdict(ok, x) { return ok ? '<span class="good">정답이에요!</span>' : '<span class="miss">아쉬워요, 정답은 ' + esc(x.a) + '예요.</span>'; }
  function score() {
    var all = load(), ids = CO.ox.map(function (x) { return x.id; }), n = 0, ok = 0;
    ids.forEach(function (id) { if (all[id]) { n++; if (all[id].ok) ok++; } });
    scoreEl.textContent = '푼 문제 ' + n + ' / ' + ids.length + ' · 정답 ' + ok;
  }
  function draw() {
    var tid = sel.value, mine = CO.ox.filter(function (x) { return x.topic === tid; }), rest = CO.ox.filter(function (x) { return x.topic !== tid; });
    listBox.innerHTML = (tid && mine.length ? '<p class="qp-sec">방금 배운 주제 · ' + esc((topicById[tid] || {}).title || '') + '</p>' + mine.map(card).join('') : '') +
      (tid && !mine.length ? '<p class="qp-sec">이 주제의 OX 문제는 아직 준비 중이에요. 다른 주제로 감각을 익혀 보세요.</p>' : '') +
      '<p class="qp-sec">' + (tid ? '다른 주제도 풀어 보기' : '전체 문제') + '</p>' + rest.map(card).join('');
    score();
  }
  var withQ = {}; CO.ox.forEach(function (x) { withQ[x.topic] = (withQ[x.topic] || 0) + 1; });
  sel.innerHTML = '<option value="">전체 주제</option>' + Object.keys(withQ).map(function (id) { return '<option value="' + esc(id) + '">' + esc((topicById[id] || {}).title || id) + ' (' + withQ[id] + ')</option>'; }).join('');
  var tp = null; try { tp = new URLSearchParams(W.location.search).get('topic'); } catch (e) { }
  if (tp && topicById[tp]) { if (!withQ[tp]) sel.insertAdjacentHTML('beforeend', '<option value="' + esc(tp) + '">' + esc(topicById[tp].title) + ' (0)</option>'); sel.value = tp; }
  sel.addEventListener('change', draw);
  D.getElementById('qpReset').addEventListener('click', function () { var all = load(); CO.ox.forEach(function (x) { delete all[x.id]; }); save(all); draw(); });
  listBox.addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-pick]'); if (!b || b.disabled) return;
    var art = b.closest('.qp-card'), id = art.getAttribute('data-id'), x = CO.ox.filter(function (z) { return z.id === id; })[0]; if (!x) return;
    var all = load(), pick = b.getAttribute('data-pick'); all[id] = { pick: pick, ok: pick === x.a }; save(all);
    art.outerHTML = card(x); score();
  });
  draw();
})();
