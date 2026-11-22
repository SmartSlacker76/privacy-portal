/* 요망진 간세 상담 화면 — 근거형 상담 엔진(counsel-engine.js)의 결과를
 * 💡 핵심 요약 / 📖 개념·근거 / ✅ 실무 / ⚖ 사례·처벌 / 🧭 다음 단계 구조로 보여 줍니다.
 * 법제처 원문은 Worker(/law)로만 조회하며 인증키(OC)는 브라우저에 두지 않습니다.
 */
(function () {
  'use strict';
  var W = window, D = document;
  var CAT = W.LIB_CATALOG || { docs: [], cats: {} };
  var Engine = W.CounselEngine;
  var engine = new Engine({ topics: W.COUNSEL_TOPICS, lexicon: W.COUNSEL_LEXICON, stop: W.COUNSEL_STOP, compare: W.COUNSEL_COMPARE, catalog: CAT });
  var docById = {}; CAT.docs.forEach(function (d) { docById[d.id] = d; });
  var DATA_VER = '20261121-1';
  var LAW = W.HondiLawAPI || null;
  var lawOn = false, aiOn = false;
  var chat = D.getElementById('chat'), form = D.getElementById('form'), input = D.getElementById('q');

  /* ---------- 작은 도구 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stripExt(n) { return String(n || '').replace(/\.(pdf|zip|hwp|hwpx)$/i, '').replace(/_/g, ' '); }
  function short(n, max) { n = stripExt(n); return n.length > max ? n.slice(0, max - 1) + '…' : n; }
  function yearText(d) { return d && d.year && d.year !== '미표기' ? d.year : '발행연도 미표기'; }
  function docBadge(id, page) {
    var d = docById[id]; if (!d) return '';
    var title = stripExt(d.name) + ' · ' + yearText(d) + (page ? ' · ' + page + '쪽' : '') + ' · ' + (d.pub || '');
    return '<span class="cs-ref" title="' + esc(title) + '">📄 ' + esc(short(d.name, 34)) + ' <em>(' + esc(yearText(d)) + (page ? ', p.' + esc(page) : '') + ')</em></span>';
  }
  /* 카드 문장 속 "D55 p32" 같은 내부 표기를 파일명·연도 배지로 바꿉니다 */
  function refText(s) {
    var out = linkLaws(esc(s)).replace(/\bD(\d{2}) ?p(\d+(?:[~∼\-]\d+)?)((?:, ?p?\d+(?:[~∼\-]\d+)?)*)/g, function (m, n, p, more) {
      var id = 'D' + n; if (!docById[id]) return m;
      return '\u0001' + docBadge(id, p + (more ? more.replace(/ ?p/g, '') : '')) + '\u0002';
    }).replace(/\bD(\d{2})\b/g, function (m, n) { var id = 'D' + n; return docById[id] ? '\u0001' + docBadge(id) + '\u0002' : m; });
    // "(D55 p32)"처럼 배지만 감싼 괄호는 지우고, 문장 속 괄호는 그대로 둡니다
    return out.replace(/\(\s*\u0001([^\u0002]*)\u0002\s*\)/g, '$1').replace(/[\u0001\u0002]/g, '');
  }
  function termRegexes(terms) {
    return (terms || []).filter(function (t) { return t && t.length >= 2; }).slice(0, 8).map(function (t) {
      return new RegExp(t.split('').map(function (c) { return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s*'), 'gi');
    });
  }
  function snippet(text, terms, len) {
    len = len || 260; text = String(text || '');
    var res = termRegexes(terms), at = -1;
    res.forEach(function (re) { re.lastIndex = 0; var m = re.exec(text); if (m && (at < 0 || m.index < at)) at = m.index; });
    var start = Math.max(0, (at < 0 ? 0 : at) - 70), cut = text.slice(start, start + len);
    var out = esc(cut);
    res.forEach(function (re) { var r2 = new RegExp(re.source, 'gi'); out = out.replace(r2, function (m) { return '<mark>' + m + '</mark>'; }); });
    return (start > 0 ? '… ' : '') + out + (start + len < text.length ? ' …' : '');
  }
  function lawName(l) { return '「' + l.n + '」 제' + l.jo + '조' + (l.b ? '의' + l.b : ''); }
  function lawLink(l) { return LAW ? LAW.link({ kind: l.k || '법령', name: l.n, jo: l.jo, branch: l.b || 0 }) : 'https://www.law.go.kr/'; }
  /* ---------- 조문 인용을 눌러 채팅창에서 원문 보기 ---------- */
  var lawCtxPrivacy = true; // 개인정보 분야 답변일 때만 '법·시행령·고시·표준지침' 약칭을 개인정보 법령으로 풉니다
  var SHORT = { '법': ['법령', '개인정보 보호법'], '보호법': ['법령', '개인정보 보호법'], '시행령': ['법령', '개인정보 보호법 시행령'], '영': ['법령', '개인정보 보호법 시행령'],
    '고시': ['행정규칙', '개인정보의 안전성 확보조치 기준'], '표준지침': ['행정규칙', '표준 개인정보 보호지침'] };
  function lawKind(name) { return /(지침|고시|기준|규정|훈령|예규)$/.test(name) ? '행정규칙' : '법령'; }
  function citeKey(k, n, jo, b, hang) { return [k, n, jo, b || 0, hang || 0].join('|'); }
  function citeBtn(key, label, cls) { return '<button type="button" class="cs-cite' + (cls ? ' ' + cls : '') + '" data-cite="' + esc(key) + '" title="눌러서 조문 원문 보기">' + label + '</button>'; }
  // 이미 HTML 이스케이프된 문자열 속 조문 표기를 버튼으로 바꿉니다
  var CITE_RE = /「([^」<>]{2,40})」\s*제\s?(\d{1,4})조(?:의\s?(\d{1,3}))?(?:\s?제\s?(\d{1,3})항)?|(?<![가-힣])(표준 개인정보 보호지침|개인정보 보호법 시행령|개인정보 보호법|보호법|표준지침|시행령|고시|법|영)\s?제\s?(\d{1,4})조(?:의\s?(\d{1,3}))?(?:\s?제\s?(\d{1,3})항)?/g;
  function linkLaws(html) {
    return html.replace(CITE_RE, function (m, n1, j1, b1, h1, n2, j2, b2, h2) {
      var k, n, jo, b, h;
      if (n1) { n = n1.trim(); k = lawKind(n); jo = j1; b = b1; h = h1; }
      else {
        var sh = SHORT[n2];
        if (sh) { if (!lawCtxPrivacy && n2 !== '표준지침') return m; k = sh[0]; n = sh[1]; }
        else { n = n2; k = lawKind(n); }
        jo = j2; b = b2; h = h2;
      }
      if (!/^[가-힣a-z0-9 ().·ㆍ,_-]{1,100}$/i.test(n)) return m;
      return citeBtn(citeKey(k, n, jo, b, h), m);
    });
  }
  function store(k, v) { try { if (v === undefined) return W.localStorage.getItem(k); W.localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- 말풍선 ---------- */
  function scrollEnd() { chat.scrollTop = chat.scrollHeight; }
  function addMsg(who, html, wide) {
    var m = D.createElement('div'); m.className = 'msg ' + who + (wide ? ' wide' : '');
    m.innerHTML = (who === 'bot' ? '<div class="av" aria-hidden="true">🐴</div>' : '') + '<div class="bubble">' + html + '</div>';
    chat.appendChild(m); scrollEnd(); return m.querySelector('.bubble');
  }
  function chipsHtml(list, cls) {
    return '<div class="cs-chips">' + list.map(function (c) {
      return '<button type="button" class="chip-q ' + (cls || '') + '" data-q="' + esc(c.q || c) + '"' + (c.topic ? ' data-topic="' + esc(c.topic) + '"' : '') + '>' + esc(c.label || c) + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- 자료 조각(shard) 지연 로딩 ---------- */
  var shardP = {};
  function loadShard(n) {
    if (!shardP[n]) shardP[n] = fetch('assets/data/library/shard-' + n + '.json?v=' + DATA_VER, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw Error('shard ' + n); return r.json(); })
      .then(function (j) { engine.addShard(n, j); return true; })
      .catch(function (e) { delete shardP[n]; throw e; });
    return shardP[n];
  }
  function ensureShards(q) {
    var u = engine.understand(q);
    var need = engine.shardsFor(u).filter(function (n) { return !engine.loadedShards[n]; });
    return Promise.all(need.map(loadShard));
  }

  /* ---------- 섹션 그리기 ---------- */
  function sec(icon, title, body, cls) { return body ? '<section class="cs-sec ' + (cls || '') + '"><h3>' + icon + ' ' + esc(title) + '</h3>' + body + '</section>' : ''; }
  function list(items, ordered, fmt) {
    if (!items || !items.length) return '';
    var t = ordered ? 'ol' : 'ul';
    return '<' + t + ' class="cs-list">' + items.map(function (x) { return '<li>' + (fmt ? fmt(x) : refText(x)) + '</li>'; }).join('') + '</' + t + '>';
  }
  function tableHtml(tb) {
    if (!tb || !tb.rows) return '';
    return '<div class="cs-tablewrap"><table class="cs-table"><thead><tr>' + tb.head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      tb.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td>' + refText(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function lawsHtml(laws) {
    if (!laws || !laws.length) return '';
    return '<ul class="cs-laws">' + laws.map(function (l, i) {
      var key = [l.k || '법령', l.n, l.jo, l.b || 0].join('|');
      return '<li data-law="' + esc(key) + '">' + citeBtn(citeKey(l.k || '법령', l.n, l.jo, l.b, l.hang), '<b>' + esc(lawName(l)) + '</b>') + (l.label ? ' <span class="cs-muted">' + esc(l.label) + '</span>' : '') +
        (l.from ? ' <span class="cs-muted">· 인용 위치 </span>' + docBadge(l.from, l.page) : '') +
        '<span class="cs-lawbtns">' + (lawOn ? '<button type="button" class="cs-lawget" data-i="' + i + '">법제처 현행 원문 보기</button>' : '') +
        '<a href="' + esc(lawLink(l)) + '" target="_blank" rel="noopener noreferrer">국가법령정보센터 ↗</a></span><div class="cs-lawbody" hidden></div></li>';
    }).join('') + '</ul>' + (lawOn ? '' : '<p class="cs-muted cs-small">법제처 실시간 조회가 연결되지 않아 원문 바로가기 링크로 안내합니다.</p>');
  }
  function refsHtml(refs) {
    if (!refs || !refs.length) return '';
    var by = {}, order = [];
    refs.forEach(function (r) { if (!by[r.d]) { by[r.d] = []; order.push(r.d); } if (by[r.d].indexOf(r.p) < 0) by[r.d].push(r.p); });
    return '<ul class="cs-list cs-refs">' + order.map(function (id) {
      var d = docById[id]; if (!d) return '';
      return '<li><b>' + esc(stripExt(d.name)) + '</b> <span class="cs-muted">(' + esc(yearText(d)) + ' · ' + esc(d.pub || '') + ')</span> — ' + by[id].map(function (p) { return p + '쪽'; }).join(', ') + '</li>';
    }).join('') + '</ul>';
  }
  function passagesHtml(ps, terms, title, open) {
    if (!ps || !ps.length) return '';
    return '<details class="cs-pass"' + (open ? ' open' : '') + '><summary>' + esc(title) + ' (' + ps.length + ')</summary>' + ps.map(function (p) {
      return '<blockquote class="cs-q">' + snippet(p.text, terms, 320) + '<footer>' + docBadge(p.doc, p.page) + '</footer></blockquote>';
    }).join('') + '</details>';
  }
  function caseHtml(ps, terms) {
    return ps.map(function (p) { return '<blockquote class="cs-q cs-case">' + snippet(p.text, terms, 240) + '<footer>' + docBadge(p.doc, p.page) + '</footer></blockquote>'; }).join('');
  }
  function penaltyHtml(pen, hl) {
    if (!pen) return '';
    var rows = [['행정적 처분 (과태료·과징금 등)', pen.admin], ['법적 처벌 (형벌)', pen.crim], ['공무원 징계', pen.disc]].filter(function (r) { return r[1] && r[1].length; });
    if (!rows.length) return '';
    return '<div class="cs-pen' + (hl ? ' hl' : '') + '">' + rows.map(function (r) { return '<div class="cs-pen-row"><b>' + esc(r[0]) + '</b>' + list(r[1]) + '</div>'; }).join('') + '</div>';
  }
  function nextHtml(asks, cond, related, q) {
    var h = '';
    if (cond) {
      var base = q.replace(/\s+/g, ' ').trim();
      var strip = function (x) { return x.replace(/\(.*?\)/g, '').trim(); };
      h += '<div class="cs-cond"><p>' + esc(cond.text) + '</p>' + chipsHtml([{ label: cond.a, q: base + ' ' + strip(cond.a) }, { label: cond.b, q: base + ' ' + strip(cond.b) }]) + '</div>';
    }
    if (asks && asks.length) h += '<p class="cs-sub">함께 생각해 볼 질문</p>' + list(asks.slice(0, 2), false, esc);
    if (related && related.length) h += '<p class="cs-sub">이어서 보면 좋은 주제</p>' + chipsHtml(related.filter(Boolean).map(function (t) { return { label: t.title, q: t.title, topic: t.id }; }));
    return h;
  }

  function renderTopic(a, q) {
    var t = a.topic, terms = a.u.terms;
    lawCtxPrivacy = t.cat === 2;
    var head = '<div class="cs-head"><span class="cs-cat">' + esc(CAT.cats[t.cat] || '') + '</span><span class="cs-topic">' + esc(t.title) + '</span></div>';
    var s0 = '<section class="cs-sec cs-sum"><h3>💡 핵심 요약</h3>' + t.core.map(function (c) { return '<p>' + refText(c) + '</p>'; }).join('') + '</section>';
    var s1 = '<p>' + refText(t.concept) + '</p>' + tableHtml(t.table) +
      (t.laws && t.laws.length ? '<p class="cs-sub">법령·행정규칙</p>' + lawsHtml(t.laws) : '') +
      (t.refs && t.refs.length ? '<p class="cs-sub">지침·안내서 근거</p>' + refsHtml(t.refs) : '');
    var s2 = (t.check && t.check.length ? '<p class="cs-sub">체크할 사항 (To-Do, 순서대로)</p>' + list(t.check, true) : '') +
      (t.caution && t.caution.length ? '<p class="cs-sub">유의할 사항 (Don\'t)</p>' + list(t.caution) : '');
    var s3 = '<p class="cs-sub">위반·침해·분쟁 사례 (자료 원문)</p>' + (a.cases.length ? caseHtml(a.cases, Engine.tokens(t.cq || '', []).map(Engine.compact).concat(terms)) : '<p class="cs-muted">첨부 자료에서 이 주제와 직접 맞는 사례 원문을 찾지 못했습니다.</p>') +
      '<p class="cs-sub">잘된 사례</p>' + (a.good.length ? caseHtml(a.good, terms) : '<p class="cs-muted">첨부 자료에서 이 주제의 우수사례는 확인되지 않았습니다.</p>') +
      '<p class="cs-sub">처벌·처분 기준</p>' + (penaltyHtml(t.penalty, a.wantPenalty) || '<p class="cs-muted">첨부 자료에서 이 주제의 처벌 기준 표를 확인하지 못했습니다. 법제처 원문을 확인하세요.</p>');
    var rel = (a.related || []).filter(Boolean);
    if (!rel.length) rel = (W.COUNSEL_TOPICS || []).filter(function (x) { return x.id !== t.id && (x.docs || []).some(function (d) { return (t.docs || []).indexOf(d) >= 0; }); }).slice(0, 3);
    var s4 = nextHtml(t.ask, a.cond, rel, q);
    return head + s0 + sec('📖', '1. 개념 및 법령/규칙 근거', s1) + sec('✅', '2. 실무 가이드', s2) + sec('⚖', '3. 실제 사례 및 처벌 기준', s3, a.wantPenalty ? 'hl' : '') + sec('🧭', '4. 다음 단계 안내', s4) +
      passagesHtml(a.passages, terms, '원문 근거 발췌');
  }

  function sentList(ss) { return list(ss, false, function (x) { return esc(x.s) + ' ' + docBadge(x.doc, x.page); }); }
  function renderSearch(a, q) {
    var terms = a.u.terms;
    lawCtxPrivacy = a.passages.some(function (p) { return p.cat === 2; });
    var head = '<div class="cs-head"><span class="cs-cat">자료 원문 검색</span><span class="cs-topic">준비된 주제 카드가 없어, 첨부 자료에서 찾은 문장으로 답합니다</span></div>';
    var s0 = '<section class="cs-sec cs-sum"><h3>💡 핵심 요약</h3>' + a.core.map(function (x) { return '<p>' + esc(x.s) + ' ' + docBadge(x.doc, x.page) + '</p>'; }).join('') + '</section>';
    var docs = []; a.passages.forEach(function (p) { if (docs.indexOf(p.doc) < 0) docs.push(p.doc); });
    var s1 = (a.concept.length ? sentList(a.concept) : '') + (a.laws.length ? '<p class="cs-sub">자료에 인용된 법령·행정규칙</p>' + lawsHtml(a.laws) : '') +
      '<p class="cs-sub">근거 자료</p>' + refsHtml(a.passages.map(function (p) { return { d: p.doc, p: p.page }; }));
    var s2 = (a.check.length ? '<p class="cs-sub">체크할 사항</p>' + sentList(a.check) : '') + (a.caution.length ? '<p class="cs-sub">유의할 사항</p>' + sentList(a.caution) : '');
    var s3 = (a.cases.length ? '<p class="cs-sub">관련 사례 (자료 원문)</p>' + caseHtml(a.cases, terms) : '') + (a.penalty.length ? '<p class="cs-sub">처벌·처분 관련 문장</p>' + sentList(a.penalty) : '');
    if (!s3) s3 = '<p class="cs-muted">첨부 자료에서 이 질문과 맞는 사례·처벌 기준 문장을 찾지 못했습니다.</p>';
    return head + s0 + sec('📖', '1. 개념 및 법령/규칙 근거', s1) + sec('✅', '2. 실무 가이드', s2 || '<p class="cs-muted">자료에서 절차 문장을 찾지 못했습니다. 아래 원문 발췌를 확인하세요.</p>') +
      sec('⚖', '3. 실제 사례 및 처벌 기준', s3) + sec('🧭', '4. 다음 단계 안내', nextHtml(a.ask, null, null, q)) + passagesHtml(a.passages, terms, '원문 근거 발췌', true);
  }

  function metaTable(d) {
    var rows = [['파일명', d.file], ['카테고리', CAT.cats[d.cat]], ['발행연도', yearText(d) + (d.ybasis ? ' (' + d.ybasis + ')' : '')], ['발행기관', d.pub], ['주요 대상', d.aud], ['매체(자료 유형)', d.media], ['쪽수', d.pages ? d.pages + '쪽' : '-'], ['추출 방식', d.parse]];
    if (d.dupOf) rows.push(['비고', '동일 파일이 ' + (docById[d.dupOf] ? docById[d.dupOf].file : d.dupOf) + '로도 있어 한 번만 색인했습니다.']);
    if (d.forms) rows.push(['포함 서식', d.forms.join(', ')]);
    return '<div class="cs-tablewrap"><table class="cs-table cs-meta"><tbody>' + rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1] || '-') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function renderDoc(a, q) {
    var d = a.doc;
    return '<div class="cs-head"><span class="cs-cat">자료 안내</span><span class="cs-topic">' + esc(stripExt(d.name)) + '</span></div>' + metaTable(d) +
      passagesHtml(a.passages, a.u.terms, '질문과 가까운 본문', true) +
      (a.related && a.related.filter(Boolean).length ? '<p class="cs-sub">관련 주제</p>' + chipsHtml(a.related.filter(Boolean).map(function (t) { return { label: t.title, q: t.title, topic: t.id }; })) : '');
  }

  function renderCatalog() {
    var opts = Object.keys(CAT.cats).map(function (k) { return '<option value="' + k + '">' + esc(CAT.cats[k]) + '</option>'; }).join('');
    var uniq = CAT.docs.filter(function (d) { return !d.dupOf; }).length;
    return '<div class="cs-head"><span class="cs-cat">참고자료 목록</span><span class="cs-topic">첨부 자료 ' + CAT.docs.length + '건 (중복 1건 제외 ' + uniq + '종) · 기준일 ' + esc(CAT.asof) + '</span></div>' +
      '<div class="cs-catbar"><select class="cs-catsel" aria-label="카테고리"><option value="">전체 카테고리</option>' + opts + '</select><input class="cs-catq" type="search" placeholder="파일명·기관·키워드로 거르기" aria-label="자료 거르기"></div>' +
      '<div class="cs-tablewrap cs-catlist"></div>';
  }
  function fillCatalog(root) {
    var sel = root.querySelector('.cs-catsel'), fq = root.querySelector('.cs-catq'), box = root.querySelector('.cs-catlist');
    function draw() {
      var c = sel.value, t = Engine.compact(fq.value || '');
      var rows = CAT.docs.filter(function (d) { return (!c || String(d.cat) === c) && (!t || Engine.compact([d.name, d.pub, d.aud, d.media, d.tags, d.year].join(' ')).indexOf(t) >= 0); });
      box.innerHTML = '<table class="cs-table cs-cattable"><thead><tr><th>파일명</th><th>발행연도</th><th>주요 대상</th><th>매체</th></tr></thead><tbody>' + rows.map(function (d) {
        return '<tr><td><button type="button" class="cs-doclink" data-q="' + esc(stripExt(d.name)) + ' 자료">' + esc(stripExt(d.name)) + '</button><div class="cs-muted cs-small">' + esc(d.pub || '') + ' · ' + esc(CAT.cats[d.cat] || '') + (d.dupOf ? ' · 중복본' : '') + '</div></td><td>' + esc(yearText(d)) + '</td><td>' + esc(d.aud || '') + '</td><td>' + esc(d.media || '') + '</td></tr>';
      }).join('') + '</tbody></table><p class="cs-muted cs-small">' + rows.length + '건</p>';
    }
    sel.addEventListener('change', draw); fq.addEventListener('input', draw); draw();
  }

  /* ---------- 법제처 원문 ---------- */
  var lawCache = {};
  function fetchLaw(li) {
    var key = li.getAttribute('data-law'), body = li.querySelector('.cs-lawbody'), btn = li.querySelector('.cs-lawget');
    if (!LAW || !body) return;
    var p = key.split('|'), arg = { kind: p[0], name: p[1], jo: Number(p[2]), branch: Number(p[3]) };
    body.hidden = false; body.innerHTML = '<span class="cs-muted">법제처에서 현행 조문을 불러오는 중…</span>';
    if (btn) btn.disabled = true;
    var pr = lawCache[key] || (lawCache[key] = LAW.article(arg));
    pr.then(function (r) {
      body.innerHTML = '<div class="cs-lawtext">' + esc(r.content).replace(/\n/g, '<br>') + '</div><p class="cs-muted cs-small">출처: ' + esc(r.source) + ' · 조회 시점 현행 원문</p>';
      if (btn) btn.textContent = '현행 원문 확인됨';
    }).catch(function () {
      delete lawCache[key];
      body.innerHTML = '<span class="cs-muted">법제처 원문을 지금 불러오지 못했습니다. 오른쪽 국가법령정보센터 링크로 확인하세요.</span>';
      if (btn) btn.disabled = false;
    });
  }

  /* 조문 원문을 채팅창 새 말풍선으로 보여 줍니다(법제처 현행 → 실패 시 첨부 자료 인용) */
  var CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  function paragraph(text, hang) {
    if (!hang || hang > 20) return null;
    var a = text.indexOf(CIRCLED[hang - 1]); if (a < 0) return null;
    var b = hang < 20 ? text.indexOf(CIRCLED[hang], a + 1) : -1;
    return text.slice(a, b > a ? b : undefined).trim();
  }
  function corpusQuote(n, jo, b, hang) {
    var art = '제' + jo + '조' + (b ? '의' + b : '');
    var names = [Engine.compact(n)]; if (n === '표준 개인정보 보호지침') names.push('표준지침');
    if (n === '개인정보 보호법') names.push('보호법');
    var pats = names.map(function (x) { return x + art + (hang ? '제' + hang + '항' : ''); });
    var out = [], seen = {};
    for (var i = 0; i < engine.chunks.length && out.length < 2; i++) {
      var c = engine.chunks[i];
      if (pats.some(function (p) { return c[3].indexOf(p) >= 0; }) && !seen[c[0] + c[1]]) { seen[c[0] + c[1]] = 1; out.push({ doc: c[0], page: c[1], text: c[2] }); }
    }
    return { list: out, terms: pats };
  }
  function showLaw(key) {
    var p = key.split('|'), k = p[0], n = p[1], jo = Number(p[2]), b = Number(p[3]) || 0, hang = Number(p[4]) || 0;
    var l = { k: k, n: n, jo: jo, b: b };
    var title = lawName(l) + (hang ? ' 제' + hang + '항' : '');
    var link = '<a class="cs-lawlink" href="' + esc(lawLink(l)) + '" target="_blank" rel="noopener noreferrer">국가법령정보센터에서 보기</a>';
    var bub = addMsg('bot', '<p class="cs-sub">조문 원문</p><p class="cs-lawtitle"><b>' + esc(title) + '</b></p><div class="cs-lawtext"><span class="cs-muted">법제처에서 현행 조문을 불러오는 중…</span></div>', true);
    function fallback() {
      var q = corpusQuote(n, jo, b, hang);
      var body = q.list.length
        ? '<p class="cs-muted cs-small">법제처 원문을 지금 불러오지 못해, 첨부 자료에 인용된 내용을 보여 드립니다. 현행 조문과 다를 수 있으니 링크에서 확인하세요.</p>' +
          q.list.map(function (x) { return '<blockquote class="cs-q">' + snippet(x.text, q.terms, 360) + '<footer>' + docBadge(x.doc, x.page) + '</footer></blockquote>'; }).join('')
        : '<p class="cs-muted">법제처 원문을 지금 불러오지 못했습니다. 아래 링크에서 현행 조문을 확인하세요.</p>';
      bub.querySelector('.cs-lawtext').outerHTML = '<div>' + body + '</div>';
      bub.insertAdjacentHTML('beforeend', '<p>' + link + '</p>');
    }
    if (!LAW || !LAW.enabled()) { fallback(); return; }
    var ck = citeKey(k, n, jo, b, 0);
    var pr = lawCache[ck] || (lawCache[ck] = LAW.article({ kind: k, name: n, jo: jo, branch: b }));
    pr.then(function (r) {
      var full = String(r.content || ''), para = paragraph(full, hang);
      var html = para
        ? '<div class="cs-lawtext cs-hl">' + esc(para).replace(/\n/g, '<br>') + '</div><details class="cs-pass"><summary>조문 전체 보기</summary><div class="cs-lawtext">' + esc(full).replace(/\n/g, '<br>') + '</div></details>'
        : '<div class="cs-lawtext">' + esc(full).replace(/\n/g, '<br>') + '</div>' + (hang ? '<p class="cs-muted cs-small">제' + hang + '항을 따로 찾지 못해 조문 전체를 보여 드립니다.</p>' : '');
      bub.querySelector('.cs-lawtext').outerHTML = html;
      bub.insertAdjacentHTML('beforeend', '<p class="cs-muted cs-small">출처: ' + esc(r.source) + ' · 조회 시점 현행 원문 · ' + link + '</p>');
    }).catch(function () { delete lawCache[ck]; fallback(); });
  }

  /* ---------- 선택형 AI 정리(근거 범위 안에서만) ---------- */
  function evidenceOf(a) {
    var ev = [];
    function add(ref, text) { if (text) ev.push({ ref: ref, text: String(text).slice(0, 700) }); }
    if (a.kind === 'topic') {
      var t = a.topic;
      t.core.forEach(function (c) { add('주제카드:' + t.title, c); });
      add('개념', t.concept);
      (t.check || []).forEach(function (c) { add('체크', c); });
      (t.caution || []).forEach(function (c) { add('유의', c); });
      ['admin', 'crim', 'disc'].forEach(function (k) { ((t.penalty || {})[k] || []).forEach(function (c) { add('처벌', c); }); });
      if (Coach) (t.laws || []).forEach(function (l) { add('법령 요약:' + Coach.citeOf(l), Coach.lawSummary(l, t, W.LAW_SUMMARY).lines.join(' ')); });
    } else if (a.kind === 'search') {
      a.core.concat(a.check, a.caution, a.penalty).forEach(function (x) { add((docById[x.doc] || {}).name + ' p.' + x.page, x.s); });
    }
    (a.passages || []).slice(0, 3).forEach(function (p) { add(stripExt((docById[p.doc] || {}).name) + ' p.' + p.page, p.text); });
    return ev.slice(0, 18);
  }
  function aiRewrite(a, q, bubble) {
    if (!aiOn || (a.kind !== 'topic' && a.kind !== 'search') || !LAW || !LAW.origin()) return;
    var box = D.createElement('div'); box.className = 'cs-ai'; box.innerHTML = '<p class="cs-sub">🤖 AI 정리 (아래 근거 문장 안에서만 다시 쓴 참고용 요약)</p><p class="cs-muted">정리하는 중…</p>';
    bubble.insertBefore(box, bubble.children[1] || null);
    fetch(LAW.origin() + '/chat', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: q.slice(0, 300), evidence: evidenceOf(a) }), signal: AbortSignal.timeout(20000) })
      .then(function (r) { if (!r.ok) throw Error('status ' + r.status); return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !j.text) throw Error('empty');
        box.innerHTML = '<p class="cs-sub">🤖 AI 정리 (근거 문장 안에서만 다시 쓴 참고용 요약 · 판단은 아래 근거로)</p><div class="cs-aitext">' + esc(j.text).replace(/\n/g, '<br>') + '</div>';
      })
      .catch(function () { box.innerHTML = '<p class="cs-muted cs-small">AI 정리를 지금 사용할 수 없어 근거형 답변만 보여 드립니다.</p>'; });
  }

  /* ---------- 시민용 모드: 해요체 · 핵심 먼저 · 4줄 이내 ---------- */
  var CITIZEN_FALLBACK = '정확한 법령 검토와 개별 확인을 위해 담당 부서 연결이 필요한 내용이에요. 아래 공식 민원 창구로 문의해 주시면 담당자가 자세히 안내해 드릴게요.';
  var CITIZEN_UNCLEAR = '질문하신 내용을 정확히 이해하지 못했어요. 어떤 상황인지 조금 더 자세히 알려주시겠어요?';
  var DESK = W.COUNSEL_DESKS || {};
  var CZ = W.COUNSEL_CITIZEN || {};
  var FAQ = W.COUNSEL_CITIZEN_FAQ || [];
  var AGENCY = (W.APP_CONFIG || {}).AGENCY || {};
  var SENSITIVE = [
    [/01[016789][\s-]?\d{3,4}[\s-]?\d{4}/g, '전화번호'],
    [/\d{6}\s?-?\s?[1-8]\d{6}/g, '주민등록번호'],
    [/\d{2,6}-\d{2,6}-\d{2,8}/g, '계좌·카드번호'],
    [/\b\d{11,16}\b/g, '계좌·카드번호'],
    [/(비밀번호|비번|패스워드|password|pw)\s*(은|는|:|=)?\s*\S{4,}/gi, '비밀번호']
  ];
  function maskSensitive(q) {
    var kinds = [];
    SENSITIVE.forEach(function (r) { q = q.replace(r[0], function () { if (kinds.indexOf(r[1]) < 0) kinds.push(r[1]); return '[가림]'; }); });
    return { q: q, kinds: kinds };
  }
  var INDIVIDUAL = /(제|저의|내|나의|우리)\s?(민원|신청|신고|사건|건).{0,10}(처리|진행|상태|결과|언제|어떻게 ?됐)|처리\s?(상태|현황)|진행\s?상황|처분\s?결과|(제|내|저)\s?(경우|사건).{0,12}(처벌|과태료|벌금|위법|불법|소송|이길|받나|되나)/;
  /* 합니다체 문장 끝을 해요체로 바꿉니다(뜻은 그대로 두고 어미만 바꿈) */
  var END = '(?=[^가-힣]|$)';
  function hj(c) { var x = c.charCodeAt(0) - 0xAC00; return x < 0 || x > 11171 ? null : { i: Math.floor(x / 588), v: Math.floor((x % 588) / 28), f: x % 28 }; }
  function hc(i, v, f) { return String.fromCharCode(0xAC00 + i * 588 + v * 28 + f); }
  function bright(v) { return v === 0 || v === 8 || v === 2 || v === 9; } // ㅏ ㅗ ㅑ ㅘ
  function irr(s) {
    var IRR = { '만듭니다': '만들어요', '압니다': '알아요', '삽니다': '살아요', '엽니다': '열어요', '겁니다': '걸어요', '놉니다': '놀아요', '늡니다': '늘어요',
      '다릅니다': '달라요', '아닙니다': '아니에요', '고릅니다': '골라요', '부릅니다': '불러요', '빠릅니다': '빨라요', '오릅니다': '올라요', '모릅니다': '몰라요', '따릅니다': '따라요', '치릅니다': '치러요',
      '쉽습니다': '쉬워요', '어렵습니다': '어려워요', '가깝습니다': '가까워요', '무겁습니다': '무거워요', '가볍습니다': '가벼워요', '새롭습니다': '새로워요', '고맙습니다': '고마워요' };
    return s.replace(new RegExp('(' + Object.keys(IRR).join('|') + ')' + END, 'g'), function (m) { return IRR[m]; });
  }
  function haeyo(s) {
    s = irr(String(s || ''))
      .replace(new RegExp('됩니다' + END, 'g'), '돼요').replace(new RegExp('합니다' + END, 'g'), '해요')
      .replace(new RegExp('([가-힣])입니다' + END, 'g'), function (m, c) { var h = hj(c); return c + (h && h.f ? '이에요' : '예요'); })
      .replace(new RegExp('([가-힣])습니다' + END, 'g'), function (m, c) { var h = hj(c); return c + (h && bright(h.v) ? '아요' : '어요'); });
    // ㄹ 탈락 동사는 따로 바꿉니다(만듭니다 → 만들어요)
    // 받침 ㅂ + 니다 (예: 거칩니다 → 거쳐요, 봅니다 → 봐요, 줍니다 → 줘요)
    return s.replace(new RegExp('([가-힣])니다' + END, 'g'), function (m, c) {
      var h = hj(c); if (!h || h.f !== 17) return m;
      var v = h.v, out;
      if (v === 20) out = h.i === 11 ? hc(h.i, 6, 0) : hc(h.i, 6, 0);           // ㅣ → ㅕ (치→쳐, 기→겨)
      else if (v === 8) out = hc(h.i, 9, 0);                                     // ㅗ → ㅘ
      else if (v === 13) out = hc(h.i, 14, 0);                                   // ㅜ → ㅝ
      else if (v === 18) out = hc(h.i, 4, 0);                                    // ㅡ → ㅓ
      else out = hc(h.i, v, 0);                                                  // ㅏ ㅓ ㅐ ㅔ ㅚ 등
      return out + '요';
    });
  }
  function plain(s) {
    s = String(s || '').replace(/\s*[—-]\s*D\d{2} p[\d~∼\-, p]+$/, '')
      .replace(/,\s*D\d{2}(?: ?p[\d~∼\-]+(?:, ?p?[\d~∼\-]+)*)?\s*\)/g, ')')
      .replace(/\(\s*D\d{2}(?: ?p[\d~∼\-]+(?:, ?p?[\d~∼\-]+)*)?\s*\)/g, '')
      .replace(/\bD\d{2}(?: ?p[\d~∼\-]+)?/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
    return haeyo(s);
  }
  function firstSentence(s) { var m = String(s || '').match(/^.+?(?:다|요)\.(?=\s|$)/); return m ? m[0] : String(s || ''); }
  function actButtons(keys, laws) {
    var h = [];
    (keys || []).forEach(function (k) {
      var d = DESK[k]; if (!d) return;
      if (d.agency) {
        var g = AGENCY[d.agency] || {}; if (!g.dept || !(g.tel || g.url)) return;
        d = { label: g.dept + (g.tel ? ' ' + g.tel : ''), tel: g.tel, url: g.url };
      }
      if (d.tel) h.push('<a class="cz-act cz-tel" href="tel:' + esc(String(d.tel).replace(/[^0-9+]/g, '')) + '">전화 ' + esc(d.label) + '</a>');
      else if (d.url) h.push('<a class="cz-act" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + esc(d.label) + ' 바로가기</a>');
    });
    (laws || []).slice(0, 1).forEach(function (l) { h.push(citeBtn(citeKey(l.k || '법령', l.n, l.jo, l.b, l.hang), esc(lawName(l) + (l.hang ? ' 제' + l.hang + '항' : '')) + ' 원문 보기', 'cz-act')); });
    return h.length ? '<div class="cz-acts">' + h.join('') + '</div>' : '';
  }
  function deskHtml() { return actButtons(['agencyPrivacy', 'kisa', 'kopico', 'police182', 'portal']); }
  function czSources(refs, laws) {
    var parts = [];
    (laws || []).slice(0, 3).forEach(function (l) { parts.push(citeBtn(citeKey(l.k || '법령', l.n, l.jo, l.b, l.hang), esc(lawName(l) + (l.hang ? ' 제' + l.hang + '항' : '')), 'cz-cite')); });
    var seen = {};
    (refs || []).forEach(function (r) { if (r.faq) { parts.push('운영 기관 제공 FAQ'); return; } var d = docById[r.d]; if (!d || seen[r.d] || Object.keys(seen).length >= 2) return; seen[r.d] = 1; var nmS = short(d.name, 30); parts.push(esc(nmS) + (nmS.indexOf(String(d.year).slice(0, 4)) >= 0 ? '' : '(' + esc(yearText(d)) + ')')); });
    return parts.length ? '<p class="cz-src">근거: ' + parts.join(' · ') + '</p>' : '';
  }
  function cardHtml(card, laws) {
    return '<p class="cz-lead">' + esc(card.lead) + '</p><ul class="cz-list">' + card.items.slice(0, 3).map(function (it) { return '<li><b>' + esc(it[0]) + '</b> ' + esc(it[1]) + '</li>'; }).join('') + '</ul>' +
      actButtons(card.act, []) + czSources(card.refs, card.cite || laws || []);
  }
  function matchFaq(q) { for (var i = 0; i < FAQ.length; i++) if (FAQ[i].match.test(q)) return FAQ[i]; return null; }
  function renderCitizen(a, q) {
    var more = W.COUNSEL_MODE_LOCK ? '' : chipsHtml([{ label: '공무원용 5단계 상세 답변 보기', q: q, topic: a.kind === 'topic' ? a.topic.id : '' }], 'cz-more');
    var cards = a.kind === 'topic' && CZ[a.topic.id];
    var card = cards ? [].concat(cards).filter(function (c) { return !c.when || c.when.test(q); })[0] : null;
    if (card) return cardHtml(card, card.law ? [card.law] : a.topic.laws) + more;
    var lead, bullets = [], refs = [], laws = [], extra = '';
    if (a.kind === 'topic') {
      var t = a.topic;
      lead = plain(t.core[0]);
      var cs = firstSentence(t.concept);
      bullets = [t.core[1], /^(법|시행령|고시) 제|^「/.test(cs) ? '' : cs].map(plain).filter(Boolean);
      if (bullets.length < 2) bullets = bullets.concat((t.caution || []).map(plain));
      refs = t.refs; laws = t.laws;
      if (a.cond) extra = '<div class="cz-cond"><p>질문하신 상황은 대상과 조건에 따라 기준이 달라질 수 있어요. [' + esc(a.cond.a) + '] 또는 [' + esc(a.cond.b) + '] 중 어느 쪽인지 알려주시면 정확히 안내해 드릴게요.</p>' +
        chipsHtml([{ label: a.cond.a, q: q + ' ' + a.cond.a.replace(/\(.*?\)/g, '') }, { label: a.cond.b, q: q + ' ' + a.cond.b.replace(/\(.*?\)/g, '') }]) + '</div>';
    } else if (a.kind === 'search') {
      lead = plain(a.core[0] && a.core[0].s);
      bullets = a.core.slice(1).concat(a.check).map(function (x) { return plain(x.s); }).filter(Boolean);
      refs = a.passages.map(function (p) { return { d: p.doc, p: p.page }; }); laws = a.laws;
    }
    var uniq = []; bullets.forEach(function (b) { if (b !== lead && uniq.indexOf(b) < 0) uniq.push(b); });
    uniq = uniq.slice(0, 3);
    while (uniq.length && (lead + uniq.join('')).length > 200) uniq.pop(); // 모바일 한눈 분량(200자) 유지
    lawCtxPrivacy = true;
    return '<p class="cz-lead">' + linkLaws(esc(lead)) + '</p>' + (uniq.length ? '<ul class="cz-list">' + uniq.map(function (b) { return '<li>' + linkLaws(esc(b)) + '</li>'; }).join('') + '</ul>' : '') +
      extra + actButtons(['kisa'], []) + czSources(refs, laws) + more;
  }
  function citizenFallback(text, masked) {
    return '<p>' + esc(text) + '</p>' + (text === CITIZEN_FALLBACK ? deskHtml() : '') + (masked ? '' : '');
  }


  /* ---------- AI 실무 코치 모드: 3단 레이어(결론 → 상세 아코디언 → 역질문·퀴즈·문의) ---------- */
  var Coach = W.CounselCoach || null, CO = W.COUNSEL_COACH || null;
  var LAWSUM = W.LAW_SUMMARY || null;
  var gloss = Coach && CO ? Coach.makeGloss(CO.gloss) : function (x) { return x; };
  var gloss1 = Coach && CO ? Coach.makeGloss(CO.gloss, 2) : function (x) { return x; }; // 1단계는 300자 안에 들도록 2개까지만
  var sumOn = false; // Worker의 원문→3줄 요약 변환기 사용 가능 여부(/health summary)
  var lastTopic = null;
  var VCLS = { '가능': 'ok', '조건부 가능': 'cond', '불가': 'bad', '확인 필요': 'chk', '필수': 'must' };
  function gt(s, used, g) { return refText((g || gloss)(Coach ? Coach.plain(s) : s, used)); }
  function oxStore(id, v) { var all = {}; try { all = JSON.parse(store('coach-ox') || '{}') || {}; } catch (e) { all = {}; } if (v === undefined) return id ? all[id] : all; all[id] = v; store('coach-ox', JSON.stringify(all)); return v; }
  function quizHref(topicId) { return (CO && CO.quizPage || 'quiz.html') + (topicId ? '?topic=' + encodeURIComponent(topicId) : ''); }
  function oxHtml(x) {
    if (!x) return '';
    var mine = oxStore(x.id);
    return '<div class="co-ox" data-oxid="' + esc(x.id) + '"><p class="co-ox-q"><b>OX</b> ' + esc(x.s) + '</p><div class="co-ox-pick">' +
      ['O', 'X'].map(function (o) { return '<button type="button" class="co-ox-b' + (mine && mine.pick === o ? ' sel' : '') + '" data-ox="' + esc(x.id) + '" data-pick="' + o + '" aria-label="' + (o === 'O' ? '맞다' : '아니다') + '">' + o + '</button>'; }).join('') +
      '<span class="co-ox-vd" aria-live="polite"></span></div><div class="co-ox-a" hidden></div></div>';
  }
  function oxReveal(box, x, pick) {
    var ok = pick === x.a;
    box.querySelectorAll('.co-ox-b').forEach(function (b) { b.classList.toggle('sel', b.getAttribute('data-pick') === pick); b.disabled = true; });
    box.querySelector('.co-ox-vd').innerHTML = ok ? '<span class="good">정답이에요!</span>' : '<span class="miss">아쉬워요, 정답은 ' + esc(x.a) + '예요.</span>';
    var a = box.querySelector('.co-ox-a'); a.hidden = false;
    a.innerHTML = '<p><b>정답 ' + esc(x.a) + '</b> · ' + refText(x.ex) + '</p>' +
      ((x.law || []).length || (x.ref || []).length ? '<p class="cs-muted cs-small">근거: ' + (x.law || []).map(function (l) { return citeBtn(citeKey(l.k, l.n, l.jo, l.b, l.hang), esc(Coach.citeOf(l))); }).join(' · ') +
        ((x.law || []).length && (x.ref || []).length ? ' · ' : '') + (x.ref || []).map(function (r) { return docBadge(r.d, r.p); }).join(' ') + '</p>' : '');
  }
  function coachBtns(topicId, q) {
    return '<div class="co-btns"><a class="co-btn co-quiz" href="' + esc(quizHref(topicId)) + '">🎯 방금 배운 내용 OX 퀴즈 풀기 (퀴즈 페이지 이동)</a>' +
      '<button type="button" class="co-btn co-esc">🚨 긴급/모호한 사안 전문가(보안팀/DPO) 문의</button>' +
      (q ? '<button type="button" class="co-btn co-more cz-more" data-q="' + esc(q) + '"' + (topicId ? ' data-topic="' + esc(topicId) + '"' : '') + '>📚 5단계 상세 답변 보기</button>' : '') + '</div>';
  }
  function topicChips(list) {
    return '<div class="cs-chips co-chips">' + list.map(function (c) { return '<button type="button" class="chip-q co-chip" data-q="' + esc(c.q || c.label) + '"' + (c.topic ? ' data-topic="' + esc(c.topic) + '"' : '') + '>' + esc(c.label) + '</button>'; }).join('') + '</div>';
  }
  function stage1Html(v, title, why, warn, type) {
    var used = {};
    return '<section class="co-s1"><div class="co-head"><span class="co-badge co-v-' + (VCLS[v] || 'chk') + '">' + esc(v) + '</span><span class="co-topic">' + esc(title) + '</span>' +
      (type ? '<span class="co-type" title="질문 유형">' + (type === 'A' ? '상황 질문' : '단어 조합 질문') + '</span>' : '') + '</div>' +
      '<p class="co-why">' + gt(haeyo(why), used, gloss1) + '</p>' + (warn ? '<p class="co-warn">⚠️ <b>주의:</b> ' + gt(haeyo(warn), used, gloss1) + '</p>' : '') + '</section>';
  }
  function coachLawItems(laws, topic) {
    if (!laws || !laws.length) return '<p class="cs-muted">이 주제에 연결된 법령 조문이 없습니다. 지침·안내서 근거를 확인하세요.</p>';
    return '<ul class="co-laws">' + laws.map(function (l) {
      var k = l.k || '법령', sm = Coach.lawSummary(l, topic || { core: [''], laws: laws }, LAWSUM);
      return '<li class="co-law" data-law="' + esc([k, l.n, l.jo, l.b || 0, l.hang || 0].join('|')) + '"><p class="co-lname"><b>' + esc(lawName(l)) + (l.hang ? ' 제' + l.hang + '항' : '') + '</b>' + (l.label ? ' <span class="cs-muted">' + esc(l.label) + '</span>' : '') + '</p>' +
        '<div class="co-lsum">' + sm.lines.map(function (x) { return '<p>' + esc(gloss(x, {})) + '</p>'; }).join('') + '</div>' +
        '<p class="co-cite">(근거: ' + esc(Coach.citeOf(l)) + ')' + (sm.from ? ' <span class="cs-muted cs-small">· 요약 출처: ' + esc(sm.from) + '</span>' : '') + '</p>' +
        '<span class="cs-lawbtns">' + citeBtn(citeKey(k, l.n, l.jo, l.b, l.hang), '📜 조문 원문 보기') + '<a href="' + esc(lawLink(l)) + '" target="_blank" rel="noopener noreferrer">국가법령정보센터 ↗</a></span></li>';
    }).join('') + '</ul><p class="cs-muted cs-small">답변에는 조문 원문 대신 쉬운 말 요약만 보여 드립니다. 원문은 "조문 원문 보기"를 눌렀을 때만 따로 표시합니다.</p>';
  }
  /* 법령 아코디언을 열면 Worker의 원문→3줄 요약(검증 통과분)으로 바꿉니다. 실패하면 위 요약을 그대로 둡니다 */
  function liveSummaries(box) {
    if (!sumOn || !LAW || !LAW.summary || box.getAttribute('data-live')) return;
    box.setAttribute('data-live', '1');
    box.querySelectorAll('.co-law').forEach(function (li) {
      var p = li.getAttribute('data-law').split('|'), arg = { kind: p[0], name: p[1], jo: Number(p[2]), branch: Number(p[3]) || 0, hang: Number(p[4]) || 0 };
      var key = 'S|' + li.getAttribute('data-law');
      var pr = lawCache[key] || (lawCache[key] = LAW.summary(arg));
      pr.then(function (r) {
        li.querySelector('.co-lsum').innerHTML = r.summary.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('');
        li.querySelector('.co-cite').innerHTML = '(근거: ' + esc(r.cite || Coach.citeOf({ n: arg.name, jo: arg.jo, b: arg.branch, hang: arg.hang })) + ') <span class="cs-muted cs-small">· 법제처 현행 조문을 3줄로 요약(조회 시점)</span>';
      }).catch(function () { delete lawCache[key]; });
    });
  }
  function docsHtml(refs) {
    if (!refs || !refs.length) return '<p class="cs-muted">연결된 지침·안내서가 없습니다.</p>';
    var forms = [], seen = {};
    refs.forEach(function (r) { var d = docById[r.d]; if (d && d.forms && !seen[r.d]) { seen[r.d] = 1; forms = forms.concat(d.forms); } });
    return '<p class="cs-sub">관련 지침·안내서 (쪽은 PDF 기준)</p>' + refsHtml(refs) +
      (forms.length ? '<p class="cs-sub">필요 양식</p>' + list(forms, false, esc) : '<p class="cs-muted cs-small">연결된 자료에 별도 양식 목록은 확인되지 않았습니다. 체크리스트의 절차와 위 자료의 서식 부분을 확인하세요.</p>');
  }
  function acc(icon, title, body, cls) { return '<details class="co-acc' + (cls ? ' ' + cls : '') + '"><summary>' + icon + ' ' + esc(title) + '</summary><div class="co-acc-in">' + body + '</div></details>'; }
  function narrowHtml(a, q, type) {
    var t = a.topic, base = q.replace(/\s+/g, ' ').trim(), items = null, title = '🧭 상황을 좁혀 볼까요?';
    if (a.cond) { items = [{ label: a.cond.a, q: base + ' ' + a.cond.a.replace(/\(.*?\)/g, '').trim(), topic: t.id }, { label: a.cond.b, q: base + ' ' + a.cond.b.replace(/\(.*?\)/g, '').trim(), topic: t.id }]; title = '🧭 조건에 따라 기준이 달라져요. 어느 쪽인가요?'; }
    else if (type === 'B') {
      var sp = (CO.split || {})[t.id];
      if (sp) items = sp.map(function (x) { var tt = (W.COUNSEL_TOPICS || []).filter(function (z) { return z.id === x.topic; })[0]; return { label: x.label, q: tt ? tt.title : x.label, topic: x.topic }; });
      else {
        var rel = (a.related || []).filter(Boolean);
        if (rel.length < 2) rel = rel.concat((W.COUNSEL_TOPICS || []).filter(function (x) { return x.id !== t.id && rel.indexOf(x) < 0 && (x.docs || []).some(function (d) { return (t.docs || []).indexOf(d) >= 0; }); }));
        items = rel.slice(0, 2).map(function (x) { return { label: '혹시 "' + x.title + '" 상황인가요?', q: x.title, topic: x.id }; });
      }
    }
    if (!items || !items.length) return '';
    var useTopic = !a.cond;
    return '<p class="co-sub">' + esc(title) + '</p>' + topicChips(items.slice(0, 2).map(function (x) { return { label: x.label, q: x.q, topic: useTopic ? x.topic : null }; }));
  }
  function renderCoachTopic(a, q, type) {
    var t = a.topic, s = Coach.stage1(t, CO, a);
    lawCtxPrivacy = t.cat === 2; lastTopic = t.id;
    var s1 = stage1Html(s.v, t.title, s.why, s.warn, type);
    var used = {};
    var chk = (t.check && t.check.length ? '<p class="cs-sub">순서대로 체크하세요</p><div class="co-chk">' + t.check.map(function (c, i) { return '<label class="chk-i"><input type="checkbox"><span>' + (i + 1) + '. ' + gt(c, used) + '</span></label>'; }).join('') + '</div>' : '') +
      (t.caution && t.caution.length ? '<p class="cs-sub">⛔ 하지 말아야 할 것</p>' + list(t.caution, false, function (x) { return gt(x, used); }) : '') +
      (t.refs && t.refs.length ? '<p class="cs-muted cs-small">절차 근거: ' + t.refs.map(function (r) { return docBadge(r.d, r.p); }).join(' ') + '</p>' : '');
    var s2 = '<section class="co-s2"><p class="co-lab">[ 클릭하여 자세히 보기 ]</p>' +
      acc('📋', '단계별 처리 절차 및 체크리스트 (지침·안내서 기준)', chk || '<p class="cs-muted">자료에서 절차 문장을 찾지 못했습니다.</p>') +
      acc('⚖️', '관련 법령·고시 요약 보기 (법제처 조문 요약)', coachLawItems(t.laws, t), 'co-acc-law') +
      acc('📄', '관련 지침명 및 필요 양식 안내', docsHtml(t.refs) + passagesHtml(a.passages, a.u.terms, '자료 원문 발췌')) + '</section>';
    var ox = (type === 'A' || CO.ox.some(function (x) { return x.topic === t.id; })) ? Coach.oxFor(t.id, CO.ox, 1, new Date().getDate())[0] : null;
    var s3 = '<section class="co-s3">' + narrowHtml(a, q, type) +
      (t.ask && t.ask.length ? '<p class="co-sub">🧠 중급 실무자로 한 걸음: 생각해 볼 질문</p>' + list(t.ask.slice(0, 2), false, function (x) { return esc(gloss(x, used)); }) : '') +
      (ox ? '<p class="co-sub">🎮 실전 감각 테스트 (OX)</p>' + oxHtml(ox) : '') + coachBtns(t.id, q) + '</section>';
    return s1 + s2 + s3;
  }
  function renderCoachSearch(a, q, type) {
    lawCtxPrivacy = a.passages.some(function (p) { return p.cat === 2; });
    var why = a.core.map(function (x) { return x.s; }).slice(0, 1)[0] || '';
    var warn = (a.caution[0] || {}).s || '';
    if ((why + warn).length > 260) warn = '';
    var s1 = stage1Html('확인 필요', '준비된 주제 카드가 없어 자료 원문으로 안내해요', why, warn, type) + '<p class="cs-muted cs-small">근거: ' + a.core.slice(0, 1).concat(a.caution.slice(0, 1)).map(function (x) { return docBadge(x.doc, x.page); }).join(' ') + '</p>';
    var used = {};
    var chk = a.check.length ? '<div class="co-chk">' + a.check.map(function (x, i) { return '<label class="chk-i"><input type="checkbox"><span>' + (i + 1) + '. ' + gt(x.s, used) + ' ' + docBadge(x.doc, x.page) + '</span></label>'; }).join('') + '</div>' : '<p class="cs-muted">자료에서 절차 문장을 찾지 못했습니다. 아래 원문 발췌를 확인하세요.</p>';
    var s2 = '<section class="co-s2"><p class="co-lab">[ 클릭하여 자세히 보기 ]</p>' + acc('📋', '단계별 처리 절차 및 체크리스트 (지침·안내서 기준)', chk) +
      acc('⚖️', '관련 법령·고시 요약 보기 (법제처 조문 요약)', coachLawItems(a.laws, null), 'co-acc-law') +
      acc('📄', '관련 지침명 및 필요 양식 안내', docsHtml(a.passages.map(function (p) { return { d: p.doc, p: p.page }; })) + passagesHtml(a.passages, a.u.terms, '자료 원문 발췌')) + '</section>';
    var s3 = '<section class="co-s3">' + (a.ask && a.ask.length ? '<p class="co-sub">🧠 상황을 좁혀 볼까요?</p>' + list(a.ask.slice(0, 2), false, esc) : '') +
      '<p class="co-sub">🎮 실전 감각 테스트 (OX)</p>' + oxHtml(Coach.oxFor(null, CO.ox, 1, new Date().getDate())[0]) + coachBtns(null, q) + '</section>';
    return s1 + s2 + s3;
  }
  function renderProbe(domain) {
    var set = (CO.probe || {})[domain] || CO.probe.privacy;
    return '<p class="co-calm">' + esc(CO.calm) + '</p>' + set.map(function (p, i) {
      return '<div class="co-probe"><p class="co-pq"><b>Q' + (i + 1) + '.</b> ' + esc(gloss(p.q, {})) + '</p>' + topicChips(p.chips) + '</div>';
    }).join('') + '<p class="cs-muted cs-small">가장 가까운 답을 누르면 그 상황의 기준부터 3단계로 안내해 드려요.</p>' + coachBtns(null, '');
  }
  function renderQuizAsk() {
    var list2 = Coach.oxFor(lastTopic, CO.ox, 2, new Date().getDate());
    return '<p class="co-calm">좋아요! 맛보기로 ' + list2.length + '문제 풀어 볼까요? 더 많은 문제는 퀴즈 페이지에서 이어서 풀 수 있어요.</p>' + list2.map(oxHtml).join('') +
      '<div class="co-btns"><a class="co-btn co-quiz" href="' + esc(quizHref(lastTopic)) + '">[ 🎮 실전 OX 퀴즈 풀고 감각 익히기 (페이지 이동) ]</a><a class="co-btn" href="security-ox.html">⏱ 5분 타임어택 보안 OX 게임</a></div>';
  }
  function escalateHtml() {
    var E = CO.escalate, rows = [];
    E.inside.forEach(function (x) {
      var g = AGENCY[x.agency] || {};
      var link = g.dept && (g.tel || g.url) ? (g.tel ? '<a class="cz-act cz-tel" href="tel:' + esc(String(g.tel).replace(/[^0-9+]/g, '')) + '">전화 ' + esc(g.dept + ' ' + g.tel) + '</a>' : '<a class="cz-act" href="' + esc(g.url) + '" target="_blank" rel="noopener noreferrer">' + esc(g.dept) + ' 바로가기</a>')
        : '<p class="cs-muted cs-small">기관 연락처가 아직 등록되지 않았습니다. 관리자는 assets/config.js의 APP_CONFIG.AGENCY.' + esc(x.agency) + '에 부서·대표번호를 적어 주세요.</p>';
      rows.push('<li><b>' + esc(x.role) + '</b> <span class="cs-muted">· ' + esc(x.when) + '</span>' + link + '</li>');
    });
    var out = E.outside.map(function (x) {
      return '<li><b>' + esc(x.label) + '</b> <span class="cs-muted">· ' + esc(x.note) + '</span> ' + (x.tel ? '<a href="tel:' + esc(x.tel) + '">☎ ' + esc(x.tel) + '</a> ' : '') + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">바로가기 ↗</a>' : '') + ' ' + (x.ref || []).map(function (r) { return docBadge(r.d, r.p); }).join(' ') + '</li>';
    }).join('');
    return '<p class="cs-sub">🚨 전문가에게 바로 물어보세요</p><p>급하거나 판단이 모호하면 혼자 결정하지 말고 먼저 알리세요. 사고가 의심되면 증거를 지우지 말고 보고합니다.</p><ul class="cs-list co-esc-l">' + rows.join('') + '</ul>' +
      '<p class="cs-sub">외부 공식 창구</p><ul class="cs-list">' + out + '</ul><p class="cs-muted cs-small">' + esc(E.note) + '</p>';
  }

  /* ---------- 모드 ---------- */
  var MODES = ['coach', 'staff', 'citizen'];
  var mode = Coach && CO ? 'coach' : 'staff';
  try { var mq = new URLSearchParams(W.location.search).get('mode'); var ms0 = store('counsel-mode'); if (MODES.indexOf(mq) >= 0) mode = mq; else if (MODES.indexOf(ms0) >= 0) mode = ms0; } catch (e) { }
  if (mode === 'coach' && !(Coach && CO)) mode = 'staff';
  if (W.COUNSEL_MODE_LOCK) mode = W.COUNSEL_MODE_LOCK;

  /* ---------- 질문 처리 ---------- */
  var busy = false;
  function ask(q, topicId, forceMode) {
    q = String(q || '').trim(); if (!q || busy) return;
    var m = forceMode || mode;
    busy = true;
    var ms = maskSensitive(q); q = ms.q;
    addMsg('me', esc(q));
    var wait = addMsg('bot', '<span class="cs-muted">' + (m === 'citizen' ? '관련 안내를 찾고 있어요…' : '관련 자료를 찾는 중…') + '</span>');
    var holder = wait.parentNode;
    var warn = ms.kinds.length ? '<p class="cz-warn">' + esc(ms.kinds.join('·')) + '처럼 보이는 내용은 화면에서 가렸어요. 상담에는 주민등록번호, 계좌번호, 비밀번호, 전화번호가 필요하지 않으니 입력하지 마세요.</p>' : '';
    ensureShards(q).catch(function () { return null; }).then(function () {
      var a;
      try { a = topicId ? engine.answerTopic(topicId) : engine.answer(q); } catch (e) { a = { kind: 'fallback', reason: 'unclear', text: Engine.FALLBACK.unclear }; }
      var html, wide = true;
      if (m === 'citizen') {
        wide = false;
        var faq = !topicId && matchFaq(q);
        if (!topicId && INDIVIDUAL.test(q)) html = citizenFallback(CITIZEN_FALLBACK);
        else if (faq) html = cardHtml(faq, faq.law ? [faq.law] : []);
        else if (a.kind === 'topic' || a.kind === 'search') html = renderCitizen(a, q);
        else if (a.kind === 'catalog') { html = renderCatalog(); wide = true; }
        else if (a.kind === 'doc') { html = '<p class="cz-lead">「' + esc(stripExt(a.doc.name)) + '」(' + esc(yearText(a.doc)) + ', ' + esc(a.doc.pub || '') + ') 자료를 말씀하시는 것 같아요.</p><ul class="cz-list"><li>' + esc(a.doc.aud || '') + '을(를) 위한 ' + esc(a.doc.media || '자료') + '예요.</li></ul>'; }
        else if (a.reason === 'unclear') html = citizenFallback(CITIZEN_UNCLEAR) + chipsHtml(['CCTV 영상 보고 싶어요', '개인정보 유출 문자를 받았어요', '내 개인정보 삭제 요청']);
        else html = citizenFallback(CITIZEN_FALLBACK);
        html = warn + html + '<p class="cs-disc">공식 지침과 법령 안내서에 근거한 일반 안내예요. 개별 사건의 법적 판단이나 처분 결과는 담당 기관에서 확인해 주세요.</p>';
      } else if (m === 'coach') {
        var type = topicId ? 'A' : Coach.classify(q, a);
        if (type === 'quiz') { html = renderQuizAsk(); wide = false; }
        else if (type === 'C') html = renderProbe(Coach.genericDomain(q) || 'privacy');
        else if (type === 'unclear') { wide = false; html = '<p>' + esc(a.text) + '</p><p class="cs-sub">이렇게 시작해 볼까요?</p>' + chipsHtml(['개인정보', '보안 검토 어떻게 해요?', '신규 서비스 오픈', '퀴즈 내줘']); }
        else if (a.kind === 'topic') html = renderCoachTopic(a, q, type);
        else if (a.kind === 'search') html = renderCoachSearch(a, q, type);
        else if (a.kind === 'doc') html = renderDoc(a, q);
        else if (a.kind === 'catalog') html = renderCatalog();
        else { wide = false; html = '<p>' + esc(a.text) + '</p>' + coachBtns(null, ''); }
        html = warn + html + '<p class="cs-disc">이 답변은 첨부 자료와 법령에 근거한 일반 안내이며 법률 자문이 아닙니다. 자료와 현행 법령이 다르면 현행 법령을 따르고, 구체적 해석은 개인정보보호위원회(또는 담당 정보보호팀)에 문의하세요.</p>';
      } else {
        if (a.kind === 'topic') html = renderTopic(a, q);
        else if (a.kind === 'search') html = renderSearch(a, q);
        else if (a.kind === 'doc') html = renderDoc(a, q);
        else if (a.kind === 'catalog') html = renderCatalog();
        else { wide = false; html = '<p>' + esc(a.text) + '</p>' + (a.reason === 'unclear' ? '<p class="cs-sub">이렇게 물어보셔도 됩니다</p>' + chipsHtml(['개인정보 파기 방법', '이동형 vs 고정형', '유출 신고 기한', '망분리', '자료 목록']) : ''); }
        html = warn + html + '<p class="cs-disc">이 답변은 첨부 자료와 법령에 근거한 일반 안내이며 법률 자문이 아닙니다. 자료와 현행 법령이 다르면 현행 법령을 따르고, 구체적 해석은 개인정보보호위원회(또는 담당 정보보호팀)에 문의하세요.</p>';
      }
      wait.innerHTML = html;
      holder.classList.toggle('wide', wide);
      holder.classList.toggle('cz', m === 'citizen');
      if (a.kind === 'catalog') fillCatalog(wait);
      // 조문 원문은 답변에 자동으로 붙이지 않습니다(원문은 버튼을 눌렀을 때만)
      if (m !== 'citizen') aiRewrite(a, q, wait);
      chat.scrollTop = Math.max(0, holder.offsetTop - chat.offsetTop - 8);
      busy = false;
    });
  }

  chat.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.classList.contains('cs-cite')) { showLaw(b.getAttribute('data-cite')); return; }
    if (b.classList.contains('cs-lawget')) { fetchLaw(b.closest('li')); return; }
    if (b.classList.contains('cz-more')) { ask(b.getAttribute('data-q'), b.getAttribute('data-topic') || null, 'staff'); return; }
    if (b.classList.contains('co-esc')) { addMsg('bot', escalateHtml()); return; }
    if (b.classList.contains('co-ox-b')) {
      var oid = b.getAttribute('data-ox'), x = (CO && CO.ox || []).filter(function (z) { return z.id === oid; })[0], pick = b.getAttribute('data-pick');
      if (x) { oxStore(oid, { pick: pick, ok: pick === x.a }); oxReveal(b.closest('.co-ox'), x, pick); }
      return;
    }
    if (b.hasAttribute('data-q')) ask(b.getAttribute('data-q'), b.getAttribute('data-topic'));
  });
  chat.addEventListener('toggle', function (ev) { var d = ev.target; if (d && d.classList && d.classList.contains('co-acc-law') && d.open) liveSummaries(d); }, true);
  form.addEventListener('submit', function (ev) { ev.preventDefault(); var v = input.value; input.value = ''; ask(v); });
  var chipsBox = D.getElementById('chips');
  var CHIPS = {
    coach: ['이벤트 경품 발송용 주소 수집 방법 알려줘', '외부업체 데이터 전달', 'CCTV 파기', '기반시설 취약점', '보안 검토 어떻게 해요?', '신규 서비스 오픈', '퀴즈 내줘'],
    staff: ['이동형 vs 고정형', '블랙박스', '파기', '유출', '위탁', '망분리', 'USB', '챗GPT 써도 되나요', '접속기록 얼마나 보관', '영향평가 대상', '자료 목록'],
    citizen: ['CCTV 영상 보고 싶어요', '개인정보 유출 문자를 받았어요', '내 개인정보 삭제 요청', '블랙박스 촬영', '아이 개인정보 동의', '개인정보 처리방침이 뭐예요']
  };
  var INTRO = '<p class="greet">안녕하세요! 사이버보안과 개인정보 보호를 알려드리는 AI 상담사 \'간세\'예요. 🐢</p><p>가끔 엉뚱한 답변을 하거나, 제가 잘 모를 땐 되묻기도 하니 너무 당황하지 마세요! (함께 답을 찾아가요 😊)</p><p class="cs-muted">"파기", "블랙박스"처럼 단어 하나만 입력하셔도 되고, "외주 주는데 주민번호 넘겨도 돼?"처럼 편하게 물어보셔도 됩니다.</p>';
  var GREET = {
    coach: function () { return INTRO + '<p class="cs-muted cs-small">AI 실무 코치는 결론부터 보여 드리고, 역질문과 OX 퀴즈로 실무 감각을 익히도록 도와드려요.</p>'; },
    staff: function () { return INTRO + '<p class="cs-muted cs-small">"자료 목록"이라고 쓰면 참고자료 목록을 보여 드립니다.</p>'; },
    citizen: function () { return '<p class="greet"><b>안녕하세요, 요망진 간세예요.</b> 개인정보나 보안 관련 규정을 쉽게 풀어서 안내해 드릴게요.</p><p class="cs-muted">궁금한 점을 편하게 적어 주세요. 상담에는 주민등록번호, 계좌번호, 비밀번호, 전화번호가 필요하지 않으니 입력하지 마세요.</p>'; }
  };
  var lead = D.querySelector('.sp-head .lead');
  var LEADS = {
    coach: '개인정보 보호·사이버보안 업무를 처음 맡은 분을 중급 실무자로 키우는 AI 실무 코치입니다. 결론부터 보여 드리고, 역질문과 OX 퀴즈로 실무 감각을 익히게 도와드려요.',
    staff: '공공기관에서 개인정보 보호·사이버보안·정보보안 업무를 처음 맡은 분을 위한 사수입니다. 단어 하나, 짧은 문장, 편한 말투 어느 것이든 질문해 보세요.',
    citizen: '개인정보와 보안 관련 규정을 쉬운 말로 안내해 드려요. 핵심 답을 먼저 알려 드리고, 개별 사건은 공식 민원 창구로 연결해 드려요.'
  };
  function applyMode(first) {
    if (chipsBox) chipsBox.innerHTML = chipsHtml(CHIPS[mode]);
    if (lead) lead.textContent = LEADS[mode];
    input.placeholder = mode === 'citizen' ? '예: CCTV에 찍힌 제 영상을 볼 수 있나요?' : mode === 'coach' ? '예: 외부업체 데이터 전달 / 보안 검토 어떻게 해요? / 퀴즈 내줘' : '예: 블랙박스 / 위탁 파기 / 외주 주는데 주민번호 넘겨도 돼?';
    D.querySelectorAll('.mode-sw button').forEach(function (b) { var on = b.getAttribute('data-mode') === mode; b.setAttribute('aria-pressed', String(on)); });
    D.body.setAttribute('data-counsel-mode', mode);
    if (!first) addMsg('bot', GREET[mode](uniqN));
  }
  if (chipsBox) chipsBox.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-q]'); if (b) ask(b.getAttribute('data-q')); });
  D.querySelectorAll('.mode-sw button').forEach(function (b) {
    b.addEventListener('click', function () { var m = b.getAttribute('data-mode'); if (m === mode || W.COUNSEL_MODE_LOCK) return; mode = m; store('counsel-mode', m); applyMode(false); });
  });
  var exp = D.getElementById('chatExpand');
  if (exp) exp.addEventListener('click', function () {
    var on = D.body.classList.toggle('chat-expanded'); exp.setAttribute('aria-pressed', String(on));
    exp.textContent = on ? '↙ 기본 크기로 보기' : '↗ 답변창 더 크게 보기';
  });

  /* ---------- 상태 표시 · 시작 ---------- */
  var bar = D.getElementById('asofBar');
  var uniqN = CAT.docs.filter(function (d) { return !d.dupOf; }).length;
  function drawBar(state) {
    if (!bar) return;
    bar.innerHTML = '자료 기준일 ' + esc(CAT.asof) + ' · 참고자료 ' + uniqN + '종(5개 분야) · 법제처 법령·행정규칙: ' + esc(state) +
      (aiAvail ? ' · <label class="cs-aitoggle"><input type="checkbox" id="aiToggle"' + (aiOn ? ' checked' : '') + '> AI 정리 함께 보기</label>' : '');
    var t = D.getElementById('aiToggle');
    if (t) t.addEventListener('change', function () { aiOn = t.checked; store('counsel-ai', aiOn ? '1' : '0'); });
  }
  var aiAvail = false;
  drawBar(LAW && LAW.enabled() ? '연결 확인 중…' : '바로가기 링크 모드');
  var healthP = (LAW && LAW.enabled())
    ? fetch(LAW.origin() + '/health', { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(6500) }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    : Promise.resolve({});
  healthP.then(function (h) {
    lawOn = !!(h && h.ok && h.law === true);
    aiAvail = !!(h && h.ok && h.ai === true);
    sumOn = !!(h && h.ok && h.summary === true);
    aiOn = aiAvail && store('counsel-ai') === '1';
    drawBar(lawOn ? '실시간 조회 연결됨' : (LAW && LAW.enabled() ? '연결 안 됨(바로가기 링크로 안내)' : '바로가기 링크 모드'));
  });

  applyMode(true);
  addMsg('bot', GREET[mode](uniqN));

  var qp = null, tp = null; try { var sp = new URLSearchParams(W.location.search); qp = sp.get('q'); tp = sp.get('topic'); } catch (e) { }
  // ?topic=<주제 ID> 는 온보딩 페이지 등에서 특정 주제 카드를 바로 여는 데 씁니다(없는 ID는 무시)
  var tpc = tp && (W.COUNSEL_TOPICS || []).filter(function (t) { return t.id === tp; })[0];
  var start = tpc ? healthP.then(function () { ask((qp || tpc.title).slice(0, 200), tpc.id); })
    : qp ? healthP.then(function () { ask(qp.slice(0, 200)); }) : Promise.resolve();
  // 개인정보 분야 자료를 미리 받아 두어 첫 답변을 빠르게 합니다
  start.then(function () { var idle = W.requestIdleCallback || function (f) { setTimeout(f, 1200); }; idle(function () { loadShard(2).catch(function () { }); }); });
})();
