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
  assert.deepEqual(await status.json(), { ok: true, law: false, fetch: false, fetchPolicy: 'explicit-urls-v1', ai: false });
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
