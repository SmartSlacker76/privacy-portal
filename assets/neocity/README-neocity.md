# 🔐 사라진 7분 — 네오시티 공공분야 CTF

> GitHub Pages 배포용 **정적 웹 기반**, 영화형 스토리·디지털 포렌식·개인정보보호 법령 판단 융합 교육 게임

**버전:** 1.0 / 2026-11-15 · **자료 기준:** 제공받은 ZIP 3개(개인정보보호 PDF 62개, 사이버보안 PDF 13개, 공무원 PDF 4개) 및 공개 공식 법령·평가 발표

## 1. 바로 실행하기

1. ZIP 파일을 풀고 프로젝트 폴더에서 `index.html`을 엽니다. 온라인 기능이 필요 없는 기본 게임은 정적 HTML/CSS/JavaScript로 작동합니다.
2. 개발 환경에서는 `python -m http.server 8000`으로 간이 서버를 시작하여 `http://localhost:8000`을 방문할 수 있습니다.
3. 또는 동봉된 단일 HTML 파일 `CTF_바로실행.html`을 열어 바로 테스트할 수 있습니다.

브라우저에 저장된 진행도는 서버와 연동되지 않으므로 다른 기기와 동기화되지 않습니다. 데이터 이전은 **수사 보고서 → 보고서 JSON 내보내기 / 진행상황 가져오기** 기능을 이용하세요.

## 2. GitHub Pages 배포

1. GitHub에서 **새로운 공개 저장소**(예: `neocity-ctf`)를 만듭니다. 원본 교육용 PDF ZIP 3개는 저장소에 업로드하지 마세요.
2. 이 압축파일의 **내용물 전체**(`index.html`, `assets/`, `data/`, `tools/`, `.github/` 등)를 저장소 **루트**에 올립니다. ZIP 파일 자체만 업로드하는 방식은 아닙니다.
3. GitHub 저장소의 **Settings → Pages → Build and deployment**에서 `Deploy from a branch`, `main`, `/(root)`를 선택해 저장합니다.
4. 공개 URL은 일반적으로 `https://계정이름.github.io/neocity-ctf/` 형식입니다. 생성된 URL에서 200개 사건 목록과 테스트 문제를 확인하세요.
5. 정적 사이트는 별도 서버·데이터베이스·API 인증키 없이 기본 게임을 실행할 수 있습니다.

이 프로젝트는 절대 경로가 아닌 상대 경로를 사용하여 GitHub Pages의 서브 경로에서도 동작합니다.

## 3. 실제 구현 범위

| 항목 | 현 버전 |
|---|---|
| 총 문항 | 200개 고유 사건 / 10개 챕터 × 20개 |
| 개인정보보호 | 150개 / 챕터당 15개 |
| 사이버보안 | 50개 / 챕터당 5개 |
| 문항 방식 | 사건별 책임 판단 50, 로그 플래그와 조치 50, 모순 증거 2개 찾기 50, 타임라인 재구성 50 |
| 증거물 | 모든 사건에 가상 현장진술·원시 로그·승인 대조 자료 3개 생성 |
| 이야기 분기 | 챕터별 3개 선택지 × 10개 지점, 후속 사건 브리핑 변경, 최종 3개 결말 |
| 분석 조교 | 오프라인 **규칙 기반** 질의응답, 3단계 유료 힌트; 실제 LLM 호출 없음 |
| 점수 | 사건 기본점수, 모든 증거 검증 보너스, 힌트 감점, 오답 감점 |
| 배지/랭킹 | 누적 성취 배지, 이 브라우저의 결과만 비교하는 로컬 순위 |
| 진행상황 | localStorage에 로컬 저장 / JSON 백업·복구 |
| 출처 | 제공자료 파일명을 사례별로 연결, 법제처·개인정보위 공식 링크 제공 |
| 배포 형태 | GitHub Pages 호환 정적 사이트 / 단일 HTML 별도 제공 |

