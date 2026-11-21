/* 시민용 답변 카드 — [요망진 간세] 3단 공식
 *   1) 첫 줄: 결론 먼저("~하실 수 있어요")  2) 핵심 조건 2~3줄(한 줄에 정보 하나)  3) 다음 행동 버튼
 * 본문(첫 줄 + 가운데 줄)은 공백 포함 200자 이내, 이모티콘 없이 해요체로 씁니다.
 * 근거: 첨부 자료(문서ID·쪽) 또는 운영자 제공 FAQ(2026-11-21 대화에서 받은 시민용 답변 예시).
 *   - 연락처 118·1833-6972·182: 개인정보 처리방침 표준(안) D29 p23·p39
 *   - 개인정보 포털·국가법령정보센터: 마이데이터 안내서 D28 p4
 *   - 경찰청 사이버범죄 신고 주소: 첨부 자료(2026 표준안)에는 ecrm.cyber.go.kr, 운영자 FAQ에는 ecrm.police.go.kr — 운영자 FAQ를 따릅니다.
 *   - 정보공개포털·정보공개 기한: 첨부 자료에 없고 운영자 FAQ에만 있습니다(법령은 법제처 원문 링크로 확인).
 * when: 이 정규식에 맞는 질문에만 카드를 씁니다. 주제 카드(topic)가 없는 FAQ는 match로 질문을 찾습니다.
 * 기관 담당 부서 연락처는 assets/config.js 의 APP_CONFIG.AGENCY 에 넣으면 버튼으로 붙습니다(비우면 표시 안 함).
 */
window.COUNSEL_DESKS = {
  kisa: { label: '개인정보 침해신고센터 118', tel: '118', url: 'https://privacy.kisa.or.kr/', ref: 'D29 p23' },
  kisaWeb: { label: '개인정보 침해신고센터', url: 'https://privacy.kisa.or.kr/', ref: 'D29 p23' },
  kopico: { label: '개인정보 분쟁조정위원회 1833-6972', tel: '1833-6972', url: 'https://www.kopico.go.kr/', ref: 'D29 p23' },
  kopicoWeb: { label: '개인정보 분쟁조정위원회', url: 'https://www.kopico.go.kr/', ref: 'D29 p23' },
  police: { label: '경찰청 사이버범죄 신고', url: 'https://ecrm.police.go.kr/', ref: '운영자 FAQ' },
  police182: { label: '경찰청 182', tel: '182', ref: 'D29 p23' },
  portal: { label: '개인정보 포털', url: 'https://www.privacy.go.kr/', ref: 'D28 p4' },
  open: { label: '정보공개포털', url: 'https://www.open.go.kr/', ref: '운영자 FAQ' },
  law: { label: '국가법령정보센터', url: 'https://www.law.go.kr/', ref: 'D28 p4' },
  agencyPrivacy: { agency: 'privacy' },
  agencySecurity: { agency: 'security' }
};
window.COUNSEL_CITIZEN = {
  rights: {
    lead: '개인정보 열람·정정·삭제는 온라인이나 방문으로 신청하실 수 있어요.',
    items: [
      ['신청 방법', '기관 처리방침에 적힌 접수 창구(홈페이지·전자우편·방문)'],
      ['준비물', '방문 신청 시 신분증 지참'],
      ['처리 기한', '요구한 날부터 10일 이내']
    ],
    law: { k: '법령', n: '개인정보 보호법', jo: 35 },
    act: ['portal', 'agencyPrivacy', 'kisa'],
    refs: [{ d: 'D29', p: 21 }, { d: 'D20', p: 11 }]
  },
  cctv: {
    when: /열람|보고 ?싶|볼 ?수|보여|확인|영상.{0,4}(요청|달라|받|줄)|삭제|지워/,
    lead: 'CCTV에 찍힌 내 영상은 열람이나 삭제를 요청하실 수 있어요.',
    items: [
      ['신청처', 'CCTV를 운영하는 기관의 관리책임자'],
      ['준비물', '신분증 지참'],
      ['거절할 때', '기관은 10일 이내에 사유를 알려야 해요']
    ],
    law: { k: '법령', n: '개인정보 보호법', jo: 35 },
    act: ['agencyPrivacy', 'kisa'],
    refs: [{ d: 'D37', p: 36 }, { d: 'D37', p: 27 }]
  },
  breach: {
    lead: '개인정보 침해가 의심되면 공식 창구로 바로 신고하실 수 있어요.',
    items: [
      ['정부 신고 창구', '개인정보 침해신고센터(국번 없이 118)'],
      ['기관 통지', '기관은 유출을 안 뒤 72시간 이내에 알려야 해요'],
      ['주의', '채팅창에 주민등록번호 등은 입력하지 마세요']
    ],
    law: { k: '법령', n: '개인정보 보호법', jo: 34 },
    act: ['kisa', 'agencyPrivacy', 'kisaWeb'],
    refs: [{ d: 'D29', p: 23 }, { d: 'D45', p: 14 }]
  },
  dispute: {
    lead: '개인정보 피해는 분쟁조정을 신청하실 수 있어요.',
    items: [
      ['신청처', '개인정보 분쟁조정위원회(온라인 신청 가능)'],
      ['처리 기한', '접수일부터 60일 이내가 원칙'],
      ['준비물', '피해를 보여 주는 자료']
    ],
    law: { k: '법령', n: '개인정보 보호법', jo: 43 },
    act: ['kopico', 'kopicoWeb'],
    refs: [{ d: 'D31', p: 167 }, { d: 'D29', p: 23 }]
  }
};
/* 주제 카드가 없는 시민 민원 FAQ(운영자 제공 답변 예시 기반) */
window.COUNSEL_CITIZEN_FAQ = [
  {
    id: 'smishing',
    match: /스미싱|피싱|의심.{0,4}문자|문자.{0,8}(링크|url|주소)|이상한 ?문자|보안 ?취약점.{0,6}(제보|신고|발견)|해킹.{0,4}(신고|제보)/i,
    lead: '의심 문자의 링크는 누르지 말고 바로 신고하실 수 있어요.',
    items: [
      ['피싱·스미싱', '경찰청 사이버범죄 신고(국번 없이 182)'],
      ['개인정보 침해', '개인정보 침해신고센터(국번 없이 118)']
    ],
    act: ['police', 'agencySecurity', 'kisa'],
    refs: [{ d: 'D29', p: 23 }, { faq: true }]
  },
  {
    id: 'info-open',
    match: /정보 ?공개|공개 ?청구|open\.go/,
    lead: '공공기관의 행정 정보는 온라인으로 공개를 청구하실 수 있어요.',
    items: [
      ['신청 방법', '정보공개포털 온라인 접수 또는 민원실 방문'],
      ['처리 기한', '청구일부터 10일 이내 결정(10일 연장 가능)']
    ],
    law: { k: '법령', n: '공공기관의 정보공개에 관한 법률', jo: 11 },
    act: ['open'],
    refs: [{ faq: true }]
  },
  {
    id: 'law-search',
    match: /(조례|자치 ?법규|규칙|법령|법률).{0,6}(조회|검색|찾|보는 ?곳|어디)/,
    lead: '최신 법령과 자치법규는 공식 사이트에서 무료로 조회하실 수 있어요.',
    items: [
      ['국가 법령', '국가법령정보센터에서 법령명 검색'],
      ['조례·규칙', '자치법규정보시스템에서 기관명 검색']
    ],
    act: ['law'],
    refs: [{ d: 'D28', p: 4 }, { faq: true }]
  }
];
