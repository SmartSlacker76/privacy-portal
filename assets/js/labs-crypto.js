/* Ⅱ. 암호화 실습: 홈 애니메이션, 일방향, 대칭키, 전송 구간, 파일 암호 */
(function () {
  'use strict';
  const { $, $$, esc, enc, dec, toHex, fromHex, toB64, fromB64, rand, hexdump, FlowPlayer, seg, onLesson, reduced } = window.PI;
  const { ARIA, SEED, cbcEncrypt, cbcDecrypt } = window.KCipher;
  const subtle = crypto.subtle;
  const sha = async (alg, data) => new Uint8Array(await subtle.digest(alg, data));
  const concat = (...a) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
  async function pbkdf2(pw, salt, iter, bits = 256) {
    const k = await subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, bits));
  }

  /* ---------------- 홈: 평문 → 암호문 ---------------- */
  onLesson('home', () => {
    const samples = [['900101-1234567', '이용자 주민등록번호 (예시)'], ['4111-1111-1111-1111', '신용카드번호 (테스트 번호)'], ['110-123-456789', '계좌번호 (예시)']];
    let k = 0;
    async function tick() {
      if (!$('#morphPlain')) return;
      const [v, label] = samples[k++ % samples.length];
      const key = rand(16), iv = rand(16);
      $('#morphPlain').textContent = v;
      $('#morphPlain').previousElementSibling.firstElementChild.textContent = '평문 · ' + label;
      const ct = cbcEncrypt(ARIA, key, iv, enc.encode(v));
      $('#morphCipher').textContent = toB64(concat(iv, ct));
      const salt = rand(16), h = await sha('SHA-256', concat(salt, enc.encode('P@ssw0rd!')));
      $('#morphHash').textContent = `$sha256$${toB64(salt)}$${toHex(h)}`;
    }
    tick(); if (!reduced()) setInterval(() => { if (!$('#home').hidden) tick(); }, 3200);
  });

  /* ---------------- Ⅱ-2 일방향 ---------------- */
  onLesson('hash', () => {
    const lab = $('#hashLab');
    lab.innerHTML = `<h2>해시 저장과 로그인 검증</h2>
      <div style="display:grid;gap:10px;margin-top:12px">
        <div class="field"><label for="hPw">가입 시 입력한 비밀번호</label><input class="input" id="hPw" value="P@ssw0rd!" autocomplete="off"></div>
        <div class="row">
          <div class="field" style="flex:1;min-width:160px"><label for="hAlg">알고리즘</label><select class="input" id="hAlg">
            <option value="SHA-256">SHA-256</option><option value="SHA-512">SHA-512</option><option value="PBKDF2">PBKDF2-HMAC-SHA256 (키 스트레칭)</option><option value="SHA-1">SHA-1 (사용 금지 예시)</option></select></div>
          <div class="field" style="width:130px"><label for="hIter">반복 횟수</label><input class="input" id="hIter" type="number" value="600000" min="1000" step="1000"></div>
        </div>
        <label class="row" style="font-size:13.5px"><input type="checkbox" id="hSalt" checked> 사용자별 무작위 솔트 16바이트 추가 <button class="btn" id="hNewSalt" type="button" style="padding:3px 10px">솔트 새로 만들기</button></label>
        <div><div class="row" style="justify-content:space-between"><span style="font-size:12.5px;color:var(--muted);font-weight:600">DB에 저장되는 값</span><span class="chip" id="hTime"></span></div><div class="out enc" id="hOut"></div></div>
        <div class="field"><label for="hTry">로그인 시 입력</label><div class="row"><input class="input" id="hTry" value="P@ssw0rd!" style="flex:1" autocomplete="off"><button class="btn primary" id="hVerify" type="button">검증</button></div></div>
        <div class="verdict" id="hRes" aria-live="polite"></div>
      </div>`;
    let salt = rand(16), stored = null;
    async function digest(pw, s) {
      const alg = $('#hAlg').value, useSalt = $('#hSalt').checked, input = useSalt ? concat(s, enc.encode(pw)) : enc.encode(pw);
      if (alg === 'PBKDF2') return pbkdf2(pw, useSalt ? s : new Uint8Array(0), Math.max(1000, +$('#hIter').value || 600000));
      return sha(alg, input);
    }
    async function save() {
      const t = performance.now(); const h = await digest($('#hPw').value, salt); const ms = performance.now() - t;
      const alg = $('#hAlg').value, useSalt = $('#hSalt').checked;
      stored = { h, alg, useSalt, salt };
      const tag = alg === 'PBKDF2' ? `pbkdf2-sha256$${$('#hIter').value}` : alg.toLowerCase().replace('-', '');
      $('#hOut').innerHTML = `${esc(tag)}$${useSalt ? `<span class="tag-warn">${toB64(salt)}</span>$` : ''}<span class="tag-enc">${toHex(h)}</span>`;
      $('#hOut').className = 'out ' + (alg === 'SHA-1' ? 'plain' : 'enc');
      $('#hTime').textContent = `계산 ${ms < 1 ? '<1' : ms.toFixed(0)} ms`;
      $('#hIter').disabled = alg !== 'PBKDF2';
      if (alg === 'SHA-1') { $('#hRes').className = 'verdict bad'; $('#hRes').innerHTML = '<b class="big">SHA-1은 사용 금지</b>충돌 공격이 실제로 시연된 알고리즘이에요. 안내서는 MD5, SHA-1 등 보안강도가 낮은 알고리즘을 사용하면 안 된다고 명시해요.'; }
      else verify();
    }
    async function verify() {
      if (!stored) return;
      const h = await digest($('#hTry').value, stored.salt), ok = toHex(h) === toHex(stored.h);
      $('#hRes').className = 'verdict ' + (ok ? 'good' : 'bad');
      $('#hRes').innerHTML = ok ? '<b class="big">로그인 성공</b>입력값을 같은 솔트·알고리즘으로 해시한 결과가 저장값과 같아요. 서버는 원래 비밀번호를 한 번도 저장하지 않았아요.' : '<b class="big">로그인 실패</b>한 글자만 달라도 해시값은 완전히 달라져요. 일정 횟수 이상 실패하면 접근을 제한해요(제5조⑥).';
    }
    let to; const later = () => { clearTimeout(to); to = setTimeout(save, 250); };
    ['#hPw', '#hIter'].forEach(s => $(s).addEventListener('input', later));
    ['#hAlg', '#hSalt'].forEach(s => $(s).addEventListener('change', save));
    $('#hNewSalt').addEventListener('click', () => { salt = rand(16); save(); });
    $('#hVerify').addEventListener('click', verify);
    $('#hTry').addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
    save();

    /* 눈사태 효과 */
    const av = $('#avalanche');
    av.innerHTML = `<h2>한 글자만 바꿔도</h2><p style="color:var(--muted);font-size:13.5px;margin:6px 0 10px">해시는 입력이 조금만 달라도 출력 비트의 절반 정도가 바뀌어요(눈사태 효과). 그래서 해시값만 보고 원래 값을 짐작할 수 없어요.</p>
      <div class="cols" style="grid-template-columns:1fr 1fr;gap:8px"><div class="field"><label for="aA">입력 A</label><input class="input" id="aA" value="P@ssw0rd!"></div><div class="field"><label for="aB">입력 B</label><input class="input" id="aB" value="P@ssw0rd?"></div></div>
      <div id="aBits" style="display:grid;grid-template-columns:repeat(32,minmax(0,1fr));gap:2px;margin-top:12px" aria-label="SHA-256 비트 비교"></div>
      <p style="margin:10px 0 0;font-size:14px" id="aSum"></p>`;
    async function aval() {
      const [a, b] = await Promise.all([sha('SHA-256', enc.encode($('#aA').value)), sha('SHA-256', enc.encode($('#aB').value))]);
      let diff = 0, cells = '';
      for (let i = 0; i < 256; i++) { const x = (a[i >> 3] >> (7 - (i & 7))) & 1, y = (b[i >> 3] >> (7 - (i & 7))) & 1; if (x !== y) diff++; cells += `<i style="aspect-ratio:1;border-radius:2px;background:${x !== y ? 'var(--plain)' : 'var(--grid)'}"></i>`; }
      $('#aBits').innerHTML = cells;
      $('#aSum').innerHTML = `256비트 중 <b class="tag-plain">${diff}비트(${(diff / 2.56).toFixed(1)}%)</b>가 달라요.`;
    }
    $('#aA').addEventListener('input', aval); $('#aB').addEventListener('input', aval); aval();

    /* 레인보우 테이블 */
    const rb = $('#rainbow');
    const users = [['kim', '123456'], ['lee', 'qwerty123'], ['park', 't7#Kq!x2Vm$9'], ['choi', '123456'], ['jung', 'iloveyou'], ['kang', 'password1']];
    const dict = ['123456', 'password', '123456789', '12345678', '12345', 'qwerty', 'qwerty123', '111111', '1q2w3e4r', 'iloveyou', 'password1', 'admin', 'abc123', '1234', 'qwer1234', 'a123456', 'P@ssw0rd', 'dragon', 'sunshine', 'princess'];
    rb.innerHTML = `<div class="row" style="justify-content:space-between"><h2 style="margin:0">유출된 해시 DB에 레인보우 테이블 대입</h2><div id="rbSeg"></div></div>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">공격자는 자주 쓰는 비밀번호 수백만 개의 해시를 미리 계산해 둬요(사전·레인보우 테이블). 솔트가 없으면 유출된 해시를 표에서 찾기만 하면 돼요. 아래 사전에는 20개만 넣었어요.</p>
      <div class="table-wrap"><table><thead><tr><th>아이디</th><th>솔트</th><th>저장된 해시 (SHA-256)</th><th>공격 결과</th></tr></thead><tbody id="rbRows"></tbody></table></div>
      <div class="row" style="margin-top:12px"><button class="btn danger" id="rbGo" type="button">미리 계산한 표로 대조</button><span id="rbSum" style="font-size:14px"></span></div>`;
    let salted = false, rows = [];
    async function build() {
      rows = await Promise.all(users.map(async ([id, pw]) => { const s = salted ? rand(8) : new Uint8Array(0); return { id, pw, s, h: toHex(await sha('SHA-256', concat(s, enc.encode(pw))))}; }));
      $('#rbRows').innerHTML = rows.map(r => `<tr data-id="${r.id}"><td>${r.id}</td><td class="mono">${r.s.length ? toHex(r.s) : '<span style="color:var(--muted)">없음</span>'}</td><td class="mono">${r.h.slice(0, 24)}…</td><td class="res">—</td></tr>`).join('');
      $('#rbSum').textContent = salted ? 'kim과 choi는 같은 비밀번호지만 솔트 때문에 해시가 달라요.' : 'kim과 choi의 해시가 같다는 것만으로도 같은 비밀번호임이 드러나요.';
    }
    $('#rbGo').addEventListener('click', async () => {
      const table = new Map(await Promise.all(dict.map(async p => [toHex(await sha('SHA-256', enc.encode(p))), p])));
      let n = 0;
      rows.forEach(r => { const hit = table.get(r.h), td = $(`tr[data-id="${r.id}"] .res`, rb); if (hit) n++; td.innerHTML = hit ? `<span class="tag-plain">해독: ${esc(hit)}</span>` : '<span class="tag-ok">찾지 못함</span>'; });
      $('#rbSum').innerHTML = salted ? `<b class="tag-ok">${n}명 해독.</b> 표는 솔트 없는 값으로 계산되어 쓸모가 없어요. 공격자는 사용자마다 처음부터 다시 계산해야 하고, PBKDF2 같은 키 스트레칭이 그 비용을 수십만 배로 늘려요.` : `<b class="tag-plain">6명 중 ${n}명 해독.</b> 복잡한 비밀번호를 쓴 park만 살아남았아요.`;
    });
    $('#rbSeg').append(seg([['plain', '솔트 없음'], ['salt', '사용자별 솔트']], v => { salted = v === 'salt'; build(); }));
  });

  /* ---------------- Ⅱ-3 대칭키 ---------------- */
  onLesson('symmetric', () => {
    const lab = $('#symLab');
    const SAMPLES = { rrn: '900101-1234567', card: '4111-1111-1111-1111', acct: '110-123-456789' };
    lab.innerHTML = `<h2>직접 암호화하고 복호화하기</h2>
      <div class="cols" style="margin-top:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">
        <div class="field"><label for="sType">항목</label><select class="input" id="sType"><option value="rrn">주민등록번호 (예시)</option><option value="card">신용카드번호 (테스트용 번호)</option><option value="acct">계좌번호 (예시)</option><option value="custom">직접 입력</option></select></div>
        <div class="field"><label for="sAlg">알고리즘 · 모드</label><select class="input" id="sAlg"><option value="ARIA-128">ARIA-128-CBC (국내 표준 KS X 1213)</option><option value="ARIA-256">ARIA-256-CBC</option><option value="SEED-128">SEED-128-CBC (TTA 표준)</option><option value="AES-128">AES-128-CBC (FIPS 197)</option><option value="AES-256">AES-256-CBC</option></select></div>
        <div class="field"><label for="sPlain">평문</label><input class="input" id="sPlain" value="${SAMPLES.rrn}"></div>
      </div>
      <div class="cols" style="margin-top:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))">
        <div class="field"><label for="sKey">비밀키 (hex)</label><div class="row"><input class="input mono" id="sKey" style="flex:1"><button class="btn" id="sNewKey" type="button">새 키</button></div></div>
        <div class="field"><label for="sIv">초기화 벡터 IV (hex, 16바이트)</label><div class="row"><input class="input mono" id="sIv" style="flex:1"><button class="btn" id="sNewIv" type="button">새 IV</button></div></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="sEnc" type="button">암호화</button><button class="btn" id="sDec" type="button">복호화</button><button class="btn" id="sWrong" type="button">키 1바이트 바꿔 복호화</button></div>
      <div class="cols" style="margin-top:12px">
        <div style="min-width:0"><div style="font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:4px">암호문 (Base64, DB 저장 형태)</div><div class="out enc" id="sOut"></div><div id="sDump" style="margin-top:8px"></div></div>
        <div style="min-width:0"><div style="font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:4px">복호화 결과</div><div class="verdict" id="sRes">암호화 후 복호화를 눌러 보세요.</div><p class="notice" style="margin-top:10px">CBC 모드는 평문을 16바이트 블록으로 나누고 PKCS#7 패딩을 붙여요. IV가 매번 무작위라서 같은 주민번호도 암호화할 때마다 다른 암호문이 돼요. 이 구현은 RFC 5794(ARIA)·RFC 4269(SEED) 테스트 벡터와 OpenSSL 결과로 검증했어요.</p></div>
      </div>`;
    let last = null;
    const keyLen = () => +$('#sAlg').value.split('-')[1] / 8;
    const newKey = () => { $('#sKey').value = toHex(rand(keyLen())); };
    const newIv = () => { $('#sIv').value = toHex(rand(16)); };
    async function encrypt(alg, key, iv, data) {
      if (alg.startsWith('AES')) { const k = await subtle.importKey('raw', key, 'AES-CBC', false, ['encrypt']); return new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv }, k, data)); }
      return cbcEncrypt(alg.startsWith('ARIA') ? ARIA : SEED, key, iv, data);
    }
    async function decrypt(alg, key, iv, data) {
      if (alg.startsWith('AES')) { const k = await subtle.importKey('raw', key, 'AES-CBC', false, ['decrypt']); return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv }, k, data)); }
      return cbcDecrypt(alg.startsWith('ARIA') ? ARIA : SEED, key, iv, data);
    }
    const readKey = () => { const k = fromHex($('#sKey').value), iv = fromHex($('#sIv').value); if (k.length !== keyLen()) throw new Error(`키 길이가 ${keyLen()}바이트(${keyLen() * 2}자리 hex)여야 해요.`); if (iv.length !== 16) throw new Error('IV는 16바이트(32자리 hex)여야 해요.'); return [k, iv]; };
    async function doEnc() {
      try {
        const [k, iv] = readKey(), alg = $('#sAlg').value, ct = await encrypt(alg, k, iv, enc.encode($('#sPlain').value));
        last = { alg, ct, iv }; $('#sOut').textContent = toB64(ct);
        $('#sDump').innerHTML = hexdump(ct, [{ from: 0, to: ct.length, cls: 'b-enc' }]);
        $('#sRes').className = 'verdict'; $('#sRes').textContent = `${ct.length}바이트 암호문 (${ct.length / 16}블록). 복호화를 눌러 보세요.`;
        window.dispatchEvent(new CustomEvent('sym-change'));
      } catch (e) { $('#sRes').className = 'verdict bad'; $('#sRes').innerHTML = `<b class="big">입력 오류</b>${esc(e.message)}`; }
    }
    async function doDec(wrong) {
      if (!last) await doEnc();
      try {
        let [k] = readKey(); if (wrong) { k = k.slice(); k[0] ^= 0x01; }
        const pt = await decrypt(last.alg, k, last.iv, last.ct);
        $('#sRes').className = 'verdict good'; $('#sRes').innerHTML = `<b class="big">${esc(dec.decode(pt))}</b>같은 키와 IV로 원래 값을 되찾았아요. 그래서 키를 가진 사람만 개인정보를 볼 수 있어요.`;
      } catch (e) { $('#sRes').className = 'verdict bad'; $('#sRes').innerHTML = `<b class="big">복호화 실패</b>${wrong ? '키가 1비트만 달라도 복호화 결과는 무작위 값이 되고 패딩 검사에서 걸려요. ' : ''}${esc(e.message || '')}`; }
    }
    $('#sType').addEventListener('change', () => { const v = $('#sType').value; if (SAMPLES[v]) $('#sPlain').value = SAMPLES[v]; else $('#sPlain').focus(); doEnc(); });
    $('#sAlg').addEventListener('change', () => { newKey(); doEnc(); });
    $('#sNewKey').addEventListener('click', () => { newKey(); doEnc(); });
    $('#sNewIv').addEventListener('click', () => { newIv(); doEnc(); });
    $('#sEnc').addEventListener('click', doEnc);
    $('#sDec').addEventListener('click', () => doDec(false));
    $('#sWrong').addEventListener('click', () => doDec(true));
    $('#sPlain').addEventListener('input', () => { last = null; });
    newKey(); newIv(); doEnc();

    /* 라운드 시각화 */
    const rv = $('#roundViz');
    function rounds() {
      const alg = $('#sAlg').value; let k; try { [k] = readKey(); } catch (e) { return; }
      if (alg.startsWith('AES')) { rv.innerHTML = '<h2>라운드별 상태 변화</h2><p style="color:var(--muted);font-size:14px">AES는 브라우저 내장 Web Crypto API로 계산되어 중간 라운드 값을 꺼낼 수 없어요. ARIA 또는 SEED를 선택하면 첫 블록이 라운드마다 어떻게 뒤섞이는지 볼 수 있어요.</p>'; return; }
      const C = alg.startsWith('ARIA') ? ARIA : SEED;
      const blk = Array.from(enc.encode($('#sPlain').value.padEnd(16, '\0')).slice(0, 16));
      while (blk.length < 16) blk.push(0);
      const iv = fromHex($('#sIv').value), x = blk.map((v, i) => v ^ iv[i]);
      const t1 = []; C.encryptBlock(x, k, t1);
      const y = x.slice(); y[0] ^= 1; const t2 = []; C.encryptBlock(y, k, t2);
      const cell = v => `<i style="background:hsl(${(v * 1.41) | 0} 55% 42%)">${v.toString(16).padStart(2, '0')}</i>`;
      const bits = (a, b) => a.reduce((s, v, i) => { let d = v ^ b[i], c = 0; while (d) { c += d & 1; d >>= 1; } return s + c; }, 0);
      rv.innerHTML = `<h2>라운드별 상태 변화 · ${C.name}</h2>
        <p style="color:var(--muted);font-size:13.5px;margin:6px 0 10px">${C.name === 'ARIA' ? `ARIA는 치환(S-box) 계층과 확산 계층을 번갈아 쓰는 SPN 구조로, ${C.rounds(k)}라운드를 돌아요.` : 'SEED는 블록을 64비트씩 반으로 나눠 F함수를 번갈아 적용하는 Feistel 구조로, 16라운드를 돌아요.'} 첫 블록(평문 XOR IV)이 라운드마다 바뀌는 모습이에요. 오른쪽 숫자는 입력 첫 비트 하나만 바꿨을 때 달라진 비트 수예요.</p>
        <div class="rounds"><div class="r"><span>입력</span>${x.map(cell).join('')}</div>${t1.map((r, i) => `<div class="r"><span>R${String(i + 1).padStart(2, '0')}</span>${r.map(cell).join('')}<span style="color:var(--plain);padding-left:6px;white-space:nowrap">${bits(r, t2[i])}/128</span></div>`).join('')}</div>`;
    }
    window.addEventListener('sym-change', rounds);

    /* DB 저장 비교 */
    const members = [['1001', '홍길동', '900101-1234567', '110-123-456789'], ['1002', '김영희', '850315-2345678', '352-0456-7890-12'], ['1003', '이철수', '920720-1456789', '1002-345-678901']];
    async function db() {
      let k, iv0; try { [k, iv0] = readKey(); } catch (e) { return; }
      const alg = $('#sAlg').value;
      const rows = await Promise.all(members.map(async m => { const iv = rand(16), r = await encrypt(alg, k, iv, enc.encode(m[2])), iv2 = rand(16), a = await encrypt(alg, k, iv2, enc.encode(m[3])); return [m[0], m[1], toB64(concat(iv, r)), toB64(concat(iv2, a))]; }));
      $('#dbView').innerHTML = `<h2>DB 덤프가 유출되었다면</h2><p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">SQL 인젝션 등으로 테이블이 통째로 유출된 상황이에요. 키를 DB 밖(키 관리 서버, HSM 등)에 두었다면 공격자는 암호문만 얻어요. 저장 형태는 <code>IV ‖ 암호문</code>을 Base64로 묶은 것이에요.</p>
        <div class="cols"><div style="min-width:0"><span class="chip plain">평문 저장</span><div class="table-wrap" style="margin-top:6px"><table><thead><tr><th>no</th><th>name</th><th>rrn</th><th>account</th></tr></thead><tbody>${members.map(m => `<tr><td>${m[0]}</td><td>${m[1]}</td><td class="mono tag-plain">${m[2]}</td><td class="mono tag-plain">${m[3]}</td></tr>`).join('')}</tbody></table></div></div>
        <div style="min-width:0"><span class="chip enc">${esc(alg)} 암호화 저장</span><div class="table-wrap" style="margin-top:6px"><table><thead><tr><th>no</th><th>name</th><th>rrn_enc</th><th>account_enc</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="mono tag-enc">${r[2].slice(0, 22)}…</td><td class="mono tag-enc">${r[3].slice(0, 22)}…</td></tr>`).join('')}</tbody></table></div></div></div>`;
    }
    window.addEventListener('sym-change', db);
    rounds(); db();
  });

  /* ---------------- Ⅱ-4 전송 구간 ---------------- */
  onLesson('transport', async () => {
    const host = 'shop.example.com', body = 'id=hong01&pw=P%40ssw0rd%21&name=%ED%99%8D%EA%B8%B8%EB%8F%99';
    const httpReq = enc.encode(`POST /member/login HTTP/1.1\r\nHost: ${host}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${body.length}\r\n\r\n${body}`);
    const httpRes = enc.encode('HTTP/1.1 302 Found\r\nLocation: /mypage\r\nSet-Cookie: JSESSIONID=8F3A1C77D2E94B0A; Path=/\r\n\r\n');
    // ClientHello 조립 (TLS 1.3)
    const u16 = n => [n >> 8 & 255, n & 255], u24 = n => [n >> 16 & 255, n >> 8 & 255, n & 255];
    const sni = enc.encode(host), ks = rand(32), crand = rand(32), sid = rand(32);
    const extSNI = [0, 0, ...u16(sni.length + 5), ...u16(sni.length + 3), 0, ...u16(sni.length), ...sni];
    const extVer = [0, 0x2b, 0, 3, 2, 3, 4];
    const extGrp = [0, 0x0a, 0, 4, 0, 2, 0, 0x1d];
    const extSig = [0, 0x0d, 0, 6, 0, 4, 4, 3, 8, 4];
    const extKS = [0, 0x33, ...u16(38), ...u16(36), 0, 0x1d, 0, 32, ...ks];
    const exts = [...extSNI, ...extVer, ...extGrp, ...extSig, ...extKS];
    const chBody = [3, 3, ...crand, 32, ...sid, 0, 6, 0x13, 1, 0x13, 2, 0x13, 3, 1, 0, ...u16(exts.length), ...exts];
    const hs = [1, ...u24(chBody.length), ...chBody];
    const ch = Uint8Array.from([0x16, 3, 1, ...u16(hs.length), ...hs]);
    let o = 0; const sp = (n, cls) => { const s = { from: o, to: o + n, cls }; o += n; return s; };
    const chSpans = [sp(1, 'b-hdr'), sp(2, 'b-hdr'), sp(2, 'b-hdr'), sp(1, 'b-hdr'), sp(3, 'b-hdr'), sp(2, ''), sp(32, 'b-mut'), sp(33, 'b-mut'), sp(8, ''), sp(2, ''), sp(2, ''), sp(extSNI.length - sni.length, ''), sp(sni.length, 'b-plain'), sp(extVer.length + extGrp.length + extSig.length, ''), sp(10, ''), sp(32, 'b-enc')];
    // 애플리케이션 데이터: 실제 AES-128-GCM으로 암호화
    const gk = await subtle.importKey('raw', rand(16), 'AES-GCM', false, ['encrypt']);
    const inner = concat(httpReq, Uint8Array.of(0x17));
    const appCt = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: rand(12) }, gk, inner));
    const appRec = concat(Uint8Array.of(0x17, 3, 3, ...u16(appCt.length)), appCt);
    const encHs = concat(Uint8Array.of(0x17, 3, 3, ...u16(2400)), rand(96));

    const legend = (rows) => `<div class="legend" style="margin-top:8px">${rows.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
    const views = {
      tcp: { title: 'TCP 3-way 핸드셰이크', html: '<p style="color:var(--muted)">SYN, SYN-ACK, ACK. 아직 데이터는 없어요. 도청자는 출발지·목적지 IP와 포트만 봐요.</p>' },
      httpReq: { title: '도청자가 캡처한 바이트 · HTTP 요청', html: hexdump(httpReq, [{ from: httpReq.length - body.length, to: httpReq.length, cls: 'b-plain' }]) + '<p style="margin-top:8px"><b class="tag-plain">아이디, 비밀번호, 이름이 그대로 보여요.</b> URL 인코딩은 암호화가 아니에요. <code>P%40ssw0rd%21</code> = <code>P@ssw0rd!</code></p>' },
      httpRes: { title: '도청자가 캡처한 바이트 · HTTP 응답', html: hexdump(httpRes, [{ from: dec.decode(httpRes).indexOf('JSESSIONID'), to: dec.decode(httpRes).indexOf('; Path'), cls: 'b-plain' }]) + '<p style="margin-top:8px"><b class="tag-plain">세션 쿠키가 노출되었어요.</b> 공격자는 이 값으로 비밀번호 없이 로그인 상태를 가로챌 수 있어요(세션 하이재킹).</p>' },
      ch: { title: '도청자가 캡처한 바이트 · ClientHello', html: hexdump(ch, chSpans) + legend([['var(--ok)', '레코드·핸드셰이크 헤더'], ['var(--plain)', '평문 노출: 접속 서버 이름(SNI)'], ['var(--cipher)', 'X25519 공개키(노출돼도 안전)'], ['var(--muted)', '난수·세션 ID']]) +
        `<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>바이트</th><th>의미</th></tr></thead><tbody>
        <tr><td class="mono">16</td><td>Content Type 22 = Handshake</td></tr><tr><td class="mono">03 01</td><td>레코드 버전(호환용 표기)</td></tr><tr><td class="mono">${toHex(u16(hs.length))}</td><td>레코드 길이 ${hs.length}바이트</td></tr>
        <tr><td class="mono">01</td><td>Handshake Type 1 = ClientHello</td></tr><tr><td class="mono">13 01 · 13 02 · 13 03</td><td>암호 스위트: TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256</td></tr>
        <tr><td class="mono">00 2b … 03 04</td><td>supported_versions: TLS 1.3</td></tr><tr><td class="mono">00 33 … 00 1d</td><td>key_share: X25519 공개키 32바이트</td></tr></tbody></table></div>` },
      sh: { title: 'ServerHello', html: '<p>서버가 암호 스위트(예: <code>13 01</code>)와 자신의 X25519 공개키를 보내요. 양쪽은 상대 공개키와 자기 비밀키로 <b>같은 공유 비밀</b>을 계산해요(ECDHE). 도청자는 공개키 두 개를 다 봐도 공유 비밀을 계산할 수 없어요.</p><p style="color:var(--muted)">이 순간부터 이후 핸드셰이크 메시지는 모두 암호화돼요.</p>' },
      encHs: { title: '도청자가 캡처한 바이트 · 암호화된 핸드셰이크', html: hexdump(encHs.slice(0, 64), [{ from: 0, to: 5, cls: 'b-hdr' }, { from: 5, to: 64, cls: 'b-enc' }]) + '<p style="margin-top:8px">TLS 1.3에서는 서버 인증서까지 암호화되어 전송돼요. 레코드 타입은 위장용으로 항상 <code>17</code>(application_data)로 표시돼요.</p>' },
      app: { title: '도청자가 캡처한 바이트 · 로그인 요청 (실제 AES-128-GCM 암호문)', html: hexdump(appRec, [{ from: 0, to: 5, cls: 'b-hdr' }, { from: 5, to: appRec.length - 16, cls: 'b-enc' }, { from: appRec.length - 16, to: appRec.length, cls: 'b-mut' }]) + legend([['var(--ok)', '레코드 헤더 17 03 03 + 길이'], ['var(--cipher)', '암호문'], ['var(--muted)', 'GCM 인증 태그 16바이트']]) + `<p style="margin-top:8px"><b class="tag-enc">HTTP 요청 ${httpReq.length}바이트가 통째로 암호화되었어요.</b> 도청자가 알 수 있는 것은 길이(${appCt.length}바이트)와 시각뿐이에요. 인증 태그 덕분에 1비트라도 변조되면 수신 측이 폐기해요.</p>` }
    };
    const N = [{ id: 'cli', label: '브라우저', sub: '회원 PC', x: 24, y: 120, w: 130 }, { id: 'ap', label: '공용 와이파이', sub: '도청자가 패킷 캡처', x: 290, y: 120, w: 150 }, { id: 'srv', label: '웹 서버', sub: host, x: 576, y: 120, w: 150 }];
    const S = {
      http: [
        { from: 'cli', to: 'srv', pkt: 'SYN', state: 'plain', title: 'TCP 연결', law: [], html: '<p>브라우저가 서버 80번 포트로 TCP 연결을 맺어요.</p>', v: 'tcp' },
        { from: 'cli', to: 'srv', pkt: 'POST /login', state: 'plain', danger: true, title: '로그인 요청을 평문으로', law: ['고시 제7조①④ 위반'], html: '<p>폼 데이터가 그대로 실려 가요. 와이파이 공유기, ISP, 사내 프록시 등 <b>경로상의 누구나</b> 읽고 바꿀 수 있어요.</p>', fields: [['id', 'hong01', 'plain'], ['pw', 'P@ssw0rd!', 'plain'], ['name', '홍길동', 'plain']], inspectorTitle: '도청자 화면', v: 'httpReq' },
        { from: 'srv', to: 'cli', pkt: 'Set-Cookie', state: 'plain', danger: true, title: '세션 쿠키도 평문', law: [], html: '<p>로그인 이후 모든 요청에 붙는 세션 쿠키가 노출돼요.</p>', fields: [['JSESSIONID', '8F3A1C77D2E94B0A', 'plain']], inspectorTitle: '도청자 화면', v: 'httpRes' }
      ],
      https: [
        { from: 'cli', to: 'srv', pkt: 'SYN', state: 'plain', title: 'TCP 연결', law: [], html: '<p>브라우저가 서버 443번 포트로 TCP 연결을 맺어요.</p>', v: 'tcp' },
        { from: 'cli', to: 'srv', pkt: 'ClientHello', state: 'plain', title: 'ClientHello', law: ['TLS 1.3 · RFC 8446'], html: '<p>지원하는 TLS 버전, 암호 스위트, 키 교환용 공개키를 보내요. 핸드셰이크 첫 메시지는 평문이라 <b>접속하려는 서버 이름(SNI)</b>은 보여요.</p>', fields: [['버전', 'TLS 1.3'], ['암호 스위트', 'AES_128_GCM, AES_256_GCM, CHACHA20'], ['SNI', host, 'plain'], ['key_share', 'X25519 공개키 32B']], inspectorTitle: 'ClientHello 해석', v: 'ch' },
        { from: 'srv', to: 'cli', pkt: 'ServerHello', state: 'plain', title: 'ServerHello · 키 합의', law: [], html: '<p>서버가 선택한 암호 스위트와 공개키를 돌려보내요. 이제 양쪽이 같은 세션 키를 갖아요.</p>', fields: [['선택', 'TLS_AES_128_GCM_SHA256'], ['key_share', 'X25519 공개키 32B'], ['공유 비밀', '양쪽만 계산 가능', 'enc']], v: 'sh' },
        { from: 'srv', to: 'cli', pkt: '{Certificate}', state: 'enc', title: '인증서 · 서명 · Finished', law: ['보안서버(SSL 인증서)'], html: '<p>서버가 인증서와 서명을 보내고, 브라우저는 인증기관 체인으로 <b>진짜 shop.example.com인지</b> 확인해요. 이 검증이 중간자 공격을 막아요.</p>', fields: [['EncryptedExtensions', '(암호화)', 'enc'], ['Certificate', '(암호화)', 'enc'], ['CertificateVerify', '(암호화)', 'enc'], ['Finished', '(암호화)', 'enc']], inspectorTitle: '도청자 화면', v: 'encHs' },
        { from: 'cli', to: 'srv', pkt: 'Finished', state: 'enc', title: '클라이언트 Finished', law: [], html: '<p>브라우저도 핸드셰이크 전체에 대한 확인값을 보내요. 핸드셰이크가 1왕복(1-RTT)으로 끝났아요.</p>', fields: [['Finished', '(암호화)', 'enc']], v: 'encHs' },
        { from: 'cli', to: 'srv', pkt: 'POST /login', state: 'enc', title: '로그인 요청을 암호문으로', law: ['고시 제7조①④'], html: '<p>같은 로그인 요청이지만 경로상의 누구도 내용을 읽거나 바꿀 수 없어요.</p>', fields: [['id', '(암호화)', 'enc'], ['pw', '(암호화)', 'enc'], ['name', '(암호화)', 'enc'], ['보이는 정보', `길이 ${appCt.length}B, 시각`]], inspectorTitle: '도청자 화면', v: 'app' }
      ]
    };
    const sniff = $('#sniff');
    const show = s => { const v = views[s.v]; sniff.innerHTML = `<h2 style="font-size:17px">${esc(v.title)}</h2><div style="margin-top:10px">${v.html}</div>`; };
    let fp;
    const tb = seg([['http', 'HTTP (평문)'], ['https', 'HTTPS (TLS 1.3)']], v => { if (fp) fp.load(S[v]); }, 'https');
    fp = new FlowPlayer($('#tlsFlow'), { title: '공용 와이파이에서 로그인하기', nodes: N, steps: S.https, W: 750, H: 290, toolbar: tb, onStep: show });
  });

  /* ---------------- Ⅱ-5 파일 암호 ---------------- */
  onLesson('file-lock', () => {
    const lab = $('#fileLab');
    const SAMPLE = '회원번호,이름,휴대전화,주소\n1001,홍길동,010-1234-5678,서울 종로구 세종대로 1\n1002,김영희,010-2345-6789,부산 해운대구 해운대로 2\n1003,이철수,010-3456-7890,대전 서구 둔산로 3\n※ 교육용 가상 데이터';
    const MAGIC = enc.encode('PIEDU1'), ITER = 600000;
    lab.innerHTML = `<h2>브라우저 안에서 파일 암호화</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">오피스 문서 암호와 같은 원리예요. 입력한 암호에서 PBKDF2-SHA256(${ITER.toLocaleString()}회)으로 256비트 키를 만들고, AES-256-GCM으로 파일을 암호화해요. 파일은 서버로 전송되지 않아요.</p>
      <div class="cols">
        <div style="display:grid;gap:10px;min-width:0">
          <div class="field"><label for="fFile">파일 (선택하지 않으면 아래 예시 명단 사용)</label><input class="input" type="file" id="fFile"></div>
          <div class="field"><label for="fText">예시: 경품발송_202611.csv</label><textarea class="input" id="fText" rows="6">${esc(SAMPLE)}</textarea></div>
          <div class="field"><label for="fPw">파일 암호</label><input class="input" id="fPw" type="text" value="Gyeongpum!2026" autocomplete="off"></div>
          <div class="row"><button class="btn primary" id="fEnc" type="button">암호화</button><button class="btn" id="fDl" type="button" disabled>.enc 내려받기</button></div>
        </div>
        <div style="display:grid;gap:10px;min-width:0;align-content:start">
          <div id="fDump"><div class="out">암호화를 누르면 파일 구조가 여기에 표시돼요.</div></div>
          <div class="field"><label for="fPw2">복호화할 때 입력하는 암호</label><div class="row"><input class="input" id="fPw2" value="Gyeongpum!2026" style="flex:1" autocomplete="off"><button class="btn" id="fDec" type="button">복호화</button></div></div>
          <div class="field"><label for="fEncFile">다른 .enc 파일 열기 (선택)</label><input class="input" type="file" id="fEncFile" accept=".enc"></div>
          <div class="verdict" id="fRes" aria-live="polite">복호화 결과가 여기에 표시돼요.</div>
        </div>
      </div>`;
    let blob = null, name = '경품발송_202611.csv';
    async function input() { const f = $('#fFile').files[0]; if (f) { name = f.name; return new Uint8Array(await f.arrayBuffer()); } name = '경품발송_202611.csv'; return enc.encode($('#fText').value); }
    async function keyFrom(pw, salt) { return subtle.importKey('raw', await pbkdf2(pw, salt, ITER), 'AES-GCM', false, ['encrypt', 'decrypt']); }
    $('#fEnc').addEventListener('click', async () => {
      const btn = $('#fEnc'); btn.disabled = true; btn.textContent = '키 유도 중…';
      try {
        const data = await input(), salt = rand(16), iv = rand(12), t = performance.now(), key = await keyFrom($('#fPw').value, salt), ms = performance.now() - t;
        const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
        const it = Uint8Array.of(ITER >>> 24, ITER >>> 16 & 255, ITER >>> 8 & 255, ITER & 255);
        blob = concat(MAGIC, it, salt, iv, ct);
        $('#fDump').innerHTML = `<div style="font-size:12.5px;color:var(--muted);font-weight:600;margin-bottom:4px">${esc(name)}.enc · ${blob.length}바이트 (앞 96바이트)</div>` + hexdump(blob.slice(0, 96), [{ from: 0, to: 6, cls: 'b-hdr' }, { from: 6, to: 10, cls: 'b-hdr' }, { from: 10, to: 26, cls: 'b-mut' }, { from: 26, to: 38, cls: 'b-mut' }, { from: 38, to: 96, cls: 'b-enc' }]) +
          `<div class="legend" style="margin-top:6px"><span><i style="background:var(--ok)"></i>식별자 PIEDU1 · 반복 횟수</span><span><i style="background:var(--muted)"></i>솔트 16B · IV 12B</span><span><i style="background:var(--cipher)"></i>암호문 + 인증 태그</span></div><p style="font-size:13px;color:var(--muted);margin-top:6px">키 유도에 ${ms.toFixed(0)}ms. 공격자도 암호 하나를 시도할 때마다 이 시간을 써야 해요.</p>`;
        $('#fDl').disabled = false; $('#fRes').className = 'verdict'; $('#fRes').textContent = '암호화 완료. 복호화를 눌러 보거나 암호를 바꿔 시도해 보세요.';
      } catch (e) { $('#fRes').className = 'verdict bad'; $('#fRes').textContent = e.message; }
      btn.disabled = false; btn.textContent = '암호화';
    });
    $('#fDl').addEventListener('click', () => {
      if (!blob) return;
      try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' })); a.download = name + '.enc'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
      catch (e) { $('#fRes').className = 'verdict mid'; $('#fRes').textContent = '이 화면에서는 내려받기가 막혀 있어요. GitHub Pages로 배포한 사이트에서는 동작해요.'; }
    });
    async function decrypt(buf) {
      if (toHex(buf.slice(0, 6)) !== toHex(MAGIC)) throw new Error('이 사이트에서 만든 .enc 파일이 아니에요.');
      const iter = (buf[6] << 24 | buf[7] << 16 | buf[8] << 8 | buf[9]) >>> 0, salt = buf.slice(10, 26), iv = buf.slice(26, 38);
      const key = await subtle.importKey('raw', await pbkdf2($('#fPw2').value, salt, iter), 'AES-GCM', false, ['decrypt']);
      return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, key, buf.slice(38)));
    }
    async function runDec(buf) {
      $('#fRes').className = 'verdict'; $('#fRes').textContent = '키 유도 중…';
      try { const pt = await decrypt(buf); $('#fRes').className = 'verdict good'; $('#fRes').innerHTML = `<b class="big">복호화 성공</b><pre class="out" style="margin:6px 0 0">${esc(dec.decode(pt).slice(0, 600))}</pre>`; }
      catch (e) { $('#fRes').className = 'verdict bad'; $('#fRes').innerHTML = `<b class="big">열 수 없어요</b>${e.name === 'OperationError' ? '암호가 틀렸거나 파일이 변조되었어요. GCM 인증 태그 검증에 실패했어요.' : esc(e.message)}`; }
    }
    $('#fDec').addEventListener('click', () => { if (blob) runDec(blob); else { $('#fRes').className = 'verdict mid'; $('#fRes').textContent = '먼저 암호화하거나 .enc 파일을 선택하세요.'; } });
    $('#fEncFile').addEventListener('change', async e => { const f = e.target.files[0]; if (f) runDec(new Uint8Array(await f.arrayBuffer())); });

    $('#fileGuides').innerHTML = [
      ['엑셀 · 워드 · 파워포인트', ['[파일] → [정보] → [통합 문서 보호(문서 보호)] → [암호 설정]', '암호 입력 후 확인을 위해 한 번 더 입력하고 저장', 'Office 2010 이후 기본 문서 암호화는 AES-256 기반이에요'], '<b>시트 보호, 통합 문서 구조 보호</b>는 편집만 막을 뿐 파일 내용을 암호화하지 않아요. 반드시 “암호 설정(열기 암호)”을 쓰세요.'],
      ['한글 (한컴오피스)', ['[보안] 탭 → [문서 암호 설정]', '문서 열기 암호를 입력하고 저장', '배포 전 다른 PC에서 암호 없이 열리지 않는지 확인'], '버전에 따라 메뉴 위치가 다를 수 있어요. 문서 암호와 별도로 개인정보 항목 최소화(제12조)도 함께 적용하세요.'],
      ['압축 파일 (7-Zip · 반디집 등)', ['압축할 때 암호 설정 선택', '암호화 방식을 <b>AES-256</b>으로 지정', '7z 형식이면 “파일 이름 암호화”도 선택'], 'ZIP의 기본 방식인 <b>ZipCrypto</b>는 알려진 평문 공격에 취약해요. 반드시 AES-256을 선택하세요.'],
      ['암호 전달과 사후 관리', ['암호는 파일과 <b>다른 경로</b>(전화, 별도 메신저)로 전달', '사용 목적이 끝나면 원본·사본 모두 파기', '다운로드·외부 전송 기록 남기기(제8조②)'], '메일 본문에 첨부파일 암호를 같이 적으면 암호화 효과가 사라져요.']
    ].map(([t, steps, warn]) => `<div class="panel"><h3>${t}</h3><ol style="padding-left:1.2em;margin:10px 0;font-size:14px">${steps.map(s => `<li>${s}</li>`).join('')}</ol><div class="verdict mid" style="font-size:13px">${warn}</div></div>`).join('');
  });

})();