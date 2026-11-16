# 사고 사례·근거 목록
자료 확인: 2026-11-16

실제 공격 포트가 공개되지 않으면 기본 포트와 구분해 표시합니다. 빈 CVE 목록은 특정 CVE를 확인하지 않았다는 뜻입니다.

## SonicOS SSL-VPN 인증 통제 우회 악용
2026년 11월 악용 공지 / 실제 악용 확인

SAML 로그인이 활성화된 SonicOS SSL-VPN에서 CVE-2026-19868 악용이 확인됐습니다. 모든 HTTPS 서버에 해당하는 취약점은 아닙니다.

실제 공격 포트 미공개. 443은 HTTPS 학습 연결용이며 SonicOS의 SSL-VPN 리스닝 포트는 설정에 따라 다릅니다.

예방: 벤더 권고에 따라 해당 모델·버전의 업데이트를 적용하고 VPN 인증·접속 기록을 조사하세요. MFA 사용 여부만 믿지 말고 실제 적용 경로를 검증하며 관리 인터페이스 접근을 제한하세요.

ATT&CK 연결: 학습용 분석 매핑: 원격 서비스 및 계정 악용 위험. 원문이 이 ATT&CK 번호를 직접 지정한 것은 아닙니다.

- [CVE-2026-19868](https://www.cve.org/CVERecord?id=CVE-2026-19868)
- [T1133](https://attack.mitre.org/techniques/T1133/)
- [T1078](https://attack.mitre.org/techniques/T1078/)
- [NHS England · 2026-11-09](https://digital.nhs.uk/cyber-alerts/2026/cc-4886)
- [SonicWall 공식 권고](https://psirt.global.sonicwall.com/vuln-detail/SNWLID-2026-0014)

## DNS 반사·증폭 DDoS 관측
2026년 3분기 관측 / 집계 관측 · 개별 침해사고 아님

Cloudflare 자체 네트워크 관측에서 DNS 증폭 공격 건수는 전 분기보다 215% 증가했고, 네트워크 계층 DDoS의 3.43%를 차지했습니다. 전체 인터넷 침해사고의 포트 순위가 아닙니다.

DNS의 대표 서비스 포트는 UDP 53. 보고서는 DNS 증폭 유형을 집계하며 피해자별 포트를 공개하지 않습니다.

예방: 재귀 질의는 승인된 클라이언트로 제한하고 응답률 제한 및 상위 DDoS 방어를 검토하세요. DNS에 필요한 TCP 53까지 일괄 차단하지 말고 권한 DNS와 재귀 DNS 역할을 분리하세요.

ATT&CK 연결: 학습용 분석 매핑: 반사·증폭 공격의 동작을 ATT&CK 개념에 연결합니다.

- [T1498.002](https://attack.mitre.org/techniques/T1498/002/)
- [Cloudflare · 2026-10-29](https://blog.cloudflare.com/ddos-threat-report-2026-q3/)

## 공개 CLDAP 서버의 반사·증폭 위험
2026년 3분기 관측 / 집계 관측 · 개별 침해사고 아님

Cloudflare는 공개 도메인 컨트롤러의 UDP 389를 이용하는 반사 공격을 설명했습니다. 해당 분기 비중은 0.05%로 전 분기보다 감소했습니다. 최근 가장 많이 공격된 서비스로 해석하면 안 됩니다.

보고서에 UDP 389가 명시됩니다. 현재 LDAP 실험의 TCP 389 흐름과는 다른 UDP 서비스입니다.

예방: 인터넷에서 도메인 컨트롤러의 UDP 389로 들어오는 요청을 차단하고 내부 업무에 필요한 출발지로만 제한하세요. TCP LDAP 정책과 UDP CLDAP 정책을 별도로 점검하세요.

ATT&CK 연결: 학습용 분석 매핑: 반사·증폭.

- [T1498.002](https://attack.mitre.org/techniques/T1498/002/)
- [Cloudflare · 2026-10-29](https://blog.cloudflare.com/ddos-threat-report-2026-q3/)

## SharePoint ToolShell 침해와 웹셸·랜섬웨어
2025년 7월 · 비교 학습 사례 / 실제 침해 관측

Microsoft는 인터넷에 노출된 온프레미스 SharePoint를 통한 침해와 일부 공격자의 랜섬웨어 배포를 관측했습니다. SharePoint Online은 이 취약점의 대상이 아닙니다.

보고서의 실제 공격 포트 미공개. 표시된 포트는 HTTP(S) 서비스의 기본·대체 설정 예시이며 모든 포트가 공격됐다는 뜻은 아닙니다.

예방: 지원 버전의 보안 업데이트, AMSI 활성화, ASP.NET MachineKey 교체와 IIS 재시작을 공식 절차에 따라 수행하세요. 웹셸·비정상 프로세스와 후속 침해 여부도 조사하세요.

ATT&CK 연결: 학습용 분석 매핑: 외부 공개 앱 악용 → 웹셸.

- [CVE-2025-53770](https://www.cve.org/CVERecord?id=CVE-2025-53770)
- [CVE-2025-53771](https://www.cve.org/CVERecord?id=CVE-2025-53771)
- [T1190](https://attack.mitre.org/techniques/T1190/)
- [T1505.003](https://attack.mitre.org/techniques/T1505/003/)
- [Microsoft Threat Intelligence · 2025-07-22](https://www.microsoft.com/en-us/security/blog/2025/07/22/disrupting-active-exploitation-of-on-premises-sharepoint-vulnerabilities/)

## Play 랜섬웨어의 RDP·VPN 초기 침투
2025년 6월 갱신된 공동 권고 / 수사·관측 기반 캠페인

FBI·CISA·ASD 공동 권고는 Play 공격자가 외부 RDP·VPN과 유효 계정을 초기 침투에 이용했다고 설명합니다. RDP 사례 자체에 특정 CVE가 반드시 필요한 것은 아닙니다.

RDP의 대표 포트는 3389. 권고는 RDP/VPN 악용을 확인하지만 개별 피해자의 실제 포트는 공개하지 않습니다.

예방: RDP 직접 인터넷 노출을 차단하고 VPN·게이트웨이와 MFA를 적용하세요. 허용 출발지, NLA, 계정 잠금, 로그인·세션 기록과 비정상 접속을 점검하세요.

ATT&CK 연결: T1133·T1078은 원문에 제시된 기법이며 T1021.001은 RDP 학습 연결입니다.

- [T1133](https://attack.mitre.org/techniques/T1133/)
- [T1078](https://attack.mitre.org/techniques/T1078/)
- [T1021.001](https://attack.mitre.org/techniques/T1021/001/)
- [FBI·CISA·ASD 공동 권고 · 2025-06-05 갱신](https://www.cyber.gov.au/advisory/stopransomware-play-ransomware)

## Play 랜섬웨어의 SMB 내부 확산
2025년 6월 갱신된 공동 권고 / 수사·관측 기반 캠페인

공동 권고와 MITRE의 Play 그룹 자료는 SMB를 통한 측면 이동을 설명합니다. SMB가 열려 있다는 사실만으로 취약점 악용이나 랜섬웨어 감염이 확인되지는 않습니다.

TCP 445는 직접 SMB, 139는 구형 NetBIOS 세션의 학습 연결입니다. 보고서가 피해자별 실제 포트나 139 사용을 확인한 것은 아닙니다.

예방: 외부 SMB를 차단하고 내부에서도 필요한 단말·서버 사이로만 허용하세요. SMBv1 제거, 최소 권한, 관리자 자격 증명 분리, 서명·암호화 지원 및 복구 가능한 백업을 점검하세요.

ATT&CK 연결: SMB 측면 이동은 공식 공동 권고 및 MITRE 그룹 자료에 연결됩니다.

- [T1021.002](https://attack.mitre.org/techniques/T1021/002/)
- [FBI·CISA·ASD 공동 권고](https://www.cyber.gov.au/advisory/stopransomware-play-ransomware)
- [MITRE · Play 그룹](https://attack.mitre.org/groups/G1040/)
