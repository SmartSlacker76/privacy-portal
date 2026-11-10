/* Ⅱ-2 비밀번호 입력 → 일방향 암호화 과정 + 해독 예상 시간(추정) */
(function () {
  'use strict';
  const { $, esc, enc, toHex, toB64, rand, hexdump, onLesson } = window.PI;

  /* ---------- 라운드 추적이 가능한 SHA-256 (교육용, Web Crypto 결과와 대조) ---------- */
  const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
  const K = primes.map(p => frac(Math.cbrt(p)));
  const H0 = primes.slice(0, 8).map(p => frac(Math.sqrt(p)));
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  function pad(msg) {
    const L = msg.length, total = Math.ceil((L + 9) / 64) * 64, out = new Uint8Array(total);
    out.set(msg); out[L] = 0x80;
    const bits = L * 8; for (let i = 0; i < 8; i++) out[total - 1 - i] = Math.floor(bits / 2 ** (8 * i)) & 255;
    return out;
  }
  function sha256Trace(msg) {
    const P = pad(msg), H = H0.slice(), trace = [];
    for (let o = 0; o < P.length; o += 64) {
      const W = new Array(64);
      for (let t = 0; t < 16; t++) W[t] = (P[o + 4 * t] << 24 | P[o + 4 * t + 1] << 16 | P[o + 4 * t + 2] << 8 | P[o + 4 * t + 3]) >>> 0;
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3), s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), T1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), T2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + T1) >>> 0; d = c; c = b; b = a; a = (T1 + T2) >>> 0;
        if (o === 0) trace.push(a);
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => H[i] = (H[i] + v) >>> 0);
    }
    const digest = new Uint8Array(32); H.forEach((v, i) => { digest[4 * i] = v >>> 24; digest[4 * i + 1] = v >>> 16 & 255; digest[4 * i + 2] = v >>> 8 & 255; digest[4 * i + 3] = v & 255; });
    return { padded: P, trace, digest };
  }
  window.PI.sha256Trace = sha256Trace;

  /* ---------- 해독 시간 추정 ---------- */
  // 유출 사고에서 반복 확인되는 흔한 비밀번호 (대략적 순위)
  const COMMON = ['123456', '123456789', 'password', '12345678', '111111', '12345', '1234567890', 'qwerty', '1234567', 'qwer1234', '1q2w3e4r', '000000', 'abc123', 'password1', 'iloveyou', '1234', 'a123456', 'qwerty123', 'asdf1234', '1q2w3e4r5t', 'admin', 'admin123', '123qwe', 'qwe123', 'zxcvbnm', '1qaz2wsx', 'q1w2e3r4', 'p@ssw0rd', 'passw0rd', 'dragon', 'sunshine', 'princess', 'letmein', 'welcome', 'monkey', 'football', 'baseball', 'master', 'superman', 'a123456789', 'love1234', 'test1234'];
  const WORDS = ['password', 'passwd', 'pass', 'admin', 'qwerty', 'asdf', 'zxcv', 'love', 'iloveyou', 'dragon', 'monkey', 'master', 'welcome', 'hello', 'korea', 'seoul', 'sunshine', 'princess', 'football', 'baseball', 'soccer', 'test', 'user', 'login', 'root', 'secret', 'star', 'happy', 'lucky', 'angel', 'samsung', 'apple', 'google', 'kim', 'lee', 'park'];
  const SEQS = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx3edc', 'q1w2e3r4t5'];
  const LEET = { '@': 'a', '4': 'a', '0': 'o', '1': 'i', '!': 'i', '3': 'e', '$': 's', '5': 's', '7': 't' };
  function analyze(pw) {
    const notes = []; const L = [...pw].length;
    const cls = { lower: /[a-z]/.test(pw), upper: /[A-Z]/.test(pw), digit: /[0-9]/.test(pw), sym: /[^A-Za-z0-9가-힣\s]/.test(pw), han: /[가-힣]/.test(pw) };
    const C = (cls.lower ? 26 : 0) + (cls.upper ? 26 : 0) + (cls.digit ? 10 : 0) + (cls.sym ? 33 : 0) + (cls.han ? 2350 : 0) || 1;
    let guesses = Math.pow(C, L) / 2, method = '무작위 대입(모든 조합)';
    const lower = pw.toLowerCase();
    const rank = COMMON.indexOf(lower);
    if (rank >= 0) { guesses = rank + 1; method = '흔한 비밀번호 목록'; notes.push(['bad', `유출 사고에서 가장 흔한 비밀번호 목록 상위 ${rank + 1}위권이에요. 공격자가 제일 먼저 시도해요.`]); }
    else {
      const norm = lower.replace(/[@4013!$57]/g, ch => LEET[ch] || ch);
      const core = norm.replace(/[^a-z가-힣]/g, '');
      const word = WORDS.filter(w => norm.includes(w)).sort((a, b) => b.length - a.length)[0];
      if (word) {
        const rest = L - word.length, digits = (pw.match(/[0-9]/g) || []).length, syms = (pw.match(/[^A-Za-z0-9]/g) || []).length;
        const leet = norm !== lower;
        const g = 1e5 * Math.pow(10, Math.min(digits, rest)) * Math.pow(33, Math.min(syms, Math.max(0, rest - digits))) * (cls.upper ? 4 : 1) * (leet ? 16 : 1) / 2;
        if (g < guesses) { guesses = g; method = '사전 단어 + 변형 규칙'; }
        notes.push(['bad', `사전 단어 “${word}”가 들어 있어요${leet ? '(@→a, 0→o 같은 치환은 공격 도구가 기본으로 시도해요)' : ''}. 단어 앞뒤에 숫자·기호를 붙이는 방식은 규칙 기반 공격에 약해요.`]);
      }
      if (/^[0-9]+$/.test(pw)) notes.push(['bad', '숫자로만 되어 있어 경우의 수가 자리당 10개뿐이에요.']);
      if (/(19|20)\d{2}(0[1-9]|1[0-2])?/.test(pw) || /\b\d{6}\b/.test(pw)) notes.push(['mid', '연도·생년월일처럼 보이는 숫자가 있어요. 개인정보를 아는 공격자는 먼저 시도해요.']);
      if (/(.)\1\1/.test(pw)) notes.push(['mid', '같은 문자가 3번 이상 반복돼요.']);
      const seq = SEQS.find(s => { for (let i = 0; i + 4 <= lower.length; i++) { const sub = lower.slice(i, i + 4); if (s.includes(sub) || s.split('').reverse().join('').includes(sub)) return true; } return false; });
      if (seq) { notes.push(['bad', '연속 문자·키보드 배열(1234, abcd, qwer 등)이 들어 있어요.']); if (!word) { const g = 1e4 * Math.pow(C, Math.max(0, L - 4)) / 2; if (g < guesses) { guesses = g; method = '키보드·연속 패턴 + 나머지 대입'; } } }
      if (core.length === 0 && !/^[0-9]+$/.test(pw) && L) notes.push(['mid', '영문자가 없어요.']);
    }
    if (L < 8) notes.push(['bad', `길이가 ${L}자로 짧아요. 길이가 1자 늘 때마다 대입 시간이 문자 종류 수만큼 곱해져요.`]);
    else if (L >= 12 && rank < 0 && method.startsWith('무작위')) notes.push(['good', `${L}자 길이에 흔한 패턴이 없어요.`]);
    const kinds = ['lower', 'upper', 'digit', 'sym', 'han'].filter(k => cls[k]).length;
    if (kinds <= 1 && L) notes.push(['mid', '문자 종류가 한 가지뿐이에요. 대문자·숫자·기호를 섞거나 길이를 늘리세요.']);
    return { guesses: Math.max(1, guesses), method, notes, C, L, cls };
  }
  // 공격 속도 가정치 (대략적인 크기 비교용)
  const SCEN = [
    { k: 'online', name: '온라인 로그인 대입', sub: '로그인 화면에 계속 시도 · 인증 실패 제한 없음', rate: 10 },
    { k: 'online-lock', name: '온라인 + 5회 실패 시 잠금', sub: '고시 제5조⑥ 인증 실패 접근 제한', rate: null },
    { k: 'sha', name: '해시 유출 · SHA-256 (솔트 없음)', sub: '고성능 GPU 1대, 초당 약 100억 회 가정 · 미리 계산한 표 사용 가능', rate: 1e10, table: true },
    { k: 'sha-salt', name: '해시 유출 · SHA-256 + 솔트', sub: '초당 약 100억 회 가정 · 미리 계산한 표 무력화', rate: 1e10 },
    { k: 'pbkdf2', name: '해시 유출 · PBKDF2 60만 회 + 솔트', sub: '초당 약 1만 회 가정 · 키 스트레칭으로 시도당 비용 증가', rate: 1e4 }
  ];
  function human(sec) {
    if (sec < 1) return ['1초 미만', 'bad'];
    const u = [['초', 60], ['분', 60], ['시간', 24], ['일', 365], ['년', Infinity]]; let v = sec;
    for (const [n, d] of u) { if (v < d) { const r = v < 10 ? Math.round(v * 10) / 10 : Math.round(v); return [`약 ${r.toLocaleString()}${n}`, n === '년' ? (v > 100 ? 'good' : 'mid') : n === '일' ? 'mid' : 'bad']; } v /= d; }
  }
  function humanYears(sec) {
    const y = sec / 31536000;
    if (y < 1) return human(sec);
    if (y < 1e4) return [`약 ${Math.round(y).toLocaleString()}년`, y > 100 ? 'good' : 'mid'];
    if (y < 1e8) return [`약 ${Math.round(y / 1e4).toLocaleString()}만 년`, 'good'];
    if (y < 1e12) return [`약 ${Math.round(y / 1e8).toLocaleString()}억 년`, 'good'];
    return ['사실상 불가능 (1조 년 이상)', 'good'];
  }

  onLesson('hash', () => {
    const el = $('#pwJourney');
    el.innerHTML = `<div class="row" style="justify-content:space-between"><h2 style="margin:0">내 비밀번호는 어떻게 저장될까</h2><span class="chip warn">실제로 쓰는 비밀번호는 넣지 마세요</span></div>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">입력한 값은 이 브라우저 안에서만 계산되고 어디에도 전송되지 않아요. 그래도 화면에 그대로 보이므로 연습용 비밀번호를 쓰세요.</p>
      <div class="row"><input class="input mono" id="pjIn" value="qwer1234" style="flex:1;min-width:200px;font-size:16px" autocomplete="off" spellcheck="false" aria-label="연습용 비밀번호"></div>
      <div class="row" style="margin-top:8px" id="pjPre">${['123456', 'qwer1234', 'P@ssw0rd!', 'Korea2026!', 'blue-cactus-river-42', 'x9#Lq$2vR!mZ7'].map(v => `<button class="btn mono" type="button" style="font-size:12px" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>
      <div class="cols" style="margin-top:16px;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)">
        <ol class="pj-steps" id="pjSteps"></ol>
        <div id="pjCrack" style="display:grid;gap:12px;align-content:start;min-width:0"></div>
      </div>`;
    let salt = rand(16), timer;
    const step = (n, title, body) => `<li><div class="pj-n">${n}</div><div style="min-width:0"><b>${title}</b>${body}</div></li>`;
    async function run() {
      const pw = $('#pjIn').value;
      if (!pw) { $('#pjSteps').innerHTML = ''; $('#pjCrack').innerHTML = '<div class="verdict">비밀번호를 입력하세요.</div>'; return; }
      const pwb = enc.encode(pw), msg = new Uint8Array(salt.length + pwb.length); msg.set(salt); msg.set(pwb, salt.length);
      const { padded, trace, digest } = sha256Trace(msg);
      const check = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', msg))) === toHex(digest);
      const chars = [...pw].map(ch => `<span class="pj-ch"><i>${esc(ch)}</i><small>${toHex(enc.encode(ch)).match(/../g).join(' ')}</small></span>`).join('');
      const L = msg.length;
      const cell = v => `<i style="background:hsl(${(v >>> 24) * 1.41 | 0} 55% 42%)" title="${(v >>> 0).toString(16).padStart(8, '0')}">${(v >>> 0).toString(16).padStart(8, '0').slice(0, 2)}</i>`;
      $('#pjSteps').innerHTML =
        step(1, '글자를 바이트로 바꾸기', `<p class="pj-p">컴퓨터는 글자가 아니라 숫자를 계산해요. UTF-8 규칙으로 ${[...pw].length}글자가 ${pwb.length}바이트가 돼요.</p><div class="pj-chars">${chars}</div>`) +
        step(2, '무작위 솔트 붙이기', `<p class="pj-p">회원마다 다른 16바이트 난수(솔트)를 앞에 붙여요. 같은 비밀번호라도 저장값이 달라져요. <button class="btn" type="button" id="pjSalt" style="padding:2px 9px;font-size:12px">솔트 다시 만들기</button></p>${hexdump(msg, [{ from: 0, to: 16, cls: 'b-mut' }, { from: 16, to: L, cls: 'b-plain' }])}`) +
        step(3, '512비트 블록으로 채우기(패딩)', `<p class="pj-p">SHA-256은 64바이트 단위로 처리해요. 끝에 <code>80</code>, 0으로 채운 뒤 마지막 8바이트에 원래 길이(${L * 8}비트)를 적어요. 총 ${padded.length / 64}블록.</p>${hexdump(padded.slice(0, 64), [{ from: 0, to: 16, cls: 'b-mut' }, { from: 16, to: Math.min(L, 64), cls: 'b-plain' }, { from: L, to: L + 1, cls: 'b-hdr' }, { from: padded.length === 64 ? 56 : 64, to: 64, cls: 'b-hdr' }])}`) +
        step(4, '64라운드 뒤섞기 (압축 함수)', `<p class="pj-p">회전, XOR, 덧셈, 상수 더하기를 64번 반복해요. 아래 칸은 첫 블록에서 라운드마다 바뀌는 작업 레지스터 A의 첫 바이트예요. 이 과정에서 정보가 섞이고 접혀서 거꾸로 풀 방법이 없어요.</p><div class="pj-grid">${trace.map(cell).join('')}</div>`) +
        step(5, '256비트 해시값 저장', `<p class="pj-p">결과는 입력 길이와 관계없이 항상 32바이트예요. DB에는 알고리즘, 솔트, 해시만 저장해요. ${check ? '<span class="chip ok">브라우저 내장 SHA-256과 일치</span>' : '<span class="chip plain">불일치</span>'}</p><div class="out enc" style="font-size:12px">sha256$<span class="tag-warn">${toB64(salt)}</span>$<span class="tag-enc">${toHex(digest)}</span></div>`) +
        step(6, '로그인할 때는', `<p class="pj-p">서버는 저장된 솔트를 꺼내 입력값과 같은 과정을 다시 거친 뒤 결과가 같은지만 비교해요. 원래 비밀번호를 되돌려 꺼내는 단계는 어디에도 없어요. 실무에서는 4단계를 수십만 번 반복하는 PBKDF2·bcrypt·Argon2를 써서 공격자의 시도마다 시간을 들게 만들어요.</p>`);
      $('#pjSalt').addEventListener('click', () => { salt = rand(16); run(); });
      crack(pw);
    }
    function crack(pw) {
      const a = analyze(pw), inCommon = a.method === '흔한 비밀번호 목록';
      const rows = SCEN.map(s => {
        if (s.k === 'online-lock') return [s, a.guesses <= 5 ? ['5번 안에 맞힐 수 있음', 'bad'] : ['5회 후 잠김 → 대입 불가', 'good']];
        if (s.table && inCommon) return [s, ['즉시 (미리 계산한 표에서 조회)', 'bad']];
        return [s, humanYears(a.guesses / s.rate)];
      });
      const worst = humanYears(a.guesses / 1e10);
      const bits = Math.log2(a.guesses * 2);
      const pct = Math.max(4, Math.min(100, bits / 90 * 100));
      $('#pjCrack').innerHTML = `<div class="verdict ${worst[1] === 'good' ? 'good' : worst[1] === 'mid' ? 'mid' : 'bad'}"><span style="font-size:12px;color:var(--muted)">SHA-256 해시가 유출됐을 때 예상 해독 시간</span><b class="big" style="font-size:22px;margin-top:2px">${worst[0]}</b>
          <div class="pj-meter" aria-hidden="true"><i style="width:${pct}%;background:${worst[1] === 'good' ? 'var(--ok)' : worst[1] === 'mid' ? 'var(--warn)' : 'var(--plain)'}"></i></div>
          <span style="font-size:12.5px">공격 방식: <b>${a.method}</b> · 평균 시도 약 ${a.guesses < 1e6 ? Math.round(a.guesses).toLocaleString() + '회' : '10<sup>' + Math.round(Math.log10(a.guesses)) + '</sup>회'} · 문자 종류 ${a.C}개 × ${a.L}자</span></div>
        <div class="table-wrap"><table><thead><tr><th>상황</th><th>예상 시간</th></tr></thead><tbody>${rows.map(([s, [t, c]]) => `<tr><td><b style="font-size:13px">${s.name}</b><br><small style="color:var(--muted)">${s.sub}</small></td><td class="tag-${c === 'good' ? 'ok' : c === 'mid' ? 'warn' : 'plain'}" style="white-space:nowrap">${t}</td></tr>`).join('')}</tbody></table></div>
        ${a.notes.length ? `<ul class="pj-notes">${a.notes.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join('')}</ul>` : ''}
        <p class="notice">교육용 단순 추정이에요. 공격 속도는 장비·알고리즘 설정에 따라 크게 달라지며, 위 수치는 크기 비교를 위한 가정치예요. 실제로 대입 공격을 실행하지 않고 길이·문자 종류·흔한 패턴으로 계산했어요.</p>`;
    }
    $('#pjIn').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
    $('#pjPre').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { $('#pjIn').value = b.dataset.v; run(); } });
    run();
  });
})();
