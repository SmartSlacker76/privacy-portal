window.SECURITY_EVIDENCE={
  "reviewed": "2026-11-16",
  "cases": [
    {
      "id": "sonicwall-2026",
      "title": "SonicOS SSL-VPN 인증 통제 우회 악용",
      "date": "2026-11-09",
      "period": "2026년 11월 악용 공지",
      "kind": "실제 악용 확인",
      "ports": [
        443
      ],
      "service": "SonicOS SSL-VPN / HTTPS",
      "portEvidence": "실제 공격 포트 미공개. 443은 HTTPS 학습 연결용이며 SonicOS의 SSL-VPN 리스닝 포트는 설정에 따라 다릅니다.",
      "summary": "SAML 로그인이 활성화된 SonicOS SSL-VPN에서 CVE-2026-19868 악용이 확인됐습니다. 모든 HTTPS 서버에 해당하는 취약점은 아닙니다.",
      "flow": [
        "외부에 노출된 SSL-VPN 인증 지점에 접근",
        "영향받는 SAML 구성에서 인증 통제를 우회",
        "비인가 VPN 접근 위험으로 이어짐"
      ],
      "prevention": "벤더 권고에 따라 해당 모델·버전의 업데이트를 적용하고 VPN 인증·접속 기록을 조사하세요. MFA 사용 여부만 믿지 말고 실제 적용 경로를 검증하며 관리 인터페이스 접근을 제한하세요.",
      "cves": [
        "CVE-2026-19868"
      ],
      "attack": [
        "T1133",
        "T1078"
      ],
      "mapping": "학습용 분석 매핑: 원격 서비스 및 계정 악용 위험. 원문이 이 ATT&CK 번호를 직접 지정한 것은 아닙니다.",
      "sources": [
        [
          "NHS England · 2026-11-09",
          "https://digital.nhs.uk/cyber-alerts/2026/cc-4886"
        ],
        [
          "SonicWall 공식 권고",
          "https://psirt.global.sonicwall.com/vuln-detail/SNWLID-2026-0014"
        ]
      ]
    },
    {
      "id": "dns-ddos-2026",
      "title": "DNS 반사·증폭 DDoS 관측",
      "date": "2026-10-29",
      "period": "2026년 3분기 관측",
      "kind": "집계 관측 · 개별 침해사고 아님",
      "ports": [
        53
      ],
      "service": "DNS / UDP",
      "portEvidence": "DNS의 대표 서비스 포트는 UDP 53. 보고서는 DNS 증폭 유형을 집계하며 피해자별 포트를 공개하지 않습니다.",
      "summary": "Cloudflare 자체 네트워크 관측에서 DNS 증폭 공격 건수는 전 분기보다 215% 증가했고, 네트워크 계층 DDoS의 3.43%를 차지했습니다. 전체 인터넷 침해사고의 포트 순위가 아닙니다.",
      "flow": [
        "공격자가 피해자 주소로 출발 IP를 위조",
        "공개 재귀 DNS 서버에 작은 질의 전달",
        "큰 응답이 피해자에게 반사되어 회선·서비스 부담 증가"
      ],
      "prevention": "재귀 질의는 승인된 클라이언트로 제한하고 응답률 제한 및 상위 DDoS 방어를 검토하세요. DNS에 필요한 TCP 53까지 일괄 차단하지 말고 권한 DNS와 재귀 DNS 역할을 분리하세요.",
      "cves": [],
      "attack": [
        "T1498.002"
      ],
      "mapping": "학습용 분석 매핑: 반사·증폭 공격의 동작을 ATT&CK 개념에 연결합니다.",
      "sources": [
        [
          "Cloudflare · 2026-10-29",
          "https://blog.cloudflare.com/ddos-threat-report-2026-q3/"
        ]
      ]
    },
    {
      "id": "cldap-ddos-2026",
      "title": "공개 CLDAP 서버의 반사·증폭 위험",
      "date": "2026-10-29",
      "period": "2026년 3분기 관측",
      "kind": "집계 관측 · 개별 침해사고 아님",
      "ports": [
        389
      ],
      "service": "CLDAP / UDP 389",
      "portEvidence": "보고서에 UDP 389가 명시됩니다. 현재 LDAP 실험의 TCP 389 흐름과는 다른 UDP 서비스입니다.",
      "summary": "Cloudflare는 공개 도메인 컨트롤러의 UDP 389를 이용하는 반사 공격을 설명했습니다. 해당 분기 비중은 0.05%로 전 분기보다 감소했습니다. 최근 가장 많이 공격된 서비스로 해석하면 안 됩니다.",
      "flow": [
        "공격자가 피해자 IP를 위조해 CLDAP 질의",
        "외부 공개 서버가 더 큰 응답 생성",
        "피해자 방향으로 증폭 응답 집중"
      ],
      "prevention": "인터넷에서 도메인 컨트롤러의 UDP 389로 들어오는 요청을 차단하고 내부 업무에 필요한 출발지로만 제한하세요. TCP LDAP 정책과 UDP CLDAP 정책을 별도로 점검하세요.",
      "cves": [],
      "attack": [
        "T1498.002"
      ],
      "mapping": "학습용 분석 매핑: 반사·증폭.",
      "sources": [
        [
          "Cloudflare · 2026-10-29",
          "https://blog.cloudflare.com/ddos-threat-report-2026-q3/"
        ]
      ]
    },
    {
      "id": "toolshell-2025",
      "title": "SharePoint ToolShell 침해와 웹셸·랜섬웨어",
      "date": "2025-07-22",
      "period": "2025년 7월 · 비교 학습 사례",
      "kind": "실제 침해 관측",
      "ports": [
        80,
        443,
        8080,
        8443
      ],
      "service": "온프레미스 SharePoint / HTTP(S)",
      "portEvidence": "보고서의 실제 공격 포트 미공개. 표시된 포트는 HTTP(S) 서비스의 기본·대체 설정 예시이며 모든 포트가 공격됐다는 뜻은 아닙니다.",
      "summary": "Microsoft는 인터넷에 노출된 온프레미스 SharePoint를 통한 침해와 일부 공격자의 랜섬웨어 배포를 관측했습니다. SharePoint Online은 이 취약점의 대상이 아닙니다.",
      "flow": [
        "취약한 공개 SharePoint 웹 요청 처리 경로 악용",
        "서버 코드 실행과 웹셸 등 후속 침해",
        "일부 공격에서 키 탈취 및 랜섬웨어로 확대"
      ],
      "prevention": "지원 버전의 보안 업데이트, AMSI 활성화, ASP.NET MachineKey 교체와 IIS 재시작을 공식 절차에 따라 수행하세요. 웹셸·비정상 프로세스와 후속 침해 여부도 조사하세요.",
      "cves": [
        "CVE-2025-53770",
        "CVE-2025-53771"
      ],
      "attack": [
        "T1190",
        "T1505.003"
      ],
      "mapping": "학습용 분석 매핑: 외부 공개 앱 악용 → 웹셸.",
      "sources": [
        [
          "Microsoft Threat Intelligence · 2025-07-22",
          "https://www.microsoft.com/en-us/security/blog/2025/07/22/disrupting-active-exploitation-of-on-premises-sharepoint-vulnerabilities/"
        ]
      ]
    },
    {
      "id": "play-rdp-2025",
      "title": "Play 랜섬웨어의 RDP·VPN 초기 침투",
      "date": "2025-06-05",
      "period": "2025년 6월 갱신된 공동 권고",
      "kind": "수사·관측 기반 캠페인",
      "ports": [
        3389
      ],
      "service": "RDP / VPN",
      "portEvidence": "RDP의 대표 포트는 3389. 권고는 RDP/VPN 악용을 확인하지만 개별 피해자의 실제 포트는 공개하지 않습니다.",
      "summary": "FBI·CISA·ASD 공동 권고는 Play 공격자가 외부 RDP·VPN과 유효 계정을 초기 침투에 이용했다고 설명합니다. RDP 사례 자체에 특정 CVE가 반드시 필요한 것은 아닙니다.",
      "flow": [
        "노출된 원격 접속 지점 및 계정 악용",
        "내부 네트워크 접근과 추가 정찰",
        "권한 확대·정보 유출·랜섬웨어로 진행"
      ],
      "prevention": "RDP 직접 인터넷 노출을 차단하고 VPN·게이트웨이와 MFA를 적용하세요. 허용 출발지, NLA, 계정 잠금, 로그인·세션 기록과 비정상 접속을 점검하세요.",
      "cves": [],
      "attack": [
        "T1133",
        "T1078",
        "T1021.001"
      ],
      "mapping": "T1133·T1078은 원문에 제시된 기법이며 T1021.001은 RDP 학습 연결입니다.",
      "sources": [
        [
          "FBI·CISA·ASD 공동 권고 · 2025-06-05 갱신",
          "https://www.cyber.gov.au/advisory/stopransomware-play-ransomware"
        ]
      ]
    },
    {
      "id": "play-smb-2025",
      "title": "Play 랜섬웨어의 SMB 내부 확산",
      "date": "2025-06-05",
      "period": "2025년 6월 갱신된 공동 권고",
      "kind": "수사·관측 기반 캠페인",
      "ports": [
        445,
        139
      ],
      "service": "SMB / Windows 관리 공유",
      "portEvidence": "TCP 445는 직접 SMB, 139는 구형 NetBIOS 세션의 학습 연결입니다. 보고서가 피해자별 실제 포트나 139 사용을 확인한 것은 아닙니다.",
      "summary": "공동 권고와 MITRE의 Play 그룹 자료는 SMB를 통한 측면 이동을 설명합니다. SMB가 열려 있다는 사실만으로 취약점 악용이나 랜섬웨어 감염이 확인되지는 않습니다.",
      "flow": [
        "이미 침투한 단말에서 내부 시스템 탐색",
        "계정·관리 공유를 이용해 다른 호스트에 접근",
        "다른 구간으로 이동하며 피해 범위 확대"
      ],
      "prevention": "외부 SMB를 차단하고 내부에서도 필요한 단말·서버 사이로만 허용하세요. SMBv1 제거, 최소 권한, 관리자 자격 증명 분리, 서명·암호화 지원 및 복구 가능한 백업을 점검하세요.",
      "cves": [],
      "attack": [
        "T1021.002"
      ],
      "mapping": "SMB 측면 이동은 공식 공동 권고 및 MITRE 그룹 자료에 연결됩니다.",
      "sources": [
        [
          "FBI·CISA·ASD 공동 권고",
          "https://www.cyber.gov.au/advisory/stopransomware-play-ransomware"
        ],
        [
          "MITRE · Play 그룹",
          "https://attack.mitre.org/groups/G1040/"
        ]
      ]
    }
  ],
  "techniques": {
    "T1133": "외부 원격 서비스",
    "T1078": "유효 계정",
    "T1021.001": "원격 데스크톱",
    "T1021.002": "SMB / Windows 관리 공유",
    "T1021.004": "SSH",
    "T1021.005": "VNC",
    "T1021.006": "WinRM",
    "T1190": "외부 공개 애플리케이션 악용",
    "T1505.003": "웹셸",
    "T1498.002": "반사·증폭 DDoS",
    "T1046": "네트워크 서비스 탐색",
    "T1110": "무차별 대입"
  }
};
