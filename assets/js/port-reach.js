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
    '<p>“포트가 열렸다”는 말은 <b>두 가지 뜻</b>으로 쓰여요. 하나는 <b>바깥에서 우리 집 문으로 들어올 수 있나</b>, ' +
    '다른 하나는 <b>우리가 밖으로 나갈 수 있나</b>. 전혀 다른 질문이라 아래에서 나눠 봅니다. ' +
    '확인한 내용은 이 화면에서만 쓰고 어디에도 저장하거나 보내지 않아요.</p></div>' +

    '<div class="reach-grid">' +

    /* ① 인바운드 */
    '<section class="reach-card"><div class="reach-tag in">① 밖에서 들어오는 길</div>' +
    '<h3>밖에서 우리 집 문이 보이나요?</h3>' +
    '<p class="reach-why">공유기에서 “이 번호로 들어오면 안쪽 컴퓨터로 보내 줘”라고 설정해 두었을 때(포트포워딩), ' +
    '<b>정말 밖에서 들어올 수 있는지</b> 확인하는 검사예요.</p>' +
    '<div class="reach-limit"><b>이 검사는 여기서 할 수 없어요.</b> 문을 밖에서 두드려 보려면 ' +
    '<b>밖에 있는 누군가</b>가 필요한데, 이 누리집은 여러분 브라우저 안에서만 도는 페이지라 바깥에 사람을 둘 수 없어요. ' +
    '내 컴퓨터에서 두드리는 건 <b>집 안에서 문을 두드려 보는 것</b>과 같아서, 밖에서 열리는지는 알 수 없습니다. ' +
    '그래서 이 검사만은 전문 서비스에 맡깁니다.</div>' +
    '<label class="reach-field">확인할 포트 번호' +
    '<input id="reachPort" type="number" min="0" max="65535" placeholder="예: 3389" inputmode="numeric"></label>' +
    '<div class="reach-actions">' +
    '<button type="button" class="lab-button" data-open="canyouseeme">CanYouSeeMe.org 열기 ↗</button>' +
    '<button type="button" class="lab-button secondary" data-open="yougetsignal">YouGetSignal 열기 ↗</button>' +
    '</div><p id="reachCopyNote" class="reach-note" aria-live="polite"></p>' +
    '<ul class="reach-src">' +
    '<li><b>CanYouSeeMe.org</b> — 그쪽 서버가 <b>밖에서 내 주소로 직접 두드려 보고</b> 열렸는지 알려 줘요.</li>' +
    '<li><b>YouGetSignal</b> — 같은 방식으로 확인해 주는 다른 도구예요.</li>' +
    '<li>두 곳 모두 <b>내 인터넷 주소와 포트 번호가 그 회사 서버에 전달</b>돼요. 기관 업무망에서 쓰기 전에 내부 보안 규정을 먼저 확인하세요.</li>' +
    '</ul></section>' +

    /* ② 아웃바운드 */
    '<section class="reach-card"><div class="reach-tag out">② 밖으로 나가는 길</div>' +
    '<h3>우리 쪽에서 밖으로 나갈 수 있나요?</h3>' +
    '<p class="reach-why">기관의 보안 장비가 <b>어떤 사이트로 나가는 길을 막아 두었는지</b> 지금 이 브라우저에서 확인해요. ' +
    '버튼을 누를 때 딱 한 번만 두드려 봅니다.</p>' +
    '<div class="reach-actions"><button type="button" id="reachRun" class="lab-button">한 번 점검하기</button>' +
    '<button type="button" id="reachClear" class="lab-button secondary">결과 지우기</button>' +
    '<span id="reachProgress" class="reach-note" aria-live="polite"></span></div>' +
    '<div class="log-scroll"><table><caption class="sr-only">사이트별 연결 확인 결과</caption>' +
    '<thead><tr><th>목적지</th><th>주소 · 포트</th><th>왜 확인하나요?</th><th>결과</th></tr></thead>' +
    '<tbody id="reachRows"></tbody></table></div>' +
    '<ul class="reach-src">' +
    '<li><b>알 수 있는 것</b> — 그 사이트에 <b>닿았는지 아닌지</b>까지예요.</li>' +
    '<li><b>알 수 없는 것</b> — 닿지 않았을 때 <b>왜 그런지</b>는 모릅니다. 보안 장비가 막은 것인지, 주소를 못 찾은 것인지, 상대 사이트가 잠시 멈춘 것인지 구분되지 않아요.</li>' +
    '<li><b>왜 443번만 보나요?</b> — 브라우저는 안전을 위해 아무 번호로나 연결하지 못하게 막혀 있어요. ' +
    '그래서 웹에서 쓰는 443번(자물쇠가 붙은 https)만 확인할 수 있습니다. ' +
    '주소를 직접 입력받지 않는 것은, 이 도구가 <b>남의 서버를 몰래 훑어보는 용도</b>로 쓰이지 않게 하기 위해서예요.</li>' +
    '<li>확인한 결과는 <b>이 화면에만</b> 잠깐 떠 있고, 새로고침하면 사라져요.</li>' +
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
      .catch(() => ({ cls: 'ng', label: '닿지 않음' }))
      .finally(() => clearTimeout(timer));
  }

  $('#reachRun').addEventListener('click', async () => {
    const results = {};
    TARGETS.forEach((t) => { results[t.id] = { cls: 'busy', label: '확인 중…' }; });
    paint(results);
    progress.textContent = '확인 중 — 길어도 ' + (TIMEOUT / 1000) + '초면 끝나요';
    const done = await Promise.all(TARGETS.map((t) => probe(t).then((r) => [t.id, r])));
    done.forEach(([id, r]) => { results[id] = r; });
    paint(results);
    const ok = done.filter(([, r]) => r.cls === 'ok').length;
    progress.textContent = '끝났어요 — ' + TARGETS.length + '곳 중 ' + ok + '곳에 닿았어요. 닿지 않은 곳이 왜 그런지는 이 검사로 알 수 없습니다.';
  });

  $('#reachClear').addEventListener('click', () => {
    paint({});
    progress.textContent = '결과를 지웠어요.';
  });
})();
