/* 개인정보 처리방침 진단 엔진 (규칙 기반 · 토큰 0)
   업로드/붙여넣기 → 법정 기재사항 진단 → 개선 처리방침·계층별·신구대조표 생성 → 다운로드 → 삭제/24h 보관 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'piedu:policyDiag';

  // 법정 기재사항 진단 항목 [key, label, 근거, 정규식, 조건부?]
  const DIAG = [
    ['purpose', '개인정보의 처리 목적', '법 제30조①1', /(처리|수집|이용)[\s\S]{0,4}목적/],
    ['items', '처리하는 개인정보 항목', '법 제30조①, 작성지침', /(처리|수집)(하는|[\s\S]{0,6})?(개인정보\s*)?항목|수집\s*항목/],
    ['period', '처리 및 보유 기간', '법 제30조①2', /(보유|보관)[\s\S]{0,4}기간|이용\s*기간/],
    ['third', '개인정보의 제3자 제공', '법 제30조①·제17조', /제\s*3\s*자|제삼자/],
    ['consign', '개인정보 처리의 위탁', '법 제30조①·제26조', /위\s*탁|수탁/],
    ['rights', '정보주체·법정대리인의 권리·행사방법', '법 제30조①5·제35~37조', /열람|정정|삭제|처리정지|권리[\s\S]{0,6}(행사|의무)/],
    ['destroy', '개인정보의 파기 절차 및 방법', '법 제30조①·제21조', /파\s*기/],
    ['safety', '안전성 확보조치', '법 제30조①·제29조', /안전성\s*확보|안전\s*조치|암호화|접근\s*통제/],
    ['cookie', '자동 수집 장치(쿠키 등) 설치·운영·거부', '법 제30조①, 작성지침', /쿠키|cookie|자동(으로)?\s*수집/i],
    ['cpo', '개인정보 보호책임자(성명·부서·연락처)', '법 제30조①·제31조', /개인정보\s*보호책임자|보호책임자|CPO/i],
    ['view', '열람청구 접수·처리 부서', '법 제30조①·제35조', /열람(청구)?[\s\S]{0,12}(접수|부서|처리)/],
    ['relief', '정보주체의 권익침해 구제방법', '법 제30조①·영 제31조', /권익\s*침해|분쟁\s*조정|침해\s*신고|개인정보침해/],
    ['change', '처리방침의 변경 공고(시행일·변경내용)', '법 제30조②', /변경|개정|시행\s*일|시행일자/],
    ['cctv', '영상정보처리기기 운영·관리(해당 시)', '법 제30조①·제25조', /영상정보처리기기|CCTV|폐쇄회로/i, true],
    ['pseudo', '가명정보 처리에 관한 사항(해당 시)', '법 제28조의2~7', /가명정보|가명\s*처리/, true],
    ['abroad', '개인정보의 국외 이전(해당 시)', '법 제28조의8·제30조', /국외\s*(이전|제공)/, true]
  ];

  let state = null; // { text, found:{}, gen:{improved, tiered, compare}, org }

  // ---------- 입력 탭 ----------
  $$('#inputCard .tabrow button').forEach(b => b.addEventListener('click', () => {
    $$('#inputCard .tabrow button').forEach(x => x.classList.toggle('on', x === b));
    ['paste', 'file', 'url'].forEach(t => $('#tab-' + t).hidden = t !== b.dataset.tab);
  }));
  const drop = $('#drop'), fileInp = $('#file');
  drop.addEventListener('click', () => fileInp.click());
  ['dragover', 'dragenter'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('hl'); }));
  ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('hl'); }));
  drop.addEventListener('drop', ev => { if (ev.dataTransfer.files[0]) handleFile(ev.dataTransfer.files[0]); });
  fileInp.addEventListener('change', () => { if (fileInp.files[0]) handleFile(fileInp.files[0]); });
  let pendingFileText = '';
  async function handleFile(f) {
    $('#fileName').style.display = 'block'; $('#fileName').textContent = '해석 중: ' + f.name;
    $('#fileName').style.display = 'block';
    $('#fileName').textContent = `읽는 중: ${f.name} …`;
    try {
      pendingFileText = await parseFile(f);
      if (!pendingFileText || pendingFileText.replace(/\s/g,'').length < 30) {
        pendingFileText = '';
        $('#fileName').textContent = `텍스트를 찾지 못했어요: ${f.name} — 스캔 이미지 PDF이거나 본문이 그림으로 들어간 문서일 수 있어요. 내용을 ‘붙여넣기’로 넣어 주세요.`;
      } else {
        $('#fileName').textContent = `불러옴: ${f.name} (${pendingFileText.length.toLocaleString()}자) — ‘진단 시작’을 누르세요.`;
      }
    } catch (e) {
      pendingFileText = '';
      var msg = (e && e.message === 'PDF_LIB') ? 'PDF 해석기를 불러오지 못했어요(네트워크 차단). 인터넷 연결 후 다시 시도하거나 내용을 붙여넣기로 넣어 주세요.'
              : '해석 실패 — 파일이 손상되었거나 암호가 걸려 있을 수 있어요. 내용을 붙여넣기로 넣어 주세요.';
      $('#fileName').textContent = f.name + ' — ' + msg;
    }
  }

  async function parseFile(f) {
    const name = f.name.toLowerCase();
    if (name.endsWith('.txt')) return await f.text();
    const buf = await f.arrayBuffer();
    if (name.endsWith('.docx') || name.endsWith('.docm'))
      return await parseZipXml(buf, /word\/(document|header\d*|footer\d*)\.xml$/);
    if (name.endsWith('.hwpx')) return await parseZipXml(buf, /(Contents\/)?section\d+\.xml$/i);
    if (name.endsWith('.xlsx')) return await parseXlsx(buf);
    if (name.endsWith('.pdf')) return await parsePdf(buf);
    return await f.text();
  }
  async function parseZipXml(buf, re) {
    const zip = await JSZip.loadAsync(buf); let out = '';
    const names = Object.keys(zip.files).filter(n => re.test(n));
    for (const n of names) { const xml = await zip.files[n].async('string'); out += '\n' + stripXml(xml); }
    return out.trim();
  }
  async function parseXlsx(buf) {
    const zip = await JSZip.loadAsync(buf); let out = '';
    const ss = zip.file('xl/sharedStrings.xml'); if (ss) out += stripXml(await ss.async('string'));
    const sheets = Object.keys(zip.files).filter(n => /xl\/worksheets\/sheet\d+\.xml$/.test(n));
    for (const n of sheets) out += '\n' + stripXml(await zip.files[n].async('string'));
    return out.trim();
  }
  async function parsePdf(buf) {
    try { await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); }
    catch (e) { throw new Error('PDF_LIB'); }
    const pdfjs = window.pdfjsLib;
    if (!pdfjs) throw new Error('PDF_LIB'); pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc = await pdfjs.getDocument({ data: buf }).promise; let out = '';
    for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); out += '\n' + tc.items.map(x => x.str).join(' '); }
    return out.trim();
  }
  function stripXml(xml) { return xml.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#[0-9]+;/g, ' ').replace(/\s+/g, ' ').trim(); }
  function loadScript(src) { return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  async function getInputText() {
    const tab = $('#inputCard .tabrow button.on').dataset.tab;
    if (tab === 'paste') return $('#pasteBox').value.trim();
    if (tab === 'file') return pendingFileText.trim();
    if (tab === 'url') { const u = $('#urlBox').value.trim(); if (!u) return ''; try { const r = await fetch(u); return stripXml(await r.text()); } catch (e) { alert('URL을 불러오지 못했어요(차단·로그인 가능성). 내용을 붙여넣기로 넣어 주세요.'); return ''; } }
    return '';
  }

  // ---------- 진단 ----------
  $('#run').addEventListener('click', async () => {
    const text = await getInputText();
    if (!text || text.length < 30) { alert('처리방침 내용을 30자 이상 입력하거나 파일을 올려 주세요.'); return; }
    diagnose(text);
  });
  $('#sample').addEventListener('click', () => { const b = $('#inputCard .tabrow button[data-tab=paste]'); b.click(); $('#pasteBox').value = SAMPLE; });

  function diagnose(text) {
    const found = {}; DIAG.forEach(d => found[d[0]] = d[3].test(text));
    const org = (text.match(/([가-힣A-Za-z0-9]+(시청|군청|구청|공사|공단|재단|병원|대학교|주식회사|㈜|회사|센터|청|부|원))/) || [])[1] || '[기관명]';
    state = { text, found, org, savedAt: null };
    state.gen = generate(state);
    showResults();
  }

  function showResults() {
    $('#inputCard').hidden = true; $('#results').hidden = false;
    const req = DIAG.filter(d => !d[4]), cond = DIAG.filter(d => d[4]);
    const y = req.filter(d => state.found[d[0]]).length, t = req.length, r = Math.round(y / t * 100);
    const g = r >= 90 ? ['양호', 'good'] : r >= 70 ? ['보완 필요', 'mid'] : ['미흡', 'bad'];
    const miss = req.filter(d => !state.found[d[0]]);
    $('#sb').className = 'lv-scorebar ' + g[1]; $('#sb').style.position = 'static';
    $('#sb').innerHTML = `<div class="lv-top"><div><b>필수 기재사항 이행률 ${r}%</b><span>포함 ${y} / ${t}개 · 조건부 ${cond.length}개는 해당 시 필수</span></div><div class="lv-grade">${g[0]}</div></div>
      <div class="lv-meter"><i style="width:${r}%;background:${g[1] === 'good' ? 'var(--ok)' : g[1] === 'mid' ? 'var(--warn)' : 'var(--plain)'}"></i></div>
      ${miss.length ? `<div style="margin-top:8px;font-size:12.5px"><b style="color:var(--plain)">누락 추정 항목 (${miss.length})</b> — 개선안에 표준 문구로 자동 반영했어요<ul style="margin:4px 0 0;padding-left:18px">${miss.slice(0, 8).map(m => `<li>${esc(m[1])}</li>`).join('')}</ul></div>` : '<p class="notice" style="margin-top:8px">필수 기재사항이 모두 감지됐어요.</p>'}`;
    switchR('diag'); updateRet();
  }

  $$('#rtabs button').forEach(b => b.addEventListener('click', () => switchR(b.dataset.r)));
  function switchR(which) {
    $$('#rtabs button').forEach(x => x.classList.toggle('on', x.dataset.r === which));
    const body = $('#rbody');
    if (which === 'diag') {
      body.innerHTML = `<table class="cmp"><thead><tr><th>기재사항</th><th>감지</th><th>근거</th></tr></thead><tbody>${DIAG.map(d => `<tr><td>${esc(d[1])}${d[4] ? ' <span style="color:var(--muted)">(조건부)</span>' : ''}</td><td style="text-align:center;color:${state.found[d[0]] ? 'var(--ok)' : 'var(--plain)'};font-weight:700">${state.found[d[0]] ? '있음' : '없음'}</td><td class="law-cite">${esc(d[2])}</td></tr>`).join('')}</tbody></table>`;
    } else if (which === 'improved') {
      body.innerHTML = `<div class="gen-out">${esc(state.gen.improved)}</div>`;
    } else if (which === 'tiered') {
      body.innerHTML = ['child', 'teen', 'senior'].map(k => `<h3 style="font-family:var(--f-display);font-size:15px;margin:12px 0 4px">${TIER_NAME[k]}</h3><div class="gen-out" style="max-height:220px">${esc(state.gen.tiered[k])}</div>`).join('');
    } else {
      body.innerHTML = `<table class="cmp"><thead><tr><th style="width:22%">기재사항</th><th>현행</th><th>개선(안)</th><th style="width:20%">근거</th></tr></thead><tbody>${state.gen.compare.map(r => `<tr><td>${esc(r[0])}</td><td>${r[1] === '누락' ? '<span style="color:var(--plain)">누락</span>' : esc(r[1])}</td><td class="new">${esc(r[2])}</td><td class="law-cite">${esc(r[3])}</td></tr>`).join('')}</tbody></table>`;
    }
    if (window.PI && window.PI.linkifyLaws) window.PI.linkifyLaws(body);
  }

  // ---------- 생성 (규칙 기반 템플릿) ----------
  const TIER_NAME = { child: '어린이용 (만 14세 미만)', teen: '청소년용 (15~18세)', senior: '어르신용 (65세 이상·큰 글씨)' };
  function generate(st) {
    const org = st.org, F = st.found;
    const art = [];
    const sec = (n, title, body) => art.push(`제${n}조 (${title})\n${body}`);
    sec(1, '개인정보의 처리 목적', `${org}은(는) 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 해당 목적 이외의 용도로는 이용하지 않으며, 목적이 변경되는 경우 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.\n  - 민원 처리, 서비스 제공, 자격 확인 등 소관 사무 수행`);
    sec(2, '처리하는 개인정보의 항목', `${org}은(는) 목적 달성에 필요한 최소한의 항목을 처리합니다.\n  - 필수항목: 성명, 연락처 등\n  - (해당 시) 고유식별정보·민감정보는 법령 근거에 따라 별도 처리`);
    sec(3, '개인정보의 처리 및 보유 기간', `${org}은(는) 법령에 따른 보유·이용기간 또는 정보주체로부터 동의받은 기간 내에서 개인정보를 처리·보유합니다. 보유기간이 경과하면 지체 없이 파기합니다.`);
    sec(4, '개인정보의 제3자 제공', F.third ? `${org}은(는) 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조·제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.` : `${org}은(는) 원칙적으로 개인정보를 제3자에게 제공하지 않습니다. 제공이 필요한 경우 제17조·제18조의 요건을 확인하여 처리합니다.`);
    sec(5, '개인정보 처리업무의 위탁', `${org}은(는) 원활한 업무 처리를 위하여 개인정보 처리업무를 위탁하는 경우, 「개인정보 보호법」 제26조에 따라 위탁계약 시 책임관계를 명확히 하고 수탁자를 관리·감독합니다.`);
    sec(6, '정보주체와 법정대리인의 권리·의무 및 행사방법', `정보주체는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있으며, ${org}은(는) 요구를 받은 날부터 10일 이내에 조치합니다. 권리 행사는 서면·전자우편 등으로 할 수 있습니다.`);
    sec(7, '개인정보의 파기 절차 및 방법', `${org}은(는) 보유기간 경과·처리목적 달성 등 개인정보가 불필요하게 되었을 때 지체 없이 파기합니다. 전자적 파일은 복원이 불가능한 방법으로, 종이 문서는 분쇄·소각합니다.`);
    sec(8, '개인정보의 안전성 확보조치', `${org}은(는) 「개인정보의 안전성 확보조치 기준」에 따라 내부관리계획 수립·시행, 접근권한 관리, 접속기록 보관·점검, 암호화, 보안프로그램 설치 등 관리적·기술적·물리적 조치를 하고 있습니다.`);
    sec(9, '개인정보 자동 수집 장치의 설치·운영 및 거부', `${org}은(는) 이용자 맞춤형 서비스를 위하여 쿠키(cookie)를 사용할 수 있습니다. 이용자는 웹브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.`);
    sec(10, '개인정보 보호책임자', `${org}은(는) 개인정보 처리에 관한 업무를 총괄하여 책임지는 개인정보 보호책임자를 지정하고 있습니다.\n  - 개인정보 보호책임자: [성명] / [부서·직위] / [연락처·이메일]`);
    sec(11, '열람청구 접수·처리 부서', `정보주체는 개인정보 열람청구를 아래 부서에 할 수 있습니다.\n  - 열람청구 접수·처리 부서: [부서명] / [연락처]`);
    sec(12, '권익침해 구제방법', `정보주체는 아래 기관에 분쟁해결·상담을 신청할 수 있습니다.\n  - 개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(118), 대검찰청(1301), 경찰청(182)`);
    if (F.cctv) sec(13, '영상정보처리기기 운영·관리', `${org}은(는) 영상정보처리기기를 설치·운영하는 경우 설치 목적·장소·촬영범위·관리책임자 등을 운영·관리방침으로 공개하고, 안내판을 설치합니다.`);
    if (F.pseudo) art.push(`(해당 시) 가명정보 처리에 관한 사항: 통계작성·과학적 연구·공익적 기록보존 목적으로 가명정보를 처리하는 경우 재식별 금지 및 안전조치를 적용합니다. (법 제28조의2~7)`);
    if (F.abroad) art.push(`(해당 시) 개인정보의 국외 이전: 국외 이전이 있는 경우 이전받는 자·목적·항목·국가·일시·방법 및 거부 방법을 고지합니다. (법 제28조의8)`);
    const foot = `\n부칙\n이 개인정보 처리방침은 20  .  .  .부터 적용되며, 내용의 추가·삭제·수정이 있는 경우 변경사항의 시행 7일 전부터 공지합니다.`;
    const head = `${org} 개인정보 처리방침 (개선안)\n(규칙 기반 표준 문구 초안 — 실제 업무에 맞게 수정하여 공개하세요)\n\n`;
    const improved = head + art.join('\n\n') + foot;

    const tiered = {
      child: `${org} 개인정보 처리방침 (어린이용)\n\n· 우리는 꼭 필요한 정보만 받아요(이름, 연락처 등).\n· 받은 정보는 정해진 일을 할 때만 쓰고, 다 쓰면 바로 지워요.\n· 너의 정보를 보고 싶거나 지우고 싶으면 부모님과 함께 요청할 수 있어요.\n· 만 14세가 안 됐으면 부모님(법정대리인)의 동의가 필요해요.\n· 궁금하면 개인정보 보호책임자에게 물어봐요.`,
      teen: `${org} 개인정보 처리방침 (청소년용)\n\n· 수집 목적: 필요한 서비스를 제공하기 위해서예요.\n· 수집 항목: 목적에 꼭 필요한 최소한의 정보만 받아요.\n· 보유 기간: 목적을 다하면 지체 없이 파기해요.\n· 너의 권리: 열람·정정·삭제·처리정지를 요청할 수 있고, 10일 안에 처리해요.\n· 동의는 자유롭게 선택할 수 있어요. 자세한 내용은 전체 처리방침을 확인하세요.`,
      senior: `${org} 개인정보 처리방침 (어르신용)\n\n■ 왜 모으나요?\n  필요한 민원·서비스를 처리하기 위해서입니다.\n■ 무엇을 모으나요?\n  이름, 연락처 등 꼭 필요한 정보만 모읍니다.\n■ 언제까지 보관하나요?\n  정해진 기간이 지나면 바로 없앱니다.\n■ 어떤 권리가 있나요?\n  내 정보를 보거나, 고치거나, 지워달라고 할 수 있습니다.\n■ 어디로 문의하나요?\n  개인정보 보호책임자 또는 개인정보침해신고센터(국번없이 118).`
    };

    const compare = DIAG.map(d => [d[1], state && state.found[d[0]] ? '포함(확인)' : '누락', (state && state.found[d[0]]) ? '표준 문구로 정비' : '표준 문구 신설', d[2]]);
    return { improved, tiered, compare };
  }

  // ---------- 다운로드 ----------
  $$('#results [data-dl]').forEach(b => b.addEventListener('click', () => download(b.dataset.dl)));
  function fullText() {
    const g = state.gen;
    return g.improved + '\n\n\n=== 계층별 처리방침 ===\n\n[어린이용]\n' + g.tiered.child + '\n\n[청소년용]\n' + g.tiered.teen + '\n\n[어르신용]\n' + g.tiered.senior +
      '\n\n\n=== 신구대조표 ===\n' + g.compare.map(r => `• ${r[0]}\n   현행: ${r[1]} / 개선: ${r[2]} / 근거: ${r[3]}`).join('\n');
  }
  function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); afterDownload(); }
  function download(kind) {
    const base = (state.org || 'privacy').replace(/[\[\]]/g, '') + '_개인정보처리방침_개선안';
    if (kind === 'txt') return saveBlob(new Blob([fullText()], { type: 'text/plain;charset=utf-8' }), base + '.txt');
    if (kind === 'pdf') { const w = window.open('', '_blank'); if (!w) return; w.document.write('<pre style="font-family:sans-serif;white-space:pre-wrap;font-size:12px;line-height:1.7;padding:22px">' + esc(fullText()) + '</pre>'); w.document.close(); w.print(); afterDownload(); return; }
    if (kind === 'docx') return buildDocx(fullText()).then(bl => saveBlob(bl, base + '.docx'));
    if (kind === 'hwpx') return buildHwpx(fullText()).then(bl => saveBlob(bl, base + '.hwpx'));
  }
  async function buildDocx(text) {
    const zip = new JSZip();
    const paras = text.split('\n').map(line => {
      const bold = /^(제\d+조|===|■|\S+ 개인정보 처리방침)/.test(line.trim());
      return `<w:p><w:pPr/><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`;
    }).join('');
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr/></w:body></w:document>`);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  async function buildHwpx(text) {
    // 최소 OWPML 패키지 (베타)
    const zip = new JSZip();
    const paras = text.split('\n').map(l => `<hp:p><hp:run><hp:t>${esc(l)}</hp:t></hp:run></hp:p>`).join('');
    zip.file('mimetype', 'application/hwp+zip');
    zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></rootfiles></container>`);
    zip.folder('META-INF').file('manifest.xml', `<?xml version="1.0" encoding="UTF-8"?><manifest xmlns="http://www.hancom.co.kr/hwpml/2011/manifest"><file-entry full-path="Contents/section0.xml" media-type="application/xml"/><file-entry full-path="Contents/header.xml" media-type="application/xml"/></manifest>`);
    zip.file('version.xml', `<?xml version="1.0" encoding="UTF-8"?><HCFVersion xmlns="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="0" buildNumber="0"/>`);
    const C = zip.folder('Contents');
    C.file('content.hpf', `<?xml version="1.0" encoding="UTF-8"?><opf:package xmlns:opf="http://www.idpf.org/2007/opf/" version="1.0"><opf:spine><opf:itemref idref="header"/><opf:itemref idref="section0"/></opf:spine></opf:package>`);
    C.file('header.xml', `<?xml version="1.0" encoding="UTF-8"?><hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" version="1.4"/>`);
    C.file('section0.xml', `<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">${paras}</hs:sec>`);
    return zip.generateAsync({ type: 'blob' });
  }

  // ---------- 보관/삭제 ----------
  function afterDownload() {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="box"><h3>다운로드 완료</h3><p style="font-size:13.5px;color:var(--muted);line-height:1.6">업로드하신 내용과 생성 결과를 <b>지금 모두 삭제</b>할까요?<br>‘보관’을 고르면 이 브라우저에 <b>24시간 저장 후 자동 삭제</b>돼요(서버에는 아무것도 없어요).</p><div class="sp-btns" style="margin-top:14px"><button class="btn primary" id="mDel" type="button">지금 모두 삭제</button><button class="btn" id="mKeep" type="button">24시간 보관</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#mDel').addEventListener('click', () => { purge(); m.remove(); });
    m.querySelector('#mKeep').addEventListener('click', () => { keep24(); m.remove(); });
  }
  function keep24() { try { state.savedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify({ savedAt: state.savedAt, text: state.text, org: state.org, found: state.found })); } catch (e) {} updateRet(); }
  function purge() { state = null; pendingFileText = ''; try { localStorage.removeItem(KEY); } catch (e) {} $('#pasteBox').value = ''; $('#urlBox').value = ''; $('#results').hidden = true; $('#inputCard').hidden = false; $('#fileName').style.display = 'none'; }
  $('#purge').addEventListener('click', purge);
  function updateRet() {
    let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (saved && saved.savedAt) { const left = Math.max(0, 24 - Math.floor((Date.now() - saved.savedAt) / 3600000)); $('#retInfo').textContent = `브라우저에 보관 중 — 약 ${left}시간 후 자동 삭제`; }
    else $('#retInfo').textContent = '현재 저장된 기록 없음(다운로드 후 선택).';
  }
  // 로드 시 24h 만료 자동 삭제
  (function expiry() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.savedAt && Date.now() - s.savedAt > 86400000) localStorage.removeItem(KEY); } catch (e) {} })();

  const SAMPLE = `○○시청 개인정보 처리방침\n○○시청은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하기 위하여 다음과 같이 처리방침을 수립·공개합니다.\n제1조(처리 목적) ○○시청은 민원 처리 및 행정 서비스 제공을 위하여 개인정보를 처리합니다.\n제2조(처리 항목) 성명, 연락처, 주소를 수집합니다.\n제3조(보유 기간) 관계 법령에 따릅니다.\n제4조(파기) 보유기간이 경과하면 파기합니다.\n제5조(정보주체의 권리) 열람·정정·삭제를 요구할 수 있습니다.\n제6조(개인정보 보호책임자) 보호책임자를 지정하여 운영합니다.`;
})();
