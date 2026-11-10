/* Ⅲ-0 SW 개발보안(시큐어코딩)
   근거: 행정안전부·KISA 「소프트웨어 개발보안 가이드」, 「행정기관 및 공공기관 정보시스템 구축·운영 지침」(행안부 고시) 제50~52조, 전자정부법 */
(function () {
  'use strict';
  const { $, esc, onLesson } = window.PI;

  // 개발 생애주기(SDLC) 보안활동
  const SDLC = [
    ['요구사항 분석', '보안요구사항 도출', '처리하는 개인정보·중요정보를 식별하고 법적 보안요구사항(인증·암호화·접근통제 등)을 정의해요.'],
    ['설계', '위협모델링 · 보안설계 검토', '데이터 흐름을 그려 신뢰경계를 정하고, 인증·인가·암호화·로그 설계를 검토해요.'],
    ['구현', '시큐어코딩(보안약점 제거)', '7대 유형의 보안약점이 코드에 들어가지 않도록 개발 기준을 지켜요.'],
    ['테스트', '보안약점 진단 · 모의침투', '정적분석 도구로 소스의 보안약점을 진단하고, 동적 점검·모의해킹으로 확인해요.'],
    ['유지보수', '보안패치 · 취약점 대응', '라이브러리·OS 취약점을 지속 점검하고 신속히 패치해요.']
  ];

  // 7대 보안약점 유형
  const CATS = [
    {
      no: 1, kr: '입력데이터 검증 및 표현', en: 'Input Validation & Representation',
      desc: '외부에서 들어온 값을 검증·필터링·인코딩하지 않고 그대로 쓰면 삽입·우회 공격이 일어나요. 보안약점의 절반 이상이 여기 속해요.',
      items: ['SQL 삽입', '경로 조작 및 자원 삽입', '크로스사이트 스크립트(XSS)', '운영체제 명령어 삽입', '위험한 형식 파일 업로드', '신뢰되지 않는 URL 자동접속 연결', '서버사이드 요청 위조(SSRF)', 'HTTP 응답분할', 'LDAP/XPath 삽입', '정수형 오버플로', '메모리 버퍼 오버플로', '포맷 스트링 삽입'],
      ex: [
        { t: 'SQL 삽입 — 쿼리와 입력값 분리', link: '#sqli',
          bad: 'String sql = "SELECT * FROM member\\n  WHERE id=\'" + id + "\'";\nstmt.executeQuery(sql);   // 입력이 코드로 섞임',
          good: 'PreparedStatement ps = conn.prepareStatement(\n  "SELECT * FROM member WHERE id=?");\nps.setString(1, id);      // 값으로만 전달\nps.executeQuery();',
          note: '파라미터 바인딩으로 쿼리 구조를 먼저 확정하고 입력은 값으로만 전달해요.' },
        { t: '크로스사이트 스크립트 — 출력 인코딩', link: '#xss',
          bad: 'out.println("<div>" + name + "</div>");\n// name 안의 <script>가 실행됨',
          good: 'out.println("<div>" +\n  encodeForHTML(name) + "</div>");\n// < > & " \' 를 HTML 엔티티로',
          note: '외부 입력을 화면에 출력할 때 HTML 특수문자를 인코딩해 스크립트로 해석되지 않게 해요.' }
      ]
    },
    {
      no: 2, kr: '보안기능', en: 'Security Features',
      desc: '인증·인가·암호화·권한·비밀관리 같은 보안기능을 부적절하게 구현한 약점이에요.',
      items: ['적절한 인증 없는 중요기능 허용', '부적절한 인가', '중요정보 평문 저장', '중요정보 평문 전송', '하드코드된 중요정보(비밀번호·키)', '취약한 암호화 알고리즘 사용', '솔트 없이 일방향 해시함수 사용', '충분하지 않은 키 길이 사용', '적절하지 않은 난수값 사용', '반복된 인증시도 제한 기능 부재', '부적절한 인증서 유효성 검증'],
      ex: [
        { t: '하드코드된 비밀번호 제거',
          bad: 'String dbPass = "P@ssw0rd123!";\n// 소스에 비밀번호가 그대로',
          good: 'String dbPass =\n  System.getenv("DB_PASS");\n// 환경변수·비밀관리(Vault) 사용',
          note: '비밀번호·암호키를 소스에 적지 않아요. 소스가 유출되면 그대로 뚫려요.' },
        { t: '비밀번호 저장 — 솔트+반복 일방향', link: '#hash',
          bad: 'hash = sha256(pw);\n// 솔트 없음, 레인보우 테이블에 취약',
          good: 'salt = secureRandom(16);\nhash = pbkdf2(pw, salt, 100000);\n// 사용자마다 다른 솔트 + 반복',
          note: '고시 제7조① — 비밀번호는 복호화되지 않도록 솔트를 더한 일방향 함수로 저장해요.' }
      ]
    },
    {
      no: 3, kr: '시간 및 상태', en: 'Time and State',
      desc: '동시 수행·공유자원·상태 관리를 잘못하면 경쟁조건이나 무한반복이 생겨요.',
      items: ['경쟁조건: 검사시점과 사용시점(TOCTOU)', '종료되지 않는 반복문 또는 재귀함수'],
      ex: [
        { t: '경쟁조건(TOCTOU) — 검사와 사용의 원자성',
          bad: 'if (file.canWrite()) {\n  // 이 사이에 파일이 바뀔 수 있음\n  write(file);\n}',
          good: 'try (var ch = openForWrite(file)) {\n  ch.write(data);   // 열기·쓰기를 한 번에\n} catch (IOException e) { ... }',
          note: '검사 시점과 사용 시점 사이에 상태가 바뀌지 못하도록 원자적 연산·잠금을 써요.' }
      ]
    },
    {
      no: 4, kr: '에러처리', en: 'Error Handling',
      desc: '오류 메시지에 내부정보를 흘리거나, 예외를 제대로 처리하지 않아 생기는 약점이에요.',
      items: ['오류 메시지 정보노출', '오류상황 대응 부재', '부적절한 예외 처리'],
      ex: [
        { t: '오류 메시지 — 내부정보 숨기기', link: '#sqli',
          bad: 'catch (SQLException e) {\n  out.println(e.getMessage());\n  // 쿼리·테이블·경로 노출\n}',
          good: 'catch (SQLException e) {\n  log.error("db error", e);  // 로그에만\n  out.println("처리 중 오류가 발생했습니다");\n}',
          note: '사용자에게는 일반 문구만, 상세 원인은 서버 로그에만 남겨요.' }
      ]
    },
    {
      no: 5, kr: '코드오류', en: 'Code Error',
      desc: '널 참조·자원 미해제·해제 후 사용·미초기화 변수 등 구현 단계의 오류예요.',
      items: ['Null 포인터 역참조', '부적절한 자원 해제', '해제된 자원 사용(Use After Free)', '초기화되지 않은 변수 사용'],
      ex: [
        { t: 'Null 역참조 — 상수 먼저 비교',
          bad: 'String v = req.getParameter("x");\nif (v.equals("1")) { ... }\n// v가 null이면 NPE',
          good: 'String v = req.getParameter("x");\nif ("1".equals(v)) { ... }\n// null이어도 안전',
          note: '널이 될 수 있는 값은 상수를 기준으로 비교하거나 먼저 널 검사를 해요.' },
        { t: '자원 해제 — try-with-resources',
          bad: 'InputStream in = open(path);\nin.read(buf);\n// close 누락 → 자원 누수',
          good: 'try (InputStream in = open(path)) {\n  in.read(buf);\n}   // 자동 close',
          note: '파일·소켓·DB 연결은 반드시 닫아요. 자동 해제 구문을 쓰면 누락을 막아요.' }
      ]
    },
    {
      no: 6, kr: '캡슐화', en: 'Encapsulation',
      desc: '중요 데이터·기능을 캡슐화하지 않아 외부에 노출되는 약점이에요.',
      items: ['제거되지 않고 남은 디버그 코드', '시스템 데이터 정보노출', 'Public 메소드로부터 반환된 Private 배열', 'Private 배열에 Public 데이터 할당', '잘못된 세션에 의한 데이터 정보 노출'],
      ex: [
        { t: '남은 디버그 코드 제거',
          bad: 'System.out.println("admin pw=" + pw);\n// 운영에 남은 디버그 출력',
          good: '// 디버그 출력 제거\nlog.debug("auth attempt user={}", userId);\n// 민감정보는 남기지 않음',
          note: '배포 전 디버그·테스트 코드를 제거하고, 로그에 비밀번호 등 민감정보를 남기지 않아요.' },
        { t: 'Private 배열 반환 — 복사본',
          bad: 'public int[] getData() {\n  return this.data;   // 내부 배열 직접 노출\n}',
          good: 'public int[] getData() {\n  return this.data.clone(); // 복사본\n}',
          note: '내부 배열을 그대로 돌려주면 외부에서 내부 상태를 바꿀 수 있어요. 복사본을 반환해요.' }
      ]
    },
    {
      no: 7, kr: 'API 오용', en: 'API Abuse',
      desc: '보안에 취약한 API를 쓰거나, 신뢰할 수 없는 정보로 보안을 결정하는 약점이에요.',
      items: ['DNS lookup에 의존한 보안결정', '취약한 API 사용'],
      ex: [
        { t: '난수 — 예측 불가능한 보안 난수',
          bad: 'Random r = new Random();\nString token = "" + r.nextInt();\n// 예측 가능 → 세션·토큰에 부적합',
          good: 'SecureRandom r = new SecureRandom();\nbyte[] b = new byte[16];\nr.nextBytes(b);   // 암호학적 난수',
          note: '세션ID·토큰·OTP에는 일반 난수가 아니라 암호학적으로 안전한 난수를 써요.' },
        { t: 'DNS 기반 보안결정 금지',
          bad: 'if (reverseDns(ip).endsWith(".go.kr"))\n  allowAdmin();   // DNS는 위조 가능',
          good: '// DNS를 신뢰경계 판단에 쓰지 않음\nif (hasValidCert(client)) allowAdmin();',
          note: 'DNS 응답은 위조될 수 있어요. 인증서·토큰 같은 검증 가능한 수단으로 권한을 판단해요.' }
      ]
    }
  ];

  onLesson('securecoding', () => {
    const host = $('#secureLab'); if (!host) return;
    let sel = 0;

    const sdlc = `<div class="sc-sdlc">${SDLC.map((s, i) => `<div class="sc-phase"><span class="sc-pn">${i + 1}</span><b>${esc(s[0])}</b><em>${esc(s[1])}</em><p>${esc(s[2])}</p></div>`).join('<span class="sc-arrow">→</span>')}</div>`;

    function detail(c) {
      const ex = c.ex.map(e => `<div class="sc-ex">
        <div class="sc-ex-h">${esc(e.t)}${e.link ? ` <a class="sc-link" href="${e.link}">관련 레슨 →</a>` : ''}</div>
        <div class="sc-cmp">
          <div class="sc-col bad"><div class="sc-tag">취약 코드</div><pre>${esc(e.bad)}</pre></div>
          <div class="sc-col good"><div class="sc-tag">안전 코드</div><pre>${esc(e.good)}</pre></div>
        </div>
        <p class="sc-note">${esc(e.note)}</p>
      </div>`).join('');
      return `<div class="sc-detail">
        <div class="sc-dh"><span class="sc-dno">유형 ${c.no}</span><h3>${esc(c.kr)}</h3><span class="sc-den">${esc(c.en)}</span></div>
        <p class="sc-desc">${esc(c.desc)}</p>
        <div class="sc-items">${c.items.map(x => `<span class="sc-chip">${esc(x)}</span>`).join('')}</div>
        ${ex}
      </div>`;
    }
    const relink = () => { if (window.PI.linkifyLaws) window.PI.linkifyLaws(host); };

    function render() {
      host.innerHTML = `
        <h2 class="sc-h2">개발 생애주기(SDLC) 단계별 보안활동</h2>
        <p class="sc-sub">보안은 다 만든 뒤 붙이는 게 아니라, 요구사항부터 유지보수까지 전 과정에 녹여요. 구현 단계의 핵심이 아래 <b>시큐어코딩</b>이에요.</p>
        ${sdlc}
        <h2 class="sc-h2" style="margin-top:22px">소프트웨어 보안약점 7대 유형</h2>
        <p class="sc-sub">행정안전부·KISA 「소프트웨어 개발보안 가이드」 기준이에요. 유형을 눌러 대표 약점과 <b>취약 → 안전</b> 코드 예시를 보세요.</p>
        <div class="sc-tabs">${CATS.map((c, i) => `<button type="button" class="sc-tab ${i === sel ? 'on' : ''}" data-i="${i}"><b>${c.no}</b> ${esc(c.kr)}</button>`).join('')}</div>
        <div id="scDetail" class="law-cite">${detail(CATS[sel])}</div>
        <p class="notice law-cite" style="margin-top:14px">「행정기관 및 공공기관 정보시스템 구축·운영 지침」 제50조~제52조(행정안전부 고시)에 따라 감리 대상 정보화사업은 <b>소프트웨어 보안약점 진단</b>을 받아야 해요. 보안약점을 없앤 코드는 개인정보 유출의 뿌리를 줄여, 안전성 확보조치(고시)와 보호수준 평가로 이어져요.</p>`;
      relink();
    }
    host.addEventListener('click', e => {
      const t = e.target.closest('.sc-tab'); if (!t) return;
      sel = +t.dataset.i;
      host.querySelectorAll('.sc-tab').forEach(b => b.classList.toggle('on', +b.dataset.i === sel));
      const d = $('#scDetail'); d.innerHTML = detail(CATS[sel]); delete d.dataset.lawDone; relink();
    });
    render();
  });
})();
