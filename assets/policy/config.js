/* 처리방침 점검 전용 설정 — 인증키는 절대 두지 않습니다(Worker Secret으로만 관리).
   WORKER_URL 을 비우면 공개 프록시를 통해 페이지만 불러오는 '토큰 0 모드'로 동작합니다. */
window.APP_CONFIG = {
  WORKER_URL: 'https://privacy-agent.seowipo-soc.workers.dev/',
  PUBLIC_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?url=',
    'https://api.codetabs.com/v1/proxy?quest='
  ],
  AI: { model: 'claude-haiku-5-5', maxTokensFix: 1200, maxTokensAudience: 1800, excerptChars: 350 }
};
