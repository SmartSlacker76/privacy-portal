/* Cloudflare Worker — 법제처 Open API(DRF) 게이트웨이
 * 역할: 법제처 인증키(OC)를 Secret으로 보관하고, 브라우저 대신 법제처 DRF를 호출해
 *       CORS 헤더를 붙여 JSON으로 돌려줍니다. (정적 사이트는 CORS·HTTP 때문에 직접 호출 불가)
 *
 * 배포:
 *   1) dash.cloudflare.com → Workers & Pages → Create Worker (이름: privacy-agent)
 *   2) 이 파일 전체를 편집기에 붙여넣고 Deploy
 *   3) Settings → Variables and Secrets 에 아래 값 등록 후 다시 Deploy
 *        - LAW_OC         (Secret) : 법제처 OC 값 (예: 발급받은_OC값)  ← 저장소/클라이언트엔 절대 금지
 *        - ALLOWED_ORIGIN (Text)   : https://<아이디>.github.io           ← 끝 슬래시 없이
 *        - DAILY_LAW_LIMIT(Text, 선택): 기본 600 (KV 바인딩 RATE가 있을 때만 적용)
 *   4) 사이트의 assets/config.js 의 WORKER_URL 을 이 Worker 주소로 변경
 *   확인: 브라우저로 https://<worker>/health → {"ok":true,"law":true} 면 성공
 */
const DRF = 'https://www.law.go.kr/DRF';
const UA = 'privacy-edu-worker';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors } });

    if (url.pathname === '/health' || url.pathname === '/') {
      return json({ ok: true, law: !!env.LAW_OC, ai: false, kosis: false, news: false, ts: Date.now() });
    }

    if (url.pathname === '/law') {
      if (!env.LAW_OC) return json({ ok: false, error: 'LAW_OC 미설정' }, 503);
      const kind = url.searchParams.get('kind') || '법령';
      const name = url.searchParams.get('name') || '';
      const jo = parseInt(url.searchParams.get('jo') || '0', 10);
      const branch = parseInt(url.searchParams.get('branch') || '0', 10);
      if (!name) return json({ ok: false, error: 'name 필요' }, 400);

      // 7일 캐시
      const cacheKey = new Request(url.toString(), request);
      const cache = caches.default;
      const hit = await cache.match(cacheKey);
      if (hit) return hit;

      try {
        const out = kind === '행정규칙'
          ? await fetchAdmrul(env.LAW_OC, name, jo, branch)
          : await fetchLaw(env.LAW_OC, name, jo, branch);
        const res = json(out);
        if (out.ok) res.headers.set('Cache-Control', 'public, max-age=604800');
        if (out.ok) await cache.put(cacheKey, res.clone());
        return res;
      } catch (e) {
        return json({ ok: false, error: String(e && e.message || e) }, 502);
      }
    }
    // ===== MCP 서버 (Claude 커스텀 커넥터) =====
    if (url.pathname === '/mcp') {
      if (request.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
      if (env.MCP_TOKEN) { const auth = request.headers.get('authorization') || ''; if (auth !== 'Bearer ' + env.MCP_TOKEN) return json({ error: 'unauthorized' }, 401); }
      let rpc; try { rpc = await request.json(); } catch (e) { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
      return json(await mcp(rpc, env));
    }
    return json({ ok: false, error: 'not found' }, 404);
  }
};

// ===== MCP(JSON-RPC 2.0) =====
const TOOLS = [
  { name: 'lookup_law_article', description: '법제처 국가법령정보 Open API로 법령·행정규칙(고시)의 조문 본문을 조회합니다.', inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['법령', '행정규칙'], description: '법률·시행령은 법령, 고시·지침은 행정규칙' }, name: { type: 'string', description: '법령명 (예: 개인정보 보호법)' }, jo: { type: 'integer', description: '조 번호 (예: 31)' }, branch: { type: 'integer', description: '가지번호 (제31조의2의 2), 없으면 0' } }, required: ['name', 'jo'] } },
  { name: 'get_privacy_answer', description: '개인정보 보호 실무 질문(CCTV 보관, 주민번호 저장, 접속기록, 파기, 유출 통지, 영향평가, 동의, 암호화 등)에 근거 조문과 함께 답합니다.', inputSchema: { type: 'object', properties: { question: { type: 'string', description: '개인정보 보호 관련 질문' } }, required: ['question'] } }
];
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
async function mcp(rpc, env) {
  const id = rpc && rpc.id != null ? rpc.id : null;
  const ok = result => ({ jsonrpc: '2.0', id, result });
  const err = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  try {
    if (rpc.method === 'initialize') return ok({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'privacy-law-mcp', version: '1.0.0' } });
    if (rpc.method === 'notifications/initialized') return ok({});
    if (rpc.method === 'tools/list') return ok({ tools: TOOLS });
    if (rpc.method === 'tools/call') {
      const { name, arguments: args = {} } = rpc.params || {};
      if (name === 'lookup_law_article') {
        if (!env.LAW_OC) return ok({ content: [{ type: 'text', text: 'LAW_OC 미설정: 조문 조회를 쓰려면 Worker에 LAW_OC Secret을 등록하세요.' }], isError: true });
        const r = (args.kind === '행정규칙') ? await fetchAdmrul(env.LAW_OC, args.name, +args.jo, +(args.branch || 0)) : await fetchLaw(env.LAW_OC, args.name, +args.jo, +(args.branch || 0));
        return ok({ content: [{ type: 'text', text: r.ok ? `${r.article}\n\n${r.content}\n\n(출처: ${r.source})` : ('조회 실패: ' + (r.error || '')) }], isError: !r.ok });
      }
      if (name === 'get_privacy_answer') {
        const q = String(args.question || '').toLowerCase().replace(/\s/g, '');
        let best = null, sc = 0; KB.forEach(e => { let c = 0; e.kw.forEach(k => { if (q.includes(k)) c++; }); if (c > sc) { sc = c; best = e; } });
        const text = best ? `${best.a}\n\n근거: ${best.src}` : '정해진 주제(CCTV·주민번호·비밀번호·접속기록·파기·유출·영향평가·동의 등)로 질문해 주세요.';
        return ok({ content: [{ type: 'text', text }] });
      }
      return err(-32602, 'unknown tool: ' + name);
    }
    return err(-32601, 'method not found: ' + rpc.method);
  } catch (e) { return err(-32603, String(e && e.message || e)); }
}

