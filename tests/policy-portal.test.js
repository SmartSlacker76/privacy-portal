const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('six house styles distinguish CCTV from a drone', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync('assets/policy/labels.js', 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync('assets/policy/rules.js', 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync('assets/policy/engine.js', 'utf8'), sandbox);
  const { PolicyLabels } = sandbox.window;
  const { PrivacyEngine } = sandbox;
  assert.deepEqual(Object.values(PolicyLabels.themes), ['표준', '돌하르방', '제주감귤', '성산일출봉', '제주해녀', '어린이']);
  assert.equal(PolicyLabels.icon('purpose', 'step', 'invalid'), PolicyLabels.icon('purpose', 'step', 'standard'));
  for (const theme of Object.keys(PolicyLabels.themes)) {
    assert.notEqual(PolicyLabels.icon('cctv', 'right', theme), PolicyLabels.icon('mobile', 'right', theme));
    assert.match(decodeURIComponent(PolicyLabels.character(theme)), /<svg/);
  }
  const labels = PrivacyEngine.policyLabels([{ id: 22, text: '드론을 운영합니다.' }]);
  assert.equal(labels.find((entry) => entry.key === 'video').to, 22);
  assert.equal(labels.find((entry) => entry.key === 'mobile').to, 22);
  assert.equal(labels.some((entry) => entry.key === 'cctv'), false);
});

test('Worker blocks closed routes, foreign origins and unconfigured MCP', async () => {
  const source = fs.readFileSync('worker/worker.js', 'utf8');
  const { default: worker } = await import('data:text/javascript,' + encodeURIComponent(source));
  const url = 'https://worker.example';
  const env = { ALLOWED_ORIGIN: 'https://portal.example' };
  for (const path of ['/openapi.json', '/ai', '/admin', '/conversations', '/files']) {
    assert.equal((await worker.fetch(new Request(url + path), env)).status, 404);
  }
  const blockedOrigin = await worker.fetch(new Request(url + '/health', { headers: { Origin: 'https://foreign.example' } }), env);
  assert.equal(blockedOrigin.status, 403);
  assert.equal(blockedOrigin.headers.get('Access-Control-Allow-Origin'), null);
  const status = await worker.fetch(new Request(url + '/health', { headers: { Origin: env.ALLOWED_ORIGIN } }), env);
  assert.deepEqual(await status.json(), { ok: true, law: false, fetch: false, fetchPolicy: 'explicit-urls-v1', ai: false, summary: false });
  // /chat stays closed unless both the AI and CHAT_RATE bindings exist
  const chatReq = () => new Request(url + '/chat', { method: 'POST', headers: { Origin: env.ALLOWED_ORIGIN, 'content-type': 'application/json' }, body: '{"q":"x","evidence":[{"text":"y"}]}' });
  assert.equal((await worker.fetch(chatReq(), env)).status, 404);
  assert.equal((await worker.fetch(chatReq(), { ...env, AI: { run: async () => ({ response: 'z' }) } })).status, 404);
  const noToken = { method: 'POST', body: '{}' };
  assert.equal((await worker.fetch(new Request(url + '/mcp', noToken), env)).status, 404);
  assert.equal((await worker.fetch(new Request(url + '/mcp', noToken), { ...env, MCP_TOKEN: 'x'.repeat(40) })).status, 401);
  assert.equal((await worker.fetch(new Request(url + '/fetch?url=https://unapproved.example/'), env)).status, 403);
});