**정직한 한계:** 예제 200개는 모두 별도의 사건 명칭·정황·모순·해설·권장 조치가 있지만, 4가지 플레이 패턴을 재사용합니다. 피의자 조사·분기 증거가 완전히 개별 제작된 200편의 장편 시나리오는 아닙니다. 실제 사이버 공격을 수행하는 실습 서버는 제공되지 않으며, 포렌식은 가상의 로그·증거 분석을 중심으로 합니다.

## 4. 교육용 자료·법령의 사용 방법

- `data/missions.json`: 200문제 전체 사건 원본. 각 사건의 `sourceFile`, `sourceBundle`, `reference`에 참고 PDF와 관련 법령 후보를 연결합니다.
- `data/source-catalog.json`: 제공받은 PDF **전체 79개 파일명**과 ZIP 출처. 원본 자료는 포함하지 않습니다.
- `data/sources.json`: 38개 주제별 대표 참고 문서와 공개 공식 URL.
- `data/legal-cache.js`: 실제 배포 웹페이지가 읽는 법제처 API 스냅샷. 기본 상태는 '인증 없이 동기화되지 않음'입니다.
- `tools/build_missions.py`: 제공받은 첨부자료를 기반으로 구상한 **가상** 200문제의 정형 데이터 생성기. 수정 후 `python tools/build_missions.py`로 `data/missions.json`과 `data/missions.js`를 재생성하세요.

### 2025 평가 공개 사실과 2026 방향의 구분

2026-04-27 개인정보보호위원회의 **2025년 보호수준 평가 결과**에서는 개인영상정보 관리대장, 동의 시 주요내용 고지·명확화 등의 정량 지표가 상대적으로 취약하다고 발표했습니다. 심층평가의 '안전성 확보조치를 위한 노력' 지표도 낮았고, 내부관리계획 승인 누락·형식적인 이행점검이 원인으로 제시됐습니다.

2026-10-13 보도설명자료에는 **2026년 평가**부터 내부자 보안·모의해킹·사고 예방·대응 노력 등을 강화하겠다는 방향이 제시됩니다. 실제 기관별 지적사항의 전체 연도별 원문은 제공 자료에 없으므로, 본 게임의 미션은 공개된 취약 **유형을 재구성**했습니다. 실제 평가 결과·기관의 위반 사실이라고 표시하지 않습니다.

공식 근거:
- 개인정보 보호법(2026-09-11 시행): https://www.law.go.kr/LSW/lsInfoP.do?efYd=20260911&lsiSeq=283839
- 2025년 개인정보 보호수준 평가 결과: https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=12023
- 2026년 평가 개선방향 보도설명: https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS210&mCode=C020020000&nttId=12579
- 보호수준 평가 고시(2026-02-20): https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000274688

## 5. 법제처 OPEN API 갱신 (법령·판례·결정례)

