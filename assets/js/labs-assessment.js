/* Ⅰ-5 개인정보 영향평가 / Ⅳ 개인정보 유출 대응
   근거: 개인정보 영향평가 수행안내서(2025.10), 개인정보 유출등 대응 안내서(2026.9), 법 제33조·제34조 */
(function () {
  'use strict';
  const { $, $$, esc, seg, FlowPlayer, onLesson } = window.PI;

  /* =================== 영향평가 =================== */
  onLesson('impact', () => {
    /* 대상 판별 */
    const judge = $('#iaJudge');
    judge.innerHTML = `<h2>우리 사업은 영향평가 의무 대상일까?</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">공공기관이 일정 규모 이상의 개인정보파일을 전자적으로 구축·운용·변경·연계할 때 의무예요(법 제33조, 영 제35조). 해당하는 항목을 고르세요.</p>
      <div style="display:grid;gap:8px;font-size:14px">
        <label class="row"><input type="checkbox" id="ia-pub" checked> 공공기관이다 (중앙행정기관, 지자체, 공공기관 등)</label>
        <label class="row"><input type="radio" name="iasz" value="5" checked> 5만 명 이상 정보주체의 <b>민감정보 또는 고유식별정보</b>를 처리</label>
        <label class="row"><input type="radio" name="iasz" value="50"> 내부·외부 다른 파일과 <b>연계</b>, 연계 결과 정보주체 50만 명 이상</label>
        <label class="row"><input type="radio" name="iasz" value="100"> 정보주체 <b>100만 명 이상</b> 포함</label>
        <label class="row"><input type="radio" name="iasz" value="0"> 위 어느 것에도 해당하지 않음</label>
        <label class="row"><input type="checkbox" id="ia-chg"> 기존 운용 체계를 <b>변경·연계</b>하려 한다</label>
      </div>
      <div class="verdict" id="iaOut" style="margin-top:14px" aria-live="polite"></div>`;
    function run() {
      const pub = $('#ia-pub').checked, sz = (judge.querySelector('input[name=iasz]:checked') || {}).value, chg = $('#ia-chg').checked;
      let cls, title, body;
      if (!pub) { cls = 'mid'; title = '공공기관 외 개인정보처리자'; body = '법상 의무 대상은 공공기관이에요. 다만 정보주체의 침해가 우려되는 경우 영향평가를 하도록 적극 노력해야 해요(법 제33조제11항). 대량·민감 정보를 다루면 자율적으로 수행하길 권장해요.'; }
      else if (sz !== '0') { cls = 'bad'; title = '영향평가 의무 대상'; const m = { 5: '5만 명 이상의 민감정보·고유식별정보 처리', 50: '연계 결과 50만 명 이상', 100: '100만 명 이상 포함' }[sz]; body = `${m} 조건에 해당해요. 대상 시스템의 <b>설계 완료 전</b>에 지정된 평가기관을 통해 영향평가를 수행하고, 그 결과를 사업에 반영해야 해요. 예산 확보와 평가기관 선정을 미리 준비하세요.`; }
      else if (chg) { cls = 'mid'; title = '변경 시 해당 부분 평가'; body = '규모 조건에 해당하지 않더라도, 영향평가를 실시했던 기관이 운용 체계를 변경·연계하는 경우 변경 부분에 대해 영향평가를 실시해요(영 제35조).'; }
      else { cls = 'good'; title = '현재 의무 대상 아님'; body = '규모 조건에 해당하지 않아요. 다만 1년 이내에 기준을 넘길 가능성이 있으면 미리 수행하도록 권고돼요. 법령상 대상이 아니어도 대량·민감 정보를 다루면 자율 수행이 가능해요.'; }
      $('#iaOut').className = 'verdict ' + cls;
      $('#iaOut').innerHTML = `<b class="big">${title}</b>${body}`;
    }
    judge.addEventListener('change', run); run();

    /* 수행 절차 흐름도 */
    const nodes = [
      { id: 'pre', label: '사전준비 단계', sub: '대상 부서', x: 40, y: 150, w: 150 },
      { id: 'run', label: '수행 단계', sub: '평가기관 + 평가팀', x: 300, y: 150, w: 150 },
      { id: 'impl', label: '이행 단계', sub: '대상 기관', x: 560, y: 150, w: 150 }
    ];
    const zones = [{ label: '타당성·팀 구성', x: 24, y: 40, w: 182, h: 232 }, { label: '침해요인 분석·개선', x: 284, y: 40, w: 182, h: 232 }, { label: '점검', x: 544, y: 40, w: 182, h: 232 }];
    const steps = [
      { from: 'pre', to: 'pre', pkt: '1', state: 'plain', title: '사전준비: 필요성 검토', law: ['영 제35조'], html: '<p>정보화사업을 추진하며 개인정보의 신규 수집·이용·연계·제공이나 처리절차 변경이 생기는지 보고 영향평가 대상인지 판단해요.</p>', fields: [['수행 주체', '대상사업 주관 부서'], ['산출물', '영향평가 필요성 검토서']], inspectorTitle: '단계 산출물' },
      { from: 'pre', to: 'pre', pkt: '2', state: 'plain', title: '사전준비: 사업계획·예산·평가기관', law: [], html: '<p>타당성을 검토하고 협력 조직을 구성해요. 예산과 인력을 확보하고 지정된 평가기관을 선정해 평가팀을 꾸려요. 대상 시스템의 <b>설계 완료 전</b>에 수행하도록 일정을 잡아요.</p>', fields: [['준비', '예산 확보, 평가기관 선정'], ['구성', '영향평가팀 (평가기관 포함)']] },
      { from: 'pre', to: 'run', pkt: '수행계획', state: 'enc', title: '수행: 계획 수립 → 자료 수집', law: [], html: '<p>평가 수행계획을 세우고, 대상 시스템 관련 자료(사업계획서, 설계서, 내부 규정 등)를 수집해요.</p>', fields: [['① 수행계획 수립', '평가 범위·일정·방법'], ['② 평가자료 수집', '설계서, 흐름 자료, 규정']], inspectorTitle: '수행단계 1·2' },
      { from: 'run', to: 'run', pkt: '흐름 분석', state: 'enc', title: '수행: 개인정보 흐름 분석', law: [], html: '<p>개인정보가 수집→보유→이용·제공→파기까지 어디를 어떻게 흐르는지 <b>흐름표·흐름도</b>로 그려요. 이 자료가 침해요인을 찾는 토대예요.</p>', fields: [['③ 흐름 분석', '흐름표, 흐름도, 정보흐름표'], ['대상', 'DB·테이블·처리 업무']], inspectorTitle: '수행단계 3' },
      { from: 'run', to: 'run', pkt: '침해요인', state: 'plain', danger: true, title: '수행: 침해요인 분석·위험도 산정', law: ['안전성 확보조치 기준'], html: '<p>흐름의 각 지점에서 개인정보 침해요인을 식별하고 위험도를 매기네요. 법적 준거성(법·고시 준수 여부)을 함께 봐요. 아래 계산기로 위험도 산정을 체험해 보세요.</p>', fields: [['④ 침해요인 분석', '평가항목별 점검, 위험도 산정'], ['기준', '영향도·발생가능성·법적준거성']], inspectorTitle: '수행단계 4' },
      { from: 'run', to: 'impl', pkt: '개선계획', state: 'ok', title: '수행: 개선계획 → 영향평가서', law: [], html: '<p>식별된 침해요인마다 개선계획(조치 내용·일정·담당)을 세우고, 영향평가서와 요약본을 작성해요. 요약본은 보호위원회에 제출해요.</p>', fields: [['⑤ 개선계획 수립', '위험요인별 개선과제'], ['⑥ 영향평가서·요약본', '보호위원회 제출']], inspectorTitle: '수행단계 5·6' },
      { from: 'impl', to: 'impl', pkt: '이행점검', state: 'ok', title: '이행: 개선 반영·점검', law: ['영향평가 고시'], html: '<p>영향평가서의 개선계획을 사업에 반영하고, 이행 여부를 점검해요. 시스템 오픈 후에도 개선과제가 실제로 적용됐는지 확인해요.</p>', fields: [['반영', '설계·구축에 개선과제 적용'], ['점검', '이행 결과 확인·기록']], inspectorTitle: '이행단계' }
    ];
    new FlowPlayer($('#iaFlow'), { title: '영향평가 3단계 수행 절차', nodes, zones, steps, W: 750, H: 285 });

    /* 위험도 계산기 */
    const rc = $('#iaRisk');
    rc.innerHTML = `<h2>위험도 산정 해보기</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">안내서의 위험도 산정 예시 공식이에요. 세 값을 조절하면 위험도가 바뀌어요.</p>
      <div class="ia-formula">위험도 = 개인정보 영향도 + ( 침해요인 발생가능성 × 법적 준거성 ) × 2</div>
      <div style="display:grid;gap:14px;margin-top:14px">
        <div class="ia-slider"><label>개인정보 영향도 <small>자산가치·민감도 (1 낮음 ~ 3 높음)</small></label><input type="range" id="ia-a" min="1" max="3" step="1" value="3"><output id="ia-a-o">3</output></div>
        <div class="ia-slider"><label>침해요인 발생가능성 <small>취약점이 악용될 가능성 (1 ~ 3)</small></label><input type="range" id="ia-b" min="1" max="3" step="1" value="2"><output id="ia-b-o">2</output></div>
        <div class="ia-slider"><label>법적 준거성 가중치 <small>법·고시 위반 관련성 (1 ~ 3)</small></label><input type="range" id="ia-c" min="1" max="3" step="1" value="3"><output id="ia-c-o">3</output></div>
      </div>
      <div class="verdict" id="iaRiskOut" style="margin-top:14px" aria-live="polite"></div>`;
    function risk() {
      const a = +$('#ia-a').value, b = +$('#ia-b').value, c = +$('#ia-c').value;
      ['a', 'b', 'c'].forEach(k => $('#ia-' + k + '-o').textContent = $('#ia-' + k).value);
      const r = a + (b * c) * 2; // 범위 3 ~ 21
      const lv = r >= 15 ? ['매우 높음', 'bad', '즉시 개선'] : r >= 9 ? ['높음', 'bad', '우선 개선'] : r >= 6 ? ['보통', 'mid', '개선 권고'] : ['낮음', 'good', '현 수준 유지·모니터링'];
      const pct = Math.round((r - 3) / 18 * 100);
      $('#iaRiskOut').className = 'verdict ' + lv[1];
      $('#iaRiskOut').innerHTML = `<b class="big">위험도 ${r} / 21 · ${lv[0]}</b><div class="pj-meter"><i style="width:${pct}%;background:${lv[1] === 'good' ? 'var(--ok)' : lv[1] === 'mid' ? 'var(--warn)' : 'var(--plain)'}"></i></div>대응: <b>${lv[2]}</b>. 영향도가 높은(민감·대량) 자산일수록, 그리고 법적 준거성이 걸린 항목일수록 위험도가 빠르게 올라가 우선 개선 대상이 돼요.`;
    }
    rc.addEventListener('input', risk); risk();
  });

  /* =================== 유출 대응 =================== */
  onLesson('breach', () => {
    /* 대응 흐름도 */
    const nodes = [
      { id: 'detect', label: '유출 인지', sub: '탐지·신고 접수', x: 30, y: 150, w: 130 },
      { id: 'team', label: '신속 대응팀', sub: '보호책임자(CPO) 총괄', x: 230, y: 40, w: 160 },
      { id: 'min', label: '피해 최소화', sub: '긴급 조치', x: 230, y: 250, w: 160 },
      { id: 'subj', label: '정보주체', sub: '통지 대상', x: 500, y: 60, w: 130 },
      { id: 'pipc', label: '보호위원회', sub: '신고 접수', x: 500, y: 240, w: 130 }
    ];
    const steps = [
      { from: 'detect', to: 'team', pkt: '사고 보고', state: 'plain', danger: true, title: '인지와 보고', law: ['법 제34조'], html: '<p>해킹·오전송·분실 등으로 개인정보가 유출(분실·도난·유출·위조·변조·훼손)된 사실을 알게 되면, 즉시 개인정보 보호책임자에게 보고하고 신속 대응팀을 가동해요.</p>', fields: [['유출등', '분실·도난·유출·위조·변조·훼손'], ['시작', '유출 인지 시점 = 72시간 기산점', 'plain']], inspectorTitle: '대응 시작' },
      { from: 'team', to: 'min', pkt: '긴급 조치', state: 'ok', title: '피해 최소화·긴급 조치', law: ['법 제34조제1항'], html: '<p>추가 유출을 막는 것이 최우선이에요. 유출 경로를 차단하고, 유출된 개인정보를 회수·삭제하며, 접근 권한을 정지해요. 증거는 보존해요.</p>', fields: [['차단', '유출 경로·취약점 차단'], ['회수', '유출 데이터 회수·삭제'], ['보존', '로그 등 증거 보존', 'ok']], inspectorTitle: '긴급 조치' },
      { from: 'team', to: 'subj', pkt: '통지 (72h)', state: 'plain', danger: true, title: '정보주체 통지', law: ['법 제34조'], html: '<p>유출을 안 때부터 <b>72시간 이내</b>에 정보주체에게 개별 통지해요. 서면·전자우편·팩스·전화·문자 등으로 알리고, 연락처를 알 수 없는 등 정당한 사유가 있으면 홈페이지에 30일 이상 게시해요.</p>', fields: [['기한', '인지 후 72시간 내', 'plain'], ['방법', '서면·메일·전화·문자 개별 통지'], ['예외', '연락처 불명 시 홈페이지 30일 이상 게시']], inspectorTitle: '통지' },
      { from: 'team', to: 'pipc', pkt: '신고 (72h)', state: 'plain', danger: true, title: '보호위원회 신고', law: ['법 제34조제3항'], html: '<p>①1천 명 이상 유출, ②민감정보·고유식별정보 유출, ③외부의 불법적인 접근에 의한 유출 중 하나라도 해당하면 <b>72시간 이내</b>에 개인정보 유출신고 시스템(brss.pipc.go.kr)으로 신고해요. 구체적 내용을 다 확인하지 못했으면 우선 신고 후 추가 신고해요.</p>', fields: [['대상', '1천명↑ / 민감·고유식별 / 불법접근', 'plain'], ['창구', 'brss.pipc.go.kr'], ['방식', '우선 신고 + 추가 신고']], inspectorTitle: '신고' },
      { from: 'team', to: 'team', pkt: '구제·재발방지', state: 'ok', title: '피해 구제·재발 방지', law: ['법 제34조'], html: '<p>정보주체 피해를 구제하고(상담 창구 운영, 명의도용 차단 안내 등), 사고 원인을 분석해 재발 방지 대책을 세워 안전조치를 보완해요. 대응 전 과정을 기록해요.</p>', fields: [['구제', '상담·피해 접수 창구 운영', 'ok'], ['재발방지', '원인 분석, 안전조치 보완', 'ok'], ['기록', '대응 전 과정 문서화', 'ok']], inspectorTitle: '사후' }
    ];
    new FlowPlayer($('#brFlow'), { title: '유출 인지 → 대응팀 → 통지·신고 → 구제', nodes, steps, W: 760, H: 320 });

    /* 72시간 타임라인 */
    const tl = $('#brClock');
    tl.innerHTML = `<h2>72시간 시계</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 10px">통지와 신고 모두 <b>유출을 인지한 때</b>부터 72시간 안에 해야 해요. 인지 시점을 옮겨 남은 시간을 확인해 보세요.</p>
      <div class="ia-slider"><label>유출 인지 후 경과 <small id="br-h-o"></small></label><input type="range" id="br-h" min="0" max="80" step="1" value="12"></div>
      <div class="br-bar" aria-hidden="true"><div class="br-fill" id="br-fill"></div><span class="br-mark" style="left:90%">72h</span></div>
      <div class="verdict" id="brClockOut" style="margin-top:12px" aria-live="polite"></div>`;
    function clock() {
      const h = +$('#br-h').value, left = 72 - h;
      $('#br-h-o').textContent = h + '시간 경과';
      $('#br-fill').style.width = Math.min(100, h / 80 * 100) + '%';
      $('#br-fill').style.background = h >= 72 ? 'var(--plain)' : h >= 60 ? 'var(--warn)' : 'var(--ok)';
      $('#brClockOut').className = 'verdict ' + (h >= 72 ? 'bad' : h >= 60 ? 'mid' : 'good');
      $('#brClockOut').innerHTML = h >= 72 ? `<b class="big">기한 초과 (${h - 72}시간 지남)</b>정당한 사유 없이 72시간을 넘기면 안 돼요. 지연이 불가피했다면 그 사유를 소명할 수 있어야 해요(통지는 유출 방지 긴급조치·천재지변, 신고는 천재지변 등으로 한정).` : `<b class="big">통지·신고까지 ${left}시간 남음</b>남은 시간 안에 정보주체 통지와(해당 시) 보호위원회 신고를 마쳐야 해요. 내용을 다 확인하지 못했으면 확인된 부분을 우선 신고·통지하고 추가해요.`;
    }
    tl.addEventListener('input', clock); clock();

    /* 신고 대상 판별 */
    const rep = $('#brReport');
    rep.innerHTML = `<h2>신고 대상인지 판별</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 10px">아래 중 <b>하나라도</b> 해당하면 보호위원회 신고 대상이에요(통지는 1명 이상이면 항상 대상).</p>
      <div style="display:grid;gap:8px;font-size:14px">
        <label class="row"><input type="checkbox" class="br-r" id="br-1"> 유출된 정보주체가 <b>1천 명 이상</b></label>
        <label class="row"><input type="checkbox" class="br-r" id="br-2"> <b>민감정보</b> 또는 <b>고유식별정보</b>(주민·여권·운전면허·외국인등록번호)가 포함</label>
        <label class="row"><input type="checkbox" class="br-r" id="br-3"> <b>외부의 불법적인 접근</b>(해킹 등)에 의한 유출</label>
      </div>
      <div class="verdict" id="brRepOut" style="margin-top:12px" aria-live="polite"></div>`;
    function report() {
      const any = $$('.br-r').some(x => x.checked);
      $('#brRepOut').className = 'verdict ' + (any ? 'bad' : 'mid');
      $('#brRepOut').innerHTML = any ? '<b class="big">통지 + 신고 대상</b>정보주체 통지와 함께 72시간 내 보호위원회(brss.pipc.go.kr) 신고가 필요해요.' : '<b class="big">통지 대상 (신고 요건 미해당)</b>정보주체가 1명 이상이면 통지는 해야 해요. 신고 3가지 요건에는 해당하지 않지만, 피해 최소화 조치와 기록은 동일하게 수행해요.';
    }
    rep.addEventListener('change', report); report();

    /* 통지문 / 신고서 양식 */
    const doc = $('#brDocs');
    const F = { kind: '해킹(외부 불법 접근)', items: '이름, 휴대전화번호, 이메일, 주민등록번호', count: '32,480', when: '2026-11-05 02:14경', how: '웹 취약점(SQL 인젝션)을 통한 외부 불법 접근' };
    doc.innerHTML = `<div class="row" style="justify-content:space-between"><h2 style="margin:0">통지문과 신고서 미리 채워 보기</h2><div id="brTog"></div></div>
      <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">아래 가상 사고 정보를 바꾸면 통지문·신고서의 법정 기재사항이 자동으로 채워져요. <b>교육용 예시 양식</b>이며 실제 서식은 brss.pipc.go.kr과 안내서 별지를 사용하세요.</p>
      <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))">
        <div class="field"><label>유출 항목</label><input class="input" id="f-items" value="${F.items}"></div>
        <div class="field"><label>유출 규모(명)</label><input class="input" id="f-count" value="${F.count}"></div>
        <div class="field"><label>발생 시점</label><input class="input" id="f-when" value="${F.when}"></div>
        <div class="field"><label>경위</label><input class="input" id="f-how" value="${F.how}"></div>
      </div>
      <div id="brPaper" style="margin-top:14px"></div>`;
    let mode = 'notice';
    function papers() {
      const v = k => esc($('#f-' + k).value);
      if (mode === 'notice') {
        $('#brPaper').innerHTML = `<div class="paper"><div class="paper-h">개인정보 유출 통지문 <span class="chip warn">예시 · 법 제34조</span></div>
          <p class="paper-lead">고객님께. 당사가 보유한 개인정보가 아래와 같이 유출된 사실이 확인되어 「개인정보 보호법」 제34조에 따라 알려드려요. 불편을 드려 진심으로 사과드려요.</p>
          <ol class="paper-list">
            <li><b>유출된 개인정보 항목</b> — ${v('items')}</li>
            <li><b>유출을 인지한 시점과 경위</b> — ${v('when')} 인지 / ${v('how')}</li>
            <li><b>정보주체가 할 수 있는 피해 최소화 조치</b> — 비밀번호 변경, 유사 사이트 비밀번호 교체, 명의도용 방지 서비스(계좌정보통합관리, 명의도용방지서비스) 이용, 의심 문자·메일 주의</li>
            <li><b>개인정보처리자의 대응조치 및 피해 구제절차</b> — 유출 경로 차단, 취약점 조치 완료, 전담 상담창구 운영, 피해 접수 시 구제 절차 안내</li>
            <li><b>신고·상담 접수 부서 및 연락처</b> — 개인정보 보호 담당부서 ☎ 00-0000-0000 / 개인정보침해신고센터 ☎ 118 (privacy.kisa.or.kr)</li>
            <li><b>추가 통지 안내</b> — 유출 규모·항목이 확정되면 추가로 통지드리겠어요.</li>
          </ol>
          <p class="paper-foot">통지 방법: 서면·전자우편·팩스·전화·문자 등 개별 통지 / 연락처를 알 수 없는 등 정당한 사유가 있으면 홈페이지에 30일 이상 게시</p></div>`;
      } else {
        $('#brPaper').innerHTML = `<div class="paper"><div class="paper-h">개인정보 유출 신고서 <span class="chip warn">예시 · brss.pipc.go.kr</span></div>
          <table class="paper-form"><tbody>
            <tr><th>신고 기관(처리자)</th><td>○○○ (대표자·주소·연락처)</td></tr>
            <tr><th>유출 인지 일시</th><td>${v('when')}</td></tr>
            <tr><th>유출 항목</th><td>${v('items')}</td></tr>
            <tr><th>유출 규모</th><td>${v('count')} 명</td></tr>
            <tr><th>유출 경위·원인</th><td>${v('how')}</td></tr>
            <tr><th>신고 사유</th><td>1천명 이상 / 민감·고유식별정보 포함 / 외부 불법 접근 중 해당 항목 표시</td></tr>
            <tr><th>피해 최소화 조치</th><td>유출 경로 차단, 취약점 조치, 접근권한 정지, 데이터 회수·삭제, 상담창구 운영</td></tr>
            <tr><th>향후 계획</th><td>원인 분석, 재발 방지 대책, 정보주체 통지 현황</td></tr>
          </tbody></table>
          <p class="paper-foot">신고 기한: 유출 인지 후 72시간 내 / 내용을 다 확인하지 못한 경우 확인된 사항을 우선 신고하고, 추가 확인 시 ‘추가 신고’임을 명시하여 신고</p></div>`;
      }
    }
    $('#brTog').append(seg([['notice', '정보주체 통지문'], ['report', '보호위원회 신고서']], v => { mode = v; papers(); }));
    doc.addEventListener('input', papers); papers();

    /* 대응요령 체크리스트 */
    $('#brChecklist').innerHTML = `<h2>유출 사고 대응요령 체크리스트</h2>
      <div class="cols" style="margin-top:10px">
        <div class="panel" style="background:var(--surface-2)"><h3>처음 72시간</h3><ul class="checklist">
          <li>유출 사실·범위 파악, 보호책임자 보고, 신속 대응팀 가동</li>
          <li>유출 경로 차단, 취약점 조치, 접근권한 정지 (추가 유출 방지)</li>
          <li>유출 데이터 회수·삭제, 로그 등 증거 보존</li>
          <li>정보주체 개별 통지 (6개 기재사항 포함)</li>
          <li>해당 시 보호위원회 신고(brss.pipc.go.kr), 미확인 시 우선 신고</li>
        </ul></div>
        <div class="panel" style="background:var(--surface-2)"><h3>이후</h3><ul class="checklist">
          <li>연락처 불명 시 홈페이지 30일 이상 게시</li>
          <li>전담 상담창구 운영, 피해 구제 절차 안내</li>
          <li>명의도용·2차 피해 방지 안내(비밀번호 변경 등)</li>
          <li>사고 원인 분석, 재발 방지 대책 수립, 안전조치 보완</li>
          <li>대응 전 과정 기록·보관, 필요 시 추가 통지·신고</li>
        </ul></div>
      </div>
      <p class="notice" style="margin-top:12px">1천 명 이상 처리자·공공기관 등은 유출 대응 매뉴얼을 마련해 두어야 해요. 신용정보가 포함되면 「신용정보법」 제39조의4에 따른 통지·신고도 함께 확인하세요.</p>`;
  });
})();
