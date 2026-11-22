/* AI 실무 코치 규칙 — 질문 유형(A/B/C) 분기 · 1단계 결론 · 용어 풀이 · 법령 요약 고르기
   브라우저(window.CounselCoach)와 Node 테스트(module.exports) 모두에서 동작합니다.
   새 문장을 만들지 않습니다. 주제 카드 문장, 코치 데이터(counsel-coach.js), 법령 요약표만 조합합니다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CounselCoach = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERDICTS = ['가능', '조건부 가능', '불가', '확인 필요', '필수'];
  var STAGE1_MAX = 300;

  function compact(s) { return String(s || '').toLowerCase().normalize('NFKC').replace(/[\s ·ㆍ‧∙・\-_/.,!?~"'“”‘’()\[\]{}<>「」『』:;|？]+/g, ''); }
  /* 주제 카드 문장 속 내부 근거 표기(D36 p160 등)를 지운 평문 */
  function plain(s) {
    return String(s || '').replace(/\s*[—-]\s*D\d{2} p[\d~∼\-, p]+$/, '')
      .replace(/,\s*D\d{2}(?: ?p[\d~∼\-]+(?:, ?p?[\d~∼\-]+)*)?\s*\)/g, ')')
      .replace(/\(\s*D\d{2}(?: ?p[\d~∼\-]+(?:, ?p?[\d~∼\-]+)*)?(?:\s*질의응답)?\s*\)/g, '')
      .replace(/\bD\d{2}(?: ?p[\d~∼\-]+)?/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
  }

  /* ---------- 질문 유형 ---------- */
  var FILLER = /(어떻게|어떡해|해야|하나요|하나|해요|하죠|하지|하면|할까요|되나요|돼요|되요|뭐|부터|알려줘|알려주세요|알려|주세요|해주세요|궁금해요|궁금|관련|문의|업무|은|는|이|가|을|를|요)$/;
  var GENERIC = {
    privacy: ['개인정보', '개인정보보호', '개인정보처리', '프라이버시'],
    security: ['보안', '정보보안', '사이버보안', '정보보호', '보안검토', '보안점검', '보안대책', '해킹대비'],
    service: ['신규서비스', '신규서비스오픈', '서비스오픈', '서비스출시', '시스템오픈', '신규시스템', '신규시스템오픈', '시스템구축', '홈페이지오픈', '홈페이지구축', '앱출시', '앱오픈', '신규사업', '정보화사업'],
    start: ['처음', '처음이에요', '처음인데', '뭐부터', '모르겠어요', '모르겠어', '하나도모르겠어요', '담당자됐어요', '신규직원']
  };
  function stripFiller(qc) { var prev; do { prev = qc; qc = qc.replace(FILLER, ''); } while (qc !== prev && qc.length > 1); return qc; }
  function genericDomain(q) {
    var qc = stripFiller(compact(q));
    for (var k in GENERIC) if (GENERIC[k].indexOf(qc) >= 0) return k;
    return null;
  }
  var QUIZ_RE = /(퀴즈|ox문제|ox퀴즈|문제\s?(내|줘|풀)|공부하고|공부할래|공부할게|공부\s?하고\s?싶|연습\s?문제|테스트\s?해\s?줘|실력\s?점검)/i;
  function isQuizAsk(q) { return QUIZ_RE.test(String(q || '')); }
  /* 문장형 질문(상황이 분명함)인지: 물음표, 의문·요청 어미, 4어절 이상 */
  var INTENT_END = /([?？]|요|까|나|니|줘|돼|되나|가능|해도|할까|하나|방법|어떻게|알려|언제|얼마|며칠|되는지|인가|인지|뭐야|뭔가|해야|하려면|싶어|싶은데|는데|건가|맞나|괜찮)\s*$/;
  function isSentence(q) {
    var t = String(q || '').trim();
    return INTENT_END.test(t) || t.split(/\s+/).filter(Boolean).length >= 4;
  }
  /* A: 명확한 상황 질문 · B: 단어 조합/반모호 · C: 극도로 모호 · quiz: 퀴즈 요청 */
  function classify(q, a) {
    if (isQuizAsk(q)) return 'quiz';
    if (genericDomain(q)) return 'C';
    if (!a || a.kind === 'fallback') return a && a.reason === 'unclear' ? 'unclear' : 'none';
    if (a.kind !== 'topic' && a.kind !== 'search') return 'other';
    return isSentence(q) ? 'A' : 'B';
  }

  /* ---------- 1단계: 결론 · 2줄 이유 · 주의 ---------- */
  function stage1(topic, coach, a) {
    var c = (coach.topics || {})[topic.id] || {};
    var v = c.v || '확인 필요';
    var why = c.why || plain(topic.core[0]);
    var warn = c.warn || plain((topic.caution || [])[0] || '');
    if (/OCR|추출|글꼴|인코딩|가이드는 \d+개 중/.test(warn)) warn = '';
    if (a && a.cond && !a.cond.soft) v = c.vCond || v;
    return { v: v, why: why, warn: warn };
  }
  function stage1Length(s, glossFn) {
    var g = glossFn || function (x) { return x; };
    var used = {};
    return (s.v + ' ' + g(s.why, used) + (s.warn ? ' ⚠️ 주의: ' + g(s.warn, used) : '')).length;
  }

  /* ---------- 용어 풀이: 처음 나올 때만 괄호로 쉬운 설명 ---------- */
  function makeGloss(list, limit) {
    var items = (list || []).map(function (g) {
      var src = g.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s?');
      return { t: g.t, d: g.d, re: new RegExp((g.before ? '(?<!' + g.before + ')' : '') + '(' + src + ')' + (g.after ? '(?!' + g.after + ')' : ''), 'g'), key: g.key || g.t };
    });
    return function gloss(text, used) {
      used = used || {};
      var n = 0;
      var s = String(text || '');
      items.forEach(function (it) {
        if (used[it.key] || (limit && n >= limit)) return;
        it.re.lastIndex = 0;
        var m;
        while ((m = it.re.exec(s))) {
          var at = m.index, end = at + m[0].length;
          var open = s.lastIndexOf('「', at), close = s.lastIndexOf('」', at);
          var inLaw = open > close;
          var nextCh = s.charAt(end);
          var inParen = s.lastIndexOf('(', at) > s.lastIndexOf(')', at);
          if (inLaw || nextCh === '(' || nextCh === '(' || inParen) continue;
          // 바로 앞 문장이 이미 같은 뜻을 풀어 쓰고 있으면 덧붙이지 않습니다
          if (compact(s.slice(Math.max(0, at - 40), at)).indexOf(compact(it.d).slice(0, 6)) >= 0) { used[it.key] = true; break; }
          s = s.slice(0, end) + '(' + it.d + ')' + s.slice(end);
          used[it.key] = true; n++;
          break;
        }
      });
      return s;
    };
  }

  /* ---------- 법령 2~3줄 요약 고르기(원문 미포함) ---------- */
  function artLabel(jo, b) { return '제' + jo + '조' + (b ? '의' + b : ''); }
  function citeOf(l) { return (l.n || '') + ' ' + artLabel(l.jo, l.b) + (l.hang ? ' 제' + l.hang + '항' : ''); }
  /* 개인정보 보호법: 내용별 법령 요약표(LAW_SUMMARY)의 첫 문단 */
  function pipaSummary(l, table) {
    if (!table || l.n !== '개인정보 보호법') return null;
    var art = artLabel(l.jo, l.b);
    var rows = table.filter(function (r) { return (r.arts || []).indexOf(art) >= 0; });
    if (!rows.length) return null;
    var hangRow = l.hang ? rows.filter(function (r) { return r.law.indexOf(art) >= 0 && new RegExp(art + '\\([^)]*\\)\\s*제' + l.hang + '항').test(r.law); })[0] : null;
    var single = rows.filter(function (r) { return r.arts.length === 1; });
    var r = hangRow || single[0] || rows[0];
    var first = String(r.detail || '').split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
    var lines = first.split(/(?<=[.다음함임])\s+/).filter(Boolean).slice(0, 3);
    return lines.length ? { lines: lines, from: '내용별 개인정보 보호 법령 요약표 · ' + r.item } : null;
  }
  /* 그 밖의 법령·고시·지침: 주제 카드에서 이 조문을 인용한 문장 */
  function cardSummary(l, topic) {
    var art = artLabel(l.jo, l.b);
    var re = new RegExp(art.replace(/([()])/g, '\\$1') + '(?![0-9의])');
    var pool = [].concat(topic.core || [], [topic.concept || ''], topic.check || [], topic.caution || []);
    var hits = pool.filter(function (s) { return s && re.test(s); }).map(plain);
    if (!hits.length && (topic.laws || []).length === 1) hits = [plain(topic.core[0])];
    return hits.length ? { lines: hits.slice(0, 2), from: '주제 카드(참고자료 근거 문장)' } : null;
  }
  function lawSummary(l, topic, table) {
    return pipaSummary(l, table) || cardSummary(l, topic) || { lines: [(l.label ? l.label + '에 관한 조문입니다. ' : '') + '세부 문언은 원문 보기로 확인하세요.'], from: '' };
  }

  /* ---------- OX 퀴즈 고르기 ---------- */
  function oxFor(topicId, bank, n, seed) {
    var mine = (bank || []).filter(function (x) { return x.topic === topicId; });
    var rest = (bank || []).filter(function (x) { return x.topic !== topicId; });
    var s = seed || 0;
    var rot = function (arr) { if (!arr.length) return arr; var k = s % arr.length; return arr.slice(k).concat(arr.slice(0, k)); };
    return rot(mine).concat(rot(rest)).slice(0, n || 1);
  }

  return { VERDICTS: VERDICTS, STAGE1_MAX: STAGE1_MAX, compact: compact, plain: plain, classify: classify, genericDomain: genericDomain, isQuizAsk: isQuizAsk, isSentence: isSentence,
    stage1: stage1, stage1Length: stage1Length, makeGloss: makeGloss, lawSummary: lawSummary, citeOf: citeOf, oxFor: oxFor };
});