test('Optional /chat route rewrites only supplied evidence and requires the allowed origin', async () => {
  const source = fs.readFileSync('worker/worker.js', 'utf8');
  const { default: worker } = await import('data:text/javascript,' + encodeURIComponent(source));
  const url = 'https://worker.example';
  let seen = null;
  const env = { ALLOWED_ORIGIN: 'https://portal.example', CHAT_RATE: { limit: async () => ({ success: true }) }, AI: { run: async (model, input) => { seen = input; return { response: '정리 [1]' }; } } };
  const post = (headers, body) => new Request(url + '/chat', { method: 'POST', headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.1', ...headers }, body });
  const good = JSON.stringify({ q: '파기', evidence: [{ ref: 'D50 p30', text: '지체 없이 파기' }] });
  const ok = await worker.fetch(post({ Origin: env.ALLOWED_ORIGIN }, good), env);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, text: '정리 [1]' });
  assert.match(seen.messages[0].content, /근거/);
  assert.match(seen.messages[1].content, /\[1\] \(D50 p30\) 지체 없이 파기/);
  assert.equal((await worker.fetch(post({}, good), env)).status, 403);
  assert.equal((await worker.fetch(post({ Origin: 'https://foreign.example' }, good), env)).status, 403);
  assert.equal((await worker.fetch(post({ Origin: env.ALLOWED_ORIGIN }, '{"q":1}'), env)).status, 400);
  const health = await worker.fetch(new Request(url + '/health', { headers: { Origin: env.ALLOWED_ORIGIN } }), env);
  assert.equal((await health.json()).ai, true);
});

test('/law-summary returns only a checked 3-line summary, never the raw article', async () => {
  const source = fs.readFileSync('worker/worker.js', 'utf8');
  const { default: worker } = await import('data:text/javascript,' + encodeURIComponent(source));
  const url = 'https://worker.example';
  const raw = '① 개인정보처리자는 다음 각 호의 어느 하나에 해당하는 경우에는 개인정보를 수집할 수 있으며 그 수집 목적의 범위에서 이용할 수 있다.\n1. 정보주체의 동의를 받은 경우\n② 개인정보처리자는 제1항제1호에 따른 동의를 받을 때에는 다음 각 호의 사항을 정보주체에게 알려야 한다.';
  const store = new Map();
  global.caches = { default: { match: async (k) => store.has(k) ? new Response(store.get(k)) : undefined, put: async (k, r) => { store.set(k, await r.text()); } } };
  const realFetch = global.fetch;
  global.fetch = async (u) => {
    const s = String(u);
    if (s.includes('lawSearch.do')) return new Response(JSON.stringify({ LawSearch: { law: [{ 법령명한글: '개인정보 보호법', 법령일련번호: '1', 현행연혁코드: '현행' }] } }));
    return new Response(JSON.stringify({ 법령: { 조문: { 조문단위: [{ 조문번호: '15', 조문가지번호: '0', 조문제목: '개인정보의 수집ㆍ이용', 조문내용: '제15조(개인정보의 수집ㆍ이용)', 항: [{ 항내용: raw }] }] } } }));
  };
  let reply = '동의 등 법이 정한 근거가 있을 때만 개인정보를 모을 수 있어요.\n모은 목적 안에서만 써야 해요.\n동의를 받을 때는 알려야 할 사항을 먼저 알려야 해요.';
  let calls = 0;
  const env = { ALLOWED_ORIGIN: 'https://portal.example', LAW_OC: 'oc', LAW_RATE: { limit: async () => ({ success: true }) }, AI: { run: async (m, input) => { calls++; assert.match(input.messages[0].content, /3줄/); return { response: reply }; } } };
  const get = (q) => worker.fetch(new Request(url + '/law-summary?' + q, { headers: { 'CF-Connecting-IP': '203.0.113.1' } }), env);
  try {
    const ok = await get('kind=법령&name=개인정보 보호법&jo=15&branch=0&hang=1');
    assert.equal(ok.status, 200);
    const j = await ok.json();
    assert.equal(j.ok, true);
    assert.equal(j.cite, '개인정보 보호법 제15조 제1항');
    assert.equal(j.summary.length, 3);
    assert.equal(j.content, undefined, 'raw article must not be returned');
    assert(!JSON.stringify(j).includes('다음 각 호의 어느 하나에 해당하는 경우에는'));
    // cached: no second model call
    await get('kind=법령&name=개인정보 보호법&jo=15&branch=0&hang=1');
    assert.equal(calls, 1);
    // numbers not in the article are rejected
    reply = '30일 이내에 파기해야 해요.';
    assert.equal((await get('kind=법령&name=개인정보 보호법&jo=15&branch=0&hang=2')).status, 502);
    // verbatim copy of the article is rejected
    reply = '개인정보처리자는 다음 각 호의 어느 하나에 해당하는 경우에는 개인정보를 수집할 수 있으며 그 수집 목적의 범위에서 이용할 수 있다.';
    assert.equal((await get('kind=법령&name=개인정보 보호법&jo=15&branch=0&hang=0')).status, 502);
    assert.equal((await get('kind=법령&name=개인정보 보호법&jo=15&branch=0&hang=99')).status, 400);
    assert.equal((await worker.fetch(new Request(url + '/law-summary?name=개인정보 보호법&jo=15'), { ALLOWED_ORIGIN: env.ALLOWED_ORIGIN })).status, 503);
  } finally { global.fetch = realFetch; delete global.caches; }
});

