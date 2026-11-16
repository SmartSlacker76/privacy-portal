/* 포트별 보충 메모 — 등록부만으로는 알 수 없는 실제 쓰임과 사고 이력.
   어려운 말은 쓰지 않고, 꼭 필요한 용어는 바로 옆에 풀어 적는다.
   원문을 옮기지 않고 사실만 정리했으며, 항목마다 출처를 둔다. */
(() => {
  'use strict';

  /* 번호 구간별 설명 — 따로 메모가 없는 포트에도 적용된다 */
  const RANGES = [
    {
      from: 0, to: 1023, label: '0~1023번 · 미리 정해 둔 자리',
      note: '웹·메일처럼 오래된 기본 서비스에 <b>번호를 미리 붙여 둔 구간</b>이에요. ' +
            '건물로 치면 1층 안내데스크나 우편실처럼 “여기는 원래 이것”이라고 정해진 방이에요. ' +
            '이 구간에 서비스를 열려면 보통 <b>관리자 권한</b>이 필요해서 아무나 올릴 수 없어요. ' +
            '그래도 담당자가 다른 걸 올려 둘 수 있으니, 번호만 보고 믿지 말고 실제로 무엇이 돌고 있는지 확인하세요.'
    },
    {
      from: 1024, to: 49151, label: '1024~49151번 · 신청해서 받은 자리',
      note: '회사나 단체가 <b>신청해서 이름을 올린</b> 구간이에요. ' +
            '중요한 점은, <b>이름표와 실제로 그 방에 있는 사람이 다른 경우가 아주 흔하다</b>는 거예요. ' +
            '등록부는 “누가 이 번호를 신청했는가”만 알려 줄 뿐, 지금 그 번호에서 무엇이 손님을 기다리고 있는지는 ' +
            '서버에서 직접 봐야 알 수 있어요.'
    },
    {
      from: 49152, to: 65535, label: '49152~65535번 · 그때그때 빌려 쓰는 자리',
      note: '누구에게도 고정으로 주지 않는 구간이에요. 컴퓨터가 밖에 연결할 때마다 ' +
            '<b>빈 번호를 잠깐 빌렸다가 돌려주는</b> 식으로 씁니다. 기관이 자체 서비스에 쓰기도 해요. ' +
            '그래서 이 구간의 번호만 보고 “무슨 서비스다”라고 말할 수 없어요.'
    }
  ];

  /* 포트별 메모
     plain      : 한 줄 요약 (가장 쉬운 말로)
     unofficial : 등록부에 없지만 실제로 쓰이는 곳 (전송별)
     abuse      : 이 번호를 쓴 것으로 보고된 악성코드 (전송별)
     cases      : 구체적인 사고·악성코드 사례
     watch      : 담당자가 볼 지점
     sources    : 출처 */
  const NOTES = {
    1025: {
      headline: '등록부에 적힌 이름은 blackjack이지만, 실제로는 <b>윈도우가 그때그때 빌려 쓰는 번호</b>인 경우가 대부분이에요.',
      unofficial: {
        tcp: [
          '<b>윈도우 프로그램끼리 통화하는 자리</b> — 윈도우 안에서는 프로그램들이 서로 말을 주고받는데, ' +
          '이때 쓸 번호를 미리 정하지 않고 비어 있는 번호를 빌려 씁니다. 예전 윈도우는 그 빌려 쓰는 번호를 ' +
          '<b>1025번부터</b> 나눠 줬어요. 그래서 이 번호에는 그날 가장 먼저 켜진 기능이 붙고, ' +
          '번호만 봐서는 무엇인지 알 수 없습니다. (윈도우 비스타부터는 49152~65535번에서 빌려 쓰도록 바뀌었어요.)',
          '파일 공유(NFS), 웹 서버(IIS), 테라데이타, ShopPro 회계 프로그램이 이 번호를 쓴다는 보고도 있어요.'
        ],
        udp: ['윈도우 프로그램끼리 통화하는 용도로 쓰인다는 보고가 있어요.']
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
          name: 'Backdoor.Win32.Ramus — 비밀번호 없이 남의 컴퓨터에서 프로그램을 실행',
          text: '이 악성코드는 감염된 컴퓨터의 <b>1025번 문을 열어 두고 손님을 기다립니다</b>. ' +
                '그 문에 닿을 수 있는 사람은 <b>비밀번호를 묻지도 않고</b> 원하는 프로그램을 실행시킬 수 있어요. ' +
                '그렇게 되면 그 컴퓨터는 사실상 공격자 손에 넘어갑니다. ' +
                '명령은 <code>executa</code>(루마니아어로 “실행”)라고 적고 뒤에 실행할 프로그램 이름을 따옴표로 감싸 보냅니다.',
          ref: 'MVID-2021-0427'
        }
      ],
      watch: [
        '바깥(인터넷)에서 우리 기관의 1025번이 보인다면, <b>윈도우가 내부용으로 쓰던 문이 밖으로 열려 있다</b>는 뜻일 수 있어요. ' +
        '공격자는 이런 문으로 로그인 정보를 흘리게 만들거나, 비밀번호 없이 사용자·공유 목록을 훑어보거나, ' +
        '그 컴퓨터를 발판 삼아 옆 컴퓨터로 번져 갑니다.',
        '번호만 보고 판단하지 마세요. 윈도우에는 <b>어느 번호에 무엇이 붙어 있는지 알려 주는 안내 창구(135번)</b>가 있어요. ' +
        '거기에 물어보면 1025번에 실제로 무엇이 붙어 있는지 확인할 수 있습니다.',
        '바깥에서 들어오는 1025번은 <b>막는 것이 기본</b>이에요. 꼭 써야 한다면 “어디에서 오는 것만 허용”인지 지정해 좁히세요.'
      ],
      sources: [
        ['IANA 포트 등록부',
         'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=1025',
         '등록된 이름 blackjack · network blackjack (TCP·UDP 모두)'],
        ['SpeedGuide — 1025번', 'https://www.speedguide.net/port.php?port=1025',
         '등록부 밖의 실제 쓰임과 이 번호를 쓴 악성코드 목록, Backdoor.Win32.Ramus 사례'],
        ['CVE.org 검색', 'https://www.cve.org/CVERecord/SearchResults?query=1025',
         '공개된 보안 취약점 기록을 번호로 찾아보기']
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
