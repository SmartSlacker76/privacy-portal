/* 사이트 설정 — 이 파일에는 인증키(OC 등)를 절대 적지 않습니다.
   법제처 Open API를 실연동하려면 Cloudflare Worker를 배포한 뒤(worker/worker.js),
   아래 WORKER_URL 을 내 Worker 주소로 바꾸세요. 예: 'https://privacy-agent.계정.workers.dev/'
   비워 두면(기본) '토큰 0 모드' — 근거 법령을 국가법령정보센터 바로가기 링크로 연결합니다(키 불필요). */
window.APP_CONFIG = {
  WORKER_URL: 'https://privacy-agent.seowipo-soc.workers.dev/',  // ← Worker 주소(끝에 / 포함). 비우면 토큰 0 모드(바로가기 링크).
  /* 시민용 챗봇에 붙일 우리 기관 담당 부서. 비워 두면 버튼을 표시하지 않습니다(공개 대표번호만 적으세요). */
  AGENCY: {
    privacy: { dept: '', tel: '', url: '' },   // 예: { dept: '개인정보 보호담당관', tel: '064-000-0000' }
    security: { dept: '', tel: '', url: '' }   // 예: { dept: '정보보안팀', tel: '064-000-0000' }
  }
};
