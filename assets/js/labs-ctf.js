/* CTF 챌린지 보드 + 미션 시스템 + 간세다리 마스코트
   각 레슨이 미션. 플래그를 맞히면 점수를 얻고 다음 단계가 열려요. 진행 상황은 브라우저에 저장. */
(function () {
  'use strict';
  const { $, $$, esc, store } = window.PI;
  const KEY = 'ctf-progress';

  // 간세다리: 곱슬머리·안경·갈옷 입은 제주 소나이. 평소 게으르고 잠 좋아하는 개인정보·보안 전문가.
  // mood: happy(요망지게) / think(골똘히) / sad(아이고) / sleep(졸암수다)
  function pony(mood) {
    const sleep = mood === 'sleep';
    // 눈: 안경 너머
    const eyeShut = 'M-3,0 q3,2.4 6,0';
    const eyeOpen = mood === 'think' ? 'M-1.4,-0.6 h3' : 'M0,0 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0';
    const eye = sleep ? eyeShut : eyeOpen;
    const mouth = sleep ? 'M-5,8 q5,1 10,0' : mood === 'happy' ? 'M-6,6 q6,6 12,0' : mood === 'sad' ? 'M-5,9 q5,-4 10,0' : 'M-5,8 h10';
    const brow = mood === 'think' ? 'M-13,-11 l6,-2 M13,-11 l-6,-2' : mood === 'sad' ? 'M-13,-14 l6,3 M13,-14 l-6,3' : '';
    return `<svg class="pony" viewBox="-40 -46 80 86" role="img" aria-label="간세다리: 갈옷 입은 제주 소나이">
      <ellipse cx="0" cy="36" rx="22" ry="4.5" fill="rgba(0,0,0,.08)"/>
      <!-- 갈옷(저고리) 몸통 -->
      <path d="M-22,38 q-2,-22 8,-28 l28,0 q10,6 8,28 Z" fill="var(--gal)"/>
      <path d="M-14,10 q-7,4 -8,16 l6,2 q1,-10 6,-14 Z" fill="var(--gal-d)"/>
      <path d="M14,10 q7,4 8,16 l-6,2 q-1,-10 -6,-14 Z" fill="var(--gal-d)"/>
      <!-- 깃·고름 -->
      <path d="M0,10 l-13,6 1,5 12,-7 12,7 1,-5 Z" fill="var(--gal-l)"/>
      <path d="M0,16 l0,16" stroke="var(--gal-d)" stroke-width="2" fill="none"/>
      <path d="M-1,20 q-7,3 -5,10" stroke="var(--gal-tie)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- 목·얼굴 -->
      <rect x="-5" y="4" width="10" height="9" rx="4" fill="var(--skin-d)"/>
      <circle cx="0" cy="-10" r="17" fill="var(--skin)"/>
      <!-- 귀 -->
      <circle cx="-17" cy="-9" r="3" fill="var(--skin-d)"/><circle cx="17" cy="-9" r="3" fill="var(--skin-d)"/>
      <!-- 곱슬머리 -->
      <g fill="var(--hair)"><circle cx="-13" cy="-21" r="7"/><circle cx="-5" cy="-26" r="8"/><circle cx="5" cy="-27" r="8"/><circle cx="13" cy="-22" r="7"/><circle cx="16" cy="-14" r="5"/><circle cx="-16" cy="-14" r="5"/><circle cx="0" cy="-27" r="8"/>
        <path d="M-18,-14 q-2,-14 18,-16 q20,2 18,16 q-4,-10 -18,-9 q-14,-1 -18,9 Z"/></g>
      <!-- 안경 -->
      <g stroke="var(--glass)" stroke-width="2" fill="rgba(255,255,255,.35)"><circle cx="-8" cy="-10" r="6.5"/><circle cx="8" cy="-10" r="6.5"/></g>
      <path d="M-1.5,-10 h3 M-14.5,-11 l-3,-1 M14.5,-11 l3,-1" stroke="var(--glass)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- 눈·눈썹·코·입 -->
      <g transform="translate(-8,-10)" stroke="var(--ink)" stroke-width="2" fill="var(--ink)" stroke-linecap="round"><path d="${eye}" ${sleep || mood === 'think' ? 'fill="none"' : ''}/></g>
      <g transform="translate(8,-10)" stroke="var(--ink)" stroke-width="2" fill="var(--ink)" stroke-linecap="round"><path d="${eye}" ${sleep || mood === 'think' ? 'fill="none"' : ''}/></g>
      ${brow ? `<path d="${brow}" stroke="var(--hair)" stroke-width="2" fill="none" stroke-linecap="round"/>` : ''}
      <path d="M0,-6 q-2,3 1,4" stroke="var(--skin-d)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="${mouth}" transform="translate(0,-2)" stroke="var(--ink)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      ${sleep ? '<g fill="var(--cipher)" font-family="monospace" font-weight="700"><text x="18" y="-26" font-size="8">z</text><text x="23" y="-32" font-size="10">Z</text><text x="29" y="-39" font-size="13">Z</text></g>' : ''}
      ${mood === 'happy' ? '<circle cx="-13" cy="-3" r="2.5" fill="var(--blush)"/><circle cx="13" cy="-3" r="2.5" fill="var(--blush)"/>' : ''}
    </svg>`;
  }

  // ---- 챌린지 정의 (순서 = 진행 순서) ----
  // flags: 허용 정답들(소문자·공백제거 비교). 레슨을 해보면 찾을 수 있는 값.
  const CH = [
    { id: 'lifecycle', part: 'Ⅰ', cat: '처리 흐름', title: '한 건의 일생', pt: 100,
      mission: '회원가입 흐름(3단계, DB 저장)에서 <b>비밀번호</b>는 복호화할 수 없게 저장해요. 이 암호화 방식을 세 글자로 쓰면?',
      flags: ['일방향', '일방향암호화'], hint: '관리자도 원래 값을 알 수 없는 방식이에요. ○○향.' },
    { id: 'selfcheck', part: 'Ⅰ', cat: '자가진단', title: '내 조건 진단', pt: 120,
      mission: '자가진단에서 <b>공공기관 · 100만 명 이상 · 민감정보</b>를 고르면 접속기록은 몇 년 이상 보관해야 할까요? (숫자만)',
      flags: ['2', '2년'], hint: '5만 명 이상이거나 민감·고유식별정보면 1년이 아니라…' },
    { id: 'levelcheck', part: 'Ⅰ', cat: '보호수준 평가', title: '정량지표 40', pt: 130,
      mission: '보호수준 평가 정량진단을 끝까지 채워 보세요. <b>자체평가 정량지표</b>는 모두 몇 개인가요? (숫자만)',
      flags: ['40', '40개'], hint: '관리체계·권리보장·안전조치 세 분야를 합하면? 종합 이행률 옆에 “평가 ○지표”로 나와요.' },
    { id: 'safeguards', part: 'Ⅰ', cat: '안전조치', title: '과태료의 무게', pt: 120,
      mission: '안전조치 의무(법 제29조) 위반 시 과태료 상한은? <b>○천만원</b>의 숫자만 쓰세요.',
      flags: ['3', '3000', '3천만원', '3천'], hint: '내부 관리계획 자가진단의 “위반 시 처벌”을 보세요. ○천만원 이하.' },
    { id: 'access-log', part: 'Ⅰ', cat: '접속기록', title: '새벽의 침입자', pt: 150,
      mission: '접속기록 점검에서 <b>새벽 2시에 회원 전체를 대량 다운로드</b>한 취급자의 식별자(ID)는?',
      flags: ['cs_lee', 'cs lee', 'cslee'], hint: '자동 점검을 실행하면 붉게 탐지돼요. cs_○○○.' },
    { id: 'consign', part: 'Ⅰ', cat: '위수탁', title: '맡겨도 남는 책임', pt: 130,
      mission: '배송을 택배사에 맡기듯 <b>우리 업무를 대신</b> 처리하게 하는 것을 무엇이라 하나요? 두 글자.',
      flags: ['위탁', '업무위탁'], hint: '제3자 제공과 구분되는 것. ○탁.' },
    { id: 'webexposure', part: 'Ⅰ', cat: '노출 점검', title: '검색에 걸린 개인정보', pt: 140,
      mission: '홈페이지 노출 레슨에서, 게시판 첨부 엑셀이 검색엔진에 수집돼 노출될 때 그 파일에 들어 있던 가장 위험한 항목은? 여섯 글자.',
      flags: ['주민등록번호', '주민번호'], hint: '고유식별정보의 대표. ○○등록번호.' },
    { id: 'impact', part: 'Ⅰ', cat: '영향평가', title: '위험을 계산하라', pt: 130,
      mission: '위험도 산정 공식 <b>위험도 = 영향도 + (발생가능성 × 법적준거성) × ?</b> 에서 물음표 숫자는?',
      flags: ['2'], hint: '위험도 계산기의 공식 줄을 보세요.' },
    { id: 'destroy', part: 'Ⅰ', cat: '파기', title: '되살아나는 데이터', pt: 130,
      mission: 'HDD에서 일반 삭제한 데이터가 복구되지 않게 하려면? 제13조의 방법 중 <b>초기화 또는 ○○○○</b> 네 글자.',
      flags: ['덮어쓰기'], hint: '같은 블록에 다른 값을 써서 원본을 지우는 방법이에요.' },
    { id: 'encrypt-map', part: 'Ⅱ', cat: '암호화', title: '암호화 판정', pt: 120,
      mission: '판별기에서 <b>이용자의 계좌번호를 내부망 DB에 저장</b>하면 암호화는 의무일까요? (예/아니오)',
      flags: ['예', 'o', 'ㅇ', 'yes', '의무'], hint: '이용자의 계좌번호는 저장 위치와 관계없이 제7조②…' },
    { id: 'hash', part: 'Ⅱ', cat: '일방향', title: '약한 암호 깨기', pt: 150,
      mission: '비밀번호 실습의 레인보우 테이블로 <b>park</b>을 제외한 약한 비밀번호를 해독할 수 있어요. 아이디 <b>kim</b>의 비밀번호는? (솔트 없음 상태에서 대조)',
      flags: ['123456'], hint: '세계에서 가장 흔한 비밀번호. 숫자 6자리.' },
    { id: 'symmetric', part: 'Ⅱ', cat: '대칭키', title: 'ARIA 복호화', pt: 200, crypto: true,
      mission: '아래 ARIA-128-CBC 암호문을 대칭키 실습에서 복호화해 평문을 찾으세요.<br>이 미션을 열면 <b>키·IV·암호문</b>이 자동으로 실습에 채워져요. 복호화 결과(한 단어)를 제출하세요.',
      flags: ['gansedari', '간세다리'], hint: '대칭키 레슨으로 가서 복호화를 누르면 평문이 보여요.' },
    { id: 'transport', part: 'Ⅱ', cat: '전송', title: '도청자의 시야', pt: 130,
      mission: '같은 로그인을 <b>HTTPS(TLS 1.3)</b>로 보내면 도청자가 알 수 있는 것은 패킷의 길이와 무엇뿐일까요? 두 글자.',
      flags: ['시각', '시간'], hint: '6단계 “암호문으로” 패킷의 인스펙터 “보이는 정보”를 보세요.' },
    { id: 'file-lock', part: 'Ⅱ', cat: '파일 암호', title: '봉인된 명단', pt: 120,
      mission: '파일 암호화 실습이 쓰는 암호 알고리즘은? (힌트: AES-256-○○○, 세 글자 모드)',
      flags: ['gcm', 'aes-256-gcm', 'aes256gcm'], hint: '파일 구조 설명과 복호화 실패 시 “인증 태그” 문구에 힌트가 있어요.' },
    { id: 'securecoding', part: 'Ⅲ', cat: 'SW 개발보안', title: '시큐어코딩 7', pt: 140,
      mission: 'SW 개발보안 가이드의 소프트웨어 보안약점은 모두 <b>몇 대 유형</b>으로 나뉘나요? (숫자만)',
      flags: ['7', '7개', '7대'], hint: '입력검증·보안기능·시간및상태·에러처리·코드오류·캡슐화·API오용 — 탭을 세어 보세요.' },
    { id: 'sqli', part: 'Ⅲ', cat: '웹 취약점', title: '인증 우회', pt: 180,
      mission: 'SQL 인젝션 로그인 서버에서 비밀번호 없이 <b>관리자(admin)</b>로 로그인시키는 아이디 입력값을 쓰세요. (프리셋 “관리자 지정” 참고, 끝에 주석 포함)',
      flags: ["admin'--", "admin' --", "admin'-- "], hint: "아이디 칸에 admin 뒤로 따옴표와 주석(--)을 붙여요." },
    { id: 'xss', part: 'Ⅲ', cat: '웹 취약점', title: '쿠키를 지켜라', pt: 150,
      mission: '저장형 XSS로 세션 쿠키를 훔치지 못하게, 자바스크립트의 <b>document.cookie</b> 접근을 막는 쿠키 속성은?',
      flags: ['httponly', 'http only'], hint: '세션 쿠키에 붙이는 속성. Http○○○○.' },
    { id: 'csrf', part: 'Ⅲ', cat: '웹 취약점', title: '출처를 묻다', pt: 150,
      mission: '다른 사이트에서 시작된 요청에 쿠키가 자동으로 붙지 않게 하는 쿠키 속성은? (Lax/Strict 값을 갖는 속성)',
      flags: ['samesite', 'same site', 'samesite=lax'], hint: '쿠키 속성. Same○○○○.' },
    { id: 'upload', part: 'Ⅲ', cat: '웹 취약점', title: '필터를 넘다', pt: 150,
      mission: '업로드 확장자 검사에서 “막을 것”을 나열하는 블랙리스트는 변형에 뚫려요. “허용할 것”만 나열하는 안전한 방식의 이름은? 다섯 글자.',
      flags: ['화이트리스트', 'whitelist'], hint: '블랙리스트의 반대.' },
    { id: 'traversal', part: 'Ⅲ', cat: '웹 취약점', title: '상위로 올라가기', pt: 150,
      mission: '경로 조작에서 상위 디렉터리로 거슬러 올라가는 세 글자 문자열은? (기호 그대로 쓰세요)',
      flags: ['../', '..'], hint: '점 두 개와 슬래시.' },
    { id: 'idor', part: 'Ⅲ', cat: '웹 취약점', title: '번호만 바꿨을 뿐', pt: 160,
      mission: '로그인은 확인하면서 “이 데이터가 이 사람 것인지”는 확인하지 않아, 주소의 회원번호만 바꿔 남의 정보를 보는 취약점의 영문 약자(4글자)는?',
      flags: ['idor'], hint: 'Insecure Direct Object Reference.' },
    { id: 'prompt-inject', part: 'Ⅲ', cat: 'AI 취약점', title: '숨은 지시', pt: 160,
      mission: '2026년 안내서는 AI 취약점을 점검하는 방법으로 “AI 보안 ○○○○”을 권고해요. 네 글자(외래어)는?',
      flags: ['레드티밍', 'red teaming', 'redteaming'], hint: '공격자 관점으로 직접 찔러보는 점검. 레드○○.' },
    { id: 'breach', part: 'Ⅳ', cat: '유출 대응', title: '72의 법칙', pt: 170,
      mission: '유출을 인지한 때부터 정보주체 통지와 보호위원회 신고는 몇 시간 이내에 해야 할까요? (숫자만)',
      flags: ['72', '72시간'], hint: '대응 흐름도와 “72시간 시계”를 보세요.' },
    { id: 'wifi', part: 'Ⅴ', cat: '생활 보안', title: '수상한 와이파이', pt: 120,
      mission: '비밀번호 없는 공개 와이파이로 통신을 가로채는 가짜 AP 공격을 영어로? (Evil ○○○○, 한 단어)',
      flags: ['twin', 'eviltwin', 'evil twin'], hint: '쌍둥이라는 뜻의 영어 단어. Evil ○○○○.' },
    { id: 'phishmail', part: 'Ⅴ', cat: '생활 보안', title: '열기 전에 멈춰', pt: 130,
      mission: '해킹메일에서 즉시 삭제해야 하는 실행파일 확장자 하나를 쓰세요. (점 포함, 예: .___)',
      flags: ['.exe', 'exe', '.scr', 'scr', '.bat', 'bat'], hint: '문서가 아니라 실행되는 파일. .exe · .scr · .bat 중 하나.' },
    { id: 'smishing', part: 'Ⅴ', cat: '생활 보안', title: '문자 속 함정', pt: 130,
      mission: '문자(SMS) 링크로 가짜 사이트·악성앱을 설치하게 하는 문자 피싱을 세 글자로?',
      flags: ['스미싱', 'smishing'], hint: 'SMS + 피싱. ○미싱.' },
    { id: 'qrcode', part: 'Ⅴ', cat: '생활 보안', title: '찍기 전에 확인', pt: 130,
      mission: 'QR코드를 이용한 피싱 공격을 무엇이라 하나요? 세 글자.',
      flags: ['큐싱', 'quishing'], hint: 'QR + 피싱. ○싱.' },
    { id: 'band', part: 'Ⅴ', cat: '생활 보안', title: '아는 사람의 부탁', pt: 150,
      mission: '탈취된 밴드·SNS 계정으로 개인정보 입력을 요구받으면, 입력 전에 반드시 무엇으로 본인을 확인해야 할까요? 두 글자.',
      flags: ['전화', '통화', '전화확인'], hint: '메시지 안에서 말고, 직접 ○○로 확인.' },
    { id: 'msgphish', part: 'Ⅴ', cat: '생활 보안', title: '안전결제의 함정', pt: 140,
      mission: '당근마켓에서 외부 링크로 “안전결제·계좌·카드 인증”을 요구하면? (진행한다 / 거절한다)',
      flags: ['거절한다', '거절', '거부', '안한다'], hint: '앱 안 결제(당근페이)만 안전해요. 외부 링크는?' },
    { id: 'extform', part: 'Ⅴ', cat: '생활 보안', title: '폼도구의 함정', pt: 140,
      mission: '구글 폼·네이버 폼 같은 외부 폼도구로는 무엇을 수집하면 안 되나요? 네 글자.',
      flags: ['개인정보'], hint: '이름·연락처·계좌 등을 묶어 부르는 네 글자.' },
    { id: 'incidents', part: 'Ⅵ', cat: '복원력', title: '63억의 교훈', pt: 160,
      mission: '63억 달러 도난 사고는 가짜 <b>채용 면접의 ○○ 저장소</b>를 내려받다 시작됐어요. 두 글자(개발 과제의 ‘과제’)를 쓰세요.',
      flags: ['과제', '과제파일', '코딩과제'], hint: '면접에서 내주는 ○○. 출처 불명 코드 실행이 문제였어요.' },
    { id: 'resilience', part: 'Ⅵ', cat: '복원력', title: '되돌리는 힘', pt: 170,
      mission: '랜섬웨어 대비 백업 원칙은? 사본 3개·매체 2종·오프라인 1개 → <b>○-○-○</b> 숫자 세 개를 이어 쓰세요.',
      flags: ['321', '3-2-1', '3 2 1'], hint: '3개·2종·1개. 숫자만 이어서.' },
    { id: 'quiz', part: 'Ⅶ', cat: '최종', title: '최종 관문: 확인 문제', pt: 200, final: true,
      mission: '확인 문제 15문제 중 <b>12문제 이상</b>을 맞히면 이 미션이 자동으로 클리어돼요. 풀고 나서 점수를 확인하세요.',
      flags: [], hint: '퀴즈를 풀면 자동으로 깨져요.' }
  ];

  // ---- 난이도별 심화 도전 (첨부 가이드 기반 · 보드에서 바로 푸는 퀴즈) ----
  // lvl: 1 초급 / 2 중급 / 3 고급.  quiz:true → 레슨 페이지 없이 보드에서 바로 답.
  const CH2 = [
    // ── 초급 ──
    { id: 'q-def', lvl: 1, quiz: true, cat: '기본 개념', title: '개인정보란?', pt: 90,
      mission: '살아 있는 개인에 관한 정보로서 <b>특정 개인을 알아볼 수 있는</b> 정보를 무엇이라 하나요? 네 글자.',
      flags: ['개인정보'], hint: '이름·연락처·주민번호 등을 묶어 부르는 네 글자.' },
    { id: 'q-subject', lvl: 1, quiz: true, cat: '기본 개념', title: '정보의 주인', pt: 90,
      mission: '처리되는 개인정보로 <b>알아볼 수 있는 사람</b>, 즉 그 정보의 주인을 무엇이라 하나요? 네 글자.',
      flags: ['정보주체'], hint: '개인정보의 주체. ○○주체.' },
    { id: 'q-sensitive', lvl: 1, quiz: true, cat: '정보 유형', title: '사생활의 핵심', pt: 90,
      mission: '건강·유전·사상·신념·정치성향처럼 사생활을 크게 침해할 수 있어 <b>별도 동의</b>가 필요한 정보를 무엇이라 하나요? 네 글자.',
      flags: ['민감정보'], hint: '법 제23조. ○감정보.' },
    { id: 'q-life', lvl: 1, quiz: true, cat: '처리 단계', title: '한 건의 흐름', pt: 90,
      mission: '개인정보 처리 흐름: 수집 → 이용 → 제공 → <b>○○</b>. 마지막 단계 두 글자는?',
      flags: ['파기'], hint: '목적을 다하면 지체 없이 하는 것.' },
    { id: 'q-cctv-sign', lvl: 1, quiz: true, cat: '영상정보처리기기', title: '찍히고 있어요', pt: 100,
      mission: '공개된 장소에 고정형 영상정보처리기기(CCTV)를 설치·운영할 때, 정보주체가 쉽게 알 수 있도록 반드시 설치해야 하는 것은? 세 글자. (법 제25조④)',
      flags: ['안내판'], hint: '설치 목적·장소·관리책임자 등을 적어 붙이는 것.' },
    { id: 'q-cctv-rec', lvl: 1, quiz: true, cat: '영상정보처리기기', title: '소리는 안 돼', pt: 100,
      mission: '고정형 영상정보처리기기로 <b>녹음</b> 기능을 사용할 수 있나요? (예 / 아니오) — 법 제25조⑤',
      flags: ['아니오', '아니요', 'no', 'x', '안됨', '불가'], hint: '녹음은 법으로 금지돼 있어요.' },
    // ── 중급 ──
    { id: 'q-cctv-keep', lvl: 2, quiz: true, cat: '영상정보처리기기', title: '며칠이나 보관?', pt: 130,
      mission: '개별 법령에 별도 규정이 없을 때, 표준 개인정보 보호지침상 CCTV 영상 보관기간은 <b>며칠 이내</b>가 원칙인가요? (숫자만)',
      flags: ['30', '30일'], hint: '표준지침 제41조. 한 달이에요.' },
    { id: 'q-cctv-mobile', lvl: 2, quiz: true, cat: '영상정보처리기기', title: '하늘을 나는 카메라', pt: 140,
      mission: '드론·웨어러블캠·자율주행차처럼 <b>이동하면서 촬영</b>하는 기기를 무엇이라 하나요? (법 제25조의2) — 다섯 글자 이상, ‘○○형 영상정보처리기기’',
      flags: ['이동형영상정보처리기기', '이동형', '이동형영상기기'], hint: '고정형의 반대. ○○형.' },
    { id: 'q-home-robots', lvl: 2, quiz: true, cat: '홈페이지 노출', title: '검색을 막아라', pt: 130,
      mission: '검색엔진이 홈페이지의 특정 페이지·파일을 수집하지 못하도록 막는 설정 파일의 이름은? (영문 파일명)',
      flags: ['robots.txt', 'robotstxt', 'robots'], hint: '웹 루트에 두는 ○○○○○.txt.' },
    { id: 'q-consent4', lvl: 2, quiz: true, cat: '수집·동의', title: '동의 전에 알릴 것', pt: 130,
      mission: '동의를 받을 때 알려야 할 4가지: 목적·항목·보유기간·<b>동의 ○○ 권리</b>. 두 글자는? (법 제15조②)',
      flags: ['거부', '거부권'], hint: '동의하지 않을 수 있는 권리.' },
    { id: 'q-breach-report', lvl: 2, quiz: true, cat: '유출 대응', title: '신고의 문턱', pt: 140,
      mission: '개인정보가 유출된 정보주체가 <b>몇 명 이상</b>이면 개인정보보호위원회·KISA에 신고해야 하나요? (숫자만, 예: 1000)',
      flags: ['1000', '1천', '1천명', '1000명'], hint: '천 단위예요. ○천 명 이상.' },
    { id: 'q-pseudo', lvl: 2, quiz: true, cat: '정보 유형', title: '이름을 지운 정보', pt: 130,
      mission: '추가 정보 없이는 특정 개인을 알아볼 수 없도록 처리해, 통계·연구에 동의 없이 쓸 수 있는 정보를 무엇이라 하나요? 네 글자.',
      flags: ['가명정보'], hint: '법 제28조의2. ○명정보.' },
    // ── 고급 ──
    { id: 'q-cctv-ledger', lvl: 3, quiz: true, cat: '영상정보처리기기', title: '기록으로 증명', pt: 170,
      mission: '영상정보의 <b>이용·제공·파기·열람</b> 이력을 적어 관리하는 문서의 이름은? 네 글자. (‘영상정보 ○○○○’)',
      flags: ['관리대장', '영상정보관리대장'], hint: 'CCTV 자동삭제·열람을 기록하는 대장.' },
    { id: 'q-cctv-mobile-sign', lvl: 3, quiz: true, cat: '영상정보처리기기', title: '드론이 알리는 법', pt: 180,
      mission: '이동형 영상정보처리기기로 업무 목적 촬영 시, 촬영 사실을 <b>○○·소리·안내판</b> 등으로 표시해야 해요. 빈칸 두 글자는? (법 제25조의2②)',
      flags: ['불빛', '빛'], hint: '드론에서 깜빡이는 것. ○빛.' },
    { id: 'q-ai', lvl: 3, quiz: true, cat: 'AI 개인정보', title: '공개됐어도', pt: 180,
      mission: '생성형 AI 학습 등을 위해 <b>인터넷에 공개된 개인정보</b>라도 수집·이용하려면 무엇이 있어야 하나요? 두 글자(‘○○ 근거’).',
      flags: ['적법', '법적', '적법근거', '법적근거'], hint: '동의 또는 법률 근거 등 처리의 ○○한 근거.' },
    { id: 'q-penalty', lvl: 3, quiz: true, cat: '제재', title: '매출액의 무게', pt: 180,
      mission: '2023년 개정으로 개인정보 보호법 위반 과징금 상한이 위반행위 관련 매출이 아니라 <b>전체 매출액의 ○%</b>로 바뀌었어요. 숫자는? (법 제64조의2)',
      flags: ['3', '3%'], hint: '한 자리 숫자 퍼센트예요.' },
    { id: 'q-destroy-days', lvl: 3, quiz: true, cat: '파기', title: '5일의 규칙', pt: 170,
      mission: '보유기간이 지난 개인정보는 다른 법령에 특별한 규정이 없으면 <b>며칠 이내</b>에 파기해야 하나요? (표준지침, 숫자만)',
      flags: ['5', '5일'], hint: '한 자리 숫자. ○일 이내.' },
    { id: 'q-pia', lvl: 3, quiz: true, cat: '영향평가', title: '평가의 문턱', pt: 180,
      mission: '공공기관 영향평가 의무 기준 중 하나: <b>민감정보·고유식별정보 ○만 명 이상</b>. 숫자는? (영 제35조)',
      flags: ['5', '5만', '5만명'], hint: '한 자리 숫자 + 만. 접속기록 2년 기준과 같아요.' }
  ];

  // ---- AI 분야 (생성형 AI·AI 보안·개인정보 가이드 기반) ----
  const CH_AI = [
    // ── 초급 ──
    { id: 'ai-prompt', lvl: 1, quiz: true, cat: 'AI 기본', title: 'AI에게 거는 말', pt: 90,
      mission: '생성형 AI에게 주는 지시·질문·입력을 가리켜 무엇이라 하나요? 네 글자(외래어).',
      flags: ['프롬프트', 'prompt'], hint: 'ChatGPT에 입력창에 치는 그것. ○○○○.' },
    { id: 'ai-secret', lvl: 1, quiz: true, cat: 'AI 기본', title: '붙여넣기 전에', pt: 100,
      mission: '챗GPT 같은 외부 생성형 AI에 <b>회사 기밀·고객 개인정보</b>를 그대로 입력해도 되나요? (예 / 아니오)',
      flags: ['아니오', '아니요', 'no', 'x', '안됨', '안돼요'], hint: '입력한 내용이 학습·유출될 수 있어요.' },
    { id: 'ai-halluc', lvl: 1, quiz: true, cat: 'AI 기본', title: '그럴듯한 거짓말', pt: 90,
      mission: 'AI가 사실인 척 그럴듯하게 <b>없는 정보를 지어내는</b> 현상을 두 글자로? (‘○○’, 외래어로는 할루시네이션)',
      flags: ['환각', '할루시네이션', 'hallucination'], hint: '실제로는 없는 걸 보는 것. ○각.' },
    { id: 'ai-verify', lvl: 1, quiz: true, cat: 'AI 기본', title: '믿지 말고', pt: 90,
      mission: 'AI가 만든 결과물은 그대로 쓰지 말고 사람이 반드시 사실을 <b>○○</b>해야 해요. 두 글자.',
      flags: ['검증', '확인'], hint: '팩트체크. ○증/○인.' },
    { id: 'ai-train', lvl: 1, quiz: true, cat: 'AI 기본', title: '내 입력의 행방', pt: 90,
      mission: '내가 AI에 입력한 대화가 설정에 따라 모델 <b>○○</b>에 쓰일 수 있어요. 두 글자.',
      flags: ['학습', '훈련'], hint: '데이터로 모델을 가르치는 것. ○습.' },
    // ── 중급 ──
    { id: 'ai-inject', lvl: 2, quiz: true, cat: 'AI 보안', title: '숨은 지시', pt: 140,
      mission: '사용자 입력이나 외부 문서에 <b>숨긴 악성 지시</b>로 AI를 조종하는 공격을 ‘프롬프트 ○○○’이라 해요. (영문 injection)',
      flags: ['인젝션', 'injection', '프롬프트인젝션', 'promptinjection'], hint: 'SQL 인젝션처럼, 입력에 명령을 주입. ○젝션.' },
    { id: 'ai-redteam', lvl: 2, quiz: true, cat: 'AI 보안', title: '찔러보는 점검', pt: 140,
      mission: 'AI의 취약점을 <b>공격자 관점</b>에서 직접 시험하는 점검을 ‘AI 보안 ○○○○’이라 해요. 네 글자(외래어).',
      flags: ['레드티밍', 'redteaming', 'red teaming'], hint: '공격팀(레드팀)이 모의로 공격. 레드○○.' },
    { id: 'ai-poison', lvl: 2, quiz: true, cat: 'AI 보안', title: '오염된 먹이', pt: 140,
      mission: '학습 데이터에 악성 데이터를 몰래 섞어 모델을 망가뜨리는 공격을 ‘데이터 <b>○○</b>(poisoning)’이라 해요. 두 글자.',
      flags: ['중독', '오염'], hint: '독을 타는 것. ○독.' },
    { id: 'ai-mask', lvl: 2, quiz: true, cat: 'AI 개인정보', title: '가리고 올리기', pt: 130,
      mission: 'AI에 자료를 올리기 전, 개인정보를 특정인을 알아볼 수 없게 가리거나 지우는 처리를 무엇이라 하나요? 세 글자(‘○○화’ 또는 마스킹).',
      flags: ['비식별', '비식별화', '마스킹', '가명처리'], hint: '식별할 수 없게. ○식별.' },
    { id: 'ai-bias', lvl: 2, quiz: true, cat: 'AI 윤리', title: '치우친 데이터', pt: 130,
      mission: '학습 데이터가 한쪽으로 치우쳐 특정 집단에 불리한 결과를 내는 문제를 두 글자로? (‘○○’)',
      flags: ['편향', '편견'], hint: '공정성의 반대. ○향.' },
    // ── 고급 ──
    { id: 'ai-agentic', lvl: 3, quiz: true, cat: 'AI 보안', title: '스스로 움직이는 AI', pt: 180,
      mission: '스스로 판단해 도구를 쓰고 <b>행동까지 수행</b>하는 AI를 무엇이라 하나요? (‘○○○○ AI’, 외래어)',
      flags: ['에이전틱', 'agentic', '에이전트', 'agentic ai'], hint: '행위자(agent)의 형용사형. ○이전틱.' },
    { id: 'ai-agency', lvl: 3, quiz: true, cat: 'AI 보안', title: '과한 권한', pt: 180,
      mission: 'Agentic AI의 대표 위험으로, 에이전트에게 필요 이상의 <b>○○</b>·행동 범위를 주는 문제를 ‘과도한 권한(excessive agency)’이라 해요. 두 글자.',
      flags: ['권한', '권능'], hint: '접근·실행을 할 수 있는 힘. ○한.' },
    { id: 'ai-nhi', lvl: 3, quiz: true, cat: 'AI 보안', title: '사람 아닌 신원', pt: 190,
      mission: 'AI 에이전트·서비스계정·API 키처럼 <b>사람이 아닌 주체</b>의 신원을 묶어 NHI, 즉 ‘○○○ 신원’이라 해요. 세 글자.',
      flags: ['비인간', '비인간신원'], hint: 'Non-Human Identity. ○인간.' },
    { id: 'ai-mia', lvl: 3, quiz: true, cat: 'AI 개인정보', title: '학습에 쓰였나', pt: 190,
      mission: '특정 데이터가 <b>모델 학습에 쓰였는지</b>를 알아내 프라이버시를 침해하는 공격을 ‘○○○ 추론(membership inference)’이라 해요. 세 글자.',
      flags: ['멤버십', 'membership'], hint: '구성원 여부를 추론. ○○십.' },
    { id: 'ai-extract', lvl: 3, quiz: true, cat: 'AI 보안', title: '모델을 훔치다', pt: 190,
      mission: '질의를 반복해 모델 자체(파라미터·동작)를 복제·탈취하는 공격을 ‘모델 <b>○○</b>(model extraction)’이라 해요. 두 글자.',
      flags: ['추출', '탈취'], hint: '뽑아내는 것. ○출.' }
  ];

  // 인간 중심 보안 · 넛지보안 (People-Centric Security / Nudge Security)
  const CH_HUMAN = [
    // ── 초급 ──
    { id: 'hc-firewall', lvl: 1, quiz: true, cat: 'HCS 기본', title: '마지막 방어선', pt: 100,
      mission: '아무리 좋은 장비가 있어도 보안의 마지막 방어선은 결국 사람이에요. 보안을 아는 임직원들이 이루는 이 방어선을 ‘인간 <b>○○벽</b>(human firewall)’이라 해요. 두 글자.',
      flags: ['방화', '방화벽', '휴먼방화벽', 'human firewall'], hint: '불을 막는 벽. 네트워크 장비 이름이기도 해요. ○화벽.' },
    { id: 'hc-human-element', lvl: 1, quiz: true, cat: 'HCS 기본', title: '유출의 68%', pt: 90,
      mission: '베리존(Verizon) 보고서에 따르면 데이터 유출의 약 <b>○○%</b>가 기술 결함이 아니라 ‘사람 요인(human element)’에서 비롯돼요. 숫자 두 자리.',
      flags: ['68', '68%'], hint: '70에 조금 못 미치는 수. 6○.' },
    { id: 'hc-pcs', lvl: 1, quiz: true, cat: 'HCS 기본', title: '사람을 가운데로', pt: 100,
      mission: '기술만이 아니라 ‘사람’을 보안 체계의 한가운데에 두고, 임직원을 통제 대상이 아닌 파트너로 보는 접근을 ‘인간 <b>○○</b> 보안(People-Centric Security)’이라 해요. 두 글자.',
      flags: ['중심'], hint: '한가운데. ○심.' },
    { id: 'hc-nudge', lvl: 1, quiz: true, cat: '넛지 설계', title: '슬쩍 찌르기', pt: 100,
      mission: '강제하지 않고도 사람들이 더 안전한 선택을 자연스럽게 하도록 ‘슬쩍 유도’하는 행동경제학 기법을 두 글자 외래어로? (‘○○보안’에 쓰는 바로 그 말)',
      flags: ['넛지', 'nudge'], hint: '팔꿈치로 슬쩍 미는 것. ○지.' },
    { id: 'hc-report', lvl: 1, quiz: true, cat: '보안 문화', title: '혼나지 않게', pt: 90,
      mission: '피싱 메일을 눌렀거나 실수했을 때, 숨기지 않고 빨리 <b>○○</b>할 수 있도록 처벌하지 않는 문화가 중요해요. 두 글자.',
      flags: ['신고', '보고'], hint: '알리는 것. ○고.' },
    // ── 중급 ──
    { id: 'hc-se', lvl: 2, quiz: true, cat: '사회공학', title: '시스템 대신 사람', pt: 130,
      mission: '시스템의 허점이 아니라 사람의 <b>신뢰·두려움·호기심</b>을 노려 속여 넘기는 공격 기법을 ‘○○공학(social engineering)’이라 해요. 두 글자.',
      flags: ['사회', '사회공학', 'social engineering'], hint: '개인이 아니라 집단·관계를 뜻하는 말. ○회.' },
    { id: 'hc-urgency', lvl: 2, quiz: true, cat: '사회공학', title: '지금 당장!', pt: 130,
      mission: '피싱·보이스피싱이 즐겨 쓰는 심리 압박으로, ‘지금 즉시 하지 않으면 큰일 난다’며 조성하는 <b>○○성</b>(urgency)이 있어요. 세 글자.',
      flags: ['긴급성', '긴급', 'urgency'], hint: '급하게 만드는 것. ○급성.' },
    { id: 'hc-fatigue', lvl: 2, quiz: true, cat: '보안 문화', title: '지쳐버린 사람들', pt: 140,
      mission: '보안 경고·교육·인증 절차가 너무 잦아 사람들이 무뎌지고 지쳐서 오히려 규칙을 무시하게 되는 현상을 ‘보안 <b>○○</b>(security fatigue)’라 해요. 두 글자.',
      flags: ['피로', '피로감', 'fatigue'], hint: '지치는 것. ○로.' },
    { id: 'hc-default', lvl: 2, quiz: true, cat: '넛지 설계', title: '가만히 둬도 안전하게', pt: 140,
      mission: '넛지 설계의 핵심으로, 사용자가 따로 바꾸지 않아도 가장 안전한 쪽으로 미리 맞춰 두는 것을 ‘안전한 <b>○○값</b>(secure default)’이라 해요. 두 글자.',
      flags: ['기본', '기본값', 'default'], hint: '초기 설정값. ○본값.' },
    { id: 'hc-phishsim', lvl: 2, quiz: true, cat: '보안 문화', title: '진짜 같은 연습', pt: 130,
      mission: '임직원에게 실제와 비슷한 가짜 피싱 메일을 보내 클릭 여부를 보고 교육으로 이어가는 훈련을 ‘피싱 모의훈련(피싱 <b>○○○○○</b>)’이라 해요. 외래어 다섯 글자.',
      flags: ['시뮬레이션', '모의훈련', 'simulation'], hint: '모의실험을 뜻하는 외래어. 시○○○○.' },
    // ── 고급 ──
    { id: 'hc-trust-verify', lvl: 3, quiz: true, cat: 'HCS 기본', title: '믿되, 확인', pt: 180,
      mission: '인간 중심 보안의 기본 원칙으로, 사람을 믿되 그 행위는 반드시 확인한다는 ‘<b>○○</b>하되 검증하라(Trust But Verify)’가 있어요. 두 글자.',
      flags: ['신뢰', '신용'], hint: '믿음. ○뢰.' },
    { id: 'hc-friction', lvl: 3, quiz: true, cat: '넛지 설계', title: '일부러 걸리적', pt: 180,
      mission: '위험한 행동(대량 다운로드·외부 전송) 직전에 한 번 더 확인·대기하게 만드는 ‘의도적 <b>○○</b>(friction)’을 넣어 실수를 줄여요. 두 글자.',
      flags: ['마찰', '저항', '마찰력'], hint: '미끄러짐을 막는 그 힘. ○찰.' },
    { id: 'hc-ueba', lvl: 3, quiz: true, cat: '보안 문화', title: '평소와 다른 낌새', pt: 190,
      mission: '심야 로그인, 금지 파일 접근처럼 <b>평소와 다른 행동</b>을 자동으로 찾아내는 ‘사용자 행동 <b>○○</b>(behavioral analytics·UEBA)’을 활용해요. 두 글자.',
      flags: ['분석', '행동분석'], hint: '데이터를 쪼개어 살피는 것. ○석.' },
    { id: 'hc-reframe', lvl: 3, quiz: true, cat: '보안 문화', title: '겁주기보다', pt: 180,
      mission: '공포를 자극하는 메시지보다 ‘우리 모두 함께 지킨다’는 <b>○○</b> 책임감으로 바꿔 전달하면 장기적 참여가 늘어요. 두 글자.',
      flags: ['공동', '공동체', '시민'], hint: '혼자가 아니라 다 같이. ○동.' },
    { id: 'hc-psafety', lvl: 3, quiz: true, cat: '보안 문화', title: '솔직히 말할 용기', pt: 190,
      mission: '구성원이 실수나 위협을 두려움 없이 솔직히 보고할 수 있는 조직 분위기를 ‘심리적 <b>○○</b>감(psychological safety)’이라 해요. 두 글자.',
      flags: ['안전', '안정'], hint: '위험하지 않은 상태. ○전.' }
  ];

  // 공공·위수탁·신기술 (공무원·공공기관·공공분야 위수탁 + 스마트글라스 등 이동형 영상기기)
  const CH_PUB = [
    // ── 초급 ──
    { id: 'pub-public', lvl: 1, quiz: true, cat: '공공 기본', title: '더 엄격한 곳', pt: 100,
      mission: '국가·지자체처럼 세금으로 국민의 개인정보를 다루어 더 엄격한 관리가 요구되는 기관을 통틀어 ‘<b>○○</b>기관’이라 해요. 두 글자.',
      flags: ['공공'], hint: '사적(私)의 반대. 모두의. ○공.' },
    { id: 'pub-lookup', lvl: 1, quiz: true, cat: '공공 기본', title: '궁금해서 슬쩍', pt: 110,
      mission: '담당 업무와 상관없는데 호기심으로 민원인·지인·동료의 개인정보를 들여다보는 것은 ‘무단 <b>○○</b>·열람’으로 징계 대상이에요. 두 글자.',
      flags: ['조회', '검색'], hint: '찾아보는 것. ○회.' },
    { id: 'pub-report', lvl: 1, quiz: true, cat: '공공 기본', title: '숨기지 말고', pt: 90,
      mission: '공무원이 개인정보 유출·법규 위반을 알게 되면 숨기지 말고 개인정보 보호책임자(또는 감사부서)에 <b>○○</b>해야 해요. 두 글자.',
      flags: ['보고', '신고'], hint: '윗선에 알리는 것. ○고.' },
    { id: 'pub-consign', lvl: 1, quiz: true, cat: '위수탁', title: '남에게 맡기기', pt: 100,
      mission: '개인정보 처리 업무를 외부 업체에 맡기는 것을 ‘업무 <b>○○</b>(위수탁)’이라 해요. 두 글자.',
      flags: ['위탁'], hint: '맡길 위(委), 맡길 탁(託). ○탁.' },
    { id: 'pub-mobile', lvl: 1, quiz: true, cat: '신기술(영상)', title: '움직이는 카메라', pt: 110,
      mission: '스마트글라스·바디캠·드론처럼 몸에 지니거나 부착해 영상을 찍는 기기를 ‘<b>○○</b>형 영상정보처리기기’라 해요(법 제25조의2). 두 글자.',
      flags: ['이동'], hint: '고정형(CCTV)의 반대. 움직일 수 있는. ○동형.' },
    // ── 중급 ──
    { id: 'pub-doc', lvl: 2, quiz: true, cat: '위수탁', title: '말로 하지 말고', pt: 130,
      mission: '개인정보 처리를 위탁할 때는 위탁 범위·재위탁 제한·안전조치·목적 외 처리 금지 등을 반드시 ‘<b>○○</b>’로 정해야 해요(법 제26조). 두 글자.',
      flags: ['문서', '계약', '서면'], hint: '구두 말고 글로. ○서.' },
    { id: 'pub-disclose', lvl: 2, quiz: true, cat: '위수탁', title: '누구에게 맡겼나', pt: 130,
      mission: '위탁하는 업무와 수탁자(맡은 업체)는 정보주체가 알 수 있게 홈페이지 등에 ‘<b>○○</b>’해야 해요. 두 글자.',
      flags: ['공개', '게시'], hint: '숨기지 않고 드러냄. ○개.' },
    { id: 'pub-supervise', lvl: 2, quiz: true, cat: '위수탁', title: '맡겼어도 내 책임', pt: 140,
      mission: '위탁자(공공기관)는 수탁자가 개인정보를 제대로 다루는지 교육하고 ‘관리·<b>○○</b>’해야 해요(법 제26조·제28조). 두 글자.',
      flags: ['감독', '점검'], hint: '지켜보고 지도함. ○독.' },
    { id: 'pub-glass-notice', lvl: 2, quiz: true, cat: '신기술(영상)', title: '찍는 중이에요', pt: 140,
      mission: '이동형 영상기기로 공개된 장소를 업무상 촬영할 때는 불빛·소리·안내판 등으로 ‘<b>○○</b> 사실’을 명확히 표시해야 해요. 두 글자.',
      flags: ['촬영'], hint: '사진·영상을 찍음. ○영.' },
    { id: 'pub-basic', lvl: 2, quiz: true, cat: '공공 사고', title: '거창한 해킹보다', pt: 130,
      mission: '최근 공공부문 침해사고의 상당수는 대단한 공격이 아니라 기본 보안 ‘<b>○○</b>’ 미준수에서 비롯돼요. 두 글자.',
      flags: ['수칙', '규칙'], hint: '지켜야 할 규칙. ○칙.' },
    { id: 'pub-file', lvl: 2, quiz: true, cat: '공공 기본', title: '파일은 신고하고 쓰기', pt: 140,
      mission: '공공기관이 개인정보파일을 운용하려면 명칭·근거·목적·항목·보유기간 등을 개인정보위에 ‘<b>○○</b>’해야 해요(법 제32조, 범죄수사 등은 예외). 두 글자.',
      flags: ['등록', '신고'], hint: '명부에 올리는 것. ○록.' },
    // ── 고급 ──
    { id: 'pub-dismiss', lvl: 3, quiz: true, cat: '공공 기본', title: '공직에서 아웃', pt: 190,
      mission: '공직자가 개인정보를 고의로 유출·부정이용해 중대한 침해를 일으키면 파면·해임, 즉 공직에서 ‘<b>○○</b>’될 수 있어요(2023.1 시행 징계지침). 두 글자.',
      flags: ['퇴출', '배제'], hint: '쫓겨남. ○출.' },
    { id: 'pub-severity', lvl: 3, quiz: true, cat: '공공 기본', title: '중대성의 선', pt: 180,
      mission: '공직자 징계에서 ‘중대’를 가르는 요소로 민감·고유식별정보, 영리 목적과 함께 ‘<b>○,000명</b> 이상’ 유출이 제시돼요. 앞 숫자 한 자리.',
      flags: ['1', '1000', '1,000', '천'], hint: '네 자리 수의 맨 앞. 1○○○명.' },
    { id: 'pub-reconsign', lvl: 3, quiz: true, cat: '위수탁', title: '또 다른 곳에', pt: 190,
      mission: '수탁자가 받은 업무를 또 다른 업체에 다시 맡기는 ‘재위탁’은 원칙적으로 위탁자의 ‘<b>○○</b>’를 받아야 해요. 두 글자.',
      flags: ['동의', '승인'], hint: '허락. ○의.' },
    { id: 'pub-glass-ban', lvl: 3, quiz: true, cat: '신기술(영상)', title: '원칙은 안 돼요', pt: 180,
      mission: '공개된 장소에서 이동형 영상기기로 ‘업무 목적’ 촬영은 원칙적으로 <b>○○</b>되고, 동의·법령·급박한 생명·신체·재산상 이익 등 예외만 허용돼요. 두 글자.',
      flags: ['금지', '제한'], hint: '하지 못하게 함. ○지.' },
    { id: 'pub-penalty', lvl: 3, quiz: true, cat: '공공 사고', title: '공공의 과징금', pt: 190,
      mission: '공공기관 개인정보 유출 과징금은 매출이 아닌 ‘정액’으로 부과되며 상한이 <b>○○억</b> 원이에요. 숫자 두 자리.',
      flags: ['50'], hint: '오십. ○0억.' },
    { id: 'pub-rrn', lvl: 3, quiz: true, cat: '공공 기본', title: '주민번호는 조문 있어야', pt: 190,
      mission: '주민등록번호는 법률·대통령령·대법원규칙·감사원규칙 등에 ‘처리할 수 있는 <b>○○</b>’이 있어야만 수집·처리할 수 있어요(법 제24조의2). 개인정보파일 운영근거에 그 조항을 반드시 입력! 두 글자.',
      flags: ['조문', '근거', '조항'], hint: '법령의 구체적 조(條). ○문/○항.' }
  ];

  const LVLNAME = { 1: '초급', 2: '중급', 3: '고급' };
  CH2.forEach(c => c.track = 'gen'); CH_AI.forEach(c => c.track = 'ai'); CH_HUMAN.forEach(c => c.track = 'human'); CH_PUB.forEach(c => c.track = 'pub');
  const CH2X = CH2.concat(CH_AI).concat(CH_HUMAN).concat(CH_PUB);
  const ALL = CH.concat(CH2X);
  const RANKS = [[0, '오름 입문자'], [600, '간세 수습'], [1400, '보안 올레꾼'], [2400, '요망진 탐정'], [3400, '개인정보 지킴이'], [4200, '간세다리 마스터'], [5400, '혼디지킴이 명인'], [6400, '제주 정보보호 수호자']];
  const TOTAL = ALL.reduce((s, c) => s + c.pt, 0);

  // ---- 오름 단계 (동 → 남 → 서 → 북) ----
  const STAGES = [
    { dir: '동', oreum: '다랑쉬오름', desc: '처리 흐름과 안전조치', ids: ['lifecycle', 'selfcheck', 'levelcheck', 'safeguards', 'access-log', 'consign', 'webexposure', 'impact', 'destroy'] },
    { dir: '남', oreum: '따라비오름', desc: '개인정보의 암호화', ids: ['encrypt-map', 'hash', 'symmetric', 'transport', 'file-lock'] },
    { dir: '서', oreum: '새별오름', desc: '웹 취약점과 유출 대응', ids: ['securecoding', 'sqli', 'xss', 'csrf', 'upload', 'traversal', 'idor', 'prompt-inject', 'breach'] },
    { dir: '북', oreum: '사라봉', desc: '생활 속 보안', ids: ['wifi', 'phishmail', 'smishing', 'qrcode', 'band', 'msgphish', 'extform'] },
    { dir: '정상', oreum: '한라산 백록담', desc: '사이버 복원력과 최종 관문', ids: ['incidents', 'resilience', 'quiz'] }
  ];
  const DIRPT = { '동': '🌅', '남': '🏔', '서': '🌾', '북': '⛰', '정상': '🗻' };
  const stageOf = id => STAGES.find(st => st.ids.includes(id));

  // 대칭키 미션용 고정 키/IV/암호문 (평문: GANSEDARI) — labs-crypto가 읽어 자동 주입
  window.PI.ctfCrypto = { key: '00112233445566778899aabbccddeeff', iv: '0f0e0d0c0b0a09080706050403020100', b64: 'Jo8bjo+beywf3QuxJGQTzw==' };

  // ---- 세션(휘발성): 약 2시간 유지, 영구 저장 안 함 (sessionStorage + 만료) ----
  const SKEY = 'ctf-session', TTL = 2 * 60 * 60 * 1000;
  function sload() { try { const o = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); if (o && Date.now() - o.savedAt < TTL) return o; } catch (e) {} return null; }
  function ssave() { if (!sess) return; sess.savedAt = Date.now(); try { sessionStorage.setItem(SKEY, JSON.stringify(sess)); } catch (e) {} }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  const PICK_PER_TIER = 4;
  const NPC = ['한라바람', '성산해녀', '올레왕', '유채꽃소녀', '돌하르방', '감귤러버', '바당지기', '오름순이', '요망진삼춘', '백록담지기'];
  let sess = sload();
  function pickTiers(pool) { const p = {}; [1, 2, 3].forEach(l => p[l] = shuffle(pool.filter(c => c.lvl === l).map(c => c.id)).slice(0, PICK_PER_TIER)); return p; }
  function newSession(nick) {
    const board = shuffle(NPC).slice(0, 6).map(n => ({ nick: n, score: 250 + Math.floor(Math.random() * 2800), npc: true }));
    sess = { nick: nick, solved: {}, pick: pickTiers(CH2), pickAI: pickTiers(CH_AI), pickHuman: pickTiers(CH_HUMAN), pickPub: pickTiers(CH_PUB), board: board, savedAt: Date.now() }; ssave();
  }
  const flat = o => o ? [].concat(o[1], o[2], o[3]) : [];
  function activePick() { return sess ? flat(sess.pick).concat(flat(sess.pickAI)).concat(flat(sess.pickHuman)).concat(flat(sess.pickPub)) : []; }
  const isSolved = id => !!(sess && sess.solved[id]);
  const unlockedIdx = () => { let i = 0; while (i < CH.length && isSolved(CH[i].id)) i++; return i; }; // 첫 미해결 = 현재 열린 단계
  const isOpen = idx => idx <= unlockedIdx();
  function score() { let s = 0; CH.forEach(c => { if (isSolved(c.id)) s += c.pt; }); activePick().forEach(id => { if (isSolved(id)) { const c = CH2X.find(x => x.id === id); if (c) s += c.pt; } }); return s; }
  function activeTotal() { let t = CH.reduce((s, c) => s + c.pt, 0); activePick().forEach(id => { const c = CH2X.find(x => x.id === id); if (c) t += c.pt; }); return t; }
  function activeCount() { return CH.length + activePick().length; }
  function solvedCount() { let n = CH.filter(c => isSolved(c.id)).length; activePick().forEach(id => { if (isSolved(id)) n++; }); return n; }
  const rank = sc => RANKS.filter(r => sc >= r[0]).slice(-1)[0][1];
  function updateBoardEntry() { if (!sess) return; let me = sess.board.find(e => e.me); const sc = score(); if (!me) { me = { nick: sess.nick, me: true, score: sc }; sess.board.push(me); } me.score = sc; me.nick = sess.nick; ssave(); }
  function leaderboard() { if (!sess) return []; updateBoardEntry(); return sess.board.slice().sort((a, b) => b.score - a.score); }

  const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  function tryFlag(ch, val) { return ch.flags.some(f => norm(f) === norm(val)); }

  // ---- 보드 렌더 ----
  function board() {
    const host = $('#ctfBoard'); if (!host) return;
    if (!sess || !sess.nick) { renderGate(host); return; }
    if (sess && !sess.pickAI) { sess.pickAI = pickTiers(CH_AI); ssave(); } // 이전 세션 호환
    if (sess && !sess.pickHuman) { sess.pickHuman = pickTiers(CH_HUMAN); ssave(); } // 이전 세션 호환
    if (sess && !sess.pickPub) { sess.pickPub = pickTiers(CH_PUB); ssave(); } // 이전 세션 호환
    const sc = score(), cur = unlockedIdx(), solvedN = solvedCount(), cnt = activeCount(), tot = activeTotal();
    const pct = Math.round(sc / tot * 100);
    const lb = leaderboard(), myRank = lb.findIndex(e => e.me) + 1;
    host.innerHTML = `
      <div class="ctf-hero">
        <div class="ctf-mascot">${pony('happy')}<div class="ctf-bubble">${solvedN === 0 ? `반갑다 <b>${esc(sess.nick)}</b>! 난 <b>요망진 간세다리</b>. 오름 미션을 하나씩 깨멍 배워보게 마씸!` : solvedN === cnt ? '다 깼져! 자네가 바로 <b>요망진 개인정보 지킴이</b>라.' : `<b>${esc(sess.nick)}</b>, 지금 <b>${solvedN}관문</b> 통과! 요망지게 가보자.`}</div></div>
        <div class="ctf-head">
          <div class="ctf-eyebrow">CTF 챌린지 · 미션을 깨면 다음 단계가 열려요</div>
          <h1>요망진 간세다리와 함께<br>배우는 <em>개인정보 보호</em></h1>
          <div class="ctf-stat"><div><b>${sc}</b><span>점 / ${tot}</span></div><div><b>${solvedN}</b><span>/ ${cnt} 관문</span></div><div><b>${myRank}위</b><span>현재 순위</span></div><div><b>${esc(rank(sc))}</b><span>등급</span></div></div>
          <div class="ctf-meter"><i style="width:${pct}%"></i></div>
          <div class="row" style="margin-top:12px;gap:8px"><button class="btn primary" id="ctfGo" type="button">${solvedN === 0 ? '첫 미션 시작' : '이어서 도전'}</button><button class="btn" id="ctfReset" type="button">새로 시작</button></div>
        </div>
      </div>
      <section class="ctf-rank">
        <div class="ctf-rank-head">🏆 실시간 랭킹 <small>세션 기준 · 약 2시간 유지, 저장하지 않음</small></div>
        <ol class="ctf-rank-list">${lb.slice(0, 8).map((e, i) => `<li class="${e.me ? 'me' : ''}"><span class="r-pos ${i < 3 ? 'top' : ''}">${i + 1}</span><span class="r-nick">${esc(e.nick)}${e.me ? ' <b>(나)</b>' : e.npc ? ' <span class="r-bot">BOT</span>' : ''}</span><span class="r-score">${e.score}점</span></li>`).join('')}</ol>
      </section>
      ${STAGES.map(st => {
        const items = st.ids.map(id => [CH.find(c => c.id === id), CH.findIndex(c => c.id === id)]);
        const sN = items.filter(([c]) => isSolved(c.id)).length, done = sN === items.length, started = items.some(([, i]) => isOpen(i));
        return `<section class="ctf-stage ${done ? 'done' : started ? 'active' : 'locked'}">
          <div class="ctf-stage-head"><span class="ctf-dir">${DIRPT[st.dir]} ${st.dir}쪽</span><div><b>${esc(st.oreum)}</b><span>${esc(st.desc)}</span></div><span class="ctf-stage-prog">${sN}/${items.length}${done ? ' ✓' : ''}</span></div>
          <div class="ctf-grid">${items.map(([c, i]) => {
            const s = isSolved(c.id), open = isOpen(i), state = s ? 'solved' : open ? 'open' : 'locked';
            return `<button class="ctf-card ${state}" ${open ? '' : 'disabled'} data-id="${c.id}">
              <div class="ctf-card-top"><span class="ctf-num">${String(i + 1).padStart(2, '0')}</span><span class="ctf-ico">${s ? '✓' : open ? '▶' : '🔒'}</span></div>
              <b>${esc(c.title)}</b>
              <div class="ctf-tags"><span class="chip">${esc(c.cat)}</span><span class="ctf-pt">${c.pt}pt</span></div>
              <span class="ctf-state">${s ? 'CLEAR' : open ? '도전 가능' : '잠김'}</span>
            </button>`;
          }).join('')}</div>
        </section>`;
      }).join('')}
      ${advBoard()}`;
    $('#ctfGo').onclick = () => { location.hash = CH[Math.min(cur, CH.length - 1)].id; };
    $('#ctfReset').onclick = () => { if (confirmReset()) { try { sessionStorage.removeItem(SKEY); } catch (e) {} sess = null; board(); } };
    host.querySelectorAll('.ctf-card[data-id]:not(.locked)').forEach(b => b.onclick = () => { location.hash = b.dataset.id; });
    host.querySelectorAll('.ctf-card[data-quiz]:not(.locked)').forEach(b => b.onclick = () => openQuiz(b.dataset.quiz));
  }

  function renderGate(host) {
    host.innerHTML = `<div class="ctf-hero ctf-gate">
      <div class="ctf-mascot">${pony('happy')}<div class="ctf-bubble">반갑수다! 시작하기 전에 <b>닉네임</b>을 정해줍서. 랭킹에 쓰입니다(저장 안 함).</div></div>
      <div class="ctf-head">
        <div class="ctf-eyebrow">요망진 간세다리와 함께하는 개인정보 보호 CTF</div>
        <h1>닉네임을 입력하고<br><em>오름에 올라보게</em></h1>
        <div class="gate-form"><input class="input" id="nickIn" maxlength="12" placeholder="예: 요망진삼춘" autocomplete="off" spellcheck="false"><button class="btn primary" id="nickGo" type="button">시작하기</button></div>
        <p class="gate-note">문제는 접속할 때마다 <b>랜덤</b>으로 구성돼요. 진행과 랭킹은 이 브라우저 세션에만 <b>약 2시간</b> 유지되고 영구 저장되지 않아요.</p>
      </div></div>`;
    const go = () => { const v = ($('#nickIn').value || '').trim() || ('손님' + Math.floor(Math.random() * 900 + 100)); newSession(v.slice(0, 12)); board(); };
    $('#nickGo').onclick = go;
    const inp = $('#nickIn'); inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); setTimeout(() => inp.focus(), 50);
  }

  function renderTrack(key, meta, pickObj) {
    const items = flat(pickObj).map(id => CH2X.find(c => c.id === id)).filter(Boolean);
    const solvedTier = l => items.filter(c => c.lvl === l).every(c => isSolved(c.id));
    const tierOpen = l => l === 1 || solvedTier(l - 1);
    const total = items.length, sN = items.filter(c => isSolved(c.id)).length;
    return `<section class="ctf-stage ctf-adv ${key === 'ai' ? 'ctf-ai' : key === 'human' ? 'ctf-human' : key === 'pub' ? 'ctf-pub' : ''} ${total && sN === total ? 'done' : 'active'}">
      <div class="ctf-stage-head"><span class="ctf-dir">${meta.icon} ${meta.tag}</span><div><b>${meta.title}</b><span>${meta.desc}</span></div><span class="ctf-stage-prog">${sN}/${total}</span></div>
      ${[1, 2, 3].map(l => {
        const its = items.filter(c => c.lvl === l), open = tierOpen(l), ds = its.filter(c => isSolved(c.id)).length;
        return `<div class="ctf-tier ${open ? '' : 'tlock'}"><div class="ctf-tier-head"><span class="lvl-badge lvl${l}">${LVLNAME[l]}</span><small>${ds}/${its.length}${open ? '' : ' · 이전 난이도를 모두 깨면 열려요'}</small></div>
          <div class="ctf-grid">${its.map(c => { const s = isSolved(c.id); return `<button class="ctf-card ${s ? 'solved' : open ? 'open' : 'locked'}" ${open ? '' : 'disabled'} data-quiz="${c.id}"><div class="ctf-card-top"><span class="lvl-badge lvl${l}">${LVLNAME[l]}</span><span class="ctf-ico">${s ? '✓' : open ? '▶' : '🔒'}</span></div><b>${esc(c.title)}</b><div class="ctf-tags"><span class="chip">${esc(c.cat)}</span><span class="ctf-pt">${c.pt}pt</span></div><span class="ctf-state">${s ? 'CLEAR' : open ? '도전 가능' : '잠김'}</span></button>`; }).join('')}</div>
          <div class="ctf-quiz-panel" id="qp-${key}-${l}"></div></div>`;
      }).join('')}
    </section>`;
  }
  function advBoard() {
    return renderTrack('gen', { icon: '🎯', tag: '심화', title: '난이도별 심화 도전', desc: '첨부 가이드 기반 · 접속마다 랜덤 출제' }, sess.pick)
      + renderTrack('ai', { icon: '🤖', tag: 'AI', title: 'AI 분야 도전', desc: 'AI 개인정보·보안·레드티밍·Agentic AI 등 · 랜덤 출제' }, sess.pickAI)
      + renderTrack('human', { icon: '🧠', tag: '인간중심', title: '인간 중심 보안 도전', desc: '넛지보안·사회공학·보안문화·휴먼 방화벽 · 랜덤 출제' }, sess.pickHuman)
      + renderTrack('pub', { icon: '🏛', tag: '공공·위수탁', title: '공공·위수탁·신기술 도전', desc: '공무원 징계·공공기관 위수탁·스마트글라스(이동형 영상기기) · 랜덤 출제' }, sess.pickPub);
  }

  function openQuiz(id) {
    const c = CH2X.find(x => x.id === id); if (!c) return;
    const panel = $('#qp-' + c.track + '-' + c.lvl); if (!panel) return;
    if (isSolved(id)) { panel.innerHTML = `<div class="mission done"><div class="mission-row"><span class="mission-pony">${pony('happy')}</span><div><b>🚩 ${esc(c.title)} <span class="chip ok">CLEAR</span></b><p>이미 깬 미션이에요.</p></div></div></div>`; return; }
    panel.innerHTML = `<div class="mission"><div class="mission-row"><span class="mission-pony">${pony('think')}</span><div style="flex:1;min-width:0"><b>🚩 ${esc(c.title)} <span class="ctf-pt">${c.pt}pt</span> <span class="lvl-badge lvl${c.lvl}">${LVLNAME[c.lvl]}</span></b><p>${c.mission}</p><div class="mission-form"><input class="input mono" id="qflag-${id}" placeholder="플래그 입력" autocomplete="off" spellcheck="false"><button class="btn primary" data-qsub="${id}" type="button">제출</button><button class="btn" data-qhint="${id}" type="button">힌트</button></div><p class="mission-feedback" id="qmf-${id}"></p></div></div></div>`;
    const inp = $('#qflag-' + id); if (inp) inp.focus();
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function winQuiz(id) {
    if (!sess || isSolved(id)) return; sess.solved[id] = Date.now(); ssave(); updateBoardEntry(); confetti();
    const c = CH2X.find(x => x.id === id);
    const t = document.createElement('div'); t.className = 'ctf-toast'; t.innerHTML = `<b>✓ 정답! +${c.pt}pt</b> · ${esc(sess.nick)}`; document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
    board();
  }
  let resetArm = 0;
  function confirmReset() { const now = Date.now(); if (now - resetArm < 3000) return true; resetArm = now; const b = $('#ctfReset'); if (b) { b.textContent = '한 번 더 누르면 초기화'; setTimeout(() => { if ($('#ctfReset')) $('#ctfReset').textContent = '진행 초기화'; }, 3000); } return false; }

  // ---- 미션 바(각 레슨 상단) ----
  function missionBar(id) {
    const ch = CH.find(c => c.id === id); if (!ch) return;
    const sec = document.getElementById(id); if (!sec) return;
    let bar = sec.querySelector('.mission'); if (bar) bar.remove();
    const idx = CH.indexOf(ch), open = isOpen(idx), s = isSolved(id);
    bar = document.createElement('div');
    bar.className = 'mission' + (s ? ' done' : open ? '' : ' locked');
    const next = CH[idx + 1];
    if (!open) {
      bar.innerHTML = `<div class="mission-row"><span class="mission-pony">${pony('sad')}</span><div><b>🔒 아직 잠긴 미션</b><p>이전 관문을 먼저 깨야 열려요. <a href="#home">챌린지 보드로</a> 돌아가 순서대로 도전하게.</p></div></div>`;
    } else {
      bar.innerHTML = `<div class="mission-row"><span class="mission-pony">${pony(s ? 'happy' : 'think')}</span><div style="flex:1;min-width:0">
        <b>🚩 미션 ${idx + 1}. ${esc(ch.title)} <span class="ctf-pt">${ch.pt}pt</span> ${s ? '<span class="chip ok">CLEAR</span>' : ''}</b>
        <p>${ch.mission}</p>
        ${ch.crypto ? cryptoWidget() : ''}
        ${ch.final ? `<p class="mission-feedback" id="mf-${id}" aria-live="polite"></p>` : `<div class="mission-form"><input class="input mono" id="flag-${id}" placeholder="플래그 입력" autocomplete="off" spellcheck="false" ${s ? 'disabled' : ''} value="${s ? '●●● CLEAR' : ''}"><button class="btn primary" data-sub="${id}" type="button" ${s ? 'disabled' : ''}>제출</button><button class="btn" data-hint="${id}" type="button">힌트</button></div>
        <p class="mission-feedback" id="mf-${id}" aria-live="polite"></p>`}
      </div></div>`;
    }
    sec.insertBefore(bar, sec.firstChild.nextSibling);
  }

  function cryptoWidget() {
    const c = window.PI.ctfCrypto;
    return `<div class="ctf-crypto">
      <div class="ctf-kv"><span>알고리즘</span><code>ARIA-128-CBC</code></div>
      <div class="ctf-kv"><span>키 (hex)</span><code>${c.key}</code></div>
      <div class="ctf-kv"><span>IV (hex)</span><code>${c.iv}</code></div>
      <div class="ctf-kv"><span>암호문 (Base64)</span><code>${c.b64}</code></div>
      <div class="row" style="margin-top:8px"><button class="btn" id="ctfDecrypt" type="button">복호화 실행</button><span id="ctfPlain" class="mono" style="font-weight:700"></span></div>
    </div>`;
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('#ctfDecrypt')) return;
    const c = window.PI.ctfCrypto, K = window.KCipher;
    try {
      const h = s => Uint8Array.from(s.match(/../g).map(v => parseInt(v, 16)));
      const ct = Uint8Array.from(atob(c.b64), ch => ch.charCodeAt(0));
      const pt = K.cbcDecrypt(K.ARIA, h(c.key), h(c.iv), ct);
      $('#ctfPlain').innerHTML = '<span class="tag-ok">평문: ' + esc(new TextDecoder().decode(pt)) + '</span>';
    } catch (err) { $('#ctfPlain').textContent = '복호화 실패: ' + err.message; }
  });

  function win(id) {
    if (!sess) newSession('손님' + Math.floor(Math.random() * 900 + 100));
    if (isSolved(id)) return;
    sess.solved[id] = Date.now(); ssave(); updateBoardEntry();
    const ch = CH.find(c => c.id === id), idx = CH.indexOf(ch), next = CH[idx + 1];
    const bar = document.querySelector('#' + id + ' .mission');
    if (bar) {
      bar.classList.add('done');
      const inp = bar.querySelector('.mission-form .input'); if (inp) { inp.value = '●●● CLEAR'; inp.disabled = true; }
      bar.querySelectorAll('.mission-form button').forEach(b => b.disabled = true);
      const pm = bar.querySelector('.mission-pony'); if (pm) pm.innerHTML = pony('happy');
      const titleB = bar.querySelector('b'); if (titleB && !titleB.querySelector('.chip')) titleB.insertAdjacentHTML('beforeend', ' <span class="chip ok">CLEAR</span>');
    }
    const mf = $('#mf-' + id);
    if (mf) mf.innerHTML = `<span class="tag-ok">✓ 정답! +${ch.pt}pt</span> ${next ? `다음 관문 <b>${esc(next.title)}</b>이 열렸수다! ` : '마지막 관문까지 — 요망지다!'} ${next ? `<a href="#${next.id}">다음 미션 →</a>` : '<a href="#home">보드 보기 →</a>'}`;
    confetti();
  }

  document.addEventListener('click', e => {
    const sub = e.target.closest('[data-sub]'); if (sub) { const id = sub.dataset.sub, inp = $('#flag-' + id), ch = CH.find(c => c.id === id); if (tryFlag(ch, inp.value)) win(id); else { const mf = $('#mf-' + id); mf.innerHTML = '<span class="tag-plain">✗ 아직 아니라. 레슨을 더 해보고 다시 — 힌트도 눌러보게.</span>'; inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); } return; }
    const h = e.target.closest('[data-hint]'); if (h) { const id = h.dataset.hint, ch = CH.find(c => c.id === id); $('#mf-' + id).innerHTML = `<span class="tag-warn">💡 ${esc(ch.hint)}</span>`; }
    // 심화 퀴즈
    const qs = e.target.closest('[data-qsub]'); if (qs) { const id = qs.dataset.qsub, inp = $('#qflag-' + id), ch = CH2X.find(c => c.id === id); if (tryFlag(ch, inp.value)) winQuiz(id); else { $('#qmf-' + id).innerHTML = '<span class="tag-plain">✗ 아직 아니라. 힌트를 눌러보게.</span>'; inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); } return; }
    const qh = e.target.closest('[data-qhint]'); if (qh) { const ch = CH2X.find(c => c.id === qh.dataset.qhint); $('#qmf-' + qh.dataset.qhint).innerHTML = `<span class="tag-warn">💡 ${esc(ch.hint)}</span>`; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('qflag-')) { const id = e.target.id.slice(6), ch = CH2X.find(c => c.id === id); if (tryFlag(ch, e.target.value)) winQuiz(id); } });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('flag-')) { const id = e.target.id.slice(5); const ch = CH.find(c => c.id === id); if (tryFlag(ch, e.target.value)) win(id); else $('#mf-' + id).innerHTML = '<span class="tag-plain">✗ 아직 아니라. 다시 도전!</span>'; } });

  // 퀴즈 최종 미션: 12점 이상이면 자동 클리어
  window.addEventListener('ctf-quiz-score', e => { if (e.detail >= 12 && !isSolved('quiz')) win('quiz'); });

  // 대칭키 암호문 주입 (labs-crypto가 window.PI.ctfCrypto.b64를 채운 뒤 호출)
  function injectCrypto() { window.dispatchEvent(new CustomEvent('ctf-crypto-request')); }

  function confetti() {
    if (window.PI.reduced()) return;
    const n = 36, box = document.createElement('div'); box.className = 'confetti';
    for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.style.cssText = `left:${Math.random() * 100}%;background:hsl(${Math.random() * 360},70%,55%);animation-delay:${Math.random() * .3}s;transform:rotate(${Math.random() * 360}deg)`; box.appendChild(d); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 2200);
  }

  window.addEventListener('lessonroute', e => { const id = e.detail.id; if (id === 'home') board(); else missionBar(id); });
  document.addEventListener('DOMContentLoaded', () => { if (!location.hash || location.hash === '#home') board(); });
})();
