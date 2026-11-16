/* Pure deterministic teaching model; no network I/O. */
(()=>{function buildScan(o){const udp=o.type==='udp',ports=udp?[53,123,161]:[22,23,80,443,3306];const events=[],rows=[];
 const push=(p,kind,message,why,state='')=>events.push({port:p,kind,message,why,state});
 for(const p of ports){const blocked=!udp&&[22,3306].includes(p)&&o.origin==='external'&&o.policy==='restricted';let status;
  push(p,'out',udp?'UDP 탐사 데이터그램':'TCP SYN',`${p}번 접점에 ${udp?'UDP 서비스 요청':'TCP 연결 시작 신호'}를 보냅니다.`);
  if(blocked){push(p,'drop','무응답 · 재시도/타임아웃 (요약)','가상 방화벽이 외부 관리·DB 요청을 버립니다. 실제 무응답은 손실·경로 문제도 가능해 로그 확인이 필요합니다.');status='filtered';}
  else if(!udp&&p===23){push(p,'in','TCP RST · 연결 거절','대상은 통신 가능하지만 이 TCP 접점에는 수신 서비스가 없습니다.');status='closed';}
  else if(udp&&p===161){push(p,'in','ICMP Destination Unreachable · Type 3 Code 3','목적지의 UDP 포트가 닫혀 있음을 알리는 IPv4 응답 예입니다.');status='closed';}
  else if(udp&&p===123){push(p,'drop','UDP 응답 없음 · 재시도/대기 (요약)','실습에서는 열린 서버가 이 요청에 응답하지 않는 상황입니다. 스캐너만으로 필터인지 열린 서비스인지 알 수 없습니다.');status='open|filtered';}
  else if(udp){push(p,'in','UDP DNS response · transaction ID 일치','애플리케이션 응답을 받아 DNS 수신 서비스를 확인하는 예입니다.');status='open';}
  else {push(p,'in','TCP SYN+ACK','수신 중인 접점이 연결 준비로 응답했습니다.');if(o.type==='syn')push(p,'out','TCP RST · 연결 완료 전 종료','SYN 스캔은 3-way handshake를 완성하지 않습니다. 감시·로그에서 보이지 않는다는 뜻이 아닙니다.');else {push(p,'out','TCP ACK · connect() 성공','Connect 스캔은 운영체제 연결을 통해 3-way handshake를 완성합니다.');push(p,'out','TCP 연결 종료 (요약)','확인한 연결을 종료합니다. 로그와 연결 자원을 사용합니다.');}status='open';}
  push(p,'local','판정: '+status,`${p}/${udp?'udp':'tcp'}의 관측 결과입니다. 서비스 안전성 판정은 별도입니다.`,status);
  if(o.version&&status==='open'){push(p,'out','서비스 탐지 프로브 (추가 교환 요약)','-sV는 포트 번호 추정에서 더 나아가 응용 응답을 확인합니다. 별도 연결·협상이 있을 수 있습니다.');push(p,'in',p===22?'SSH-2.0-TrainingSSH (가상)':p===443?'TLS + HTTP 응답 (가상)':p===53?'DNS 응답 특성 (가상)':p===3306?'TrainingDB greeting (가상)':'HTTP 응답 (가상)','문자열·제품 식별은 예시이며 진짜 제품 버전이나 CVE를 증명하지 않습니다.');}
  rows.push({port:p,proto:udp?'udp':'tcp',status,service:({22:'ssh',23:'telnet',80:'http',443:'https',3306:'mysql',53:'domain',123:'ntp',161:'snmp'})[p],version:o.version&&status==='open'?'Training service (가상)':'포트 기반 이름 추정',action:p===3306||p===22?'업무상 필요한 관리·앱 출발지만 허용':p===53?'승인 리졸버·재귀 질의 범위 점검':p===123?'서버·방화벽 로그 대조로 불확실성 해소':p===161?'필요한 에이전트·버전·ACL 확인':'공개 필요성·패치·인증 확인'});
 }return {events,rows};}
window.NmapModel={buildScan};})();
