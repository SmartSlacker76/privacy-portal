/* Public law and policy gateway. Administrative routes are closed.
 * The optional /chat route only rewrites evidence the browser already holds; it is off unless the AI and CHAT_RATE bindings exist. */
const DRF = 'https://www.law.go.kr/DRF';
const UA = 'privacy-edu-worker';
const publicPaths = new Set(['/', '/health', '/law', '/fetch', '/chat']);
const CHAT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CHAT_SYSTEM = [
  '너는 공공기관 개인정보 보호·정보보안 업무를 처음 맡은 직원을 돕는 상담 사수다.',
  '반드시 사용자 메시지의 [근거] 목록에 있는 문장만 사용해 한국어로 짧게 다시 정리한다.',
  '근거에 없는 법 조항, 숫자, 기한, 금액, 예외, 사례를 새로 만들거나 추론하지 않는다.',
  '각 문장 끝에 사용한 근거 번호를 [1]처럼 붙인다.',
  '근거로 답할 수 없으면 "제공된 자료만으로는 정리하기 어렵습니다."라고만 답한다.',
  '형식: 핵심 2줄, 이어서 해야 할 일 3개 이내. 법률 자문이 아닌 일반 안내 어조를 유지한다.'
].join('\n');

function chatInput(body) {
  if (!body || typeof body.q !== 'string' || !Array.isArray(body.evidence)) return null;
  const q = body.q.trim();
  if (!q || q.length > 300 || body.evidence.length < 1 || body.evidence.length > 20) return null;
  const evidence = [];
  for (const e of body.evidence) {
    if (!e || typeof e.text !== 'string' || (e.ref != null && typeof e.ref !== 'string')) return null;
    const text = e.text.trim().slice(0, 800);
    if (text) evidence.push({ ref: String(e.ref || '').slice(0, 120), text });
  }
  return evidence.length ? { q, evidence } : null;
}

function configuredUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
      && /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname)) return url.href;
  } catch { /* Invalid URL. */ }
  return null;
}

function lawInput(kind, name, article, suffix) {
  if (!['법령', '행정규칙'].includes(kind) || typeof name !== 'string' || !/^[가-힣a-z0-9 ().·ㆍ,_-]{1,100}$/i.test(name)) return null;
  if (!/^\d{1,4}$/.test(article) || !/^\d{1,4}$/.test(suffix) || Number(article) < 1) return null;
  return { kind, name, jo: Number(article), branch: Number(suffix) };
}

async function cappedBody(message, max) {
  if (!message.body || Number(message.headers.get('content-length')) > max) throw Error('body size');
  const reader = message.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) throw Error('body size');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return new Blob(chunks).text();
}

function audit(event, request, status) {
  const id = request.headers.get('CF-Ray') || '';
  console.warn(JSON.stringify({ event, status, ray: /^[a-f0-9]{16,24}-[a-z]{3}$/i.test(id) ? id : undefined }));
}

async function tokenMatches(request, token) {
  if (typeof token !== 'string' || token.length < 32) return false;
  const supplied = request.headers.get('authorization') || '';
  if (!supplied.startsWith('Bearer ') || supplied.length > 1024) return false;
  const digest = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([digest(supplied.slice(7)), digest(token)]);
  let different = 0;
  a.forEach((byte, i) => { different |= byte ^ b[i]; });
  return different === 0;
}

