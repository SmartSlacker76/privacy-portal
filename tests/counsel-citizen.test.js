/* 시민용 모드 규칙 테스트: node tests/counsel-citizen.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/counsel-ui.js'), 'utf8');
const pick = (from, to) => src.slice(src.indexOf(from), src.indexOf(to));
const f = new Function(pick('  var SENSITIVE', '  var INDIVIDUAL') + pick('  var END', '  function deskHtml') +
  'var INDIVIDUAL=' + src.match(/var INDIVIDUAL = (\/.*\/);/)[1] + ';return {maskSensitive, haeyo, plain, INDIVIDUAL};')();
// 해요체 변환
for (const [a, b] of [['확인합니다.', '확인해요.'], ['적용됩니다.', '적용돼요.'], ['대상입니다.', '대상이에요.'], ['기기입니다.', '기기예요.'], ['있습니다.', '있어요.'],
  ['거칩니다.', '거쳐요.'], ['봅니다.', '봐요.'], ['다릅니다.', '달라요.'], ['아닙니다.', '아니에요.'], ['쉽습니다.', '쉬워요.']]) assert.strictEqual(f.haeyo(a), b);
// 내부 근거 표기는 시민용 문장에서 지웁니다
assert.strictEqual(f.plain('고정형입니다(차량 내부 고정 카메라는 고정형, D55 p51).'), '고정형이에요(차량 내부 고정 카메라는 고정형).');
// 민감정보 가림
const m = f.maskSensitive('주민번호 900101-1234567 계좌 110-123-456789 비밀번호는 abcd1234');
assert(!/900101|456789|abcd1234/.test(m.q), m.q);
assert.deepStrictEqual(m.kinds.sort(), ['계좌·카드번호', '비밀번호', '주민등록번호'].sort());
assert.deepStrictEqual(f.maskSensitive('CCTV 영상 보관 기간').kinds, []);
// 개별 민원·처분 판단은 민원 창구 안내로
for (const q of ['제 민원 처리 상태 알려주세요', '내 신청 언제 처리돼요', '제 경우 과태료 받나요']) assert(f.INDIVIDUAL.test(q), q);
for (const q of ['CCTV 안내판', '개인정보 유출 문자를 받았어요']) assert(!f.INDIVIDUAL.test(q), q);
// 전화번호도 가림
assert.deepStrictEqual(f.maskSensitive('제 번호 010-1234-5678 이에요').kinds, ['전화번호']);
// 시민용 카드: 본문(첫 줄 + 가운데 줄) 200자 이내, 가운데 2~3줄, 이모티콘 없음, 결론은 '~하실 수 있어요'
global.window = {}; require(path.join(__dirname, '..', 'assets/data/counsel-citizen.js'));
const cards = [].concat(...Object.values(window.COUNSEL_CITIZEN)).concat(window.COUNSEL_CITIZEN_FAQ);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
for (const c of cards) {
  const body = c.lead + c.items.map(i => i[0] + ' ' + i[1]).join('');
  assert(body.length <= 200, c.lead + ' ' + body.length);
  assert(c.items.length >= 2 && c.items.length <= 3, c.lead);
  assert(!EMOJI.test(body), c.lead);
  assert(/실 수 있어요\.$/.test(c.lead), c.lead);
  c.act.forEach(k => assert(window.COUNSEL_DESKS[k], k));
}
// 운영자 FAQ 예시 질문 연결
const faq = (q) => (window.COUNSEL_CITIZEN_FAQ.find(x => x.match.test(q)) || {}).id;
assert.strictEqual(faq('스미싱 문자 받았어요'), 'smishing');
assert.strictEqual(faq('의심스러운 문자 링크 눌러도 돼요?'), 'smishing');
assert.strictEqual(faq('정보공개 청구 어떻게 해요'), 'info-open');
assert.strictEqual(faq('조례 조회는 어디서'), 'law-search');
assert.strictEqual(faq('CCTV 영상 보고 싶어요'), undefined);
console.log('citizen rules: all passed');
