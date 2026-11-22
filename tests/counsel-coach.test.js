/* AI 실무 코치 모드 테스트: node tests/counsel-coach.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = (p) => path.join(__dirname, '..', p);
global.window = {};
require(R('assets/data/counsel-topics.js')); require(R('assets/data/counsel-lexicon.js'));
require(R('assets/data/law-summary.js')); require(R('assets/data/counsel-coach.js'));
eval(fs.readFileSync(R('assets/data/library/catalog.js'), 'utf8'));
const Engine = require(R('assets/js/counsel-engine.js'));
const Coach = require(R('assets/js/counsel-coach-core.js'));
const e = new Engine({ topics: window.COUNSEL_TOPICS, lexicon: window.COUNSEL_LEXICON, stop: window.COUNSEL_STOP, compare: window.COUNSEL_COMPARE, catalog: window.LIB_CATALOG });
const pages = {};
for (let c = 1; c <= 5; c++) e.addShard(c, JSON.parse(fs.readFileSync(R(`assets/data/library/shard-${c}.json`), 'utf8')));
e.chunks.forEach((c) => { pages[c[0] + ':' + c[1]] = 1; });
const CO = window.COUNSEL_COACH, T = {}; window.COUNSEL_TOPICS.forEach((t) => { T[t.id] = t; });
const docs = {}; window.LIB_CATALOG.docs.forEach((d) => { docs[d.id] = d; });
const LAWS = ['개인정보 보호법', '개인정보 보호법 시행령', '개인정보의 안전성 확보조치 기준', '표준 개인정보 보호지침', '국가 사이버보안 기본지침'];
let n = 0; const ok = (c, m) => { n++; assert(c, m); };

// 1) 모든 주제에 결론 배지가 있고, 1단계(결론+이유+주의)는 용어 풀이를 붙여도 300자 이내
const gloss1 = Coach.makeGloss(CO.gloss, 2);
window.COUNSEL_TOPICS.forEach((t) => {
  ok(CO.topics[t.id], 'no coach verdict for ' + t.id);
  const s = Coach.stage1(t, CO);
  ok(Coach.VERDICTS.includes(s.v), t.id + ': bad verdict ' + s.v);
  ok(s.why && !/\bD\d{2}\b/.test(s.why), t.id + ': why missing or has internal ref');
  const len = Coach.stage1Length(s, gloss1);
  ok(len <= Coach.STAGE1_MAX, t.id + ': stage1 ' + len + ' chars');
});
Object.keys(CO.topics).forEach((id) => ok(T[id], 'coach entry for unknown topic ' + id));

// 2) 질문 유형 분기 — 사용자 제시 예시
const type = (q) => Coach.classify(q, e.answer(q));
[['이벤트 경품 발송용 주소 수집 방법 알려줘', 'A'], ['외주 주는데 주민번호 넘겨도 돼?', 'A'], ['챗GPT 써도 되나요', 'A'],
 ['외부업체 데이터 전달', 'B'], ['CCTV 파기', 'B'], ['기반시설 취약점', 'B'], ['파기', 'B'],
 ['보안 검토 어떻게 해요?', 'C'], ['개인정보', 'C'], ['신규 서비스 오픈', 'C'], ['정보보호', 'C'],
 ['퀴즈 내줘', 'quiz'], ['공부하고 싶어', 'quiz'], ['OX 문제 내줘', 'quiz'], ['ㅁㄴㅇㄹ', 'unclear']].forEach(([q, want]) => {
  const got = type(q); ok(got === want, q + ' → ' + got + ' (expected ' + want + ')');
});
assert.strictEqual(Coach.genericDomain('보안 검토 어떻게 해요?'), 'security');
assert.strictEqual(Coach.genericDomain('신규 서비스 오픈'), 'service');
assert.strictEqual(Coach.genericDomain('개인정보'), 'privacy');
// B 예시의 대표 사례와 좁히는 질문
assert.strictEqual(e.answer('외부업체 데이터 전달').topic.id, 'provide');
assert.deepStrictEqual(CO.split.provide.map((x) => x.topic), ['outsourcing', 'provide']);

// 3) 역질문 버튼(유형 B·C)은 모두 기존 주제 카드로 연결, C는 2~3개 질문
Object.entries(CO.split).forEach(([id, arr]) => { ok(T[id], 'split for unknown ' + id); ok(arr.length === 2, id + ' split needs 2'); arr.forEach((x) => ok(T[x.topic], id + ' → unknown ' + x.topic)); });
Object.entries(CO.probe).forEach(([k, qs]) => { ok(qs.length >= 2 && qs.length <= 3, k + ' probe count'); qs.forEach((p) => p.chips.forEach((c) => ok(T[c.topic], k + ' chip → unknown ' + c.topic))); });
ok(/^처음 접하시면 막막하실 수 있어요\. 함께 하나씩 짚어보며 기준을 세워볼까요\?$/.test(CO.calm), 'calm line');

// 4) OX 퀴즈: 근거 쪽이 실제 원문에 있고 조문 표기가 올바름
const seen = {};
CO.ox.forEach((x) => {
  ok(!seen[x.id], 'dup ox ' + x.id); seen[x.id] = 1;
  ok(T[x.topic], x.id + ': unknown topic'); ok(x.a === 'O' || x.a === 'X', x.id + ': answer');
  ok(x.ex && (x.ref || x.law), x.id + ': needs basis');
  (x.ref || []).forEach((r) => { ok(docs[r.d], x.id + ': doc ' + r.d); ok(pages[r.d + ':' + r.p], x.id + ': no text at ' + r.d + ' p' + r.p); });
  (x.law || []).forEach((l) => { ok(LAWS.includes(l.n), x.id + ': law ' + l.n); ok(l.k === (/(지침|기준)$/.test(l.n) ? '행정규칙' : '법령'), x.id + ': kind'); });
});
ok(CO.ox.length >= 25, 'ox bank size');
ok(Coach.oxFor('breach', CO.ox, 2).every((x) => x.topic === 'breach'), 'topic-first quiz pick');
ok(Coach.oxFor('sw-cost', CO.ox, 1).length === 1, 'fallback quiz pick');

// 5) 법령 요약: 원문이 아닌 2~3줄 요약 + 근거 표기
window.COUNSEL_TOPICS.forEach((t) => (t.laws || []).forEach((l) => {
  const s = Coach.lawSummary(l, t, window.LAW_SUMMARY);
  ok(s.lines.length >= 1 && s.lines.length <= 3, t.id + ' ' + l.n + l.jo + ': lines ' + s.lines.length);
  ok(s.lines.every((x) => x.length <= 260 && (x.match(/[①-⑳]/g) || []).length < 2), t.id + ': summary looks like raw text');
  if (l.n === '개인정보 보호법') ok(/요약표/.test(s.from), t.id + ' 제' + l.jo + '조 should come from the summary table');
}));
assert.strictEqual(Coach.citeOf({ n: '개인정보 보호법', jo: 15, hang: 1 }), '개인정보 보호법 제15조 제1항');
assert.strictEqual(Coach.citeOf({ n: '개인정보 보호법', jo: 24, b: 2 }), '개인정보 보호법 제24조의2');

// 6) 용어 풀이: 처음 한 번만, 법령명 안이나 이미 괄호가 있으면 건너뜀
const g = Coach.makeGloss(CO.gloss);
const u = {}; const once = g('가명처리한 뒤 다시 가명처리합니다.', u);
ok((once.match(/가명처리\(/g) || []).length === 1, once);
ok(!/「주요정보통신기반시설\(/.test(g('「주요정보통신기반시설 기술적 취약점 가이드」', {})), 'no gloss inside 「」');
ok(/처리위탁\(우리 업무를/.test(g('처리위탁과 제3자 제공은 다릅니다.', {})), 'gloss 처리위탁');
ok(/제3자 제공\(다른 기관/.test(g('처리위탁과 제3자 제공은 다릅니다.', {})), 'gloss 제3자 제공');

// 7) 화면 연결: 챗봇·퀴즈 페이지가 코치 스크립트를 읽고, 시민용은 그대로
const chat = fs.readFileSync(R('chatbot.html'), 'utf8'), quiz = fs.readFileSync(R('quiz.html'), 'utf8'), citizen = fs.readFileSync(R('citizen.html'), 'utf8');
['counsel-coach.js', 'counsel-coach-core.js', 'law-summary.js'].forEach((f) => ok(chat.includes(f), 'chatbot loads ' + f));
ok(/data-mode="coach"/.test(chat), 'coach mode button');
ok(quiz.includes('quiz-ui.js') && quiz.includes('security-ox.html'), 'quiz page');
ok(!citizen.includes('counsel-coach'), 'citizen page untouched by coach');
const ui = fs.readFileSync(R('assets/js/counsel-ui.js'), 'utf8');
ok(ui.includes('🎯 방금 배운 내용 OX 퀴즈 풀기 (퀴즈 페이지 이동)') && ui.includes('🚨 긴급/모호한 사안 전문가(보안팀/DPO) 문의') && ui.includes('[ 클릭하여 자세히 보기 ]'), 'fixed buttons');
ok(!/fetchLaw\(first\)/.test(ui), 'raw article is not auto-inserted into answers');
ok(ui.includes("사이버보안과 개인정보 보호를 알려드리는 AI 상담사 \\'간세\\'예요. 🐢"), 'intro message');
console.log('counsel-coach: ' + n + ' checks passed');
