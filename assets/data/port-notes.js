/* 포트별 보충 메모 — IANA 등록 정보만으로는 알 수 없는 실제 사용처와 악용 이력.
   원문을 옮기지 않고 사실만 정리했으며, 항목마다 출처를 함께 둔다.
   여기에 없는 포트는 화면의 공식 출처 링크(IANA·SpeedGuide·CVE.org)로 안내한다. */
(() => {
  'use strict';

  /* 범위 규칙 — 특정 포트 메모가 없어도 적용되는 설명 */
  const RANGES = [
    {
      from: 0, to: 1023, label: '시스템 포트 (0~1023)',
      note: '대부분 오래된 핵심 서비스에 고정 배정된 범위예요. 리눅스·유닉스에서는 이 범위에 ' +
            '리스너를 띄우려면 보통 관리자 권한이 필요합니다. 등록명이 곧 실제 서비스인 경우가 많지만, ' +
            '관리자가 임의로 다른 서비스를 올려 둘 수도 있으니 실제 리스너를 확인하세요.'
    },
    {
      from: 1024, to: 49151, label: '사용자·등록 포트 (1024~49151)',
      note: '신청에 따라 등록되는 범위예요. <b>등록명과 실제로 돌고 있는 서비스가 다른 경우가 흔합니다.</b> ' +
            '등록부는 “이 번호를 누가 신청했는가”를 알려 줄 뿐, 지금 그 포트에서 무엇이 듣고 있는지는 ' +
            '서버에서 직접 확인해야 해요.'
    },
    {
      from: 49152, to: 65535, label: '동적·사설 포트 (49152~65535)',
      note: 'IANA가 서비스별로 할당하지 않는 범위예요. 클라이언트가 연결할 때마다 임시로 빌려 쓰거나, ' +
            '기관이 자체 서비스에 지정해 씁니다. 이 범위의 번호만 보고 서비스를 단정할 수 없어요.'
    }
  ];

  /* 포트별 메모.
     unofficial : 등록부에 없지만 실제로 널리 쓰이는 용도 (전송별)
     abuse      : 이 포트를 사용하는 것으로 보고된 악성코드·백도어 (전송별)
     watch      : 공공기관 담당자가 점검할 때 볼 지점
     sources    : 위 내용의 출처 */
  const NOTES = {
    1025: {
      headline: '등록명은 blackjack이지만, 실제로는 윈도우가 동적으로 빌려 쓰는 번호인 경우가 대부분이에요.',
      unofficial: {
        tcp: [
          'MSRPC 동적 엔드포인트 — 과거 윈도우는 동적 RPC 범위를 1025번부터 시작했습니다. ' +
          '그래서 이 포트에는 먼저 올라온 RPC 서비스가 붙고, 번호만으로는 어떤 서비스인지 알 수 없어요. ' +
          'Windows Vista 이후로는 동적 범위가 49152~65535로 바뀌었습니다.',
          'NFS 또는 IIS, Teradata, ShopPro 회계 소프트웨어가 이 번호를 쓴다는 보고가 있습니다.'
        ],
        udp: ['Windows RPC로 쓰인다는 보고가 있습니다.']
      },
      abuse: {
        tcp: ['NetSpy', 'Optix Pro', 'Remote Storm', 'RemoteNC', 'Remote Anything',
              'Fraggle Rock', 'AcidkoR', 'BDDT', 'DataSpy Network X', 'KiLo', 'MuSka52',
              'Paltalk', 'Ptakks', 'Real 2000', 'Remote Explorer Y2K'],
        udp: ['Optix Pro', 'Remote Storm', 'Remote Anything', 'KiLo', 'Ptakks',
              'Real 2000', 'Remote Explorer Y2K', 'Yajing']
      },
      cases: [
        {
          name: 'Backdoor.Win32.Ramus — 인증 없는 원격 코드 실행',
          text: '이 악성코드는 <b>TCP 1025번에서 대기</b>합니다. 감염된 시스템에 닿을 수 있는 제3자는 ' +
                '인증 없이 임의 코드를 실행해 호스트를 더 깊이 장악할 수 있어요. ' +
                '명령은 루마니아어로 “실행”을 뜻하는 <code>executa</code>에 대상 프로그램을 따옴표로 감싸 전달합니다.',
          ref: 'MVID-2021-0427'
        }
      ],
      watch: [
        '업무망 밖에서 1025번이 열려 보이면 <b>동적 RPC 엔드포인트가 노출된 것</b>일 수 있어요. ' +
        'RPC 강제 인증 유도·널 세션 열거·내부 이동의 출발점이 됩니다.',
        '번호만 보고 판단하지 말고 <b>135번 RPC 엔드포인트 매퍼</b>에 질의해 실제로 어떤 인터페이스가 붙어 있는지 확인하세요.',
        '외부에서 들어오는 1025번은 차단하고, 꼭 필요하면 출발지를 지정한 허용 규칙으로 좁히세요.'
      ],
      sources: [
        ['IANA Service Name and Transport Protocol Port Number Registry',
         'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=1025',
         '등록명 blackjack · network blackjack (TCP/UDP)'],
        ['SpeedGuide — Port 1025', 'https://www.speedguide.net/port.php?port=1025',
         '비공식 사용처와 이 포트를 쓰는 악성코드 목록, Backdoor.Win32.Ramus 사례'],
        ['CVE.org 검색', 'https://www.cve.org/CVERecord/SearchResults?query=1025',
         '포트 번호로 공개 취약점 레코드 검색']
      ]
    }
  };

  function rangeOf(n) {
    return RANGES.find((r) => n >= r.from && n <= r.to) || null;
  }
  function noteOf(n) {
    return Object.prototype.hasOwnProperty.call(NOTES, n) ? NOTES[n] : null;
  }

  window.PORT_NOTES = { RANGES, NOTES, rangeOf, noteOf };
})();
