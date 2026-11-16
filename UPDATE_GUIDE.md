# Network Lab · 100개 핵심 시나리오 + 전체 포트 검색

- 기본 목록: 요청한 7개 분야의 서비스 시나리오 100개. 514/TCP rsh와 514/UDP Syslog는 별도 항목이므로 숫자 포트는 99개입니다.
- 검색 보충: 기존 목록에만 있던 21개 시나리오를 검색으로 제공. 데이터 총 121개.
- 전체 검색: 0~65535 포트 번호 또는 IANA 영문 서비스명/설명으로 로컬 등록부 검색. IANA 등록부 스냅샷 기준일 2026-11-10, 수집일 2026-11-16.
- IANA 기록은 실제 리스너·위험도·특정 CVE를 증명하지 않습니다. 등록 이름이 없는 동적/사설 범위도 설명합니다. 임의의 미지정 프로토콜 흐름을 만들어내지 않습니다.
- 동작 모드: DNS UDP/TCP, HTTPS TCP/QUIC, DoT/DoQ, LDAP/CLDAP, RDP UDP 보조, Memcached UDP, FastCGI/SonarQube, Raw Print/Node Exporter, Discard/WoL 등을 구분.
- Nmap 실습: SYN / Connect / UDP, 외부·관리망 관점, 방화벽 정책, 서비스 탐지 옵션, 탐사→응답→판정→조치. 실제 네트워크 스캔을 수행하지 않습니다.
- Nmap의 --top-ports 100은 nmap-services 빈도 순위로, 이 교육 사이트의 100개 목록과 다릅니다. 실습은 TCP 대표 5개 또는 UDP 대표 3개의 교환만 재현하며 전체 100개 검사 결과가 아닙니다.
- 사고 사례 6개, CVE.org 및 ATT&CK 상세 링크는 유지했습니다. 2025년 비교 사례와 2026년 관측을 구분합니다.

## 업로드

ZIP을 압축 해제하고 내용물 전체를 기존 GitHub Pages 게시 위치에 덮어씁니다. index.html, port-lookup.html, assets 폴더가 같은 루트에 있어야 합니다. ZIP 자체를 올리는 방식이 아닙니다. 기존 Pages 게시 설정이 docs이면 docs 안에 배치하세요. 빌드·별도 서버가 필요 없는 정적 파일입니다. 캐시가 남으면 강력 새로고침하세요.

## 실행

port-lookup.html을 브라우저에서 열거나 GitHub Pages에서 접속합니다. 명령 설명의 192.0.2.20은 문서용 주소입니다. 실제 Nmap을 사용할 때는 관리하거나 허가받은 대상·범위를 정하고 공식 안내에 따라 설치·실행하세요. 설치·옵션·상태 설명은 페이지 하단 Nmap 실습에 포함했습니다.

## 확인

node tests/network-lessons.test.js
node tests/security-evidence.test.js
node tests/expansion.test.js

기존 프로토콜 정확성, 100개 핵심/21개 보충, 모드의 노드·전송·포트, DHCP 고정 접점, SYN/Connect/UDP 판정, 방화벽 관점, IANA 스냅샷을 검사합니다. 메시지는 여러 실제 패킷을 요약한 교육용 논리 예이며 전체 바이트 규격이나 모든 제품별 동작을 재현하지 않습니다.
