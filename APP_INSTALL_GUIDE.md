# 요망진 간세와 혼디 지킴이 · 앱 설치 및 배포 안내

기존 개인정보보호 포털: https://smartslacker76.github.io/privacy-portal/

## A. PWA 설치 (Android, iOS, PC)

설치 안내: https://smartslacker76.github.io/privacy-portal/install.html

- Android Chrome/삼성 인터넷: 브라우저 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'
- iPhone Safari: 공유 → 홈 화면에 추가
- Windows Chrome/Edge: 주소창 설치 아이콘 또는 메뉴의 앱 설치

설치형 PWA는 기존 GitHub Pages 사이트를 그대로 표시하므로 사이트 콘텐츠 변경이 자동 반영됩니다.
시작 URL 및 앱 범위는 `/privacy-portal/`로 제한되어 있습니다.

### PWA 관련 파일

- `manifest.webmanifest`: 이름, 범위, 설치 아이콘, 바로가기
- `assets/pwa/icon-192.png`, `icon-512.png`, `icon.svg`: 앱 아이콘
- `sw.js`: 네트워크 우선, 오프라인 안내만 캐시
- `offline.html`: 연결 끊김 안내
- `assets/js/pwa.js`: 설치 안내 및 서비스 워커 등록
- `install.html`: 기기별 설치 방법

**개인정보 보호:** 서비스 워커는 작성 중인 양식·챗봇 질문·문서·조회 결과를 캐시하지 않습니다. 단, 브라우저의 기타 저장소 사용 여부는 각 페이지의 기존 코드에 따릅니다.

## B. Android APK 테스트 앱

소스: `android/`

빌드 워크플로: https://github.com/SmartSlacker76/privacy-portal/actions/workflows/android-apk.yml

1. GitHub → Actions → 'Build Android APK'
2. 최신 빌드가 **성공**했는지 확인
3. 해당 실행의 Artifacts → 'Hondi-PrivacyPortal-Android-APK' 다운로드
4. ZIP을 압축 해제한 뒤 Android 기기에서 `app-debug.apk` 설치

추가로 배포 가능한 테스트 APK 릴리스가 생성되면
https://github.com/SmartSlacker76/privacy-portal/releases
에서도 확인할 수 있습니다. 릴리스 공개는 해당 워크플로의 성공과 저장소 권한 설정에 따라 달라집니다.

**주의:** 이 빌드는 개발용 Debug APK입니다. Google Play 배포용 정식 서명 APK가 아닙니다. APK를 다시 빌드하면 디버그 서명이 바뀔 수 있습니다. 기관 배포용이라면 고정 릴리스 서명키와 앱 검수를 별도로 적용해야 합니다.

APK의 WebView는 온라인 GitHub Pages 사이트를 표시합니다. 인터넷이 없으면 오프라인 안내를 표시하며, JavaScript Blob 기반 문서 다운로드 등 일부 브라우저 기능은 실제 Android 기기에서 검증해야 합니다.

## C. 점검

- [ ] PWA 아이콘 192/512px 파일 존재
- [ ] HTTPS에서 `manifest.webmanifest` 읽힘
- [ ] Chrome/Edge에서 설치 메뉴 표시
- [ ] PWA 홈 화면 실행 및 오프라인 안내 확인
- [ ] 개인정보 입력 후 서비스 워커 Cache Storage에 데이터가 없는지 확인
- [ ] Android Actions 빌드 성공 및 APK SHA-256 확인
- [ ] Android 실제 기기에서 홈/뒤로가기/챗봇/파일 업로드 테스트
- [ ] 처리방침·동의서 파일 다운로드, 공유·인쇄 테스트