test('/chat drops evidence that looks like raw article text', async () => {
  const source = fs.readFileSync('worker/worker.js', 'utf8');
  const { default: worker } = await import('data:text/javascript,' + encodeURIComponent(source));
  let seen = null;
  const env = { ALLOWED_ORIGIN: 'https://portal.example', CHAT_RATE: { limit: async () => ({ success: true }) }, AI: { run: async (m, input) => { seen = input; return { response: 'ok [1]' }; } } };
  const body = JSON.stringify({ q: '수집', evidence: [{ ref: '요약', text: '근거가 있을 때만 모을 수 있어요.' }, { ref: '원문', text: '제15조(개인정보의 수집ㆍ이용) ① 개인정보처리자는 ② 동의를' }] });
  const r = await worker.fetch(new Request('https://w.example/chat', { method: 'POST', headers: { Origin: env.ALLOWED_ORIGIN, 'content-type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' }, body }), env);
  assert.equal(r.status, 200);
  assert(!seen.messages[1].content.includes('제15조('));
  assert.match(seen.messages[1].content, /\[1\] \(요약\)/);
});

test('law lookup failures report a safe stage code instead of a bare 502', async () => {
  const source = fs.readFileSync('worker/worker.js', 'utf8');
  const { default: worker } = await import('data:text/javascript,' + encodeURIComponent(source));
  const store = new Map();
  global.caches = { default: { match: async () => undefined, put: async () => {} } };
  const realFetch = global.fetch;
  const env = { ALLOWED_ORIGIN: 'https://portal.example', LAW_OC: 'secret-oc', LAW_RATE: { limit: async () => ({ success: true }) } };
  const get = () => worker.fetch(new Request('https://w.example/law?kind=법령&name=개인정보 보호법&jo=15&branch=0', { headers: { 'CF-Connecting-IP': '203.0.113.1' } }), env);
  try {
    global.fetch = async () => new Response('<html>OC 인증 실패: 등록되지 않은 IP</html>', { status: 200 });
    let j = await (await get()).json();
    assert.equal(j.ok, false); assert.equal(j.stage, 'drf_auth'); assert(!JSON.stringify(j).includes('secret-oc'));
    global.fetch = async () => { throw new TypeError('network down'); };
    j = await (await get()).json(); assert.equal(j.stage, 'drf_network');
    const r = await worker.fetch(new Request('https://w.example/law?kind=법령&name=개인정보 보호법&jo=15&branch=0', { headers: { 'CF-Connecting-IP': '203.0.113.1' } }), { ...env, LAW_RATE: { limit: async () => { throw new Error('bad binding'); } } });
    assert.equal(r.status, 502); assert.equal((await r.json()).stage, 'rate_limiter_error');
  } finally { global.fetch = realFetch; delete global.caches; }
});