async function allowRate(request, limiter) {
  const key = request.headers.get('CF-Connecting-IP');
  return !!(key && limiter && (await limiter.limit({ key })).success);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin');
    const cors = origin && origin === env.ALLOWED_ORIGIN ? { 'Access-Control-Allow-Origin': origin } : {};
    const headers = { ...cors, 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
    const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
    const deny = (event, status) => { audit(event, request, status); return json({ ok: false }, status); };
    const allowed = new Set(String(env.POLICY_FETCH_URLS || '').split(/\s+/).map(configuredUrl).filter(Boolean));

    try {
      if (path === '/mcp') {
        if (request.method !== 'POST' || origin) return deny('mcp_method_or_origin_denied', 404);
        if (!env.MCP_TOKEN) return deny('mcp_disabled', 404);
        if (!(await tokenMatches(request, env.MCP_TOKEN))) return deny('mcp_auth_denied', 401);
        if (!(await allowRate(request, env.MCP_RATE))) return deny('mcp_rate_denied', 429);
        if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ ok: false }, 415);
        let rpc;
        try { rpc = JSON.parse(await cappedBody(request, 16384)); }
        catch { return deny('mcp_input_denied', 400); }
        if (!rpc || rpc.jsonrpc !== '2.0' || Array.isArray(rpc) || !['number', 'string', 'undefined'].includes(typeof rpc.id) || String(rpc.id).length > 128) {
          return deny('mcp_input_denied', 400);
        }
        const response = await mcp(rpc, env);
        return response === null ? new Response(null, { status: 204, headers }) : json(response);
      }
      if (!publicPaths.has(path)) return deny('route_denied', 404);
      if (origin && origin !== env.ALLOWED_ORIGIN) return deny('origin_denied', 403);
      if (path === '/chat') {
        if (!env.AI || !env.CHAT_RATE) return deny('chat_disabled', 404);
        if (!origin || !cors['Access-Control-Allow-Origin']) return deny('chat_origin_denied', 403);
        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } });
        }
        if (request.method !== 'POST') return deny('chat_method_denied', 405);
        if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ ok: false }, 415);
        if (!(await allowRate(request, env.CHAT_RATE))) return deny('chat_rate_denied', 429);
        let input;
        try { input = chatInput(JSON.parse(await cappedBody(request, 24576))); }
        catch { input = null; }
        if (!input) return deny('chat_input_denied', 400);
        const evidence = input.evidence.map((e, i) => `[${i + 1}] ${e.ref ? '(' + e.ref + ') ' : ''}${e.text}`).join('\n');
        const result = await env.AI.run(env.CHAT_MODEL || CHAT_MODEL, {
          messages: [{ role: 'system', content: CHAT_SYSTEM }, { role: 'user', content: `[질문]\n${input.q}\n\n[근거]\n${evidence}` }],
          max_tokens: 600, temperature: 0.1
        });
        const text = String(result?.response || '').trim().slice(0, 3000);
        return text ? json({ ok: true, text }) : json({ ok: false }, 502);
      }
      if (request.method === 'OPTIONS' && cors['Access-Control-Allow-Origin']) {
        return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
      }
      if (request.method !== 'GET') return deny('method_denied', 405);

      if (path === '/health' || path === '/') return json({ ok: true, law: Boolean(env.LAW_OC), fetch: Boolean(allowed.size && env.POLICY_RATE), fetchPolicy: 'explicit-urls-v1', ai: Boolean(env.AI && env.CHAT_RATE) });

      if (path === '/law') {
        if (!env.LAW_OC) return json({ ok: false, error: '조문 조회 서비스를 사용할 수 없습니다.' }, 503);
        const input = lawInput(url.searchParams.get('kind') || '법령', url.searchParams.get('name'), url.searchParams.get('jo') || '', url.searchParams.get('branch') || '0');
        if (!input) return deny('law_input_denied', 400);
        const key = new URL('/cache/law', url.origin);
        key.search = new URLSearchParams(input).toString();
        const hit = await caches.default.match(key.href);
        if (hit) return new Response(hit.body, { headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
        if (!(await allowRate(request, env.LAW_RATE))) return deny('law_rate_denied', 429);
        const out = await lookup(env, input);
        if (out.ok) {
          await caches.default.put(key.href, new Response(JSON.stringify(out), { headers: { 'Cache-Control': 'public, max-age=604800' } }));
        }
        return json(out);
      }

      const raw = url.searchParams.get('url') || '';
      const target = raw.length <= 2048 ? configuredUrl(raw) : null;
      if (!target || !allowed.has(target)) return deny('fetch_target_denied', 403);
      if (!(await allowRate(request, env.POLICY_RATE))) return deny('fetch_rate_denied', 429);
      const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,text/plain' } });
      if (!response.ok || !/^(text\/(html|plain)|application\/xhtml\+xml)\b/i.test(response.headers.get('content-type') || '')) {
        return json({ ok: false, error: '공개 처리방침을 읽지 못했습니다.' }, 502);
      }
      const text = htmlToText(await cappedBody(response, 1500000)).slice(0, 300000);
      return text.length > 200 ? json({ ok: true, text }) : json({ ok: false, error: '본문을 직접 붙여넣어 주세요.' }, 422);
    } catch {
      return deny('gateway_error', 502);
    }
  }
};

