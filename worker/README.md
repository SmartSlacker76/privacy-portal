# 공개 법령·처리방침 게이트웨이

Cloudflare Worker 운영 계정에서 worker.js를 갱신합니다. GitHub Pages 배포와 Worker 배포는 독립적입니다.

| 설정 | 적용값 |
| --- | --- |
| ALLOWED_ORIGIN | Pages 또는 기관 사이트의 HTTPS 오리진 한 개. 경로와 끝 슬래시 제외 |
| LAW_OC | 법제처 OC. Worker Secret으로 관리 |
| LAW_RATE | IP별 법령 조회 Rate Limit 바인딩. 예시 분당 30회 |
| POLICY_FETCH_URLS | 승인된 공개 HTTPS 처리방침 전체 URL을 공백으로 구분 |
| POLICY_RATE | IP별 공개 자료 가져오기 Rate Limit 바인딩. 예시 분당 10회 |
| MCP_TOKEN | MCP 운영 시에만 서버용 고엔트로피 비밀을 Secret으로 등록 |
| MCP_RATE | MCP 운영 시에만 IP별 Rate Limit 바인딩을 적용. 예시 분당 20회 |

- 기관이 통제하는 공개 페이지로 허용 목록을 구성합니다. 리디렉션은 차단합니다. 허용 목록이 비어 있으면 브라우저 직접 조회, 본문 붙여넣기와 파일 가져오기를 사용합니다.
- [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)에 따라 바인딩마다 계정에서 사용하지 않는 숫자 네임스페이스를 할당합니다. Cloudflare 위치별로 호출 제한이 적용되므로 계정 사용량도 모니터링합니다.
- 관리, 생성형 AI, 공개 API 명세, 대화, 파일 경로는 거부합니다. MCP는 비밀과 호출 제한을 함께 설정한 경우에만 사용합니다.
- 기존 운영 경로, 라우팅, 배포 버전, Secrets, MCP 사용 여부를 확인합니다. 스테이징에서 허용된 오리진·URL과 승인된 이용 흐름을 먼저 확인합니다.

운영 계정과 로그 점검은 [배포 및 보안 점검](../PORTAL_SECURITY.md)을 참고하세요.