async function drf(path, params) {
  const q = new URLSearchParams({ type: 'JSON', ...params });
  const r = await fetch(`${DRF}/${path}?${q}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('DRF ' + r.status);
  const t = await r.text();
  try { return JSON.parse(t); } catch (e) { throw new Error('DRF 비정상 응답'); }
}

// 법률·시행령: 검색으로 MST(법령일련번호)를 찾고, 본문에서 해당 조문을 추출
async function fetchLaw(oc, name, jo, branch) {
  const s = await drf('lawSearch.do', { OC: oc, target: 'law', query: name, display: '20' });
  const list = asArray(s && s.LawSearch && s.LawSearch.law);
  const pick = list.find(x => String(x['법령명한글'] || '').replace(/\s/g, '') === name.replace(/\s/g, '') && /현행/.test(x['현행연혁코드'] || '현행')) || list[0];
  if (!pick) return { ok: false, error: '법령 없음' };
  const mst = pick['법령일련번호'] || pick['법령ID'];
  const body = await drf('lawService.do', { OC: oc, target: 'law', MST: String(mst) });
  const units = asArray(body && body['법령'] && body['법령']['조문'] && body['법령']['조문']['조문단위']);
  const label = '제' + jo + '조' + (branch ? '의' + branch : '');
  const art = units.find(u => String(u['조문번호']) === String(jo) && String(u['조문가지번호'] || 0) === String(branch || 0))
    || units.find(u => String(u['조문번호']) === String(jo));
  const title = pick['법령명한글'] || name;
  if (!art) return { ok: true, article: title + ' ' + label, content: '(조문 본문을 찾지 못했습니다. 원문 링크로 확인하세요.)', source: '법제처 국가법령정보 Open API' };
  return { ok: true, article: title + ' ' + label + (art['조문제목'] ? '(' + art['조문제목'] + ')' : ''), content: joText(art), source: '법제처 국가법령정보 Open API · 현행' };
}

// 행정규칙(고시·지침): 조문 단위 조회 지원이 제한적이라 본문/링크로 안내
async function fetchAdmrul(oc, name, jo, branch) {
  const s = await drf('lawSearch.do', { OC: oc, target: 'admrul', query: name, display: '20' });
  const list = asArray(s && s.AdmRulSearch && s.AdmRulSearch.admrul);
  const pick = list.find(x => String(x['행정규칙명'] || '').replace(/\s/g, '') === name.replace(/\s/g, '')) || list[0];
  if (!pick) return { ok: false, error: '행정규칙 없음' };
  const id = pick['행정규칙일련번호'] || pick['행정규칙ID'];
  const body = await drf('lawService.do', { OC: oc, target: 'admrul', ID: String(id) });
  const units = asArray(body && body['AdmRulService'] && body['AdmRulService']['조문'] && body['AdmRulService']['조문']['조문단위']);
  const label = '제' + jo + '조' + (branch ? '의' + branch : '');
  const art = units.find(u => String(u['조문번호']) === String(jo));
  const title = pick['행정규칙명'] || name;
  if (art) return { ok: true, article: title + ' ' + label, content: joText(art), source: '법제처 국가법령정보 Open API · 행정규칙' };
  return { ok: true, article: title + ' ' + label, content: '(고시·지침은 조문 본문 조회가 제한될 수 있습니다. 원문 링크로 확인하세요.)', source: '법제처 국가법령정보 Open API' };
}

function joText(art) {
  let s = (art['조문내용'] || '').trim();
  const hangs = asArray(art['항']);
  hangs.forEach(h => {
    if (h['항내용']) s += '\n' + h['항내용'].trim();
    asArray(h['호']).forEach(ho => { if (ho['호내용']) s += '\n  ' + ho['호내용'].trim(); });
  });
  return s.replace(/\n{3,}/g, '\n\n').slice(0, 4000);
}
function asArray(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