const KB = [
  { kw: ['cctv', '영상', '보관'], a: 'CCTV 영상 보관기간은 개별 법령이 우선입니다. 어린이집은 영유아보육법 시행규칙 제9조에 따라 60일 이상, 별도 규정이 없으면 표준 개인정보 보호지침 제41조에 따라 30일 이내 보관이 원칙입니다. 저장기간 경과 시 자동삭제 여부를 확인해 영상정보 관리대장에 기록합니다.', src: '영유아보육법 시행규칙 제9조, 표준 개인정보 보호지침 제41조, 법 제25조' },
  { kw: ['주민', '주민등록번호'], a: '주민등록번호는 법령에 구체적 근거가 있는 경우에만 처리할 수 있고(동의 불가), 저장 시 암호화해야 합니다.', src: '법 제24조의2, 고시 제7조' },
  { kw: ['비밀번호', '패스워드'], a: '비밀번호는 복호화되지 않도록 일방향(해시) 암호화하여 저장합니다(솔트+반복 권장).', src: '고시 제7조①' },
  { kw: ['접속기록', '로그'], a: '접속기록은 최소 1년, 5만명 이상 또는 고유식별·민감정보 처리 시 2년 이상 보관하고 월 1회 이상 점검합니다.', src: '고시 제8조' },
  { kw: ['파기', '삭제'], a: '보유기간 경과·목적 달성 시 지체 없이(정당한 사유 없으면 5일 이내) 복원 불가능하게 파기합니다.', src: '법 제21조, 고시 제13조' },
  { kw: ['유출', '통지', '신고'], a: '유출 시 정보주체에게 72시간 이내 통지하고, 1천명 이상·민감/고유식별·외부 불법접근이면 개인정보위·KISA에 신고합니다.', src: '법 제34조' },
  { kw: ['영향평가', 'pia'], a: '공공기관이 일정 규모(5만명 민감/고유식별, 50만명 연계, 100만명 파일) 이상이면 영향평가가 의무입니다.', src: '법 제33조, 영 제35조' },
  { kw: ['동의', '고지'], a: '동의 시 ①목적 ②항목 ③보유기간 ④거부권·불이익을 알리고, 민감·고유식별·제3자 제공은 별도 동의를 받습니다.', src: '법 제15조·제17조·제22조·제23조·제24조' }
];
const qnaTool = { name: 'get_privacy_answer', description: '등록된 개인정보 보호 안내를 검색합니다.', inputSchema: { type: 'object', properties: { question: { type: 'string', maxLength: 300 } }, required: ['question'] } };

const tool = {
  name: 'lookup_law_article',
  description: '법제처 현행 법령 또는 행정규칙의 조문을 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: { kind: { enum: ['법령', '행정규칙'] }, name: { type: 'string', maxLength: 100 }, jo: { type: 'integer', minimum: 1, maximum: 9999 }, branch: { type: 'integer', minimum: 0, maximum: 9999 } },
    required: ['name', 'jo']
  }
};

function lookup(env, { kind, name, jo, branch }) {
  return kind === '행정규칙' ? fetchAdmrul(env.LAW_OC, name, jo, branch) : fetchLaw(env.LAW_OC, name, jo, branch);
}

async function mcp(rpc, env) {
  const id = rpc.id ?? null;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const error = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (rpc.method === 'initialize') return ok({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'privacy-law-mcp', version: '2.0.0' } });
  if (rpc.method === 'notifications/initialized') return null;
  if (rpc.method === 'tools/list') return ok({ tools: [tool, qnaTool] });
  if (rpc.method !== 'tools/call') return error(-32601, 'Method not found');
  const args = rpc.params?.arguments || {};
  if (rpc.params?.name === qnaTool.name) {
    if (typeof args.question !== 'string' || args.question.length > 300) return error(-32602, 'Invalid parameters');
    const q = args.question.toLowerCase().replace(/\s/g, '');
    const entry = KB.map((item) => ({ item, score: item.kw.filter((word) => q.includes(word)).length })).sort((a, b) => b.score - a.score)[0];
    return ok({ content: [{ type: 'text', text: entry.score ? entry.item.a + '\n근거: ' + entry.item.src : '등록된 주제로 질문해 주세요.' }] });
  }
  if (rpc.params?.name !== tool.name) return error(-32601, 'Method not found');
  const input = lawInput(args.kind || '법령', args.name, args.jo, args.branch ?? 0);
  if (!input || !env.LAW_OC) return error(-32602, 'Invalid parameters or service unavailable');
  const found = await lookup(env, input);
  return ok({ content: [{ type: 'text', text: found.ok ? [found.article, found.content, found.source].join('\n\n') : '조회 실패' }], isError: !found.ok });
}

