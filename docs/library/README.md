# 참고자료 카탈로그 (63종 · 5대 카테고리)

정보보호 상담 챗봇(`chatbot.html`)이 답변 근거로 쓰는 첨부 자료 목록입니다. 자료 기준일 2026-11-21.

| 카테고리 | 자료 수 | 폴더 README |
| --- | --- | --- |
| 1. 인공지능(AI) 및 신기술 보안 | 9 | [README](./1.%20인공지능(AI)%20및%20신기술%20보안/README.md) |
| 2. 개인정보보호 및 법·제도 실무 | 38 | [README](./2.%20개인정보보호%20및%20법·제도%20실무/README.md) |
| 3. SW 개발보안 및 시큐어코딩 | 4 | [README](./3.%20SW%20개발보안%20및%20시큐어코딩/README.md) |
| 4. 국가·공공 인프라 및 기반시설 | 8 | [README](./4.%20국가·공공%20인프라%20및%20기반시설/README.md) |
| 5. 융합보안 및 물리·특수기기 | 5 | [README](./5.%20융합보안%20및%20물리·특수기기/README.md) |

- 파일 64건 중 1건은 같은 파일이 두 폴더에 있는 중복본이라 63종으로 셉니다(주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세가이드).
- 발행연도는 표지·판권면·본문에서 확인한 값만 적고, 확인할 수 없으면 `미표기`로 둡니다. 확인 위치는 CSV의 `연도 확인 위치` 열에 있습니다.
- `guidebooks_categorized.csv`: 연번, 파일명, 원본경로, 카테고리, 발행연도, 연도 확인 위치, 발행기관, 주요 대상, 매체(자료 유형), 쪽수, 추출 방식, 핵심 키워드, 비고.
- `organize_with_readme.py`: 원본 자료를 카테고리 폴더로 복사하고 README를 배치합니다. `python3 organize_with_readme.py --src <원본 폴더>`.

## 다시 만들기

```bash
# 1) 원문 추출(별도 작업 폴더) → pages/all_pages.json
# 2) 카탈로그·검색 조각·CSV 생성
python3 -I tools/library/build_library.py <all_pages.json> <원본 폴더> assets/data/library
# 3) 카테고리 README 생성
python3 -I tools/library/make_readmes.py assets/data/library/catalog.js docs/library
cp assets/data/library/guidebooks_categorized.csv docs/library/
# 4) 회귀 테스트
node tests/counsel-engine.test.js
```

메타데이터(카테고리·발행연도·대상·매체)는 `tools/library/catalog_meta.py`에서 고칩니다.
