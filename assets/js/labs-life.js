/* 생활 속 개인정보 보호 — 선택(yes/no) → 결과 분기 시뮬레이터
   근거: 「해킹메일 예방」·「외부 설문·폼도구 준수사항」 안내(2026.10), 개인정보 보호법 제34조·제71조·제75조 */
(function () {
  'use strict';
  const { $, $$, esc, FlowPlayer, onLesson } = window.PI;

  /* 공용: 상황 → 선택 → 결과(분기) */
  function scenario(rootSel, cfg) {
    const root = $(rootSel); if (!root) return;
    root.innerHTML = `<div class="life">
      <div class="life-situation">${cfg.situation}</div>
      <div class="life-q">${esc(cfg.q)}</div>
      <div class="life-choices">${cfg.choices.map((c, i) => `<button type="button" class="life-choice ${c.tone}" data-i="${i}">${c.icon || ''} ${esc(c.label)}</button>`).join('')}</div>
      <div class="life-result" id="${root.id}-res" hidden></div>
    </div>`;
    const resEl = $('#' + root.id + '-res');
    let fp = null;
    root.querySelectorAll('.life-choice').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('.life-choice').forEach(x => x.classList.remove('picked'));
      b.classList.add('picked');
      const c = cfg.choices[+b.dataset.i];
      resEl.hidden = false;
      resEl.className = 'life-result ' + c.tone;
      resEl.innerHTML = `<div class="life-verdict"><b>${c.tone === 'bad' ? '⚠ 위험한 선택' : '✓ 안전한 선택'}</b><h3>${esc(c.title)}</h3></div>${c.html}${c.flow ? `<div id="${root.id}-flow" style="margin-top:12px"></div>` : ''}`;
      if (c.flow) { if (fp) fp.stop(); fp = new FlowPlayer($('#' + root.id + '-flow'), c.flow); }
      resEl.scrollIntoView({ behavior: window.PI.reduced() ? 'auto' : 'smooth', block: 'nearest' });
    }));
  }
  const phone = (from, body, tone) => `<div class="phone"><div class="phone-top"><span class="dot"></span>${esc(from)}</div><div class="phone-body ${tone || ''}">${body}</div></div>`;
  window.PI.scenario = scenario; window.PI.phone = phone;

  /* ---------------- 1. 공공 와이파이 ---------------- */
  onLesson('wifi', () => {
    const N = [{ id: 'me', label: '내 스마트폰', sub: '카페', x: 24, y: 110, w: 140 }, { id: 'ap', label: '가짜 와이파이', sub: '해커의 AP (Evil Twin)', x: 300, y: 110, w: 170 }, { id: 'net', label: '인터넷', sub: '정상 서버', x: 600, y: 110, w: 120 }];
    scenario('#wifiLab', {
      situation: `<div class="wifi-list"><div class="wifi-row"><span>📶 Cafe_Free_WiFi</span><span class="wifi-open">🔓 암호 없음</span></div><div class="wifi-row"><span>📶 SKT_Secure_5G</span><span>🔒</span></div><div class="wifi-row"><span>📶 iptime_2G</span><span>🔒</span></div></div>`,
      q: '카페에서 비밀번호 없이 바로 연결되는 “Cafe_Free_WiFi”가 보여요. 어떻게 할까요?',
      choices: [
        { label: '그냥 연결해서 쓴다', tone: 'bad', icon: '📶', title: '해커가 만든 가짜 AP에 연결되었어요', html: '<p>비밀번호 없는 공개 와이파이는 누구나 같은 이름으로 만들 수 있어요. 해커가 설치한 가짜 AP(Evil Twin)에 붙으면, 오가는 통신이 전부 해커를 거쳐 가요.</p>',
          flow: { title: '가짜 와이파이 공격', nodes: N, W: 750, H: 230, steps: [
            { from: 'me', to: 'ap', pkt: '자동 연결', state: 'plain', danger: true, title: '가짜 AP에 접속', law: [], html: '<p>스마트폰은 한 번 연결한 적 있는 이름의 와이파이에 <b>자동 연결</b>되기도 해요. 공격자는 흔한 이름으로 가짜 AP를 띄워요.</p>', fields: [['연결', 'Cafe_Free_WiFi (가짜)', 'plain']] },
            { from: 'ap', to: 'ap', pkt: '통신 가로채기', state: 'plain', danger: true, title: '중간자(MITM) 가로채기', law: [], html: '<p>모든 트래픽이 해커를 거쳐요. 암호화(HTTPS)되지 않은 통신은 내용이 그대로 보이고, 가짜 로그인 페이지로 유도당할 수 있어요.</p>', fields: [['도청', '접속 사이트·입력값', 'plain']] },
            { from: 'ap', to: 'me', pkt: '악성 안내', state: 'plain', danger: true, title: '앱 설치·권한 요구', law: [], html: '<p>“보안 인증 앱을 설치하세요” 같은 안내로 악성 앱 설치나 권한 허용을 유도해요.</p>', fields: [['요구', '연락처·문자·통화 권한', 'plain']] },
            { from: 'me', to: 'ap', pkt: '전화번호 탈취', state: 'plain', danger: true, title: '저장된 정보 탈취', law: ['개인정보 유출'], html: '<p>허용된 권한으로 스마트폰에 저장된 <b>전화번호부·문자·계정</b>이 빠져나가요. 이후 지인 사칭·스미싱으로 번져요.</p>', fields: [['유출', '연락처, 전화번호, 계정 토큰', 'plain']] }
          ] } },
        { label: '연결하지 않고 모바일 데이터를 쓴다', tone: 'good', icon: '🛡', title: '이상 없음', html: '<ul class="checklist"><li>민감한 작업(로그인·결제·업무)은 공개 와이파이에서 하지 않기</li><li>자동 연결 끄기, 안 쓸 때 와이파이 끄기</li><li>꼭 써야 하면 신뢰할 수 있는 VPN 사용, 주소창의 자물쇠(HTTPS) 확인</li><li>“무료 와이파이” 접속 후 앱 설치·권한 요구는 거부</li><li>기관 업무는 공용 와이파이 대신 모바일 데이터·업무망 사용</li></ul>' }
      ]
    });
  });

  /* ---------------- 2. 해킹메일(피싱) ---------------- */
  onLesson('phishmail', () => {
    // 발신자 주소 판별 미니게임
    const quizEl = $('#mailQuiz');
    const MAILS = [
      ['adm1n@k0rea.kr', false, '숫자 1·0로 바꾼 사칭 (admin→adm1n, korea→k0rea)'],
      ['no-reply@naver.com', true, '정상 네이버 도메인'],
      ['security@naver-com.cc', false, 'naver.com이 아니라 naver-com.cc (다른 도메인)'],
      ['help@goog1e.com', false, 'google의 l을 숫자 1로 바꾼 사칭'],
      ['billing@daum.net', true, '정상 다음 도메인'],
      ['service@dauum.net', false, 'daum을 dauum으로 (한 글자 추가)']
    ];
    let qi = 0, score = 0;
    function drawQuiz() {
      if (qi >= MAILS.length) { quizEl.innerHTML = `<div class="verdict good"><b class="big">판별 연습 완료 · ${score}/${MAILS.length}</b>메일 주소는 <b>한 글자</b> 차이를 노려요. 보낸 사람 주소를 끝까지 확인하세요.</div><button class="btn" id="mqReset" type="button">다시</button>`; $('#mqReset').onclick = () => { qi = 0; score = 0; drawQuiz(); }; return; }
      const [addr, real, why] = MAILS[qi];
      quizEl.innerHTML = `<div class="mail-head">보낸 사람 <code>${esc(addr)}</code></div><p style="font-size:13px;color:var(--muted);margin:6px 0">이 주소는 진짜일까요, 사칭일까요?</p><div class="row"><button class="btn" data-v="1" type="button">진짜</button><button class="btn" data-v="0" type="button">사칭(가짜)</button></div><div class="mq-fb" id="mqFb"></div>`;
      quizEl.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
        const ok = (b.dataset.v === '1') === real; if (ok) score++;
        $('#mqFb').innerHTML = `<div class="verdict ${ok ? 'good' : 'bad'}" style="margin-top:8px"><b>${ok ? '정답' : '오답'}</b> — ${real ? '진짜 도메인이에요. ' : '사칭이에요. '}${esc(why)}</div><button class="btn primary" id="mqNext" type="button" style="margin-top:8px">다음 ▶</button>`;
        $('#mqNext').onclick = () => { qi++; drawQuiz(); };
      });
    }
    drawQuiz();

    const N = [{ id: 'me', label: '내 PC', sub: '직원', x: 24, y: 110, w: 130 }, { id: 'mal', label: '악성코드', sub: '첨부파일 실행', x: 250, y: 110, w: 140 }, { id: 'c2', label: '공격자 서버', sub: 'C2', x: 470, y: 40, w: 130 }, { id: 'victim', label: '피해', sub: '정보·금전', x: 470, y: 190, w: 130 }];
    scenario('#phishLab', {
      situation: phone('보낸사람: security-team@daurn-support.com', '<b>[긴급] 계정 로그인 감지</b><br>본인이 아니면 즉시 확인하세요.<br>📎 보안확인_안내.pdf.exe', 'danger'),
      q: '“계정이 위험하다”는 메일에 첨부파일이 있어요. 어떻게 할까요?',
      choices: [
        { label: '첨부파일을 열어 확인한다', tone: 'bad', icon: '📎', title: '악성코드에 감염되었어요', html: '<p>파일명이 <code>...pdf.exe</code>, <code>.scr</code>처럼 보이면 문서가 아니라 <b>실행파일</b>이에요. 열면 악성코드가 실행돼요.</p>',
          flow: { title: '해킹메일 첨부 실행', nodes: N, W: 650, H: 270, steps: [
            { from: 'me', to: 'mal', pkt: '실행', state: 'plain', danger: true, title: '첨부파일 실행 → 감염', law: [], html: '<p>“보안확인_안내.pdf.exe”를 더블클릭하면 악성코드가 설치돼요.</p>', fields: [['위험 확장자', '.exe .scr .bat .zip .js', 'plain']] },
            { from: 'mal', to: 'c2', pkt: '접속', state: 'plain', danger: true, title: '익스플로잇·백도어 설치', law: [], html: '<p>악성코드가 공격자 서버(C2)에 연결해 추가 악성 도구를 내려받고 백도어를 심어요.</p>', fields: [['설치', '원격제어 백도어', 'plain']] },
            { from: 'c2', to: 'me', pkt: '제어권', state: 'plain', danger: true, title: '제어권 탈취', law: [], html: '<p>공격자가 내 PC를 원격으로 조종해요. 화면·키보드 입력·저장 파일에 접근해요.</p>', fields: [['탈취', '키 입력, 공인인증서, 문서', 'plain']] },
            { from: 'me', to: 'victim', pkt: '피해', state: 'plain', danger: true, title: '정보 유출·금전 피해', law: ['개인정보 유출'], html: '<p>저장된 개인정보·회사 자료가 유출되고, 금융정보로 비대면 대출·결제 피해까지 이어져요.</p>', fields: [['결과', '개인정보 유출, 명의도용, 대출 사기', 'plain']] }
          ] } },
        { label: '열지 않고 신고한다', tone: 'good', icon: '🛡', title: '잘하셨어요 — 열기 전 5가지 확인', html: '<ul class="checklist"><li><b>메일 주소</b>: 한 글자 차이 확인 (naver.com ↔ naver-com.cc)</li><li><b>모르는 발신자</b>는 무시가 최선</li><li><b>수상한 링크</b>: 클릭 대신 공식 홈페이지에 직접 접속</li><li><b>수상한 첨부</b>: .exe .scr .bat .zip 실행 금지</li><li><b>예고 없이 온 메일</b>: 열지 말고 정보보호팀에 신고</li></ul>' }
      ]
    });
  });

  /* ---------------- 3. 외부 설문·폼 ---------------- */
  onLesson('extform', () => {
    scenario('#formLab', {
      situation: `<div class="form-mock"><b>📋 동호회 회비 정산 설문 (구글 폼)</b><div class="form-field">이름 <input disabled></div><div class="form-field">휴대전화 <input disabled></div><div class="form-field">계좌번호 <input disabled></div></div>`,
      q: '회비 정산을 위해 구글 폼으로 이름·연락처·계좌번호를 받으려 해요. 괜찮을까요?',
      choices: [
        { label: '구글 폼으로 개인정보를 수집한다', tone: 'bad', icon: '📋', title: '외부 폼도구로 개인정보 수집은 금지', html: `<p>네이버 폼·구글 폼 등 외부 폼도구로 <b>개인정보를 수집하면 안 돼요</b>. 외부 도구를 써도 관리·안전조치 의무는 이용기관에 있고, 상용 플랫폼이라는 이유로 보호 의무가 면제되지 않아요.</p>
          <div class="pen-grid">
            <div class="pen-item bad"><b>필수 고지·동의 누락</b><span>3천만원 이하 과태료</span></div>
            <div class="pen-item bad"><b>목적 달성 후 미파기</b><span>3천만원 이하 과태료</span></div>
            <div class="pen-item bad"><b>구글 폼 국외 이전 동의 미취득</b><span>전체 매출액 3% 이하 과징금</span></div>
            <div class="pen-item bad"><b>결과 공개설정 오류로 유출</b><span>3천만원 이하 과태료 · 72시간 내 미통지 시 추가</span></div>
          </div>
          <p class="notice">카카오톡 등 상용메신저로 개인정보 문건을 수합하는 것도 금지예요(내부 직원 단톡방 포함). ‘개인정보 누설’로 간주되면 5년 이하 징역 또는 5천만원 이하 벌금에 해당할 수 있어요.</p>` },
        { label: '개인정보 없이 설문만 받는다', tone: 'good', icon: '🛡', title: '안전한 사용법', html: '<ul class="checklist"><li><b>개인정보를 묻지 않기</b>: 이름·연락처·계좌 등 항목을 넣지 않고 자유응답에도 적지 않도록 안내</li><li><b>공개설정 금지</b>: 결과 요약 공개를 끄고 응답 시트 공유는 ‘제한’으로</li><li><b>끝나면 바로 삭제</b>: 목적을 이루면 설문·응답·내려받은 사본까지 삭제</li><li>개인정보가 꼭 필요하면 기관 내부 시스템·공공용 도구를 사용</li></ul>' }
      ]
    });
  });

  /* ---------------- 4. 문자 스미싱 ---------------- */
  onLesson('smishing', () => {
    const N = [{ id: 'me', label: '내 스마트폰', sub: '', x: 24, y: 110, w: 130 }, { id: 'site', label: '가짜 사이트', sub: '악성앱(APK)', x: 250, y: 110, w: 150 }, { id: 'atk', label: '공격자', sub: '', x: 480, y: 40, w: 120 }, { id: 'pay', label: '금전 피해', sub: '소액결제·대출', x: 480, y: 190, w: 140 }];
    scenario('#smishLab', {
      situation: phone('010-5678-****', '[Web발신]<br>[택배] 주소가 불일치하여 배송이 보류되었어요. 주소 확인 👉 http://bit.ly/xz9q2', 'danger'),
      q: '택배 주소 확인을 요구하는 문자의 링크가 왔어요. 어떻게 할까요?',
      choices: [
        { label: '링크를 눌러 확인한다', tone: 'bad', icon: '🔗', title: '스미싱(문자 피싱)에 당했어요', html: '<p>단축 URL(bit.ly 등)로 진짜 주소를 숨기고, 택배·범칙금·청첩장 등으로 클릭을 유도해요. 링크는 가짜 사이트나 악성 앱 설치로 이어져요.</p>',
          flow: { title: '스미싱 공격', nodes: N, W: 650, H: 270, steps: [
            { from: 'me', to: 'site', pkt: '링크 접속', state: 'plain', danger: true, title: '가짜 사이트·앱 유도', law: [], html: '<p>택배사·기관을 사칭한 가짜 사이트가 열리고, “앱을 설치하라”며 악성 앱(APK) 설치를 유도해요.</p>', fields: [['유도', '악성 앱 설치, 로그인', 'plain']] },
            { from: 'site', to: 'me', pkt: '권한 요구', state: 'plain', danger: true, title: '문자·연락처·결제 권한 탈취', law: [], html: '<p>설치된 악성 앱이 문자(SMS)·연락처·통화 권한을 가져가요. 인증번호(OTP) 문자까지 가로채요.</p>', fields: [['권한', 'SMS 가로채기(OTP), 연락처', 'plain']] },
            { from: 'me', to: 'atk', pkt: '정보 전송', state: 'plain', danger: true, title: '개인·금융정보 유출', law: ['개인정보 유출'], html: '<p>입력한 정보와 가로챈 인증번호가 공격자에게 넘어가요.</p>', fields: [['유출', '계정, 인증번호, 카드정보', 'plain']] },
            { from: 'atk', to: 'pay', pkt: '금전 피해', state: 'plain', danger: true, title: '소액결제·비대면 대출', law: [], html: '<p>가로챈 인증번호로 소액결제·비대면 대출·계정 탈취가 일어나요.</p>', fields: [['피해', '소액결제, 명의도용 대출', 'plain']] }
          ] } },
        { label: '누르지 않고 공식 앱·고객센터로 확인', tone: 'good', icon: '🛡', title: '안전한 대응', html: '<ul class="checklist"><li>문자 속 링크는 누르지 않기 — 택배는 공식 앱, 기관은 공식 번호로 직접 확인</li><li>출처를 모르는 앱(APK) 설치 금지, “알 수 없는 출처” 설치 차단 유지</li><li>소액결제 차단·한도 축소, 백신 앱으로 점검</li><li>속았다면 즉시 통신사·금융사에 정지 요청, 118(인터넷진흥원)·112 신고</li></ul>' }
      ]
    });
  });

  /* ---------------- 5. QR 큐싱 ---------------- */
  onLesson('qrcode', () => {
    const N = [{ id: 'me', label: '내 스마트폰', sub: 'QR 촬영', x: 24, y: 110, w: 130 }, { id: 'site', label: '피싱 사이트', sub: '가짜 로그인', x: 260, y: 110, w: 150 }, { id: 'atk', label: '공격자', sub: '계정·결제정보', x: 500, y: 110, w: 140 }];
    scenario('#qrLab', {
      situation: `<div class="qr-mock"><div class="qr-img">▦ QR</div><p>“주차 정산은 QR을 찍어 진행하세요”<br><small>※ 기존 안내판 위에 덧붙여진 스티커</small></p></div>`,
      q: '주차장/식당에 붙은 QR을 찍으니 “앱 설치 후 로그인” 페이지가 떠요. 어떻게 할까요?',
      choices: [
        { label: '그대로 진행해 로그인한다', tone: 'bad', icon: '▦', title: '큐싱(QR 피싱)에 당했어요', html: '<p>QR코드는 눈으로 주소를 알 수 없어요. 공격자는 진짜 안내판 위에 <b>가짜 QR 스티커</b>를 덧붙여 피싱 사이트로 유도해요(큐싱).</p>',
          flow: { title: '큐싱 공격', nodes: N, W: 680, H: 230, steps: [
            { from: 'me', to: 'site', pkt: 'QR 접속', state: 'plain', danger: true, title: '가짜 QR → 피싱 사이트', law: [], html: '<p>덧붙여진 가짜 QR이 가짜 주차·결제 사이트로 연결해요.</p>', fields: [['주소', '눈으로 확인 불가', 'plain']] },
            { from: 'site', to: 'me', pkt: '로그인·결제 요구', state: 'plain', danger: true, title: '계정·카드정보 입력 유도', law: [], html: '<p>“정산을 위해 로그인/카드 등록”을 요구해요. 익숙한 화면처럼 꾸며 의심을 피해요.</p>', fields: [['입력 유도', '아이디·비밀번호·카드번호', 'plain']] },
            { from: 'me', to: 'atk', pkt: '정보 전송', state: 'plain', danger: true, title: '계정·결제정보 탈취', law: ['개인정보 유출'], html: '<p>입력한 정보가 공격자에게 넘어가 계정 탈취·부정 결제로 이어져요.</p>', fields: [['유출', '계정, 카드정보', 'plain']] }
          ] } },
        { label: 'URL을 확인하고 중단한다', tone: 'good', icon: '🛡', title: '안전한 대응', html: '<ul class="checklist"><li>QR 스캔 후 <b>연결 주소(URL)를 먼저 확인</b> — 공식 도메인이 아니면 중단</li><li>안내판 위에 덧붙인 스티커·훼손 흔적이 있으면 사용하지 않기</li><li>QR로 유도된 페이지에서 앱 설치·로그인·결제 요구는 의심</li><li>주차·결제는 현장 공식 기기나 공식 앱으로 진행</li></ul>' }
      ]
    });
  });

  /* ---------------- 7. 당근마켓·밴드·카카오톡 피싱 ---------------- */
  onLesson('msgphish', () => {
    scenario('#carrotLab', {
      situation: phone('당근마켓 채팅 · 구매자', '상품 받고 싶은데 제가 지금 바빠서요 🙏<br>“당근 안전결제”로 보내주시면 택배로 받을게요. 링크로 계좌·카드 인증만 해주세요 👉 http://danggn-pay.cc', 'danger'),
      q: '중고거래에서 구매자가 “안전결제 링크”로 계좌·카드 인증을 요구해요. 어떻게 할까요?',
      choices: [
        { label: '링크로 안전결제를 진행한다', tone: 'bad', icon: '🥕', title: '가짜 안전결제 사기예요', html: '<p>당근마켓은 <b>앱 안의 ‘당근페이’</b>로만 결제해요. 외부 링크로 “안전결제·계좌·카드 인증”을 요구하면 100% 사기예요. 입력한 금융정보로 결제·탈취가 일어나요.</p><ul class="checklist"><li>거래는 직거래 또는 앱 내 당근페이로만</li><li>외부 링크·카톡으로 유도하면 거래 중단·신고</li><li>“가족이 대신 결제”, “택배 먼저” 등 재촉은 사기 신호</li></ul>' },
        { label: '앱 내 결제만 쓰고 외부 링크는 거절', tone: 'good', icon: '🛡', title: '안전한 거래', html: '<ul class="checklist"><li>앱을 벗어난 결제·인증 요구는 모두 거절</li><li>시세보다 지나치게 싸거나 재촉하면 의심</li><li>판매자·구매자 매너온도·거래 이력 확인</li><li>피해 시 거래내역 캡처 후 경찰(112)·당근 신고</li></ul>' }
      ]
    });
    scenario('#kakaoLab', {
      situation: phone('카카오톡 · 엄마', '아들~ 엄마 폰 액정이 깨져서 수리 맡겼어. 지금 급하게 보낼 데가 있는데 50만원만 이 계좌로 보내줄래? 이따 줄게', 'danger'),
      q: '가족·지인이 메신저로 “급하다”며 송금을 요구해요. 어떻게 할까요?',
      choices: [
        { label: '급하다니까 바로 송금한다', tone: 'bad', icon: '💸', title: '메신저 피싱(지인 사칭)이에요', html: '<p>계정을 탈취하거나 프로필을 도용해 가족·지인을 사칭하고, “폰 고장·급한 송금”으로 돈이나 상품권을 요구해요. 전화를 피하고 메신저로만 재촉하는 것이 특징이에요.</p><ul class="checklist"><li>송금 전 반드시 <b>본인에게 전화·영상통화</b>로 확인</li><li>“전화 못 받는다”며 메신저만 고집하면 사기</li><li>문화상품권 핀번호·계좌 요구는 즉시 의심</li><li>피해 시 즉시 은행에 지급정지, 112·118 신고</li></ul>' },
        { label: '전화로 먼저 확인한다', tone: 'good', icon: '🛡', title: '잘하셨어요', html: '<ul class="checklist"><li>금전·상품권·개인정보 요구는 직접 통화로 확인 후 대응</li><li>가족과 미리 “확인 암호(질문)”를 정해두기</li><li>내 계정 보호: 카카오·네이버 2단계 인증, 비밀번호 재사용 금지</li><li>탈취 의심 시 비밀번호 변경·로그인 기기 정리, 지인에게 공지</li></ul>' }
      ]
    });
  });

  /* ---------------- 6. 밴드/SNS 계정 탈취 사칭 ---------------- */
  onLesson('band', () => {
    const N = [{ id: 'atk', label: '공격자', sub: '탈취한 밴드 계정', x: 24, y: 110, w: 150 }, { id: 'me', label: '회원', sub: '지인으로 믿음', x: 270, y: 110, w: 140 }, { id: 'loss', label: '피해', sub: '명의도용·사기', x: 500, y: 110, w: 140 }];
    scenario('#bandLab', {
      situation: phone('밴드 · 모임 리더 김○○', '회비 정산 때문에 그래. 미안한데 이름이랑 주민번호, 계좌번호 이 링크에 입력해줘 👉 http://band-check.cc', 'danger'),
      q: '아는 밴드 리더 계정에서 개인정보를 입력하라는 링크가 왔어요. 어떻게 할까요?',
      choices: [
        { label: '리더가 보냈으니 입력한다', tone: 'bad', icon: '✍', title: '탈취된 계정을 통한 지인 사칭이에요', html: '<p>공격자가 밴드·카카오톡 등 <b>계정을 탈취</b>하면, 그 사람의 이름과 프로필로 지인에게 접근해요. 평소 알던 사람이라 의심 없이 개인정보·금융정보를 입력하게 돼요.</p>',
          flow: { title: 'SNS 계정 탈취 사칭', nodes: N, W: 680, H: 230, steps: [
            { from: 'atk', to: 'me', pkt: '지인 사칭 DM', state: 'plain', danger: true, title: '탈취 계정으로 접근', law: [], html: '<p>탈취한 리더 계정으로 회원에게 “회비 정산” 같은 그럴듯한 이유를 대며 개인정보 입력을 요구해요.</p>', fields: [['요구', '이름·주민번호·계좌번호', 'plain']] },
            { from: 'me', to: 'atk', pkt: '정보 입력', state: 'plain', danger: true, title: '가짜 폼에 입력', law: ['개인정보 유출'], html: '<p>가짜 사이트에 입력한 개인·금융정보가 공격자에게 넘어가요.</p>', fields: [['전송', '주민번호, 계좌, 신분증 사본', 'plain']] },
            { from: 'atk', to: 'loss', pkt: '2차 피해', state: 'plain', danger: true, title: '명의도용·대출·추가 사칭', law: [], html: '<p>수집된 정보로 비대면 대출·명의도용이 일어나고, 같은 방식으로 다른 회원에게 사칭이 번져요.</p>', fields: [['피해', '명의도용 대출, 연쇄 사칭', 'plain']] }
          ] } },
        { label: '본인에게 전화로 먼저 확인한다', tone: 'good', icon: '🛡', title: '잘하셨어요', html: '<ul class="checklist"><li>금전·개인정보를 요구하면 <b>반드시 본인에게 전화·영상으로</b> 확인 (메시지 안에서 확인 금지)</li><li>평소와 다른 말투·급한 요청·링크 입력 유도는 사칭 신호</li><li>이름·주민번호·계좌·신분증 사본을 링크로 입력하지 않기</li><li>내 계정 보호: <b>2단계 인증</b> 설정, 비밀번호 재사용 금지, 로그인 기기 점검</li><li>탈취가 의심되면 즉시 비밀번호 변경·로그아웃, 지인에게 알리기</li></ul>' }
      ]
    });
  });
})();
