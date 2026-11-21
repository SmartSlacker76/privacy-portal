/* 정보보호 상담 엔진 — 질문 해석 · 주제 연결 · 참고자료 원문 검색 · 답변 구성
   브라우저(window.CounselEngine)와 Node 테스트(module.exports) 모두에서 동작합니다.
   이 엔진은 답을 지어내지 않습니다. 주제 카드(검증된 문장)와 참고자료 원문 발췌만 조합합니다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CounselEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FALLBACK = {
    unclear: '질문하신 내용의 의도를 정확히 이해하지 못했습니다. 관련 업무나 구체적인 상황을 조금 더 자세히 말씀해 주시겠어요?',
    condition: function (a, b) { return '질문하신 상황은 적용 대상과 구체적인 조건에 따라 법적 기준이 달라질 수 있습니다. [' + a + ']와 [' + b + '] 중 어떤 경우에 해당하시는지 알려주시면 정확히 안내해 드리겠습니다.'; },
    noBasis: '죄송합니다. 해당 사안에 대해서는 명확한 법적 근거나 지침 내용을 확인할 수 없어 정확한 답변이 어렵습니다. 구체적인 유권해석이나 실무 적용은 개인정보보호위원회(또는 담당 정보보호팀)에 문의하시기 바랍니다.'
  };
  var JOSA = ['으로부터', '에서부터', '이라고', '이라는', '에게서', '한테서', '에서는', '에서도', '이랑', '에서', '에게', '한테', '으로', '부터', '까지', '처럼', '보다', '이나', '이란', '이며', '이고', '라는', '라고', '은', '는', '이', '가', '을', '를', '에', '의', '로', '와', '과', '도', '만', '란', '랑'];
  var ENDINGS = ['해야하나요', '해야되나요', '해야합니까', '하려면', '하나요', '되나요', '인가요', '일까요', '할까요', '합니까', '됩니까', '해도되나', '해도돼', '해도', '하면', '하는법', '하는지', '되는지', '인지', '해야', '할때', '하기', '이에요', '예요', '에요', '입니다', '이다'];
  var CASE_MEDIA = /사례|결정문|의결|보도자료|질의응답/;

  function compact(s) { return String(s || '').toLowerCase().normalize('NFKC').replace(/[\s ·ㆍ‧∙・\-_/.,!?~"'“”‘’()\[\]{}<>「」『』:;|]+/g, ''); }
  function clean(s) { return String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim(); }

  function tokens(q, stop) {
    var out = [];
    clean(q).toLowerCase().split(/[\s+,&]+|그리고|및/).forEach(function (w) {
      w = w.replace(/[^0-9a-z가-힣%]/g, '');
      if (!w) return;
      for (var k = 0; k < 3; k++) {
        var cut = false;
        ENDINGS.some(function (e) { if (w.length > e.length + 1 && w.slice(-e.length) === e) { w = w.slice(0, -e.length); cut = true; return true; } return false; });
        JOSA.some(function (j) { if (w.length >= j.length + 2 && w.slice(-j.length) === j) { w = w.slice(0, -j.length); cut = true; return true; } return false; });
        if (!cut) break;
      }
      if (stop.indexOf(w) >= 0) return;
      if (/^[가-힣]$/.test(w)) return;
      if (/^[a-z]$/.test(w)) return;
      out.push(w);
    });
    return out;
  }

  function Engine(opts) {
    this.topics = opts.topics || [];
    this.lex = (opts.lexicon || []).map(function (e) { return Object.assign({}, e, { ac: e.a.map(compact).sort(function (x, y) { return y.length - x.length; }) }); });
    this.stop = opts.stop || [];
    this.compare = (opts.compare || []).map(compact);
    this.catalog = opts.catalog || { docs: [], cats: {} };
    this.docById = {};
    var self = this;
    this.catalog.docs.forEach(function (d) { self.docById[d.id] = d; });
    this.topicById = {};
    this.topics.forEach(function (t) { self.topicById[t.id] = t; });
    this.chunks = [];        // [docId, page, text, compactText]
    this.loadedShards = {};
    this.avgLen = 300;
  }

  Engine.FALLBACK = FALLBACK;
  Engine.compact = compact;
  Engine.tokens = tokens;

  Engine.prototype.addShard = function (cat, data) {
    if (this.loadedShards[cat]) return;
    this.loadedShards[cat] = true;
    var arr = data.chunks || [];
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      this.chunks.push([c[0], c[1], c[2], compact(c[2])]);
    }
    var tot = 0;
    for (var j = 0; j < this.chunks.length; j++) tot += this.chunks[j][3].length;
    this.avgLen = this.chunks.length ? tot / this.chunks.length : 300;
  };

  /* 1단계: 질문 해석 */
  Engine.prototype.understand = function (q) {
    var qc = compact(q), self = this;
    var cand = [];
    this.lex.forEach(function (e) {
      for (var i = 0; i < e.ac.length; i++) {
        var a = e.ac[i];
        if (a.length >= 2 && qc.indexOf(a) >= 0) { cand.push({ e: e, a: a, w: a.length }); return; }
      }
    });
    // 긴 별칭부터 채택하고, 이미 채택된 긴 별칭 안에 들어 있는 짧은 별칭은 버립니다(예: '홈페이지노출' > '노출')
    cand.sort(function (x, y) { return y.w - x.w; });
    var hits = [];
    cand.forEach(function (c) { if (!hits.some(function (h) { return h.a.indexOf(c.a) >= 0 && h.a !== c.a; })) hits.push(c); });
    var toks = tokens(q, this.stop);
    var slots = {}, intents = {}, concepts = {};
    hits.forEach(function (h) { if (h.e.slot) slots[h.e.slot] = true; if (h.e.intent) intents[h.e.intent] = true; if (h.e.concept) concepts[h.e.concept] = true; });
    if (/이용자|회원|홈페이지가입/.test(qc)) slots.user = true;
    if (/민원인|직원|임직원|주민|비회원/.test(qc)) slots.nonuser = true;
    var isCompare = this.compare.some(function (c) { return qc.indexOf(c) >= 0; });
    if (/(cctv|씨씨티비|고정형)/.test(qc)) concepts.fixed = true;
    if (/(이동형|드론|바디캠|블랙박스)/.test(qc)) concepts.mobile = true;
    // 주제 점수
    var score = {};
    hits.forEach(function (h) { if (h.e.topic) score[h.e.topic] = (score[h.e.topic] || 0) + (1 + h.w / 4) * (h.e.weak ? 0.4 : 1); });
    // '개인정보란', '개인정보 뜻'처럼 개념만 물으면 개념 주제를 살립니다
    if (/^(개인정보|개인정보란|개인정보뜻|개인정보의뜻|개인정보정의|개인정보가뭐|개인정보란무엇|개인정보의개념)/.test(qc) && hits.length === 1 && hits[0].e.topic === 'pi-definition') score['pi-definition'] = (score['pi-definition'] || 0) + 5;
    this.topics.forEach(function (t) {
      var tc = compact(t.title);
      if (qc.length >= 4 && tc.indexOf(qc) >= 0) score[t.id] = (score[t.id] || 0) + 3;
    });
    if (concepts.mobile && (concepts.fixed || isCompare)) score['video-compare'] = (score['video-compare'] || 0) + 20;
    var ranked = Object.keys(score).filter(function (k) { return self.topicById[k]; }).sort(function (a, b) { return score[b] - score[a]; });
    var terms = [];
    hits.forEach(function (h) { h.e.t.forEach(function (t) { var c = compact(t); if (c.length >= 2 && terms.indexOf(c) < 0) terms.push(c); }); });
    var residual = toks.filter(function (t) {
      return t.length >= 2 && !hits.some(function (h) { return h.a.indexOf(t) >= 0 || t.indexOf(h.a) >= 0; });
    });
    residual.forEach(function (t) { if (terms.indexOf(t) < 0) terms.push(t); });
    var docHit = this.matchDoc(qc);
    return { q: q, qc: qc, tokens: toks, hits: hits, slots: slots, intents: intents, concepts: concepts, compare: isCompare, topicScores: score, topics: ranked, terms: terms, residual: residual, doc: docHit };
  };

  Engine.prototype.matchDoc = function (qc) {
    if (qc.length < 4) return null;
    var best = null, bestLen = 0;
    this.catalog.docs.forEach(function (d) {
      if (d.dupOf) return;
      var nm = compact(d.name.replace(/\.(pdf|zip)$/i, '').replace(/\(.*?\)|\[.*?\]|★/g, ''));
      // 문서명의 핵심 부분(6자 이상 연속)이 질문에 들어 있으면 문서 질의로 봅니다
      for (var L = Math.min(nm.length, 24); L >= 6; L--) {
        for (var s = 0; s + L <= nm.length; s++) {
          var piece = nm.substr(s, L);
          if (qc.indexOf(piece) >= 0) { if (L > bestLen) { bestLen = L; best = d; } return; }
        }
      }
    });
    return bestLen >= 7 ? best : null;
  };

  Engine.prototype.shardsFor = function (u) {
    var cats = {}, self = this;
    u.topics.slice(0, 2).forEach(function (id) {
      var t = self.topicById[id]; cats[t.cat] = true;
      (t.docs || []).forEach(function (d) { var x = self.docById[d]; if (x) cats[x.shard || x.cat] = true; });
    });
    if (u.doc) cats[u.doc.shard || u.doc.cat] = true;
    var list = Object.keys(cats).map(Number);
    return list.length ? list : [1, 2, 3, 4, 5];
  };

  /* 2단계: 참고자료 원문 검색 (BM25 유사 점수 + 질문 요소 충족도 + 최신 자료 가중) */
  Engine.prototype.search = function (terms, opt) {
    opt = opt || {};
    var N = this.chunks.length; if (!N || !terms.length) return [];
    var df = terms.map(function () { return 0; });
    var tfs = new Array(N);
    for (var i = 0; i < N; i++) {
      var tx = this.chunks[i][3], row = null;
      for (var t = 0; t < terms.length; t++) {
        var p = tx.indexOf(terms[t]);
        if (p < 0) continue;
        var n = 1; while (n < 6 && (p = tx.indexOf(terms[t], p + terms[t].length)) >= 0) n++;
        if (!row) row = {};
        row[t] = n; df[t]++;
      }
      tfs[i] = row;
    }
    var idf = df.map(function (d) { return d ? Math.log(1 + (N - d + 0.5) / (d + 0.5)) : 0; });
    var weights = opt.weights || terms.map(function () { return 1; });
    var prefer = opt.docs || [], onlyDocs = opt.onlyDocs || null, media = opt.media || null;
    var self = this, res = [];
    for (var j = 0; j < N; j++) {
      var r = tfs[j]; if (!r) continue;
      var c = this.chunks[j], d = this.docById[c[0]];
      if (onlyDocs && onlyDocs.indexOf(c[0]) < 0) continue;
      if (media && !(d && media.test(d.media))) continue;
      var len = c[3].length, s = 0, k = 0;
      for (var key in r) {
        var tf = r[key];
        s += weights[key] * idf[key] * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * len / self.avgLen));
        k++;
      }
      s *= Math.pow(k / terms.length, 1.3);
      if (prefer.indexOf(c[0]) >= 0) s *= 1.6 - 0.08 * prefer.indexOf(c[0]);
      if (d) { var y = parseInt(d.year, 10); if (y) s *= 1 + Math.max(0, y - 2020) * 0.03; }
      if (len < 80) s *= 0.6;
      res.push({ i: j, s: s, k: k, doc: c[0], page: c[1], text: c[2] });
    }
    res.sort(function (a, b) { return b.s - a.s; });
    // 같은 문서·같은 쪽 중복을 줄입니다
    var seen = {}, out = [];
    for (var m = 0; m < res.length && out.length < (opt.limit || 6); m++) {
      var key2 = res[m].doc + ':' + res[m].page;
      if (seen[key2]) continue; seen[key2] = 1; out.push(res[m]);
    }
    return out;
  };

  function sentences(text) {
    return clean(text).split(/(?<=[다요음함됨임]\.)\s+|(?<=[.?!])\s+(?=[가-힣A-Z0-9※○●■□▪◦⚫•➡])|\s(?=[⚫•▪◦○●■□➡※]\s?)|\s(?=\d\.\s)/).map(function (s) { return s.replace(/^[⚫•▪◦○●■□➡※\-]\s*/, '').trim(); }).filter(function (s) { return s.length >= 18 && s.length <= 260 && /[가-힣]{2}/.test(s); });
  }
  Engine.sentences = sentences;

  function pickSentences(passages, terms, re, n) {
    var out = [], seen = {};
    passages.forEach(function (p) {
      sentences(p.text).forEach(function (s) {
        var sc = compact(s);
        if (seen[sc]) return;
        var hit = terms.filter(function (t) { return sc.indexOf(t) >= 0; }).length;
        if (!hit) return;
        if (re && !re.test(s)) return;
        seen[sc] = 1;
        out.push({ s: s, score: hit + (re ? 1 : 0) + p.s / 40, doc: p.doc, page: p.page });
      });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, n);
  }

  var LAW_RE = /「([^」]{2,40}(?:법|령|규칙|기준|지침|고시))」\s*제(\d{1,3})조(?:의(\d{1,2}))?|(?:^|[\s(])(법|시행령|영|고시)\s?제(\d{1,3})조(?:의(\d{1,2}))?/g;
  function lawRefs(passages) {
    var out = [], seen = {};
    passages.forEach(function (p) {
      var m; LAW_RE.lastIndex = 0;
      while ((m = LAW_RE.exec(p.text))) {
        var name = m[1] || ({ '법': '개인정보 보호법', '시행령': '개인정보 보호법 시행령', '영': '개인정보 보호법 시행령', '고시': '개인정보의 안전성 확보조치 기준' })[m[4]];
        var docMedia = '';
        if (!m[1] && m[4] && p.cat && p.cat !== 2) continue; // 개인정보 분야가 아닌 문서의 '법 제n조'는 법명을 특정할 수 없어 제외
        var jo = Number(m[2] || m[5]), b = Number(m[3] || m[6] || 0);
        var key = name + jo + '-' + b; if (seen[key]) continue; seen[key] = 1;
        out.push({ k: /기준|지침|고시/.test(name) ? '행정규칙' : '법령', n: name, jo: jo, b: b, from: p.doc, page: p.page });
        if (out.length >= 5) return out;
      }
    });
    return out;
  }

  /* 3단계: 답변 구성 */
  Engine.prototype.answer = function (q) {
    var u = this.understand(q);
    var self = this;
    if (!u.qc || (u.tokens.length === 0 && u.hits.length === 0)) return { kind: 'fallback', reason: 'unclear', text: FALLBACK.unclear, u: u };
    if (/^(목록|자료목록|자료|카탈로그|파일목록|첨부목록|참고자료|문서목록|63종|63개)$/.test(u.qc) || /(자료|파일|문서)(목록|리스트)|목록(보여|알려)/.test(u.qc)) return { kind: 'catalog', u: u };

    var topic = u.topics.length ? this.topicById[u.topics[0]] : null;
    // 주제 점수가 낮고 문서명이 직접 언급되면 문서 안내를 우선합니다
    if (u.doc && (!topic || /(안내서|가이드|지침|매뉴얼|사례집|보고서|표준안|핸드북|모음집|보안모델|파일|문서|자료)/.test(u.qc))) {
      var dp = this.search(u.terms.length ? u.terms : [compact(u.doc.name).slice(0, 6)], { onlyDocs: [u.doc.dupOf || u.doc.id], limit: 4 });
      return { kind: 'doc', doc: u.doc, passages: dp, u: u, related: u.topics.slice(0, 3).map(function (id) { return self.topicById[id]; }) };
    }

    var terms = u.terms.slice();
    var weights = terms.map(function () { return 1; });
    if (topic) {
      Engine.tokens(topic.q || '', []).forEach(function (t) { var c = compact(t); if (c.length >= 2 && terms.indexOf(c) < 0) { terms.push(c); weights.push(0.6); } });
    }
    if (!terms.length) return { kind: 'fallback', reason: 'unclear', text: FALLBACK.unclear, u: u };
    var passages = this.search(terms, { weights: weights, docs: topic ? topic.docs : [], limit: 5 });
    passages.forEach(function (p) { var d = self.docById[p.doc]; p.cat = d && d.cat; });
    var best = passages[0] ? passages[0].s : 0;

    if (!topic) {
      // 검색만으로 답할 때: 질문 요소의 절반 이상이 한 조각에 함께 있고 점수가 충분해야 합니다
      var need = Math.max(1, Math.ceil(u.terms.length / 2));
      var strong = passages.filter(function (p) { return p.k >= need; });
      if (!strong.length || best < 2.2) {
        if (!u.hits.length && u.residual.every(function (t) { return t.length < 2; })) return { kind: 'fallback', reason: 'unclear', text: FALLBACK.unclear, u: u };
        return { kind: 'fallback', reason: 'noBasis', text: FALLBACK.noBasis, u: u, passages: passages.slice(0, 2) };
      }
      var core = pickSentences(strong, u.terms, null, 2);
      var concept = pickSentences(strong, u.terms, /(이?란|말한다|말함|의미한다|의미함|정의|뜻한다)/, 1);
      var check = pickSentences(strong, u.terms, /(하여야|해야|확인|점검|필요|수립|지정|실시|설정)/, 3);
      var caution = pickSentences(strong, u.terms, /(금지|아니 ?된다|안 ?된다|않도록|유의|주의|제외|다만)/, 2);
      var pen = pickSentences(strong, u.terms, /(과태료|과징금|징역|벌금|징계|파면|해임)/, 2);
      var cases = this.search(u.terms, { media: CASE_MEDIA, limit: 2 });
      return { kind: 'search', u: u, core: core, concept: concept, check: check, caution: caution, penalty: pen, cases: cases, passages: strong.slice(0, 4), laws: lawRefs(strong), ask: this.genericAsk(u, strong) };
    }

    return this.topicAnswer(topic, u, terms, passages);
  };

  /* 주제 카드를 바로 열 때(관련 주제 버튼 등) */
  Engine.prototype.answerTopic = function (id) {
    var topic = this.topicById[id]; if (!topic) return null;
    var u = this.understand(topic.q || topic.title);
    u.topics = [id].concat(u.topics.filter(function (x) { return x !== id; }));
    var terms = Engine.tokens(topic.q || topic.title, []).map(compact).filter(function (t) { return t.length >= 2; });
    var passages = this.search(terms, { docs: topic.docs, limit: 5 });
    return this.topicAnswer(topic, u, terms, passages);
  };

  Engine.prototype.topicAnswer = function (topic, u, terms, passages) {
    var self = this;
    var cond = null;
    if (topic.cond) {
      var have = topic.cond.need.some(function (s) { return u.slots[s]; });
      if (!have) cond = { text: FALLBACK.condition(topic.cond.a, topic.cond.b), a: topic.cond.a, b: topic.cond.b, soft: !!topic.cond.soft };
    }
    var cq = Engine.tokens((topic.cq || '') + ' ' + u.residual.join(' '), []).map(compact).filter(function (t) { return t.length >= 2; });
    var cases = this.search(cq.length ? cq : terms, { media: CASE_MEDIA, docs: topic.docs, limit: 3 });
    var good = this.search(cq.concat(['우수', '모범']).filter(function (x, i, a) { return a.indexOf(x) === i; }), { media: /우수사례|사례집/, limit: 6 }).filter(function (p) { return /우수|모범|잘된|개선 사례|성공/.test(p.text); }).slice(0, 1);
    var related = u.topics.slice(1, 4).map(function (id) { return self.topicById[id]; });
    return { kind: 'topic', topic: topic, u: u, passages: passages.slice(0, 4), cases: cases, good: good, cond: cond, related: related, wantPenalty: !!u.intents.penalty };
  };

  Engine.prototype.genericAsk = function (u, passages) {
    var asks = [];
    if (!u.slots.public && !u.slots.private) asks.push('질문하신 업무는 공공기관에서 하는 일인가요, 민간 위탁·협력업체와 관련된 일인가요?');
    asks.push('이미 일어난 일(사고·민원)에 대응하는 중인가요, 아니면 시작 전에 준비하는 단계인가요?');
    return asks.slice(0, 2);
  };

  return Engine;
});
