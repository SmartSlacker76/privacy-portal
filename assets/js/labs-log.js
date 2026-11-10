/* Ⅰ-3 접속기록 점검 (고시 제8조) */
(function () {
  'use strict';
  const { $, $$, esc, enc, toHex, rand, FlowPlayer, onLesson } = window.PI;

  const DATE = '2026-11-05';
  const AUTH = ['cs_kim', 'cs_lee', 'mk_park', 'dev_choi', 'admin_jung'];
  const SUSPENDED = ['cs_oh'];
  // [시각, 식별자, 접속지, 처리한 정보주체, 수행업무, 건수, 다운로드 사유]
  const LOG = [
    ['02:14:07', 'cs_lee', '10.10.20.32', '회원 전체', '다운로드', 12480, ''],
    ['08:58:12', 'cs_kim', '10.10.20.31', '-', '로그인', 1],
    ['09:03:40', 'cs_kim', '10.10.20.31', 'M1021', '조회', 1],
    ['09:15:22', 'mk_park', '10.10.20.45', '-', '로그인', 1],
    ['09:16:05', 'mk_park', '10.10.20.45', '이벤트 응모자', '다운로드', 120, '11월 경품 발송'],
    ['09:41:18', 'cs_oh', '10.10.20.38', '-', '로그인', 1],
    ['09:42:02', 'cs_oh', '10.10.20.38', 'M0877', '조회', 1],
    ['10:05:31', 'cs_lee', '10.10.20.32', 'M1102', '수정', 1],
    ['10:47:55', 'admin_jung', '198.51.100.23', '-', '로그인 실패', 1],
    ['10:48:10', 'admin_jung', '198.51.100.23', '-', '로그인 실패', 1],
    ['10:48:26', 'admin_jung', '198.51.100.23', '-', '로그인 실패', 1],
    ['10:48:40', 'admin_jung', '198.51.100.23', '-', '로그인', 1],
    ['10:52:03', 'admin_jung', '10.10.30.5', '-', '로그인', 1],
    ['11:20:44', 'cs_kim', '10.10.20.31', 'M1004', '조회', 1],
    ['11:22:10', 'cs_kim', '10.10.20.31', 'M1004', '조회', 1],
    ['11:25:37', 'cs_kim', '10.10.20.31', 'M1004', '조회', 1],
    ['11:31:02', 'cs_kim', '10.10.20.31', 'M1004', '조회', 1],
    ['11:40:59', 'cs_kim', '10.10.20.31', 'M1004', '조회', 1],
    ['11:58:13', 'cs_kim', '10.10.20.31', 'M1004', '조회', 1],
    ['12:10:00', 'cs_lee', '10.10.20.32', 'M0450', '조회', 1],
    ['13:05:41', 'mk_park', '10.10.20.45', 'M0991', '조회', 1],
    ['13:30:12', 'cs_lee', '10.10.20.32', 'M1210', '출력', 1],
    ['14:02:31', 'cs_kim', '10.10.20.31', 'M1001', '조회', 1],
    ['14:15:09', 'dev_choi', '10.10.30.12', '배송지 테이블', '조회', 3],
    ['15:30:27', 'dev_choi', '10.10.30.12', "DELETE … WHERE withdraw_dt < '2026-10-06'", '삭제', 3200],
    ['15:45:50', 'mk_park', '10.10.20.45', 'M0733', '수정', 1],
    ['16:10:12', 'cs_kim', '10.10.20.31', 'M1300', '조회', 1],
    ['16:55:33', 'cs_lee', '10.10.20.32', 'M1102', '조회', 1],
    ['17:20:05', 'mk_park', '203.0.113.77', 'M0518', '조회', 1],
    ['17:22:40', 'mk_park', '203.0.113.77', '고객 연락처', '다운로드', 850, '재택 업무'],
    ['18:02:11', 'cs_kim', '10.10.20.31', '-', '로그아웃', 1],
    ['19:10:44', 'cs_lee', '10.10.20.32', 'M0450', '수정', 1],
    ['23:48:19', 'cs_kim', '10.10.20.31', 'M1004', '조회', 1]
  ];
  const sec = t => { const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + s; };
  const RULES = [
    ['offhours', '업무시간 외 접속', '접속일시'],
    ['account', '미인가·사용 중지 계정', '식별자'],
    ['ip', '인가되지 않은 접속지(IP)', '접속지 정보'],
    ['multiip', '짧은 시간 여러 IP에서 같은 계정', '접속지 정보'],
    ['authfail', '반복 인증 실패', '수행업무'],
    ['repeat', '특정 정보주체 과다 조회', '처리한 정보주체 정보'],
    ['bulk', '대량 조회·다운로드·삭제', '수행업무'],
    ['reason', '다운로드 사유 미기재', '수행업무']
  ];
  function detect(cfg) {
    const out = LOG.map(() => []);
    LOG.forEach((r, i) => {
      const [t, id, ip, subj, task, n, why] = r, h = sec(t) / 3600;
      if (cfg.offhours && (h < cfg.start || h >= cfg.end)) out[i].push('offhours');
      if (cfg.account && (SUSPENDED.includes(id) || !AUTH.includes(id))) out[i].push('account');
      if (cfg.ip && !ip.startsWith('10.10.')) out[i].push('ip');
      if (cfg.multiip && LOG.some(o => o[1] === id && o[2] !== ip && Math.abs(sec(o[0]) - sec(t)) <= 600)) out[i].push('multiip');
      if (cfg.authfail && task === '로그인 실패' && LOG.filter(o => o[1] === id && o[4] === '로그인 실패' && Math.abs(sec(o[0]) - sec(t)) <= 600).length >= 3) out[i].push('authfail');
      if (cfg.repeat && /^M\d+$/.test(subj) && LOG.filter(o => o[1] === id && o[3] === subj).length >= cfg.repeatN) out[i].push('repeat');
      if (cfg.bulk && n >= cfg.bulkN) out[i].push('bulk');
      if (cfg.reason && task === '다운로드' && !why) out[i].push('reason');
    });
    return out;
  }
  const DEFAULT = { offhours: 1, account: 1, ip: 1, multiip: 1, authfail: 1, repeat: 1, bulk: 1, reason: 1, start: 8, end: 20, repeatN: 5, bulkN: 1000 };
  const ANSWER = detect(DEFAULT).map(f => f.length > 0);

  onLesson('access-log', () => {
    /* 보관 기간 판별 */
    const ret = $('#logRetention');
    ret.innerHTML = `<h2>우리 시스템은 몇 년 보관?</h2>
      <div style="display:grid;gap:8px;margin-top:12px;font-size:14px">
        <label class="row"><input type="checkbox" id="rt1"> 5만명 이상의 정보주체에 관한 개인정보를 처리한다</label>
        <label class="row"><input type="checkbox" id="rt2"> 고유식별정보(주민·여권·운전면허·외국인등록번호) 또는 민감정보를 처리한다</label>
        <label class="row"><input type="checkbox" id="rt3"> 「전기통신사업법」에 따라 등록·신고한 기간통신사업자다</label>
      </div><div class="verdict" id="rtOut" style="margin-top:12px" aria-live="polite"></div>`;
    const rt = () => { const two = ['#rt1', '#rt2', '#rt3'].some(s => $(s).checked); $('#rtOut').className = 'verdict ' + (two ? 'mid' : 'good'); $('#rtOut').innerHTML = `<b class="big">${two ? '2년 이상' : '1년 이상'} 보관</b>${two ? '제8조① 단서 각 호에 해당해요.' : '제8조① 본문 기준이에요.'} 최소 기간이 지나도 바로 지우지 말고, 책임 추적에 충분한 기간을 내부 관리계획으로 정하세요. 오픈마켓 판매자처럼 제3자에게 계정을 발급한 경우에도 접속기록을 남기네요.`; };
    ['#rt1', '#rt2', '#rt3'].forEach(s => $(s).addEventListener('change', rt)); rt();

    /* 점검 실습 */
    const lab = $('#logLab');
    const total = ANSWER.filter(Boolean).length;
    lab.innerHTML = `<div class="row" style="justify-content:space-between"><h2 style="margin:0">하루치 접속기록 점검</h2><span class="chip">${DATE} (목) · 회원관리시스템 · ${LOG.length}건</span></div>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px"><b>1단계</b> 수상한 행을 눌러 표시하세요(다시 누르면 해제). <b>2단계</b> 자동 점검을 실행해 비교해요. 인가 계정: ${AUTH.join(', ')} · 업무망 10.10.0.0/16</p>
      <div id="lgAlarm" class="log-alarm" role="alert" aria-live="assertive" hidden></div>
      <div class="table-wrap log-table"><table><thead><tr><th>접속일시</th><th>식별자</th><th>접속지 정보</th><th>처리한 정보주체</th><th>수행업무</th><th style="text-align:right">건수</th><th>탐지</th></tr></thead><tbody id="lgRows"></tbody></table></div>
      <div class="panel" style="margin-top:14px;background:var(--surface-2)">
        <h3>점검 기준 (내부 관리계획)</h3>
        <div class="cols" style="margin-top:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:6px 16px;font-size:13.5px" id="lgRules">
          ${RULES.map(([k, l, f]) => `<label class="row" style="gap:6px"><input type="checkbox" data-r="${k}" checked> ${l} <span class="chip" style="font-size:10.5px">${f}</span></label>`).join('')}
        </div>
        <div class="row" style="margin-top:12px;font-size:13px;gap:14px">
          <label>업무시간 <input class="input" id="lgS" type="number" min="0" max="23" value="8" style="width:64px;display:inline-block"> ~ <input class="input" id="lgE" type="number" min="1" max="24" value="20" style="width:64px;display:inline-block">시</label>
          <label>대량 기준 <input class="input" id="lgB" type="number" min="1" value="1000" style="width:90px;display:inline-block">건 이상</label>
          <label>과다 조회 <input class="input" id="lgR" type="number" min="2" value="5" style="width:64px;display:inline-block">회 이상</label>
        </div>
        <div class="row" style="margin-top:12px"><button class="btn primary" id="lgRun" type="button">자동 점검 실행</button><button class="btn" id="lgClear" type="button">처음부터</button><label class="row" style="gap:6px;margin-left:auto;font-size:13px"><input type="checkbox" id="lgSnd" checked> 🔔 경보음</label></div>
      </div>
      <div class="verdict" id="lgOut" style="margin-top:12px" aria-live="polite">표시한 행: 0건</div>`;
    const marks = new Set(); let ran = false, lastN = 0, actx = null;
    const label = Object.fromEntries(RULES.map(r => [r[0], r[1]]));
    function beep() {
      if (!$('#lgSnd') || !$('#lgSnd').checked) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        const t = actx.currentTime;
        [0, 0.2].forEach(d => {
          const o = actx.createOscillator(), g = actx.createGain();
          o.type = 'square'; o.frequency.setValueAtTime(988, t + d); o.frequency.setValueAtTime(740, t + d + 0.1);
          o.connect(g); g.connect(actx.destination);
          g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.22, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
          o.start(t + d); o.stop(t + d + 0.17);
        });
      } catch (e) {}
    }
    function cfg() { const c = { start: +$('#lgS').value, end: +$('#lgE').value, bulkN: +$('#lgB').value || 1000, repeatN: +$('#lgR').value || 5 }; $$('#lgRules [data-r]').forEach(x => c[x.dataset.r] = x.checked); return c; }
    function draw() {
      const flags = ran ? detect(cfg()) : LOG.map(() => []);
      $('#lgRows').innerHTML = LOG.map((r, i) => {
        const f = flags[i], m = marks.has(i);
        const cls = [m ? 'mark' : '', f.length ? 'flag' : ''].join(' ');
        const res = !ran ? (m ? '<span class="chip warn">내가 표시</span>' : '') : f.length ? f.map(k => `<span class="chip plain" style="margin:1px">${label[k]}</span>`).join('') + (m ? '' : ' <span class="chip">놓침</span>') : (m ? '<span class="chip">오탐</span>' : '');
        return `<tr class="${cls}" data-i="${i}" tabindex="0"><td class="mono">${r[0]}</td><td class="mono">${esc(r[1])}</td><td class="mono">${esc(r[2])}</td><td class="mono" style="max-width:220px">${esc(r[3])}</td><td>${esc(r[4])}${r[6] ? `<br><small style="color:var(--muted)">사유: ${esc(r[6])}</small>` : ''}</td><td class="mono" style="text-align:right">${r[5].toLocaleString()}</td><td>${res}</td></tr>`;
      }).join('');
      const al = $('#lgAlarm');
      if (ran) {
        const fl = flags.map(f => f.length > 0), hit = [...marks].filter(i => fl[i]).length, miss = fl.filter((v, i) => v && !marks.has(i)).length, fp = [...marks].filter(i => !fl[i]).length, n = fl.filter(Boolean).length;
        lastN = n;
        $('#lgOut').className = 'verdict ' + (miss === 0 && fp === 0 ? 'good' : 'mid');
        $('#lgOut').innerHTML = `<b class="big">자동 점검 ${n}건 탐지 · 내가 찾은 것 ${hit}건 · 놓친 것 ${miss}건 · 오탐 ${fp}건</b>탐지는 “이상 징후”일 뿐 위반 확정이 아니에요. 예를 들어 dev_choi의 3,200건 삭제는 탈퇴회원 정기 파기 배치일 수 있어요. 아래 사후조치 절차에서 소명으로 확인해요. 점검 기준을 바꿔 다시 실행해 보세요.`;
        if (al) {
          if (n > 0) {
            const cnt = {}; flags.forEach(f => f.forEach(k => cnt[k] = (cnt[k] || 0) + 1));
            const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${label[k]} ${v}건`).join(' · ');
            const noanim = (window.PI && window.PI.reduced && window.PI.reduced()) ? ' noanim' : '';
            al.hidden = false; al.className = 'log-alarm on' + noanim;
            al.innerHTML = `<span class="al-ico" aria-hidden="true">🚨</span><div class="al-body"><b>경보 · 개인정보 총괄부서 알림</b><div class="al-sub">점검 결과 <b>이상행위 ${n}건</b>이 탐지됐어요 — ${top}.<br>운영부서와 분리된 총괄부서가 즉시 <b>사유 확인(소명)</b> 등 사후조치를 시작해야 해요. 아래 흐름을 확인하세요.</div></div>`;
          } else {
            al.hidden = false; al.className = 'log-alarm ok';
            al.innerHTML = `<span class="al-ico" aria-hidden="true">✅</span><div class="al-body"><b>경보 없음 · 정상</b><div class="al-sub">현재 점검 기준에서 이상행위가 탐지되지 않았어요. 기준을 바꿔 다시 실행해 볼 수 있어요.</div></div>`;
          }
        }
      } else {
        lastN = 0;
        if (al) { al.hidden = true; al.className = 'log-alarm'; al.innerHTML = ''; }
        $('#lgOut').className = 'verdict'; $('#lgOut').innerHTML = `표시한 행: ${marks.size}건 · 정답은 기본 기준으로 ${total}건이에요.`;
      }
    }
    const toggle = tr => { const i = +tr.dataset.i; marks.has(i) ? marks.delete(i) : marks.add(i); draw(); };
    $('#lgRows').addEventListener('click', e => { const tr = e.target.closest('tr[data-i]'); if (tr) toggle(tr); });
    $('#lgRows').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const tr = e.target.closest('tr[data-i]'); if (tr) { e.preventDefault(); toggle(tr); } } });
    $('#lgRun').addEventListener('click', () => { ran = true; draw(); if (lastN > 0) beep(); });
    $('#lgClear').addEventListener('click', () => { ran = false; marks.clear(); draw(); });
    lab.addEventListener('change', e => { if (ran && e.target.closest('#lgRules, .row')) draw(); });
    lab.addEventListener('input', e => { if (ran && e.target.type === 'number') draw(); });
    draw();

    /* 사후조치 흐름 */
    const nodes = [{ id: 'sys', label: '접속기록 분석', sub: '자동 점검', x: 20, y: 40, w: 150 }, { id: 'aud', label: '개인정보 총괄부서', sub: '점검 담당 (운영부서와 분리)', x: 300, y: 40, w: 190 }, { id: 'usr', label: '취급자 cs_lee', sub: '고객센터', x: 20, y: 200, w: 150 }, { id: 'cpo', label: '보호책임자', sub: 'CPO', x: 590, y: 120, w: 140 }];
    const steps = [
      { from: 'sys', to: 'aud', pkt: '경보', state: 'plain', danger: true, title: '탐지', law: ['제8조②'], html: '<p>새벽 2시 14분, 회원 전체 12,480건 다운로드, 사유 없음. 업무시간 외·대량·사유 미기재 세 기준에 동시에 걸렸어요.</p>', fields: [['식별자', 'cs_lee'], ['접속일시', `${DATE} 02:14:07`], ['수행업무', '다운로드 12,480건', 'plain'], ['사유', '(없음)', 'plain']], inspectorTitle: '탐지 내역' },
      { from: 'aud', to: 'aud', pkt: '검토', state: 'plain', title: '독립된 부서가 검토', law: ['안내서'], html: '<p>책임 추적성과 객관성을 위해 점검은 개인정보 취급·운영 부서가 아닌 <b>총괄 부서나 감사 부서</b>가 해요. 같은 계정의 전후 기록과 파일 반출 경로(메일, USB, 클라우드)를 함께 확인해요.</p>' },
      { from: 'aud', to: 'usr', pkt: '소명 요청', state: 'plain', title: '사유 확인(소명)', law: [], html: '<p>취급자에게 다운로드 목적, 파일 보관 위치, 외부 전달 여부를 서면으로 소명하게 해요.</p>', fields: [['요청', '목적 · 승인자 · 보관 위치 · 전달 여부'], ['기한', '2영업일']], inspectorTitle: '소명 요청서' },
      { from: 'usr', to: 'aud', pkt: '소명서', state: 'plain', danger: true, title: '소명 결과: 승인 없는 반출', law: [], html: '<p>“이직 준비 중 고객 연락처를 참고하려 했다”는 소명. 파일은 개인 클라우드에 업로드된 사실이 확인되었어요.</p><p style="color:var(--muted)">반대로 dev_choi의 3,200건 삭제는 파기 승인 문서가 확인되어 정상으로 종결하고, 그 결과를 기록해요.</p>' },
      { from: 'aud', to: 'cpo', pkt: '결과 보고', state: 'plain', title: '보고와 후속조치', law: ['제5조②', '제13조'], html: '<p>보호책임자에게 보고하고 후속조치를 해요.</p>', fields: [['계정', '즉시 접근 권한 정지', 'ok'], ['파일', '개인 클라우드 사본 회수·파기 확인', 'ok'], ['재발 방지', '야간 대량 다운로드 차단 정책', 'ok']], inspectorTitle: '후속조치' },
      { from: 'cpo', to: 'cpo', pkt: '통지·신고', state: 'ok', title: '유출 대응', law: ['법 제34조'], html: '<p>개인정보가 외부로 유출된 것으로 판단되면 법 제34조에 따라 정보주체 통지와 보호위원회·전문기관 신고 절차를 밟아요. 기한과 신고 기준은 시행령과 「개인정보 유출 등 사고 대응 매뉴얼」을 확인하세요.</p><p>모든 점검·소명·조치 내역은 기록으로 남겨 다음 점검과 감사에 써요.</p>' }
    ];
    new FlowPlayer($('#logFlow'), { title: '이상 행위 탐지 후 사후조치', nodes, steps, W: 750, H: 290 });

    /* 위·변조 방지: HMAC 체인 */
    const chain = $('#logChain');
    const base = LOG.slice(2, 10).map(r => `${DATE} ${r[0]}|${r[1]}|${r[2]}|${r[3]}|${r[4]}|${r[5]}`);
    chain.innerHTML = `<h2>접속기록 위·변조 확인</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">각 줄의 MAC은 <code>HMAC-SHA256(키, 이전 줄 MAC ‖ 현재 줄)</code>로 계산해 <b>별도 장비</b>에 보관해요. 기록을 한 글자라도 고치거나 한 줄을 지우면 그 지점부터 검증이 깨져요. 줄 내용을 직접 고쳐 보세요.</p>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>접속기록 (수정 가능)</th><th>보관된 MAC (별도 장비)</th><th>검증</th></tr></thead><tbody id="chRows"></tbody></table></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="chVerify" type="button">무결성 검증</button><button class="btn danger" id="chDel" type="button">3번째 줄 몰래 삭제</button><button class="btn" id="chReset" type="button">원래대로</button></div>
      <div class="verdict" id="chOut" style="margin-top:12px" aria-live="polite"></div>`;
    let key, stored = [], lines = [];
    async function hmac(prev, line) {
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(prev + '|' + line));
      return toHex(new Uint8Array(sig));
    }
    async function macs(arr) { const out = []; let prev = 'GENESIS'; for (const l of arr) { prev = await hmac(prev, l); out.push(prev); } return out; }
    function render(res) {
      $('#chRows').innerHTML = lines.map((l, i) => `<tr><td class="mono">${i + 1}</td><td><input class="input mono" data-i="${i}" value="${esc(l)}" style="font-size:12px;min-width:360px" aria-label="${i + 1}번째 접속기록"></td><td class="mono" style="font-size:11.5px">${stored[i] ? stored[i].slice(0, 16) + '…' : '<span class="tag-plain">(없음)</span>'}</td><td>${res ? (res[i] ? '<span class="chip ok">일치</span>' : '<span class="chip plain">불일치</span>') : ''}</td></tr>`).join('');
    }
    async function verify() {
      const now = await macs(lines), res = lines.map((_, i) => now[i] === stored[i]);
      const bad = res.indexOf(false), lenBad = lines.length !== stored.length;
      render(res);
      $('#chOut').className = 'verdict ' + (bad < 0 && !lenBad ? 'good' : 'bad');
      $('#chOut').innerHTML = bad < 0 && !lenBad ? '<b class="big">무결성 확인</b>모든 줄의 MAC이 보관된 값과 일치해요.' : `<b class="big">${bad < 0 ? lines.length + 1 : bad + 1}번째 줄부터 위·변조 의심</b>${lenBad ? `기록 수가 ${stored.length}줄에서 ${lines.length}줄로 줄었어요. ` : ''}체인 구조라서 중간 한 줄만 바꿔도 이후 MAC이 모두 달라져요. 키와 MAC 값이 접속기록과 분리 보관되어 있어야 공격자가 다시 계산해 덮어쓸 수 없어요.`;
    }
    async function reset() {
      key = await crypto.subtle.importKey('raw', rand(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      lines = base.slice(); stored = await macs(lines); render(); $('#chOut').className = 'verdict'; $('#chOut').textContent = '예: 3번째 줄의 “조회”를 “로그인”으로 바꾼 뒤 무결성 검증을 눌러 보세요.';
    }
    $('#chRows').addEventListener('input', e => { const i = e.target.dataset.i; if (i != null) lines[+i] = e.target.value; });
    $('#chVerify').addEventListener('click', verify);
    $('#chDel').addEventListener('click', () => { if (lines.length > 2) { lines.splice(2, 1); verify(); } });
    $('#chReset').addEventListener('click', reset);
    reset();
  });
})();
