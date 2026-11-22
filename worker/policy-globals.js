/* 처리방침 점검 규칙(assets/policy/rules.js)은 브라우저용으로 window.RULES 에 값을 넣습니다.
   Worker·Node 에는 window 가 없으므로 rules.js 보다 먼저 이 파일을 불러 globalThis 를 window 로 씁니다. */
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
