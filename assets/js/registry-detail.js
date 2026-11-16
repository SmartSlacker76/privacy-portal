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
        '<span class="rd-scope">범위 레코드 ' + E(r[0]) + '</span>';
      return '<div class="rd-rec"><b>' + E(name) + '</b>' + scope + why(r) + '</div>';
    }).join('');
    const un = note && note.unofficial && note.unofficial[tp];
    const ab = note && note.abuse && note.abuse[tp];
    return '<article class="rd-card"><div class="rd-tp ' + tp + '">' + tp.toUpperCase() + '</div>' +
      '<div class="rd-sec"><h4>IANA 등록 정보</h4>' + (rows || '<p class="rd-none">이 전송에는 등록 레코드가 없어요.</p>') + '</div>' +
      (un ? '<div class="rd-sec"><h4>실제로 쓰이는 곳 <span>등록부 밖</span></h4><ul>' +
        un.map((x) => '<li>' + x + '</li>').join('') + '</ul></div>' : '') +
      (ab ? '<div class="rd-sec rd-abuse"><h4>이 포트를 쓰는 것으로 보고된 악성코드</h4>' +
        '<p class="rd-chips">' + ab.map((x) => '<span>' + E(x) + '</span>').join('') + '</p>' +
        '<p class="rd-caveat">이름이 올라 있다는 것은 <b>과거 그렇게 쓰인 보고가 있다</b>는 뜻이에요. ' +
        '이 포트가 열려 있다고 해서 감염을 뜻하지는 않습니다.</p></div>' : '') +
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
      '<div class="rd-head"><div><span class="lesson-category">기초 · 상세 시나리오 밖 · 등록부 조회</span>' +
      '<h2>포트 ' + n + '</h2>' +
      '<p>' + (note ? note.headline :
        '이 번호는 학습용 100개 시나리오에 없어요. 아래는 공식 등록부에 남아 있는 내용과 범위 규칙입니다.') + '</p></div>' +
      '<div class="port-badge"><small>PORT NUMBER</small><b>' + n + '</b>' +
      '<span>' + (tps.length ? tps.map((t) => t.toUpperCase()).join(' · ') : '등록 없음') + '</span></div></div>' +

      (range ? '<div class="rd-range"><b>' + E(range.label) + '</b><p>' + range.note + '</p></div>' : '') +

      '<div class="rd-grid">' +
      (tps.length ? tps.map((tp) => transportCard(tp, recs[tp], note)).join('')
        : '<article class="rd-card"><div class="rd-sec"><h4>IANA 등록 정보</h4>' +
          '<p class="rd-none">TCP·UDP 어느 쪽에도 개별 등록이 없어요. 미할당이거나 예약된 번호일 수 있습니다.</p></div></article>') +
      '</div>' +

      (note && note.cases ? '<div class="rd-cases"><h4>알려진 악용 사례</h4>' +
        note.cases.map((c) => '<div class="rd-case"><b>' + E(c.name) + '</b><p>' + c.text + '</p>' +
          (c.ref ? '<span class="rd-ref">참고문헌 ' + E(c.ref) + '</span>' : '') + '</div>').join('') + '</div>' : '') +

      (note && note.watch ? '<div class="rd-watch"><h4>담당자가 볼 지점</h4><ul>' +
        note.watch.map((w) => '<li>' + w + '</li>').join('') + '</ul></div>' : '') +

      '<div class="rd-sources"><h4>출처</h4><ul>' +
      (note && note.sources ? note.sources.map((s) =>
        '<li><a href="' + s[1] + '" target="_blank" rel="noopener">' + E(s[0]) + ' ↗</a><span>' + E(s[2]) + '</span></li>').join('')
        : '<li><a href="https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=' + enc +
          '" target="_blank" rel="noopener">IANA 등록부에서 ' + n + '번 보기 ↗</a><span>포트 번호와 등록 서비스명의 공식 등록부</span></li>' +
          '<li><a href="https://www.speedguide.net/port.php?port=' + enc +
          '" target="_blank" rel="noopener">SpeedGuide에서 ' + n + '번 보기 ↗</a><span>비공식 사용처와 이 포트를 쓰는 악성코드 목록. 민간 자료라 교차 확인이 필요해요</span></li>' +
          '<li><a href="https://www.cve.org/CVERecord/SearchResults?query=' + enc +
          '" target="_blank" rel="noopener">CVE.org에서 ' + n + ' 검색 ↗</a><span>공개 취약점 레코드. 포트가 열렸다는 사실만으로 해당 CVE에 해당하지는 않아요</span></li>') +
      '</ul>' +
      (note ? '' : '<p class="rd-caveat">이 번호의 비공식 사용처·악성코드 정보는 아직 이 누리집에 정리되어 있지 않아요. ' +
        '위 출처에서 확인하시고, 자주 보는 번호라면 알려 주시면 근거와 함께 정리해 둘게요.</p>') +
      '</div>' +

      '<button type="button" id="rdBack" class="lab-button secondary">← 시뮬레이터로 돌아가기</button>';

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
