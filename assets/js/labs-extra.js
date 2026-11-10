/* 추가 레슨: 개인정보 처리 위수탁 / 홈페이지 개인정보 노출 / 실제 사고에서 배우기 / 사이버 복원력
   근거: 개인정보 보호법 §26·§29, 안전성 확보조치 기준 §6, 보안뉴스(바이낸스 63억달러·전용기 명단 유출) */
(function () {
  'use strict';
  const { $, $$, esc, FlowPlayer, seg, onLesson } = window.PI;

  /* ================= 위수탁 ================= */
  onLesson('consign', () => {
    const j = $('#consignJudge');
    const CASES = [
      ['우리 쇼핑몰의 배송을 택배사에 맡긴다', 'wi', '위탁: 우리 업무(배송)를 대신 처리하게 하는 것이에요.'],
      ['제휴 보험사가 자기 마케팅에 쓰려고 회원정보를 받아간다', 'je', '제3자 제공: 받는 자가 자기 목적으로 사용해요. 받는 자·목적·항목·기간·거부권을 알리고 별도 동의가 필요해요.'],
      ['고객 상담(콜센터)을 외주 업체에 맡긴다', 'wi', '위탁: 우리 업무를 대신 수행해요.'],
      ['급여 이체를 위해 은행에 직원 계좌정보를 전달한다', 'wi', '위탁(또는 법령상 처리): 우리 업무(급여지급) 수행을 위한 처리예요.'],
      ['이벤트 경품을 위해 명단을 협력사에 넘겨 협력사가 자체 광고에 활용한다', 'je', '제3자 제공: 협력사가 자기 목적(광고)으로 써요.']
    ];
    let i = 0, sc = 0;
    function draw() {
      if (i >= CASES.length) { j.innerHTML = `<div class="verdict good"><b class="big">판별 완료 · ${sc}/${CASES.length}</b>핵심은 “<b>누구의 목적</b>으로 처리하느냐”이에요. 우리 업무를 대신하면 <b>위탁</b>, 받는 자가 자기 목적으로 쓰면 <b>제3자 제공</b>이에요.</div><button class="btn" id="cjReset" type="button">다시</button>`; $('#cjReset').onclick = () => { i = 0; sc = 0; draw(); }; return; }
      const [q, ans, why] = CASES[i];
      j.innerHTML = `<h2 style="margin:0 0 4px">위탁일까, 제3자 제공일까?</h2><p style="color:var(--muted);font-size:13.5px;margin:0 0 12px">${i + 1} / ${CASES.length}</p>
        <div class="consign-case">${esc(q)}</div>
        <div class="row" style="margin-top:12px"><button class="btn" data-v="wi" type="button">업무 위탁</button><button class="btn" data-v="je" type="button">제3자 제공</button></div>
        <div id="cjFb"></div>`;
      j.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
        const ok = b.dataset.v === ans; if (ok) sc++;
        $('#cjFb').innerHTML = `<div class="verdict ${ok ? 'good' : 'bad'}" style="margin-top:10px"><b>${ok ? '정답' : '오답'}</b> — ${esc(why)}</div><button class="btn primary" id="cjNext" type="button" style="margin-top:8px">다음 ▶</button>`;
        $('#cjNext').onclick = () => { i++; draw(); };
      });
    }
    draw();

    const nodes = [{ id: 'own', label: '위탁자', sub: '우리 기관', x: 24, y: 110, w: 140 }, { id: 'sub', label: '수탁자', x: 300, y: 110, w: 140, sub: '외주 업체' }, { id: 're', label: '재수탁자', sub: '2차 위탁', x: 560, y: 40, w: 130 }, { id: 'subj', label: '정보주체', sub: '고객', x: 560, y: 190, w: 130 }];
    const steps = [
      { from: 'own', to: 'sub', pkt: '위탁계약', state: 'ok', title: '문서로 위탁', law: ['법 제26조'], html: '<p>위탁 업무의 목적·범위, 재위탁 제한, 안전조치, 목적 외 처리 금지, 관리·감독, 손해배상 등을 <b>문서로</b> 정해요.</p>', fields: [['계약서', '안전조치·재위탁 제한 포함', 'ok'], ['처리방침', '위탁 업무·수탁자 공개', 'ok']], inspectorTitle: '위탁 시 할 일' },
      { from: 'own', to: 'subj', pkt: '공개', state: 'ok', title: '처리방침에 공개', law: ['법 제26조②'], html: '<p>위탁하는 업무 내용과 수탁자를 개인정보 처리방침에 공개해요. 홍보·마케팅 위탁은 정보주체에게 알려요.</p>', fields: [['공개', '수탁자명·위탁 업무', 'ok']] },
      { from: 'own', to: 'sub', pkt: '교육·감독', state: 'ok', title: '수탁자 교육·감독', law: ['법 제26조④', '고시 제4조①16호'], html: '<p>수탁자가 안전조치를 지키는지 교육하고 정기적으로 점검·감독해요. 내부 관리계획에 수탁자 관리를 포함해요.</p>', fields: [['점검', '연 1회 이상 현장 점검(예시)', 'ok']] },
      { from: 'sub', to: 're', pkt: '재위탁', state: 'warn', title: '재위탁은 동의 필요', law: ['법 제26조⑥'], html: '<p>수탁자가 다시 다른 업체에 재위탁하려면 <b>위탁자의 동의</b>를 받아야 해요. 몰래 재위탁하면 통제 밖으로 벗어나요.</p>', fields: [['조건', '위탁자 동의 후 가능', 'warn']] },
      { from: 'sub', to: 'subj', pkt: '유출', state: 'plain', danger: true, title: '수탁자 유출 = 위탁자도 책임', law: ['법 제26조⑦'], html: '<p>수탁자가 유출 사고를 내면, 손해배상 등에서 수탁자를 <b>소속 직원처럼</b> 봐요. “맡겼으니 끝”이 아니라 관리·감독까지가 위탁자의 의무예요.</p>', fields: [['책임', '위탁자에게 관리·감독 책임', 'plain']], inspectorTitle: '사고 시' }
    ];
    new FlowPlayer($('#consignFlow'), { title: '개인정보 처리 위수탁', nodes, steps, W: 720, H: 270 });
  });

  /* ================= 홈페이지 개인정보 노출 ================= */
  onLesson('webexposure', () => {
    const el = $('#exposeLab');
    const DORKS = [
      ['site:ourcity.go.kr filetype:xls 주민번호', [['민원인명부_2026.xls', '이름·주민등록번호 320건', true], ['통계_방문자수.xls', '개인정보 없음', false]], '게시판에 올린 엑셀 첨부파일이 검색엔진에 수집됐어요. 주민등록번호가 포함된 파일이 그대로 노출돼요.'],
      ['site:ourcity.go.kr "비밀번호" ext:txt', [['config_backup.txt', 'DB 접속 비밀번호 평문', true]], '설정·백업 파일이 웹 경로에 방치돼 검색에 노출됐어요.'],
      ['intitle:"index of" /upload', [['/upload/ 디렉터리 목록', '업로드 파일 전체 열람 가능', true]], '디렉터리 리스팅이 켜져 있어 업로드 폴더의 모든 파일이 보여요.'],
      ['구글 폼 결과 "응답 보기" 공개 링크', [['설문응답시트', '응답자 이름·연락처 공개', true]], '결과 페이지를 ‘링크가 있는 모든 사용자 공개’로 잘못 설정했어요.']
    ];
    el.innerHTML = `<h2>검색엔진에 내 기관 개인정보가?</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">공격자는 검색 연산자(구글 도크)로 노출된 파일을 찾아요. 아래 검색을 눌러 무엇이 노출되는지 보세요. (교육용 시뮬레이션)</p>
      <div class="browser"><div class="bar"><span class="dots"><i></i><i></i><i></i></span><input id="exInput" readonly value="${esc(DORKS[0][0])}" aria-label="검색어"></div>
        <div class="view"><div class="row" id="exBtns" style="flex-wrap:wrap">${DORKS.map((d, i) => `<button class="btn mono" data-i="${i}" type="button" style="font-size:11.5px">${esc(d[0].slice(0, 28))}…</button>`).join('')}</div><div id="exResult" style="margin-top:12px"></div></div></div>
      <div id="exAction" style="margin-top:12px"></div>`;
    function run(i) {
      const [q, rows, why] = DORKS[i]; $('#exInput').value = q;
      $('#exResult').innerHTML = `<div class="table-wrap"><table><thead><tr><th>검색 결과</th><th>내용</th></tr></thead><tbody>${rows.map(r => `<tr><td class="mono">${esc(r[0])}</td><td class="${r[2] ? 'tag-plain' : ''}">${esc(r[1])}${r[2] ? ' ⚠' : ''}</td></tr>`).join('')}</tbody></table></div>`;
      $('#exAction').innerHTML = `<div class="verdict bad"><b class="big">개인정보 노출</b>${esc(why)}</div>
        <div class="panel" style="background:var(--surface-2);margin-top:10px"><h3>즉시 조치 (고시 제6조③)</h3><ul class="checklist">
          <li>노출 파일·게시물을 <b>삭제</b>하고, 접근 권한을 바로잡아요</li>
          <li>검색엔진에 남은 <b>캐시·검색결과 삭제</b>를 요청해요(네이버·구글 삭제 요청)</li>
          <li>디렉터리 리스팅 끄기, 업로드 폴더를 웹 루트 밖으로</li>
          <li>결과 페이지·공유 링크의 <b>공개설정을 ‘제한’</b>으로</li>
          <li>정기적으로 자사 도메인을 검색 점검(site:·filetype:), 노출 모니터링</li>
          <li>유출에 해당하면 72시간 내 통지·신고(법 제34조)</li>
        </ul></div>`;
    }
    $('#exBtns').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
    run(0);
  });

  /* ================= 실제 사고에서 배우기 ================= */
  onLesson('incidents', () => {
    const el = $('#incidentLab');
    const CASES = [
      {
        tag: '2026 · 가상자산 거래소', title: '면접 과제에서 시작된 63억 달러 도난', loss: '약 63.4억 달러',
        timeline: [['6월', '엔지니어가 AI 코딩 도구를 설치하려다 악성코드 감염 (기기 교체했으나 정보는 이미 유출)'], ['9월', '다른 엔지니어가 가짜 채용 면접의 ‘과제 저장소’를 내려받다 기기 장악 — 단말 보안 우회'], ['10월 20일', '추가 기기 2대 접근'], ['10월 29일', '지갑 관리 도구 도달 → 탈취 계정으로 자금 인출 (첫 4억 달러)']],
        lessons: ['채용 과제·개발도구도 공격 경로 — 출처 불명 코드 실행 금지', '엔드포인트 보안만으로는 부족 (악성코드가 우회)', '대규모 처리·이체에 최소 권한과 다단계 승인', '권한 회수·격리 절차를 사고 전에 미리 마련(플레이북)', 'AI 기반 이상행위 탐지 확대'],
        maps: [['프롬프트 인젝션', '#prompt-inject'], ['접근 권한 관리', '#safeguards'], ['사이버 복원력', '#resilience']]
      },
      {
        tag: '2026 · 공공·문서 유출', title: '전용기 탑승자 168명 명단 유출', loss: '여권번호 등 168명',
        timeline: [['6월 2일', '탑승자 명단 엑셀이 악성코드 분석 사이트(바이러스토탈)에 게시됨'], ['노출 상태', '생년월일·영문성명·여권번호·만료일이 보호 없이 공개, 누구나 열람·다운로드'], ['약 5개월', '아무도 노출을 인지하지 못함'], ['뒤늦게', '경찰 수사 의뢰 — 정보가 누구에게 넘어갔는지 파악 곤란']],
        lessons: ['기밀·개인정보 문서를 외부 공개 공간(분석 사이트·클라우드)에 올리지 않기', '고유식별정보(여권번호 등)는 반드시 암호화·접근통제', '상시 노출 모니터링 — 5개월 방치는 탐지 공백', '문서 작성·공유·폐기 전 과정에 제로트러스트 암호화·접근통제', '유통 경로 추적이 안 되면 피해 범위 산정 불가'],
        maps: [['홈페이지·문서 노출', '#webexposure'], ['암호화 대상 판별', '#encrypt-map'], ['접속기록·탐지', '#access-log']]
      }
    ];
    el.innerHTML = CASES.map((c, i) => `<div class="panel incident">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h2 style="margin:0">${esc(c.title)}</h2><span class="chip plain">${esc(c.loss)}</span></div>
      <span class="chip" style="margin-top:6px">${esc(c.tag)}</span>
      <div class="timeline">${c.timeline.map(t => `<div class="tl-row"><span class="tl-when">${esc(t[0])}</span><span class="tl-what">${esc(t[1])}</span></div>`).join('')}</div>
      <div class="cols" style="margin-top:10px"><div class="panel" style="background:var(--ok-soft)"><h3>교훈</h3><ul class="checklist" style="margin-top:8px">${c.lessons.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>
      <div class="panel" style="background:var(--surface-2)"><h3>이 사이트에서 연습</h3><div class="row" style="margin-top:8px;flex-wrap:wrap">${c.maps.map(m => `<a class="btn" style="text-decoration:none;font-size:12.5px" href="${m[1]}">${esc(m[0])} →</a>`).join('')}</div></div></div>
    </div>`).join('');
  });

  /* ================= 사이버 복원력 ================= */
  onLesson('resilience', () => {
    const nodes = [{ id: 'id', label: '식별', sub: 'Identify', x: 20, y: 110, w: 120 }, { id: 'pr', label: '보호', sub: 'Protect', x: 175, y: 110, w: 120 }, { id: 'de', label: '탐지', sub: 'Detect', x: 330, y: 110, w: 120 }, { id: 're', label: '대응', sub: 'Respond', x: 485, y: 110, w: 120 }, { id: 'rc', label: '복구', sub: 'Recover', x: 640, y: 110, w: 120 }];
    const steps = [
      { from: 'id', to: 'id', pkt: '자산 파악', state: 'ok', title: '식별 — 무엇을 지킬지 안다', law: [], html: '<p>어떤 개인정보·시스템을 보유하는지, 어디에 있고 누가 접근하는지 목록화해요. 위험을 분석해요(고시 제4조①15호).</p>', fields: [['산출', '정보자산 목록, 위험 분석', 'ok']] },
      { from: 'id', to: 'pr', pkt: '보호조치', state: 'ok', title: '보호 — 사고를 어렵게 만든다', law: ['고시 제5~12조'], html: '<p>접근통제, 암호화, 백업, 교육 등 안전조치로 공격을 막아요. 완벽한 차단은 불가능하다는 전제가 복원력의 출발이에요.</p>', fields: [['핵심', '최소권한·암호화·백업 3-2-1', 'ok']] },
      { from: 'pr', to: 'de', pkt: '이상 탐지', state: 'warn', title: '탐지 — 빨리 알아챈다', law: ['고시 제8조'], html: '<p>접속기록·로그를 분석해 이상 행위를 조기에 발견해요. 전용기 사례의 “5개월 방치”는 탐지 공백이 키운 피해예요.</p>', fields: [['수단', '접속기록 점검, 이상행위 탐지', 'warn']] },
      { from: 'de', to: 're', pkt: '대응 플레이북', state: 'warn', title: '대응 — 미리 정한 대로 움직인다', law: ['법 제34조'], html: '<p>사고 대응 계획(플레이북)과 권한 회수·격리 절차를 <b>미리</b> 마련해요. 바이낸스 사례는 절차를 사고 중에 급조해 대응이 지연됐어요.</p>', fields: [['준비', '대응팀·격리·권한회수 절차', 'warn'], ['통지·신고', '72시간 내']] },
      { from: 're', to: 'rc', pkt: '복구·개선', state: 'ok', title: '복구 — 빠르게 되돌리고 더 강해진다', law: ['고시 제11조'], html: '<p>백업으로 업무를 복구하고, 원인을 분석해 재발 방지로 안전조치를 보완해요. 사고 경험이 다음 보호를 강화하는 순환이에요.</p>', fields: [['복구', '백업 복원, 재구축', 'ok'], ['개선', '원인 분석 → 보호 강화', 'ok']] }
    ];
    new FlowPlayer($('#resilienceFlow'), { title: '사이버 복원력 5단계 (식별·보호·탐지·대응·복구)', nodes, steps, W: 780, H: 230 });

    const chk = $('#resilienceCheck');
    chk.innerHTML = `<h2>사이버 복원력 자가점검</h2>
      <div class="cols" style="margin-top:10px">
        <div class="panel" style="background:var(--surface-2)"><h3>버티는 힘 (보호·탐지)</h3><ul class="checklist">
          <li><b>백업 3-2-1</b>: 사본 3개, 매체 2종, 1개는 오프라인/원격 — 랜섬웨어 대비</li>
          <li>최소 권한·다단계 승인, 중요 작업은 사람 2인 확인</li>
          <li>출처 불명 파일·코드·앱 실행 금지(채용 과제·AI 도구 포함)</li>
          <li>접속기록·로그 상시 점검으로 이상 조기 탐지</li>
        </ul></div>
        <div class="panel" style="background:var(--surface-2)"><h3>되돌리는 힘 (대응·복구)</h3><ul class="checklist">
          <li>사고 대응 플레이북을 <b>미리</b> 작성(연락체계·격리·권한회수)</li>
          <li>정기 모의훈련(침해 대응·복구 리허설)</li>
          <li>백업에서 복구하는 절차를 실제로 테스트</li>
          <li>사고 후 원인 분석 → 안전조치 보완(개선 순환)</li>
          <li>유출 시 72시간 내 통지·신고 절차 숙지(법 제34조)</li>
        </ul></div>
      </div>
      <p class="notice" style="margin-top:12px">복원력은 “절대 안 뚫린다”가 아니라 “뚫려도 빨리 알아채고, 피해를 줄이고, 빠르게 되돌린다”는 관점이에요. 실제 대형 사고들의 공통 교훈은 <b>사전 준비된 절차</b>와 <b>조기 탐지</b>였어요.</p>`;
  });
})();
