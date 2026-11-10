/* Ⅲ-1 추가: SQL 인젝션 공격 과정 흐름도 (해커 → 웹 → DB 서버 → 자료 탈취) */
(function () {
  'use strict';
  const { $, FlowPlayer, vulnToggle, onLesson } = window.PI;

  onLesson('sqli', () => {
    const host = $('#sqliFlow'); if (!host) return;
    const nodes = [
      { id: 'atk', label: '공격자', sub: '브라우저 · 공격 도구', x: 20, y: 150, w: 140 },
      { id: 'web', label: '웹 애플리케이션', sub: 'DMZ · 로그인 처리', x: 290, y: 150, w: 160 },
      { id: 'db', label: 'DB 서버', sub: '내부망 · members', x: 585, y: 60, w: 150 },
      { id: 'out', label: '자료 유출', sub: '공격자 수중', x: 585, y: 250, w: 150 }
    ];
    const zones = [
      { label: '인터넷', x: 8, y: 36, w: 168, h: 268 },
      { label: 'DMZ', x: 272, y: 36, w: 196, h: 268 },
      { label: '내부망', x: 560, y: 36, w: 184, h: 268 }
    ];
    const steps = v => v === 'vuln' ? [
      { from: 'atk', to: 'web', pkt: "' OR 1=1 --", state: 'plain', danger: true, title: '입력란을 탐색', law: ['OWASP A03'],
        html: '<p>공격자는 로그인·검색·게시판 같은 입력란에 따옴표(<code>\'</code>)를 넣어 봐요. 화면에 DB 오류가 뜨면 입력이 쿼리에 그대로 들어간다는 신호예요.</p>',
        fields: [['입력란', 'id = ' + "' OR 1=1 --", 'plain'], ['관찰', 'SQL 구문 오류 메시지 노출', 'plain']], inspectorTitle: '공격자 입력' },
      { from: 'web', to: 'web', pkt: '문자열 결합', state: 'plain', danger: true, title: '입력이 쿼리에 섞임', law: ['입력값 미검증'],
        html: '<p>서버가 입력을 문자열로 이어 붙여 쿼리를 만들어요. 공격자의 따옴표가 데이터의 끝을 선언하고, 그 뒤 <code>OR 1=1</code>은 항상 참, <code>--</code>는 비밀번호 조건을 주석으로 지워요.</p>',
        extra: `<div class="sql" style="margin-top:8px;font-size:11.5px">SELECT * FROM members\nWHERE id='<span class="inj">' OR 1=1 --</span>' AND pw='...'</div>`, inspectorTitle: '서버가 만든 쿼리' },
      { from: 'web', to: 'db', pkt: 'SQL 실행', state: 'plain', danger: true, title: 'DB가 조작된 쿼리를 실행', law: [],
        html: '<p>웹 서버는 내부망 DB에 접속할 권한이 있으므로 방화벽을 그대로 통과해요. DB는 조작된 조건을 그대로 실행해 인증을 우회시켜요.</p>',
        fields: [['조건', "id='' OR 1=1 (항상 참)", 'plain'], ['반환', '첫 번째 행 = admin', 'plain']], inspectorTitle: 'DB 처리' },
      { from: 'db', to: 'web', pkt: 'admin 행', state: 'plain', danger: true, title: '관리자 권한 획득', law: [],
        html: '<p>비밀번호를 몰라도 관리자로 로그인돼요. 여기서 끝나지 않고, <code>UNION SELECT</code>로 다른 테이블 내용을 조회 결과에 끼워 넣어 회원 정보를 뽑아내요.</p>',
        extra: `<div class="sql" style="margin-top:8px;font-size:11.5px">' UNION SELECT id,pw,name,rrn FROM members --</div>`,
        fields: [['로그인', 'admin 성공', 'plain'], ['추가 공격', 'UNION 기반 대량 조회', 'plain']], inspectorTitle: '공격 확대' },
      { from: 'db', to: 'out', pkt: '회원 312,408건', state: 'plain', danger: true, title: '개인정보 탈취', law: ['개인정보 유출'],
        html: '<p>members 테이블 전체가 공격자에게 넘어가요. 평문으로 저장된 항목은 그대로 노출돼요. 암호화·일방향 저장과 접근통제가 있었다면 피해를 줄일 수 있었어요.</p>',
        fields: [['유출', '아이디, 이름, 주민번호 등', 'plain'], ['규모', '회원 312,408건', 'plain']], inspectorTitle: '탈취 결과' }
    ] : [
      { from: 'atk', to: 'web', pkt: "' OR 1=1 --", state: 'ok', title: '같은 입력을 전송', law: [],
        html: '<p>공격자는 동일하게 따옴표가 섞인 값을 보내요. 입력 자체는 막지 않아요. 중요한 것은 서버가 이 값을 어떻게 다루느냐예요.</p>',
        fields: [['입력란', 'id = ' + "' OR 1=1 --", 'ok']], inspectorTitle: '공격자 입력' },
      { from: 'web', to: 'web', pkt: '바인딩', state: 'ok', title: '구조와 데이터를 분리', law: ['PreparedStatement'],
        html: '<p>쿼리의 구조를 먼저 확정하고(<code>?</code> 자리표시자), 입력은 나중에 값으로만 전달해요. 따옴표가 섞여 있어도 구문이 아니라 찾을 문자열의 일부로 취급돼요.</p>',
        extra: `<div class="sql" style="margin-top:8px;font-size:11.5px">SELECT * FROM members WHERE id=? AND pw=?\n<span style="color:var(--muted)">[1]</span> <span class="data">' OR 1=1 --</span>  <span style="color:var(--muted)">(통째로 하나의 아이디 값)</span></div>`, inspectorTitle: '바인딩 처리' },
      { from: 'web', to: 'db', pkt: '안전한 쿼리', state: 'ok', title: '일치하는 계정 없음', law: [],
        html: '<p>DB는 아이디가 정확히 <code>\' OR 1=1 --</code>인 회원을 찾지만 그런 계정은 없어요. 조건이 코드로 해석되지 않았아요.</p>',
        fields: [['조회', "id = '' OR 1=1 --' 인 회원", 'ok'], ['반환', '0건', 'ok']], inspectorTitle: 'DB 처리' },
      { from: 'db', to: 'web', pkt: '0건', state: 'ok', blocked: true, title: '로그인 실패', law: ['고시 제5조⑥'],
        html: '<p>인증이 실패해요. 오류 메시지는 일반 문구로 보여 주고(DB 구조 숨김), 반복 실패하면 접근을 제한해요. DB 계정은 최소 권한만 부여해요.</p>',
        fields: [['결과', '로그인 실패', 'ok'], ['화면', '“아이디 또는 비밀번호를 확인하세요”', 'ok']], inspectorTitle: '응답' },
      { from: 'web', to: 'web', pkt: '유출 없음', state: 'ok', title: '유출 없음, 기록 남김', law: ['고시 제8조'],
        html: '<p>탈취로 이어지지 않아요. 이상 입력 시도는 접속기록·보안로그에 남겨 점검해요. 개인정보 컬럼을 암호화해 두면 다른 경로로 DB가 유출돼도 평문 노출을 막아요.</p>',
        fields: [['유출', '없음', 'ok'], ['조치', '이상 입력 기록 · 점검', 'ok']], inspectorTitle: '결과' }
    ];
    let fp; const tb = vulnToggle(x => { if (fp) fp.load(steps(x)); });
    fp = new FlowPlayer(host, { title: '해커 → 웹 → DB 서버 → 자료 탈취', nodes, zones, steps: steps('vuln'), W: 760, H: 320, toolbar: tb });
  });
})();
