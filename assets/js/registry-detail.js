/* 검색한 포트를 가운데 패널에 전송(TCP/UDP)별로 펼쳐 보여준다.
   100개 시나리오에 없는 번호도 IANA 등록 정보·범위 설명·보충 메모로 설명하고,
   그 밖의 내용은 공식 출처 링크로 넘긴다. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const E = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const center = $('.lab-center');
  if (!center || !window.PORT_REGISTRY || !window.PORT_NOTES) return;

  const box = document.createElement('section');
  box.id = 'registryDetail';
  box.className = 'registry-detail';
  box.hidden = true;
  center.insertBefore(box, center.firstChild);

  const simParts = () => [...center.children].filter((el) => el !== box);
  function showSim(on) { simParts().forEach((el) => { el.hidden = !on; }); }

  function within(n, range) {
    const [a, b] = String(range).split('-').map(Number);
    return Number.isFinite(b) ? (n >= a && n <= b) : n === a;
  }

  /* 같은 번호를 덮는 레코드를 전송별로 모은다 (단일 번호 우선, 없으면 범위 레코드) */
  function recordsFor(n) {
    const all = window.PORT_REGISTRY.filter((r) => within(n, r[0]));
    const out = {};
    ['tcp', 'udp', 'sctp', 'dccp'].forEach((tp) => {
      const hits = all.filter((r) => r[1] === tp);
      const exact = hits.filter((r) => r[0] === String(n));
      const pick = exact.length ? exact : hits;
      if (pick.length) out[tp] = pick;
    });
    return out;
  }

  function transportCard(tp, recs, note) {
    const rows = recs.map((r) => {
      const name = r[2] || (/reserved/i.test(r[3]) ? 'Reserved' : '등록명 없음');
      const scope = r[0] === String(current) ? '' :
        '<span class="rd-scope">' + E(r[0]) + '번 묶음에 포함</span>';
      return '<div class="rd-rec"><b>' + E(name) + '</b>' + scope + why(r) + '</div>';
    }).join('');
    const un = note && note.unofficial && note.unofficial[tp];
    const ab = note && note.abuse && note.abuse[tp];
    return '<article class="rd-card"><div class="rd-tp ' + tp + '">' + tp.toUpperCase() + '</div>' +
      '<p class="rd-plain">' + (tp === 'tcp'
        ? '<b>TCP</b> — 전화처럼 <b>먼저 연결하고</b> 주고받는 방식이에요. 빠진 내용이 있으면 다시 보내 달라고 합니다.'
        : tp === 'udp'
          ? '<b>UDP</b> — 엽서처럼 <b>연결 없이 그냥 보내는</b> 방식이에요. 빨리 보내는 대신 도착을 보장하지 않습니다.'
          : '<b>' + tp.toUpperCase() + '</b> — 덜 쓰이는 전송 방식이에요.') + '</p>' +
      '<div class="rd-sec"><h4>등록부에 적힌 이름 <span class="rd-hint">공식 명부</span></h4>' + (rows || '<p class="rd-none">이 방식으로는 등록된 이름이 없어요.</p>') + '</div>' +
      (un ? '<div class="rd-sec"><h4>실제로는 이렇게 쓰여요 <span class="rd-hint">명부에 없는 쓰임</span></h4><ul>' +
        un.map((x) => '<li>' + x + '</li>').join('') + '</ul></div>' : '') +
      (ab ? '<div class="rd-sec rd-abuse"><h4>이 번호를 쓴 적 있는 나쁜 프로그램</h4>' +
        '<p class="rd-chips">' + ab.map((x) => '<span>' + E(x) + '</span>').join('') + '</p>' +
        '<p class="rd-caveat">여기 이름이 있다는 건 <b>예전에 이 번호를 쓴 적이 있다고 보고됐다</b>는 뜻일 뿐이에요. ' +
        '이 번호가 열려 있다고 해서 우리 컴퓨터가 감염됐다는 말은 아닙니다.</p></div>' : '') +
      '</article>';
  }
  function why(r) {
    const d = r[3] ? '<p>' + E(r[3]) + '</p>' : '';
    const ref = r[4] ? '<span class="rd-ref">' + E(r[4]) + '</span>' : '';
    return d + ref;
  }

  let current = null;

  function render(n) {
    current = n;
    const recs = recordsFor(n);
    const note = window.PORT_NOTES.noteOf(n);
    const range = window.PORT_NOTES.rangeOf(n);
    const tps = Object.keys(recs);
    const enc = encodeURIComponent(String(n));

    box.innerHTML =
      '<div class="rd-head"><div><span class="lesson-category">학습 목록에 없는 번호 · 등록부에서 찾아봤어요</span>' +
      '<h2>포트 ' + n + '</h2>' +
      '<p>' + (note ? note.headline :
        '이 번호는 학습용 100개 목록에 없어요. 대신 <b>세계 공통 명부(IANA)</b>에 적힌 내용과, ' +
        '이 번호가 속한 구간의 성격을 정리했어요.') + '</p></div>' +
      '<div class="port-badge"><small>포트 번호</small><b>' + n + '</b>' +
      '<span>' + (tps.length ? tps.map((t) => t.toUpperCase()).join(' · ') : '등록된 이름 없음') + '</span></div></div>' +

      (range ? '<div class="rd-range"><b>' + E(range.label) + '</b><p>' + range.note + '</p></div>' : '') +

      '<div class="rd-grid">' +
      (tps.length ? tps.map((tp) => transportCard(tp, recs[tp], note)).join('')
        : '<article class="rd-card"><div class="rd-sec"><h4>IANA 등록 정보</h4>' +
          '<p class="rd-none">TCP로도 UDP로도 등록된 이름이 없어요. 아직 아무에게도 주지 않았거나, 쓰지 않기로 비워 둔 번호일 수 있어요.</p></div></article>') +
      '</div>' +

      (note && note.cases ? '<div class="rd-cases"><h4>실제로 있었던 일</h4>' +
        note.cases.map((c) => '<div class="rd-case"><b>' + E(c.name) + '</b><p>' + c.text + '</p>' +
          (c.ref ? '<span class="rd-ref">자료 번호 ' + E(c.ref) + '</span>' : '') + '</div>').join('') + '</div>' : '') +

      (note && note.watch ? '<div class="rd-watch"><h4>담당자가 확인할 것</h4><ul>' +
        note.watch.map((w) => '<li>' + w + '</li>').join('') + '</ul></div>' : '') +

      '<div class="rd-sources"><h4>출처</h4><ul>' +
      (note && note.sources ? note.sources.map((s) =>
        '<li><a href="' + s[1] + '" target="_blank" rel="noopener">' + E(s[0]) + ' ↗</a><span>' + E(s[2]) + '</span></li>').join('')
        : '<li><a href="https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=' + enc +
          '" target="_blank" rel="noopener">IANA 명부에서 ' + n + '번 보기 ↗</a><span>번호와 이름을 공식으로 관리하는 곳이에요</span></li>' +
          '<li><a href="https://www.speedguide.net/port.php?port=' + enc +
          '" target="_blank" rel="noopener">SpeedGuide에서 ' + n + '번 보기 ↗</a><span>명부 밖의 실제 쓰임과 나쁜 프로그램 목록이 모여 있어요. 민간이 만든 자료라 다른 곳과 한 번 더 맞춰 보세요</span></li>' +
          '<li><a href="https://www.cve.org/CVERecord/SearchResults?query=' + enc +
          '" target="_blank" rel="noopener">CVE.org에서 ' + n + ' 검색 ↗</a><span>공개된 보안 약점 기록이에요. 번호가 열려 있다고 해서 그 약점이 우리 것이라는 뜻은 아니에요</span></li>') +
      '</ul>' +
      (note ? '' : '<p class="rd-caveat">이 번호가 실제로 어디에 쓰이는지, 나쁜 프로그램이 쓴 적은 있는지는 아직 여기에 정리해 두지 않았어요. ' +
        '위 세 곳에서 확인해 보시고, 자주 보는 번호라면 알려 주세요. 근거를 확인해 여기에 적어 둘게요.</p>') +
      '</div>' +

      '<button type="button" id="rdBack" class="lab-button secondary">← 패킷 따라가기로 돌아가기</button>';

    box.hidden = false;
    showSim(false);
    $('#rdBack').addEventListener('click', close);
  }

  function close() {
    box.hidden = true;
    box.innerHTML = '';
    current = null;
    showSim(true);
  }

  /* 100개 시나리오에 있는 번호인가 */
  function hasScenario(n) {
    const L = window.NETWORK_LESSONS || [];
    return L.some((l) => Number(l.port) === n ||
      (l.variants || []).some((v) => Number(v.port) === n));
  }

  function onSearch() {
    const q = ($('#portSearch').value || '').trim();
    if (!/^\d+$/.test(q)) { if (!box.hidden) close(); return; }
    const n = Number(q);
    if (n < 0 || n > 65535) { if (!box.hidden) close(); return; }
    if (hasScenario(n)) { if (!box.hidden) close(); return; }
    render(n);
  }

  $('#portSearch').addEventListener('input', onSearch);
  /* 시나리오 카드를 고르면 시뮬레이터로 돌아간다 */
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-port]') && !box.hidden) close();
  });
})();
