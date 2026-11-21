/* 상담 엔진 회귀 테스트: node tests/counsel-engine.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
global.window = {};
const R = (p) => path.join(__dirname, '..', p);
require(R('assets/data/counsel-topics.js')); require(R('assets/data/counsel-lexicon.js'));
eval(fs.readFileSync(R('assets/data/library/catalog.js'), 'utf8'));
const Engine = require(R('assets/js/counsel-engine.js'));
const e = new Engine({ topics: window.COUNSEL_TOPICS, lexicon: window.COUNSEL_LEXICON, stop: window.COUNSEL_STOP, compare: window.COUNSEL_COMPARE, catalog: window.LIB_CATALOG });
for (let c = 1; c <= 5; c++) e.addShard(c, JSON.parse(fs.readFileSync(R(`assets/data/library/shard-${c}.json`), 'utf8')));
let fail = 0;
function expectTopic(q, id) {
  const a = e.answer(q); const got = a.kind === 'topic' ? a.topic.id : a.kind + ':' + (a.reason || (a.doc && a.doc.id) || '');
  const ok = got === id; if (!ok) fail++;
  console.log((ok ? 'ok  ' : 'FAIL') + ' ' + q + ' → ' + got + (ok ? '' : ' (expected ' + id + ')'));
  return a;
}
function expectKind(q, kind) { const a = e.answer(q); const ok = a.kind === kind || (a.kind === 'fallback' && a.reason === kind); if (!ok) fail++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + q + ' → ' + a.kind + (a.reason ? ':' + a.reason : '') + (a.topic ? ':' + a.topic.id : '')); return a; }
// 사용자 제시 예시: 모두 고정형·이동형 비교로
['이동형과 고정형 차이는?', '이동형 영상정보처리기기와 고정형 영상정보처리기기의 차이는?', '이동형 vs 고정형', '블랙박스', '이동형 cctv와 고정형 cctv 차이는?', '바디캠', '드론 촬영'].forEach(q => expectTopic(q, 'video-compare'));
// 단어 / 단어+단어 / 단어+문장 / 은어
[['파기', 'destroy'], ['유출', 'breach'], ['위탁', 'outsourcing'], ['망분리', 'n2sf'], ['USB', 'usb'], ['CCTV', 'cctv'], ['씨씨티비 안내판', 'cctv'],
 ['용역 파기', 'outsourcing'], ['외주 주는데 엑셀로 주민번호 넘겨도 돼?', 'rrn'], ['챗GPT 써도 되나요', 'genai-use'], ['메일 잘못 보냈어요 개인정보', 'breach'],
 ['접속기록 얼마나 보관', 'access-log'], ['비번 저장 어떻게', 'encrypt'], ['퇴직자 계정 정리', 'access'], ['경찰이 영상 달래요', 'purpose-out'],
 ['14세 미만 동의', 'child'], ['개인정보 처리방침 어디에 올려', 'policy'], ['영향평가 대상', 'pia'], ['보호책임자 지정 요건', 'cpo'], ['호기심으로 조회하면 처벌', 'discipline'],
 ['SQL 인젝션 막는 법', 'secure-coding'], ['보안성 검토 언제', 'security-review'], ['클라우드 도입', 'cloud'], ['랜섬웨어 걸렸어요', 'incident'], ['프롬프트 인젝션', 'ai-security'],
 ['IP카메라 비밀번호', 'ipcam'], ['로봇청소기', 'iot'], ['가명처리', 'pseudonym'], ['지문 인식 출입', 'biometric'], ['민감정보', 'sensitive']].forEach(([q, id]) => expectTopic(q, id));
expectKind('ㅁㄴㅇㄹ', 'unclear');
expectKind('자료 목록 보여줘', 'catalog');
const cmp = e.answer('이동형 vs 고정형');
assert(cmp.topic.table && cmp.topic.table.rows.length >= 5);
const pia = e.answer('영향평가 대상'); assert(pia.cond, 'PIA without 주체 should carry the condition prompt');
const pia2 = e.answer('공공기관 영향평가 대상'); assert(!pia2.cond, 'condition satisfied');
const s = e.answer('스마트시티 통합플랫폼 보안 요구사항'); console.log('search/topic:', s.kind, s.topic && s.topic.id, (s.passages || []).slice(0, 2).map(p => p.doc + ' p' + p.page));
const nb = e.answer('양자 텔레포테이션 인사발령'); console.log('noBasis:', nb.kind, nb.reason);
console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail ? 1 : 0);