async function drf(path, params) {
  const q = new URLSearchParams({ type: 'JSON', ...params });
  const r = await fetch(`${DRF}/${path}?${q}`, { redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('DRF ' + r.status);
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { throw new Error('DRF 비정상 응답'); }
}

// 법률·시행령: 검색으로 MST(법령일련번호)를 찾고, 본문에서 해당 조문을 추출
async function fetchLaw(oc, name, jo, branch) {
  const s = await drf('lawSearch.do', { OC: oc, target: 'law', query: name, display: '20' });
  const list = asArray(s && s.LawSearch && s.LawSearch.law);
  const pick = list.find(x => String(x['법령명한글'] || '').replace(/\s/g, '') === name.replace(/\s/g, '') && /현행/.test(x['현행연혁코드'] || '현행'));
  if (!pick) return { ok: false, error: '법령 없음' };
  const mst = pick['법령일련번호'] || pick['법령ID'];
  const body = await drf('lawService.do', { OC: oc, target: 'law', MST: String(mst) });
  const units = asArray(body && body['법령'] && body['법령']['조문'] && body['법령']['조문']['조문단위']);
  const label = '제' + jo + '조' + (branch ? '의' + branch : '');
  const art = units.find(u => String(u['조문번호']) === String(jo) && String(u['조문가지번호'] || 0) === String(branch || 0));
  const title = pick['법령명한글'] || name;
  if (!art || !joText(art).trim()) return { ok: false, error: '요청한 조문 원문을 확인하지 못했습니다.' };
  return { ok: true, article: title + ' ' + label + (art['조문제목'] ? '(' + art['조문제목'] + ')' : ''), content: joText(art), source: '법제처 국가법령정보 Open API · 현행' };
}

// 행정규칙(고시·지침): 조문 단위 조회 지원이 제한적이라 본문/링크로 안내
async function fetchAdmrul(oc, name, jo, branch) {
  const s = await drf('lawSearch.do', { OC: oc, target: 'admrul', query: name, display: '20' });
  const list = asArray(s && s.AdmRulSearch && s.AdmRulSearch.admrul);
  const pick = list.find(x => String(x['행정규칙명'] || '').replace(/\s/g, '') === name.replace(/\s/g, ''));
  if (!pick) return { ok: false, error: '행정규칙 없음' };
  const id = pick['행정규칙일련번호'] || pick['행정규칙ID'];
  const body = await drf('lawService.do', { OC: oc, target: 'admrul', ID: String(id) });
  const units = asArray(body && body['AdmRulService'] && body['AdmRulService']['조문'] && body['AdmRulService']['조문']['조문단위']);
  const label = '제' + jo + '조' + (branch ? '의' + branch : '');
  const art = units.find(u => String(u['조문번호']) === String(jo) && String(u['조문가지번호'] || 0) === String(branch || 0));
  const title = pick['행정규칙명'] || name;
  if (art && joText(art).trim()) return { ok: true, article: title + ' ' + label, content: joText(art), source: '법제처 국가법령정보 Open API · 행정규칙' };
  return { ok: false, error: '요청한 행정규칙 조문의 본문을 확인하지 못했습니다.' };
}

function joText(art) {
  let s = (art['조문내용'] || '').trim();
  const hangs = asArray(art['항']);
  hangs.forEach(h => {
    if (h['항내용']) s += '\n' + h['항내용'].trim();
    asArray(h['호']).forEach(ho => {
      if (ho['호내용']) s += '\n' + ho['호내용'].trim();
      asArray(ho['목']).forEach(mo => { const t = Array.isArray(mo['목내용']) ? mo['목내용'].join('\n') : (mo['목내용'] || ''); if (t) s += '\n' + t.trim(); });
    });
  });
  return s.replace(/\n{3,}/g, '\n\n').slice(0, 20000);
}
function asArray(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }

/* HTML → 본문 텍스트 (처리방침 추출용) */
function htmlToText(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, ' ');
  // 표는 구분자를 살려 둔다
  s = s.replace(/<\/t[dh]>/gi, ' | ').replace(/<\/tr>/gi, '\n');
  s = s.replace(/<\/(p|div|li|h[1-6]|section|article|br)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
       .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d));
  s = s.split('\n').map(l => l.replace(/[ \t\u00a0]+/g, ' ').trim()).filter(Boolean).join('\n');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}
