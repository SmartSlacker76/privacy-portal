/* 안전조치 자가진단 마법사 — 기관 유형·처리 규모 선택 → 적용 항목만 단계별 체크 → 결과
   privacy.go.kr 자가진단 방식 참고. 근거: 개인정보 보호법·시행령, 안전성 확보조치 기준 고시, 안내서(2026.11.) */
(function () {
  'use strict';
  const { $, $$, esc, onLesson } = window.PI;
  const store = window.PI.store, KEY = 'selfcheck2';

  // ---- 프로필 정의 ----
  const ORG = [['public', '공공기관', '중앙행정기관·지자체·공공기관'], ['large', '대기업·중견기업', '상시근로자·매출 규모가 큰 기업'], ['sme', '중소기업·단체', '중소기업기본법상 중소기업 등'], ['small', '소상공인·개인·단체', '소상공인기본법상 소상공인 등']];
  const SCALE = [['s1', '1만 명 미만', 0], ['s2', '1만 ~ 5만 명', 1], ['s3', '5만 ~ 10만 명', 2], ['s4', '10만 ~ 100만 명', 3], ['s5', '100만 명 이상', 4]];
  const TOGGLES = [
    ['sensitive', '민감정보 또는 고유식별정보(주민·여권·운전면허·외국인등록번호)를 처리'],
    ['isUser', '정보통신서비스 이용자(온라인 회원 등)의 개인정보를 처리'],
    ['outsource', '개인정보 처리 업무를 외부에 위탁'],
    ['cctv', '영상정보처리기기(CCTV)를 운영'],
    ['ai', 'AI(생성형 AI 등)로 개인정보를 처리']
  ];
  const DEF = { org: 'sme', scale: 's2', sensitive: false, isUser: false, outsource: false, cctv: false, ai: false };

  // scale index helper
  const sidx = p => (SCALE.find(s => s[0] === p.scale) || SCALE[0])[2];
  const big = p => (p.org === 'public' || p.org === 'large') ? sidx(p) >= 3 : sidx(p) >= 4; // 10만↑(공공·대기업) / 100만↑(중소)
  const log2y = p => sidx(p) >= 2 || p.sensitive; // 접속기록 2년
  const netcut = p => p.isUser && sidx(p) >= 4; // 인터넷망 차단(이용자 100만↑ 근사)
  const impactTgt = p => p.org === 'public' && ((p.sensitive && sidx(p) >= 2) || sidx(p) >= 4);
  const smallExempt = p => p.org === 'small' && sidx(p) === 0; // 내부관리계획 생략 가능

  // ---- 체크 항목 ----
  const ITEMS = [
    { cat: '관리적', tag: '내부 관리계획', applies: () => true,
      q: '개인정보 보호를 위한 <b>내부 관리계획</b>을 문서로 수립·시행하고 있습니까?',
      must: p => ['대표·임원 등 내부 의사결정 절차를 거쳐 문서로 수립', '18개 법정 항목을 모두 포함(해당 없는 항목도 사유 명시)', '중요한 변경 시 즉시 반영하고 수정 이력 관리', '개인정보 보호책임자가 연 1회 이상 이행 실태 점검'].concat(smallExempt(p) ? ['※ 귀하의 유형(소상공인·1만 명 미만)은 수립을 생략할 수 있어요. 생략해도 다른 안전조치는 이행'] : []),
      law: '고시 제4조제1항 · 법 제29조', level: 'warn',
      penalty: '안전조치 의무(법 제29조) 위반 시 3천만원 이하 과태료(법 제75조제2항제5호). 미수립 상태에서 유출 시 전체 매출액 3% 이하 과징금(법 제64조의2).',
      incident: '내부 관리계획 없이 담당자 개인 판단으로만 운영하다 퇴직 예정 직원의 과도한 권한을 방치해 고객 수만 건이 반출된 사례.' },
    { cat: '관리적', tag: 'CPO 지정', applies: () => true,
      q: '자격요건을 갖춘 <b>개인정보 보호책임자(CPO)</b>를 지정했습니까?',
      must: () => ['법·시행령이 정한 자격요건을 갖춘 사람을 CPO로 지정', '지정 사실과 역할·책임을 내부 관리계획에 반영', 'CPO가 안전조치 이행 실태를 연 1회 이상 점검'],
      law: '법 제31조제1항 · 고시 제4조제1항제2호', level: 'warn',
      penalty: '개인정보 보호책임자 미지정 시 1천만원 이하 과태료(법 제75조제4항제9호).',
      incident: '보호책임자를 형식상 대표이사로만 올려두고 점검·보고 체계를 두지 않아 유출 징후를 몇 달간 확인하지 못한 사례.' },
    { cat: '관리적', tag: '취급자 교육', applies: p => !smallExempt(p),
      q: '개인정보취급자에게 <b>정기 교육</b>을 실시하고 있습니까?',
      must: () => ['사업 규모·업무 성격에 따라 교육을 차등화해 정기 실시', '교육 계획·대상·내용·일자를 기록으로 보관', '신규 취급자·수탁자 직원 포함'],
      law: '고시 제4조제2항', level: 'warn',
      penalty: '교육 부재가 안전조치 의무(법 제29조) 미이행 근거가 되어 과태료·유출 시 과징금 판단에 반영.',
      incident: '취급자가 고객정보를 개인 메일·USB로 반출하면 안 된다는 사실 자체를 몰라 발생한 유출.' },
    { cat: '관리적', tag: '수탁자 관리·감독', applies: p => p.outsource,
      q: '업무를 위탁할 때 <b>수탁자를 관리·감독</b>하고 있습니까?',
      must: () => ['위탁 내용과 수탁자를 처리방침에 공개', '안전조치 의무를 포함한 문서로 위탁계약 체결', '수탁자를 교육하고 처리 현황을 점검·감독'],
      law: '법 제26조 · 고시 제4조제1항제16호', level: 'bad',
      penalty: '수탁자가 준용 규정을 위반하면 위탁자도 과징금(제64조의2)·과태료(제75조·제76조) 대상이 될 수 있음(2023년 개정).',
      incident: '고객센터·배송을 맡긴 수탁사에서 유출이 났는데 위탁자가 한 번도 점검하지 않아 함께 책임을 진 사례.' },
    { cat: '관리적', tag: '유출 대응 계획', applies: p => p.org === 'public' || sidx(p) >= 1,
      q: '<b>유출 사고 대응 계획(매뉴얼)</b>을 수립해 두고 있습니까?',
      must: () => ['인지·보고·신속 대응팀 가동 절차 문서화', '72시간 내 통지·신고 절차와 담당자 지정', '피해 최소화·구제·재발 방지 절차 포함'],
      law: '고시 제4조제1항제14호 · 법 제34조', level: 'warn',
      penalty: '유출 통지·신고 의무(법 제34조) 위반 시 과태료. 대응 지연은 과징금 산정에 불리하게 반영.',
      incident: '유출을 인지하고도 보고·통지 순서를 정해두지 않아 72시간을 넘긴 사례.' },
    { cat: '관리적', tag: '영향평가', applies: p => impactTgt(p),
      q: '사업 전에 <b>개인정보 영향평가</b>를 수행했습니까? <small>(귀하의 유형·규모는 의무 대상으로 판단돼요)</small>',
      must: () => ['대상 시스템 설계 완료 전에 지정 평가기관을 통해 수행', '개인정보 흐름표·흐름도 작성, 침해요인 분석, 개선계획 수립', '영향평가서 요약본을 보호위원회에 제출', '개선계획을 사업에 반영하고 이행 점검'],
      law: '법 제33조 · 영 제35조', level: 'warn',
      penalty: '공공기관이 의무 대상임에도 미수행 시 개선권고·시정조치 대상. 침해 발생 시 책임 가중.',
      incident: '대규모 민원 시스템을 영향평가 없이 오픈한 뒤 설계 단계의 과다 수집·권한 문제를 운영 중 뒤늦게 고치느라 비용이 커진 사례.' },
    { cat: '관리적', tag: 'AI 취약점 점검', applies: p => p.ai,
      q: 'AI로 개인정보를 처리한다면 <b>AI 보안 레드티밍</b> 등 점검을 하고 있습니까?',
      must: () => ['프롬프트 인젝션 등 AI 특화 취약점 점검 수행', 'AI 도구의 데이터·기능 권한 최소화', '개인정보 대량 출력·외부 전송에 사람 승인 단계', '출력 단계 개인정보 패턴 탐지·마스킹'],
      law: '안내서(2026.11.) AI 보안 레드티밍 · 고시 제4조제1항제10호', level: 'warn',
      penalty: 'AI 취약점 방치로 유출 시 안전조치 의무 위반으로 과태료·과징금 판단에 반영.',
      incident: '상담용 AI에 고객 DB 전체 조회 권한을 주었다가, 문의 메일 속 숨은 지시로 다른 고객 정보가 답장에 섞여 나간 사례.' },
    { cat: '기술적', tag: '접근 권한 최소화', applies: () => true,
      q: '접근 권한을 <b>업무에 필요한 최소한</b>으로 부여하고, 인사이동·퇴직 시 지체 없이 변경·말소합니까?',
      must: () => ['업무별 최소 권한 차등 부여', '취급자·업무 변경 시 지체 없이 권한 변경·말소', '권한 부여·변경·말소 내역 최소 3년 보관', '계정은 취급자별 발급, 공유 금지'],
      law: '고시 제5조', level: 'warn',
      penalty: '안전조치 의무(법 제29조) 위반 시 3천만원 이하 과태료, 유출 시 과징금.',
      incident: '퇴직자 계정을 삭제하지 않아 퇴직 후 외부에서 접속해 고객 DB를 내려받은 사례.' },
    { cat: '기술적', tag: '접근통제·인증', applies: () => true,
      q: '외부 접속 시 <b>안전한 인증수단</b>을 적용하고, IP 제한·유휴 세션 차단을 하고 있습니까?',
      must: () => ['접속 권한을 IP 등으로 제한, 유출 시도 탐지·대응', '외부 접속 시 인증서·보안토큰·OTP 등 안전한 인증', '일정 시간 미사용 시 자동 접속 차단', '홈페이지·공유설정을 통한 노출 방지'],
      law: '고시 제6조', level: 'warn',
      penalty: '안전조치 의무(법 제29조) 위반 시 과태료·과징금.',
      incident: '관리자 페이지를 아이디·비밀번호만으로 외부에 열어두어 무차별 대입으로 뚫린 사례.' },
    { cat: '기술적', tag: '인터넷망 차단', applies: p => netcut(p),
      q: '권한 설정·다운로드·파기가 가능한 취급자 PC에 <b>인터넷망 차단</b>을 적용했습니까? <small>(이용자 100만 이상 근사)</small>',
      must: () => ['권한 설정 가능 취급자 PC 인터넷망 차단', '다운로드·파기 가능 취급자 PC 인터넷망 차단', '클라우드 이용 시 해당 서비스 접속 외 인터넷 차단'],
      law: '고시 제6조의2', level: 'warn',
      penalty: '대상자가 미적용 시 안전조치 의무 위반으로 과태료·과징금.',
      incident: '대량 다운로드 권한을 가진 PC가 인터넷에 연결돼 있어 악성코드 감염 후 전체 회원이 유출된 사례.' },
    { cat: '기술적', tag: '암호화', applies: () => true,
      q: '비밀번호 일방향 암호화, 주민·카드·계좌번호 등 <b>저장·전송 암호화</b>를 적용했습니까?',
      must: p => ['비밀번호는 복호화 불가하도록 일방향 암호화', '주민등록번호 등 법정 항목 저장 시 암호화(AES·ARIA·SEED 등)', '인터넷망 구간 송·수신 시 암호화(TLS)', '취급자 PC·USB 저장 시 암호화'].concat(big(p) ? ['암호 키 생성·이용·보관·배포·파기 절차 수립·시행(제7조⑥)'] : []),
      law: '고시 제7조 · 법 제24조의2', level: 'bad', link: '#encrypt-map',
      penalty: '주민등록번호 미암호화 등 안전조치 위반 시 과태료, 유출 시 전체 매출액 3% 이하 과징금.',
      incident: '회원 주민등록번호를 평문으로 저장했다가 DB 유출로 그대로 노출돼 대규모 과징금이 부과된 유형.' },
    { cat: '기술적', tag: '접속기록 보관·점검', applies: () => true,
      q: '접속기록을 <b>' + '{{logyear}}' + ' 이상 보관</b>하고 정기적으로 점검합니까?',
      must: p => [(log2y(p) ? '접속기록 2년 이상 보관(5만 명 이상·민감/고유식별정보 등)' : '접속기록 1년 이상 보관'), '식별자·접속일시·접속지·처리한 정보주체·수행업무 기록', '정한 주기·기준으로 이상 행위 점검, 사후조치', '위·변조 방지(별도 저장소·WORM 등)'],
      law: '고시 제8조', level: 'warn', link: '#access-log',
      penalty: '접속기록 미보관·미점검은 안전조치 의무 위반으로 과태료·과징금.',
      incident: '접속기록을 남기지 않아 내부자 유출 후에도 누가 언제 가져갔는지 추적하지 못한 사례.' },
    { cat: '기술적', tag: '악성프로그램 방지', applies: () => true,
      q: '백신 등 보안 프로그램을 설치하고 <b>자동/일 1회 이상 업데이트</b>합니까?',
      must: () => ['보안 프로그램 자동 업데이트 또는 일 1회 이상 업데이트', '악성프로그램 발견 시 삭제 등 대응', '보안 경보·업데이트 공지 시 즉시 적용'],
      law: '고시 제9조', level: 'warn',
      penalty: '안전조치 의무(법 제29조) 위반 시 과태료·과징금.',
      incident: '서버 백신·보안 패치를 미루다 알려진 취약점으로 랜섬웨어·유출을 동시에 당한 사례.' },
    { cat: '기술적', tag: '재해·재난 대비', applies: p => big(p),
      q: '화재·홍수·단전 등에 대비한 <b>위기대응 매뉴얼과 백업·복구 계획</b>이 있습니까? <small>(대규모 처리자)</small>',
      must: () => ['위기대응 매뉴얼 등 대응절차 마련, 정기 점검', '개인정보처리시스템 백업 및 복구 계획 마련', '백업 데이터도 암호화·접근통제'],
      law: '고시 제11조', level: 'warn',
      penalty: '대상자가 미비 시 안전조치 의무 위반으로 과태료·과징금.',
      incident: '백업 체계 없이 운영하다 랜섬웨어로 원본·업무가 동시에 마비돼 서비스가 장기 중단된 사례.' },
    { cat: '기술적', tag: '출력·복사 안전조치', applies: () => true,
      q: '개인정보를 <b>출력·복사</b>할 때 용도를 특정하고 항목을 최소화합니까?',
      must: () => ['출력 시 용도 특정, 용도에 따라 항목 최소화', '화면 마스킹 등 적용', '종이 인쇄물·외부 저장매체 안전 관리', '다운로드 상황 확인·점검(제8조②)'],
      law: '고시 제12조', level: 'warn',
      penalty: '안전조치 의무(법 제29조) 위반 시 과태료·과징금.',
      incident: '회원 전체를 주민번호까지 포함해 엑셀로 내려받아 PC에 두었다가 감염으로 유출된 사례.' },
    { cat: '물리적', tag: '물리적 안전조치', applies: () => true,
      q: '전산실·자료보관실 <b>출입통제</b>와 서류·보조저장매체 <b>잠금 보관</b>을 하고 있습니까?',
      must: () => ['전산실·자료보관실 출입통제 절차 수립·운영', '개인정보 서류·보조저장매체를 잠금장치가 있는 곳에 보관', '보조저장매체(USB 등) 반출·입 통제'],
      law: '고시 제10조', level: 'warn',
      penalty: '안전조치 의무(법 제29조) 위반 시 과태료·과징금.',
      incident: '회원 명부가 담긴 USB와 서류를 잠금 없이 두었다가 분실·도난으로 유출된 사례.' },
    { cat: '물리적', tag: '개인정보 파기', applies: () => true,
      q: '보유기간이 지난 개인정보를 <b>복원 불가능하게 파기</b>합니까?',
      must: () => ['완전파괴(소각·파쇄) 또는 전용 소자장비 또는 초기화·덮어쓰기', '일부 파기 시 삭제 후 복구·재생되지 않도록 관리·감독', '파기 시행·결과를 보호책임자 책임하에 기록'],
      law: '고시 제13조 · 법 제21조', level: 'warn', link: '#destroy',
      penalty: '보유기간 경과 개인정보 미파기는 법 제21조 위반으로 과태료.',
      incident: '탈퇴 회원 정보를 “삭제”만 하고 디스크에 남겨두어 복구 도구로 되살아난 사례.' },
    { cat: '물리적', tag: 'CCTV 운영·관리', applies: p => p.cctv,
      q: 'CCTV(영상정보처리기기)에 <b>안내판 설치</b> 등 운영·관리 기준을 지키고 있습니까?',
      must: () => ['설치 목적·장소·촬영 범위·관리책임자 등을 담은 안내판 설치', '목적 외 임의 조작·다른 곳 비춤 금지', '영상정보 보관 기간 설정 후 지체 없이 파기', '영상정보처리기기 운영·관리 방침 마련'],
      law: '법 제25조 · 고시(영상정보 안전조치)', level: 'warn',
      penalty: '안내판 미설치 등 위반 시 과태료. 목적 외 이용·제공은 별도 제재.',
      incident: '매장 CCTV를 직원 감시·사적 용도로 돌려보다 목적 외 이용으로 제재를 받은 사례.' }
  ];

  const STEPS = [
    { id: 'start', label: 'START' },
    { id: '관리적', label: '관리적' },
    { id: '기술적', label: '기술적' },
    { id: '물리적', label: '물리적' },
    { id: 'result', label: '결과' }
  ];

  onLesson('selfcheck', () => {
    const host = $('#scWizard'); if (!host) return;
    let state;
    try { state = JSON.parse(store.get(KEY) || 'null'); } catch (e) { state = null; }
    if (!state || !state.profile) state = { profile: Object.assign({}, DEF), ans: {}, step: 0 };
    const save = () => { try { store.set(KEY, JSON.stringify(state)); } catch (e) { } };
    const applicable = () => ITEMS.map((it, i) => [it, i]).filter(([it]) => it.applies(state.profile));
    const inStep = cat => applicable().filter(([it]) => it.cat === cat);

    function profileSummary() {
      const p = state.profile, on = [];
      if (p.sensitive) on.push('민감·고유식별정보');
      if (p.isUser) on.push('정보통신서비스 이용자');
      if (p.outsource) on.push('업무 위탁');
      if (p.cctv) on.push('CCTV');
      if (p.ai) on.push('AI 처리');
      const duties = [];
      if (!smallExempt(p)) duties.push('내부 관리계획 수립'); else duties.push('내부 관리계획 생략 가능');
      duties.push(log2y(p) ? '접속기록 2년 이상' : '접속기록 1년 이상');
      if (big(p)) duties.push('암호 키 관리 절차·재해재난 대비');
      if (netcut(p)) duties.push('인터넷망 차단');
      if (impactTgt(p)) duties.push('영향평가 의무');
      return { chips: on, duties };
    }

    function renderProgress() {
      return `<ol class="sc-prog">${STEPS.map((s, i) => `<li class="${i === state.step ? 'on' : i < state.step ? 'done' : ''}"><span>${i + 1}</span>${esc(s.label)}</li>`).join('')}</ol>`;
    }

    function renderStart() {
      const p = state.profile;
      return `<div class="sc-start">
        <h3>1. 어떤 기관인가요?</h3>
        <div class="sc-pick">${ORG.map(([v, l, d]) => `<button type="button" class="sc-opt ${p.org === v ? 'on' : ''}" data-org="${v}"><b>${esc(l)}</b><span>${esc(d)}</span></button>`).join('')}</div>
        <h3>2. 처리하는 정보주체 수는?</h3>
        <div class="sc-pick scale">${SCALE.map(([v, l]) => `<button type="button" class="sc-opt sm ${p.scale === v ? 'on' : ''}" data-scale="${v}">${esc(l)}</button>`).join('')}</div>
        <h3>3. 해당하는 상황을 모두 선택하세요</h3>
        <div class="sc-toggles">${TOGGLES.map(([k, l]) => `<label class="sc-tg ${p[k] ? 'on' : ''}"><input type="checkbox" data-tg="${k}" ${p[k] ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
        <div class="sc-applied"><b>이 조건에서 적용되는 주요 의무</b><div class="row" style="gap:6px;margin-top:6px">${profileSummary().duties.map(d => `<span class="chip enc">${esc(d)}</span>`).join('')}</div></div>
        <div class="sc-nav"><span></span><button type="button" class="btn primary" data-go="1">진단 시작 → 관리적 조치</button></div>
      </div>`;
    }

    function renderCat(cat) {
      const list = inStep(cat);
      if (!list.length) return `<div class="sc-start"><p class="notice">이 조건에서는 ${esc(cat)} 분야의 추가 진단 항목이 없어요.</p>${navRow()}</div>`;
      return `<div class="sc-start"><h3 style="margin-top:0">${esc(cat)} 안전조치 <span style="font-size:13px;color:var(--muted);font-weight:400">${list.length}개 항목</span></h3>
        <div class="ac-list">${list.map(([it, i]) => renderItem(it, i)).join('')}</div>${navRow()}</div>`;
    }

    function renderItem(it, i) {
      const ans = state.ans[i], open = !!ans, stateCls = ans === 'n' ? 'no' : ans === 'y' ? 'yes' : ans === 'na' ? 'na' : '';
      const must = it.must(state.profile), law = it.law, q = it.q.replace('{{logyear}}', log2y(state.profile) ? '2년' : '1년');
      return `<div class="ac-item ${stateCls}" data-i="${i}">
        <div class="ac-q"><div class="ac-qtext"><span class="chip">${esc(it.tag)}</span><div>${q}</div></div>
          <div class="ac-opts" role="group"><button type="button" data-v="y" class="${ans === 'y' ? 'on' : ''}">예</button><button type="button" data-v="n" class="${ans === 'n' ? 'on' : ''}">아니오</button><button type="button" data-v="na" class="${ans === 'na' ? 'on' : ''}">해당없음</button></div></div>
        ${open ? `<div class="ac-body">
          <div class="ac-block must"><b>처리해야 하는 사항</b><ul>${must.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>
          <div class="ac-grid"><div class="ac-block law"><b>근거 법령</b><p>${esc(law)}</p></div><div class="ac-block pen ${it.level}"><b>위반 시 처벌</b><p>${esc(it.penalty)}</p></div></div>
          <div class="ac-block case"><b>사고사례</b><p>${esc(it.incident)}</p></div>
          ${it.link ? `<p style="margin:0"><a class="btn" style="text-decoration:none;font-size:13px;padding:5px 12px" href="${it.link}">관련 실습 →</a></p>` : ''}
        </div>` : ''}
      </div>`;
    }

    function navRow() {
      return `<div class="sc-nav"><button type="button" class="btn" data-go="${state.step - 1}">← 이전</button><button type="button" class="btn primary" data-go="${state.step + 1}">${state.step >= STEPS.length - 2 ? '결과 보기' : '다음'} →</button></div>`;
    }

    function renderResult() {
      const list = applicable();
      const yes = list.filter(([, i]) => state.ans[i] === 'y').length;
      const no = list.filter(([, i]) => state.ans[i] === 'n');
      const na = list.filter(([, i]) => state.ans[i] === 'na').length;
      const applied = list.length - na;
      const rate = applied ? Math.round(yes / applied * 100) : 0;
      const cls = no.length ? (rate < 60 ? 'bad' : 'mid') : 'good';
      const ps = profileSummary();
      return `<div class="sc-start">
        <div class="ac-score ${cls}"><div class="ac-meter"><i style="width:${rate}%;background:${cls === 'good' ? 'var(--ok)' : cls === 'mid' ? 'var(--warn)' : 'var(--plain)'}"></i></div>
          <div class="ac-score-row"><b>이행률 ${rate}%</b><span>적용 ${list.length} · 이행 ${yes} · 미이행 ${no.length} · 해당없음 ${na}</span></div>
          <p style="margin:6px 0 0;font-size:13px">${no.length ? `미이행 ${no.length}건을 우선 조치하세요.` : '적용 항목을 모두 이행하고 있어요. 증빙 기록을 남겨 두세요.'}</p></div>
        <div class="sc-result-grid">
          <div class="ac-block law"><b>진단한 조건</b><p>${esc((ORG.find(o => o[0] === state.profile.org) || [])[1] || '')} · ${esc((SCALE.find(s => s[0] === state.profile.scale) || [])[1] || '')}${ps.chips.length ? ' · ' + ps.chips.map(esc).join(', ') : ''}</p></div>
          <div class="ac-block must"><b>이 조건의 주요 의무</b><div class="row" style="gap:6px;margin-top:4px">${ps.duties.map(d => `<span class="chip enc">${esc(d)}</span>`).join('')}</div></div>
        </div>
        ${no.length ? `<div class="ac-block pen bad"><b>먼저 조치할 미이행 항목</b><ul style="margin:4px 0 0;padding-left:1.3em">${no.map(([it]) => `<li>${esc(it.tag)} — ${esc(it.law)}</li>`).join('')}</ul></div>` : ''}
        <p class="notice">교육용 자가진단이에요. 적용 의무는 기관 유형·규모·처리 환경에 따라 달라질 수 있으니, 실제 적용은 개인정보보호위원회 자가진단(privacy.go.kr)과 법령 원문으로 확인하세요.</p>
        <div class="sc-nav"><button type="button" class="btn" data-go="${STEPS.length - 2}">← 이전</button><button type="button" class="btn" data-restart="1">처음부터 다시</button></div>
      </div>`;
    }

    function render() {
      const step = STEPS[state.step];
      let body;
      if (step.id === 'start') body = renderStart();
      else if (step.id === 'result') body = renderResult();
      else body = renderCat(step.id);
      host.innerHTML = renderProgress() + body;
    }

    host.addEventListener('click', e => {
      const org = e.target.closest('[data-org]'); if (org) { state.profile.org = org.dataset.org; save(); render(); return; }
      const sc = e.target.closest('[data-scale]'); if (sc) { state.profile.scale = sc.dataset.scale; save(); render(); return; }
      const opt = e.target.closest('.ac-opts button'); if (opt) { const i = +opt.closest('.ac-item').dataset.i; state.ans[i] = state.ans[i] === opt.dataset.v ? undefined : opt.dataset.v; if (state.ans[i] === undefined) delete state.ans[i]; save(); render(); return; }
      const go = e.target.closest('[data-go]'); if (go) { state.step = Math.max(0, Math.min(STEPS.length - 1, +go.dataset.go)); save(); render(); host.scrollIntoView({ behavior: window.PI.reduced() ? 'auto' : 'smooth', block: 'start' }); return; }
      if (e.target.closest('[data-restart]')) { state = { profile: Object.assign({}, DEF), ans: {}, step: 0 }; save(); render(); }
    });
    host.addEventListener('change', e => { const tg = e.target.closest('[data-tg]'); if (tg) { state.profile[tg.dataset.tg] = tg.checked; save(); render(); } });
    render();
  });
})();