법제처 [국가법령정보 공동활용 서비스](https://open.law.go.kr/LSO/openApi/guideResult.do)에서 API 이용을 신청해야 합니다. 공식 API 검색은 `lawSearch.do?target=law`, `target=prec`, `target=detc` 등을 사용하며 **`OC` 인증값**이 필요합니다.

API 값을 브라우저 JavaScript에 입력하거나 `index.html` 또는 GitHub 저장소에 평문으로 올리지 마세요. **로컬 관리자 PC**의 환경변수 또는 **GitHub Actions Secrets**를 사용하세요.

```bash
# 먼저 호출 목록 확인 (인증값 불필요)
python tools/sync_law.py --dry-run

# macOS/Linux (예시: 값을 노출하지 않는 환경변수 설정 방식 사용)
export LAW_API_OC='본인이 발급받은_법제처_API_인증값'
python tools/sync_law.py

# Windows PowerShell
$env:LAW_API_OC = '본인이 발급받은_법제처_API_인증값'
python tools/sync_law.py
```

성공하면 `data/legal-cache.js`, `data/legal-cache.json`에 **공개 법령·판례 메타데이터만** 저장됩니다. 웹페이지의 **근거 자료 → 법제처 API 데이터 스냅샷**에 나타납니다. 판례의 사건번호가 실제로 조회되기 전에는 특정 사건명을 임의로 만들지 않습니다. API 검색 결과가 게임의 사례와 법리상 동일하다는 뜻도 아닙니다. 담당자의 **관련성 검토**, 법령 시행일 검증, 해설 검수가 필요합니다.

GitHub Actions에서 갱신하려면 저장소 **Settings → Secrets and variables → Actions**에 `LAW_API_OC`를 등록한 뒤 **Actions → Refresh Legal Reference Snapshot (manual) → Run workflow**를 실행합니다. 이 작업은 사용자가 명시적으로 선택할 때만 수행됩니다. 인증정보는 업로드되는 스냅샷에 저장하지 않습니다.

> 국가법령정보센터가 API에 대해 일시 점검·접근제한·응답 필드 변경을 할 경우, 갱신 실패 시 기존 스냅샷을 보존하게 구현했습니다. 이 환경에서 유효한 발급 인증값으로 실 API 동기화까지 검증하지는 않았습니다.

## 6. 교육기관 운영 전 검수 체크리스트

1. `data/missions.json`의 200개 문항별 **법령 시행일·해설·적용조건·예외** 확인. 특히 공무원 징계, 영상정보 열람·제공, 국외이전, AI, 개인정보 유출 신고 등은 법무·개인정보 담당자가 최종 검수하세요.
2. 자체 보호수준 평가의 당해연도 **공식 지표, 기관 유형, 실제 지적사항**을 확보한 뒤 교육용 미션과 대응표를 별도로 작성하세요.
3. 공개 사례를 참고했더라도 실제 피해자, 직원, 사건번호, 수사정보를 게임에 **직접 넣지 마세요**.
4. 기관 직원별 인증, 서버 채점, 부정행위 방지, 기관 전체 랭킹, 수료증 진위 확인이 필요한 경우 인증 연계 백엔드와 서버 보안·개인정보 영향 검토가 추가로 필요합니다.
5. 웹페이지는 모두 공개되므로 `missions.js` 안의 정답·플래그는 개발자 도구로 확인할 수 있습니다. 게임은 **학습용 CTF**이며 공식 보안 인증평가/대회용 **비밀 플래그 검증 서버**를 대체하지 못합니다.

## 7. 테스트

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
node --check assets/game.js
node --check data/missions.js
python tools/sync_law.py --dry-run
```

`tests/smoke_playwright.py`는 Playwright + Chromium 설치 환경에서 기본 4종 문제 해결, 검색 필터, 성적표, 공식 출처, 모바일 레이아웃까지 브라우저 시뮬레이션합니다. 접근이 제한된 샌드박스 환경을 고려하여 HTML·JS·CSS를 직접 주입해 테스트합니다.

## 8. 디렉터리

```text
index.html                       정적 사이트 진입점
assets/                          CSS, 게임 엔진, 파비콘
  game.js                        스토리·채점·증거·분기·진도·결과
  style.css
  favicon.svg
data/
  missions.js / missions.json     200개 실제 문제와 교육 데이터
  source-catalog.js / .json      첨부 PDF 79개 목록
  sources.json                    주제별 대표 출처
  legal-cache.js                  법제처 API 공개 메타데이터 스냅샷
tools/
  build_missions.py               오리지널 문제은행 생성·검증
  sync_law.py                     법제처 DRF API 관리자 동기화
tests/                            자동 점검 및 화면 검증
.github/workflows/                GitHub Actions 검증 및 수동 API 갱신
CTF_바로실행.html                  한 파일로 실행하는 전체 게임
```

## 9. 정보보호 및 저작권 안내

게임 코드는 별도의 서버 호출 없이 작동합니다. `localStorage`에는 점수, 진행도, 별칭, 선택이 저장되며 외부 분석 서비스에 전송하지 않습니다. 실제 개인정보·비밀정보·내부망 로그·API 인증값을 입력하지 마세요. 첨부 PDF 원문은 배포 ZIP에 넣지 않았으며 각 원저작자의 권리와 재배포 정책을 존중해야 합니다.

게임 코드·오리지널 가상 사례는 교육용으로 수정하여 사용할 수 있습니다. 법령·정책의 문구는 교육 목적으로 축약·재구성하였고 원문을 대체하지 않습니다.
