# 법제처 Open API 연동 Worker

정적 사이트(GitHub Pages)는 브라우저에서 법제처 DRF를 직접 호출할 수 없습니다(CORS·HTTP 혼합콘텐츠·OC 인증키 노출). 이 Cloudflare Worker가 **OC 인증키를 Secret으로 보관**하고 법제처를 대신 호출해 CORS를 붙여 JSON으로 돌려줍니다.

## 두 가지 모드
- **토큰 0 모드(기본)**: Worker 없이도 동작합니다. 근거 법령을 클릭하면 국가법령정보센터 현행 조문 페이지가 새 탭으로 열립니다. 설정 불필요.
- **API 모드**: Worker를 배포하고 `assets/config.js`의 `WORKER_URL`을 Worker 주소로 바꾸면, 근거 법령 클릭 시 조문 본문을 사이트 안 팝오버로 바로 보여 줍니다.

## 배포 (약 10분, 무료)
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Create Worker**. 이름 `privacy-agent` → **Deploy**.
2. **Edit code**에서 내용을 모두 지우고 `worker.js` 전체를 붙여넣고 **Deploy**.
3. **Settings → Variables and Secrets → Add**:
   | 이름 | 종류 | 값 |
   |---|---|---|
   | `LAW_OC` | **Secret** | 법제처 OC 값 (예: `발급받은_OC값`) |
   | `ALLOWED_ORIGIN` | Text | `https://<아이디>.github.io` (끝 슬래시 없이) |
   | `DAILY_LAW_LIMIT` | Text(선택) | `600` |
   저장 후 다시 **Deploy**.
4. 사이트의 `assets/config.js`에서 `WORKER_URL`을 `https://privacy-agent.<계정>.workers.dev/`로 바꾸고 커밋.

## 법제처 OC 발급
[open.law.go.kr](https://open.law.go.kr) → 회원가입 → **OPEN API → OPEN API 신청**. 활용 목적과 사용 서비스 주소(Worker 주소)를 적고, 필요한 API(법령·행정규칙)를 신청합니다. 승인되면 OC 값(보통 가입 이메일의 @ 앞부분)을 확인합니다.

## 확인
- `https://<worker 주소>/health` → `{"ok":true,"law":true}` 면 성공.
- `https://<worker 주소>/law?kind=법령&name=개인정보 보호법&jo=31` → 제31조 본문 JSON.

## 엔드포인트
- `GET /health` → `{ok, law, ai, kosis, news}`
- `GET /law?kind=법령|행정규칙&name=<법령명>&jo=<조번호>&branch=<가지번호>` → `{ok, article, content, source}`

응답에 실패하면 사이트는 자동으로 국가법령정보센터 바로가기 링크로 폴백하므로, Worker 장애 시에도 사이트는 정상 동작합니다.
