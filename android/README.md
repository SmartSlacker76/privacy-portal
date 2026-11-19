# 요망진 간세와 혼디 지킴이 — Android 앱

## 동작 구조

- 앱 ID: `io.github.smartslacker76.privacyportal`
- 시작 페이지: `https://smartslacker76.github.io/privacy-portal/index.html`
- 순수 Android Java + WebView. 기존 웹사이트를 HTTPS로 표시합니다.
- 페이지 내 파일 선택(Excel/문서 업로드)을 지원합니다.
- 외부 웹사이트는 사용자의 기본 브라우저에서 엽니다.
- HTTPS 전용, 혼합 HTTP 콘텐츠 차단, JS 브리지 없음, 위험한 파일 URL 차단
- APK는 서버 없이 독립 작동하는 **오프라인 앱이 아닙니다**. 웹 콘텐츠를 불러오려면 인터넷이 필요합니다.

## GitHub에서 APK 받기

1. GitHub 저장소의 **Actions** 메뉴로 이동
2. **Build Android APK** 워크플로 선택
3. 가장 최근 성공한 실행을 열고 **Artifacts**에서 `Hondi-PrivacyPortal-Android-APK` 다운로드
4. ZIP을 풀어 `app-debug.apk`를 Android에 설치

자동 빌드는 `android/**`의 변경이나 워크플로 수동 실행으로 시작합니다.
개발용 APK는 Android 테스트 키로 서명됩니다. 다음 번 빌드 시 개발 서명키가 달라질 수 있으므로 설치된 이전 APK 위에 업데이트되지 않을 수 있습니다.
장기 배포에는 **고정된 서명키를 안전하게 보관한 정식 릴리스 APK/AAB**가 필요합니다.

### 로컬 빌드

Android Studio에서 `android` 디렉터리를 열어 Gradle Sync 후 Debug APK를 빌드하거나,
JDK17, Android SDK API35, Gradle 8.10.2를 준비하고 아래 명령을 실행합니다:

```sh
cd android
gradle :app:assembleDebug
```

빌드 결과: `android/app/build/outputs/apk/debug/app-debug.apk`

## 기능 및 보안 유의사항

- 사이트의 JavaScript·DOM 저장소 기능을 사용하므로 사용자가 입력한 데이터가 웹페이지의 브라우저 저장소에 남을 수 있습니다. 이 앱은 별도의 수집·전송 기능을 추가하지 않습니다.
- Android WebView와 Chrome은 파일 다운로드 동작이 다릅니다. **JavaScript Blob URL로 생성하는 PDF·DOCX·XLSX 등 다운로드 기능은 이 Debug 앱에서 완전히 검증되지 않았습니다.** 실사용 전 문서 생성·다운로드 테스트가 필요하며, 필요하면 보안 검토된 별도 Android 다운로드 구현을 추가해야 합니다.
- Android 앱은 GitHub Pages의 최신 사이트를 표시합니다. 서버 측 로직·권한관리·사용자 데이터 보호 방식은 기존 웹사이트의 설정을 따릅니다.
- 앱에서 파일 선택은 운영체제의 파일 선택기를 사용하며, 저장소 전체 접근 권한을 요구하지 않습니다.
- 앱 서명 인증서와 도메인의 Digital Asset Links 검증이 필요한 TWA 방식은 현재 적용하지 않았습니다.
