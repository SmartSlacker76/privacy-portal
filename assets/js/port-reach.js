/* 포트·연결 확인 — 1회성.
   결과는 이 화면 안에서만 쓰이고 저장하거나 어디로도 보내지 않는다.
   정적 사이트라 인바운드(포트포워딩) 검사는 직접 할 수 없으므로,
   ① 외부 공식 서비스로 넘기는 도우미와 ② 브라우저가 할 수 있는
   아웃바운드 도달 점검을 분리해 제공한다. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const E = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* 공개 기관·공식 자료 위주로 고정한 목적지. 임의 주소 입력을 받지 않아
     스캐너로 쓰이지 않도록 한다. 모두 HTTPS(443)만 확인한다. */
  const TARGETS = [
    { id: 'privacy', name: '개인정보 포털', host: 'www.privacy.go.kr', why: '개인정보위 자료·신고 창구' },
    { id: 'law', name: '국가법령정보센터', host: 'www.law.go.kr', why: '법령 원문 현행본' },
    { id: 'pipc', name: '개인정보보호위원회', host: 'www.pipc.go.kr', why: '고시·안내서 배포처' },
    { id: 'iana', name: 'IANA 등록부', host: 'www.iana.org', why: '포트·서비스명 공식 등록부' },
    { id: 'cve', name: 'CVE.org', host: 'www.cve.org', why: '공개 취약점 레코드' },
    { id: 'gh', name: 'GitHub', host: 'github.com', why: '이 누리집이 배포된 곳' }
  ];
  const TIMEOUT = 6000;

  const host = document.getElementById('portReach');
  if (!host) return;

  host.innerHTML =
    '<div class="reach-heading"><div><span>CHECK YOUR OWN CONNECTION</span>' +
    '<h2>포트가 열려 있나요?<span>.</span></h2></div>' +
    '<p>두 가지는 서로 다른 질문이에요. <b>밖에서 내 쪽으로 들어오는 길</b>이 열렸는지와, ' +
    '<b>내 쪽에서 밖으로 나가는 길</b>이 열렸는지. 아래에서 나눠 확인합니다. ' +
    '결과는 이 화면에서만 쓰이고 저장하거나 어디로도 보내지 않아요.</p></div>' +

    '<div class="reach-grid">' +

    /* ① 인바운드 */
    '<section class="reach-card"><div class="reach-tag in">① 들어오는 길 · 포트포워딩</div>' +
    '<h3>밖에서 내 IP의 포트가 보이나요?</h3>' +
    '<p class="reach-why">공유기에 포트포워딩을 걸었거나 서버를 열었을 때, <b>외부에서 실제로 닿는지</b>를 보는 검사예요.</p>' +
    '<div class="reach-limit"><b>여기서는 직접 검사할 수 없어요.</b> 외부에서 내 IP로 접속을 시도하려면 ' +
    '<b>우리 바깥에 서버</b>가 있어야 하는데, 이 누리집은 서버 없이 브라우저에서만 도는 정적 페이지예요. ' +
    '브라우저에서 보낸 요청은 <b>내 네트워크 안에서 출발</b>하므로 “밖에서 보이는지”를 증명하지 못합니다. ' +
    '그래서 검사는 전문 서비스로 넘깁니다.</div>' +
    '<label class="reach-field">확인할 포트 번호' +
    '<input id="reachPort" type="number" min="0" max="65535" placeholder="예: 3389" inputmode="numeric"></label>' +
    '<div class="reach-actions">' +
    '<button type="button" class="lab-button" data-open="canyouseeme">CanYouSeeMe.org 열기 ↗</button>' +
    '<button type="button" class="lab-button secondary" data-open="yougetsignal">YouGetSignal 열기 ↗</button>' +
    '</div><p id="reachCopyNote" class="reach-note" aria-live="polite"></p>' +
    '<ul class="reach-src">' +
    '<li><b>출처: CanYouSeeMe.org</b> — 접속한 사람의 공인 IP로 외부에서 TCP 연결을 시도해 열림 여부를 알려 줍니다.</li>' +
    '<li><b>출처: YouGetSignal</b> — 같은 방식의 민간 점검 도구입니다.</li>' +
    '<li>두 서비스 모두 <b>그쪽 서버에 내 IP와 포트가 전달</b>됩니다. 기관 업무망에서 쓰기 전에 내부 보안 정책을 확인하세요.</li>' +
    '</ul></section>' +

    /* ② 아웃바운드 */
    '<section class="reach-card"><div class="reach-tag out">② 나가는 길 · 아웃바운드</div>' +
    '<h3>우리 네트워크에서 밖으로 닿나요?</h3>' +
    '<p class="reach-why">기관 방화벽·프록시가 특정 목적지를 막고 있는지 <b>이 브라우저에서</b> 확인해요. 눌렀을 때 한 번만 시도합니다.</p>' +
    '<div class="reach-actions"><button type="button" id="reachRun" class="lab-button">한 번 점검하기</button>' +
    '<button type="button" id="reachClear" class="lab-button secondary">결과 지우기</button>' +
    '<span id="reachProgress" class="reach-note" aria-live="polite"></span></div>' +
    '<div class="log-scroll"><table><caption class="sr-only">목적지별 아웃바운드 연결 점검 결과</caption>' +
    '<thead><tr><th>목적지</th><th>주소 · 포트</th><th>왜 보나요?</th><th>결과</th></tr></thead>' +
    '<tbody id="reachRows"></tbody></table></div>' +
    '<ul class="reach-src">' +
    '<li><b>확인할 수 있는 것</b> — HTTPS(443)로 <b>연결이 성립했는지</b>까지입니다.</li>' +
    '<li><b>확인할 수 없는 것</b> — 실패했을 때 그 이유가 방화벽 차단인지, DNS 문제인지, 상대 서비스 장애인지는 구분하지 못해요.</li>' +
    '<li><b>443만 보는 이유</b> — 브라우저는 원시 소켓을 열 수 없고, 보안상 여러 포트로의 연결을 막습니다. ' +
    'HTTPS 페이지에서 평문 HTTP(80)로 보내는 요청도 차단돼요. 임의 주소를 입력받지 않는 것은 이 도구가 포트 스캐너로 쓰이지 않게 하기 위해서예요.</li>' +
    '<li>점검 결과는 <b>메모리에만</b> 두고 새로고침하면 사라집니다.</li>' +
    '</ul></section></div>';

  /* ── ① 인바운드 도우미 ── */
  const portInput = $('#reachPort');
  const copyNote = $('#reachCopyNote');
  const SITES = {
    canyouseeme: ['https://canyouseeme.org/', 'CanYouSeeMe.org'],
    yougetsignal: ['https://www.yougetsignal.com/tools/open-ports/', 'YouGetSignal']
  };
  host.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-open]');
    if (!btn) return;
    const [url, label] = SITES[btn.dataset.open];
    const raw = (portInput.value || '').trim();
    const n = Number(raw);
    let msg = '';
    if (raw !== '' && Number.isInteger(n) && n >= 0 && n <= 65535) {
      try {
        await navigator.clipboard.writeText(String(n));
        msg = '포트 ' + n + '번을 복사했어요. ' + label + ' 화면의 입력란에 붙여 넣고 확인하세요.';
      } catch (err) {
        msg = label + ' 화면의 입력란에 ' + n + '번을 입력하세요. (복사 권한이 없어 자동 복사는 하지 못했어요)';
      }
    } else {
      msg = label + ' 화면에서 확인할 포트 번호를 입력하세요. 두 서비스는 접속한 사람의 공인 IP를 자동으로 인식해요.';
    }
    copyNote.textContent = msg;
    window.open(url, '_blank', 'noopener');
  });

  /* ── ② 아웃바운드 점검 ── */
  const rows = $('#reachRows');
  const progress = $('#reachProgress');

  function paint(results) {
    rows.innerHTML = TARGETS.map((t) => {
      const r = results[t.id];
      const cls = r ? r.cls : 'idle';
      const label = r ? r.label : '점검 전';
      return '<tr><td><b>' + E(t.name) + '</b></td>' +
        '<td><span class="badge">HTTPS</span> ' + E(t.host) + ' · 443</td>' +
        '<td>' + E(t.why) + '</td>' +
        '<td><span class="reach-state ' + cls + '">' + E(label) + '</span></td></tr>';
    }).join('');
  }
  paint({});

  function probe(t) {
    /* no-cors 요청은 내용이 아니라 "연결이 됐는가"만 알려준다. 캐시는 쓰지 않는다. */
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT);
    const url = 'https://' + t.host + '/favicon.ico?reach=' + Date.now();
    return fetch(url, { mode: 'no-cors', cache: 'no-store', redirect: 'follow', signal: ctl.signal })
      .then(() => ({ cls: 'ok', label: '닿음' }))
      .catch(() => ({ cls: 'ng', label: '닿지 않음 · 원인 미상' }))
      .finally(() => clearTimeout(timer));
  }

  $('#reachRun').addEventListener('click', async () => {
    const results = {};
    TARGETS.forEach((t) => { results[t.id] = { cls: 'busy', label: '확인 중…' }; });
    paint(results);
    progress.textContent = '점검 중 — 최대 ' + (TIMEOUT / 1000) + '초';
    const done = await Promise.all(TARGETS.map((t) => probe(t).then((r) => [t.id, r])));
    done.forEach(([id, r]) => { results[id] = r; });
    paint(results);
    const ok = done.filter(([, r]) => r.cls === 'ok').length;
    progress.textContent = '끝났어요 — ' + ok + ' / ' + TARGETS.length + '곳에 닿았습니다. 닿지 않은 곳의 원인은 이 검사로 알 수 없어요.';
  });

  $('#reachClear').addEventListener('click', () => {
    paint({});
    progress.textContent = '결과를 지웠어요.';
  });
})();
