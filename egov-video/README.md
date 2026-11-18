# 기관용 개인정보 안내 영상 음성합성

전자정부 표준프레임워크 5.0의 기반 실행환경을 사용하는 Java 17 모듈입니다. 공개 GitHub Pages에서는 브라우저 내 음성 파일 합성이 기본입니다. 기관 호스팅에서 이 모듈을 배포하면 로그인한 제작자가 한국어 음성합성을 사용할 수 있습니다.

1. 기관 개발 환경에서 **mvn -f egov-video/pom.xml verify**를 실행합니다. eGov Maven 저장소 접근이 필요합니다. 운영에서는 Spring Boot 3.5 계열의 기관 유지보수 지원과 종속성 보안 업데이트 경로를 확보합니다.
2. 기관 IdP에 OIDC 클라이언트를 등록합니다. 리디렉션 URI는 **https://기관호스트/login/oauth2/code/office**이고, ID 토큰의 **groups** 클레임에 제작자 그룹을 넣습니다. 승인된 IP와 2차 인증은 IdP 또는 접근 프록시에서 강제합니다.
3. 비밀 저장소에 **HONDI_OIDC_CLIENT_ID**, **HONDI_OIDC_CLIENT_SECRET**, **HONDI_OIDC_ISSUER**, **HONDI_PUBLIC_ORIGIN**, **HONDI_VIDEO_GROUP**을 설정합니다. Azure Speech 연동 승인 후 **HONDI_SPEECH_KEY**와 **HONDI_SPEECH_REGION**을 추가합니다.
4. HTTPS 역방향 프록시의 도메인 루트에 포털 정적 파일을 배치합니다. **/api/video-tts**, **/oauth2/authorization/office**, **/login/oauth2/code/office** 경로만 로컬 Java 서비스로 전달합니다. API 요청 본문을 4KiB로 제한하고 시간과 속도 제한을 적용합니다. 서버 소스와 설정, 빌드 파일은 정적 배포 대상에서 제외합니다.
5. 기관 배포본의 assets/policy/config.js에서 **VIDEO_SERVER_TTS**를 true로 설정합니다. 스테이징에서 기관 계정 로그인, 제작자 그룹, 음성합성 및 MP4 재생을 확인합니다.

서버는 공개할 슬라이드 문구, 선택 음성, 속도만 Azure Speech에 전달합니다. 브라우저로 음성을 바로 반환하며 파일·영상·대화내역을 서버에 저장하지 않습니다. Azure Speech 도입과 처리 문구 범위에는 기관이 승인한 조건을 적용합니다.

- [전자정부 표준프레임워크 5.0 실행환경](https://www.egovframe.go.kr/docs/5.0/egovframe-runtime/)
- [Microsoft Azure Speech 음성합성 API](https://learn.microsoft.com/ko-kr/azure/ai-services/speech-service/rest-text-to-speech)
