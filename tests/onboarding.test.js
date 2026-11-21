/* 신규 직원 온보딩 데이터·로직 테스트: node tests/onboarding.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = (p) => path.join(__dirname, '..', p);
global.window = {};
global.document = { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } };
require(R('assets/data/counsel-topics.js')); require(R('assets/data/counsel-lexicon.js'));
eval(fs.readFileSync(R('assets/data/library/catalog.js'), 'utf8'));
require(R('assets/data/onboarding.js'));
require(R('assets/js/onboarding-ui.js'));
const Engine = require(R('assets/js/counsel-engine.js'));
const e = new Engine({ topics: window.COUNSEL_TOPICS, lexicon: window.COUNSEL_LEXICON, stop: window.COUNSEL_STOP, compare: window.COUNSEL_COMPARE, catalog: window.LIB_CATALOG });
const pages = {};
for (let c = 1; c <= 5; c++) {
  const sh = JSON.parse(fs.readFileSync(R(`assets/data/library/shard-${c}.json`), 'utf8'));
  e.addShard(c, sh);
}
e.chunks.forEach((c) => { pages[c[0] + ':' + c[1]] = 1; });
const OB = window.ONBOARDING, UI = window.OnboardingUI;
const docs = {}; window.LIB_CATALOG.docs.forEach((d) => { docs[d.id] = d; });
const topics = {}; window.COUNSEL_TOPICS.forEach((t) => { topics[t.id] = t; });
const LAWS = ['개인정보 보호법', '개인정보 보호법 시행령', '개인정보의 안전성 확보조치 기준', '표준 개인정보 보호지침', '국가 사이버보안 기본지침'];
let n = 0;
function ok(cond, msg) { n++; assert(cond, msg); }

// 모든 근거: 문서 ID·쪽이 실제 원문에 있고, 조문 표기가 올바른지
function checkBasis(x, where) {
  (x.ref || []).forEach((r) => {
    ok(docs[r.d], where + ': unknown doc ' + r.d);
    ok(Number.isInteger(r.p) && r.p >= 1 && r.p <= docs[r.d].pages, where + ': page out of range ' + r.d + ' p' + r.p);
    ok(pages[r.d + ':' + r.p], where + ': no extracted text at ' + r.d + ' p' + r.p);
  });
  (x.law || []).forEach((l) => {
    ok(LAWS.includes(l.n), where + ': unexpected law ' + l.n);
    ok(l.k === (/(지침|기준)$/.test(l.n) ? '행정규칙' : '법령'), where + ': wrong kind for ' + l.n);
    ok(Number.isInteger(l.jo) && l.jo > 0, where + ': bad jo');
  });
}
checkBasis({ ref: OB.CODE.ref }, 'code');
ok(OB.CODE.items.length === 9, 'code has 9 items (표준행동수칙)');
// 직무
ok(OB.ROLES.map((r) => r.id).join() === 'hr,civil,it,plan,contract', 'five roles');
OB.ROLES.forEach((r) => {
  r.focus.forEach((id) => ok(topics[id], r.id + ': unknown focus topic ' + id));
  r.tips.forEach((t, i) => { ok(t.ref || t.law, r.id + ' tip ' + i + ' needs basis'); checkBasis(t, r.id + ' tip ' + i); });
  r.qs.forEach((q) => {
    const a = e.answer(q);
    ok(a.kind === 'topic', r.id + ': example "' + q + '" should hit a topic card, got ' + a.kind);
  });
});
// 플레이북
ok(OB.PLAYBOOKS.map((p) => p.id).join() === 'pi-check,share,genai,incident', 'four playbooks');
OB.PLAYBOOKS.forEach((p) => {
  ok(topics[p.topic], p.id + ': unknown topic');
  ok(p.dont.length >= 2, p.id + ': dont list');
  const steps = p.cases ? [].concat(...p.cases.map((c) => c.steps)) : p.steps;
  steps.forEach((s, i) => { ok(s.ref || s.law, p.id + ' step ' + i + ' needs basis'); checkBasis(s, p.id + ' step ' + i); });
});
const inc = OB.PLAYBOOKS.find((p) => p.id === 'incident');
ok(inc.cases.map((c) => c.id).join() === 'misdelivery,loss,phishing,infection,breach', 'incident cases');
ok(/72시간/.test(JSON.stringify(inc)), 'incident mentions 72시간');
// 보고 경로: 기관 연락처는 설정값으로만, 외부 창구는 근거 있는 것만
OB.REPORT.inside.forEach((r) => ok(['privacy', 'security'].includes(r.agency), 'inside contact uses AGENCY key'));
OB.REPORT.outside.forEach((o) => { ok(o.ref && o.ref.length, 'outside contact needs source ' + o.label); checkBasis(o, 'report ' + o.label); });
// 퀴즈
const ids = new Set();
ok(OB.QUIZ.length >= 12, 'quiz bank size');
OB.QUIZ.forEach((q) => {
  ok(!ids.has(q.id), 'duplicate quiz id ' + q.id); ids.add(q.id);
  ok(q.opts.length >= 2 && q.a >= 0 && q.a < q.opts.length, q.id + ': answer index');
  ok(q.ex && (q.ref || q.law), q.id + ': explanation with basis');
  ok(!q.topic || topics[q.topic], q.id + ': unknown topic ' + q.topic);
  checkBasis(q, q.id);
});
// 오늘의 문항: 같은 날 같은 문제, 날마다 바뀜, 한 바퀴 돌면 모든 문항 등장
const d1 = UI.dailyQuiz('2026-11-21'), d1b = UI.dailyQuiz('2026-11-21'), d2 = UI.dailyQuiz('2026-11-22');
ok(d1.length === 2 && d1[0].id !== d1[1].id, 'two distinct questions');
ok(d1.map((q) => q.id).join() === d1b.map((q) => q.id).join(), 'deterministic per day');
ok(d1.map((q) => q.id).join() !== d2.map((q) => q.id).join(), 'changes next day');
const seen = new Set(); for (let i = 0; i < OB.QUIZ.length; i++) { const dt = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10); UI.dailyQuiz(dt).forEach((q) => seen.add(q.id)); }
ok(seen.size === OB.QUIZ.length, 'every question appears within a cycle');
const d3 = UI.dailyQuiz('2026-11-21', OB.QUIZ, 3);
ok(d3.length === 3 && d3[0].id === d1[0].id && d3[1].id === d1[1].id, 'extra question keeps today\'s first two');
ok(UI.paragraph('제1조 ① 가 ② 나 ③ 다', 2) === '② 나', 'paragraph extraction');
// 사내 규정이 없으므로 자리표시 문구를 넣지 않습니다. 인증키도 넣지 않습니다.
const blob = fs.readFileSync(R('assets/data/onboarding.js'), 'utf8') + fs.readFileSync(R('assets/js/onboarding-ui.js'), 'utf8') + fs.readFileSync(R('onboarding.html'), 'utf8');
ok(!/사내 ?규정|내부 ?규정을 확인/.test(blob), 'no in-house rule placeholders');
ok(!/LAW_OC|[?&]OC=/.test(blob), 'no law OC in browser code');
ok(!/fetch\(/.test(fs.readFileSync(R('assets/js/onboarding-ui.js'), 'utf8')), 'onboarding sends nothing itself (law viewer goes through HondiLawAPI)');
// 페이지: CSP와 스크립트 순서
const html = fs.readFileSync(R('onboarding.html'), 'utf8');
ok(/Content-Security-Policy[^>]+script-src 'self'/.test(html), 'CSP present');
const order = ['assets/config.js', 'law-api-client.js', 'catalog.js', 'onboarding.js', 'onboarding-ui.js'].map((s) => html.indexOf(s));
ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), 'script order');
ok(/href="onboarding.html"/.test(fs.readFileSync(R('chatbot.html'), 'utf8')), 'chatbot links to onboarding');
console.log('onboarding: ' + n + ' checks passed');
