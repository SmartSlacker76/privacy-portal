(function () {
  var KB = window.CHATKB || [], A = window.CHATKB_ASOF || {}, QNA = window.CHATQNA || [];
  var chat = document.getElementById('chat');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }

  /* ── 주제 매칭 ─────────────────────────────────────────── */
  function match(q) {
    var s = q.toLowerCase().replace(/\s/g, ''), best = null, sc0 = 0;
    // 조문 번호로 찾기: "제34조", "제25조의2" 등
    var arts = (q.replace(/\s/g, '').match(/제\d+조(?:의\d+)?/g) || []);
    KB.forEach(function (e) {
      if (e.need && !e.need.some(function (n) { return s.indexOf(n.replace(/\s/g, '')) >= 0; })) return;
      var sc = 0;
      e.kw.forEach(function (k) { var kk = k.toLowerCase().replace(/\s/g, ''); if (s.indexOf(kk) >= 0) sc = Math.max(sc, kk.length); });
      if (arts.length) {
        (e.laws || []).forEach(function (L) {
          arts.forEach(function (a) {
            // "제25조의2" 질문은 "제25조"에 매칭되지 않도록 정확히 비교
            if (L.a === a) sc = Math.max(sc, a.length + 6);
          });
        });
      }
      if (sc > sc0) { sc0 = sc; best = e; }
    });
    if (!(sc0 > 0)) return null;
    /* 동문서답 방지: 질문 토큰 가운데 이 주제가 실제로 다루는 비중이 낮으면 '불확실'로 표시합니다. */
    var qt = tokens(q), covered = 0, total = 0;
    var hay = qaNorm((best.title || '') + ' ' + (best.kw || []).join(' ') + ' ' + (best.intro || '')
      + ' ' + (best.sum2 || []).join(' ') + ' ' + (best.src || '')
      + ' ' + (best.sections || []).map(function (x) { return (x.h || '') + ' ' + (x.items || []).join(' '); }).join(' '));
    for (var t = 0; t < qt.length; t++) {
      if (qt[t].length < 2) continue;
      total += qt[t].length;
      if (hay.indexOf(qt[t]) >= 0) covered += qt[t].length;
    }
    best = Object.create(best);
    best.weak = total > 0 && (covered / total) < 0.34;
    return best;
  }

  /* ── 모드 판별 ─────────────────────────────────────────── */
  var RE_QUIZ   = /퀴즈|문제\s*(를|좀)?\s*(만들|출제|내)|테스트|ox|o\/x|교육자료|문항/i;
  var RE_REVIEW = /검토|적법|위법|가능한가|가능한지|되나요|돼요\?|해도\s*(되|돼)|문제\s*(없|있)|괜찮|합법|위반\s*(인|되)|받아도|수집해도|제공해도/;
  function mode(q) {
    if (RE_QUIZ.test(q)) return 3;
    if (RE_REVIEW.test(q) && q.replace(/\s/g, '').length > 12) return 2;
    return 1;
  }

  /* ── 공통 출력 구조: 2줄 요약 + 자세히 보기 토글 ─────────── */
  function wrap(sum2, body, label) {
    return '<div class="sum2">' + sum2.map(function (L) { return '<p>' + L + '</p>'; }).join('') + '</div>' +
      '<details class="dt"><summary>' + esc(label || '자세히 보기') + '</summary><div class="dt-in">' + body + '</div></details>';
  }

  /* ── 모드 1: 표준 8단계 ─────────────────────────────────── */
  function render8(e, full) {
    var h = '<p class="a-intro">공공기관 실무 및 교육을 위한 <b>' + esc(e.title) + '</b>의 핵심 법령 검토 기준부터 실제 위반 사례까지 정리해 드릴게요.</p>';
    var secs = e.sections || [];
    if (!full) secs = secs.filter(function (x) { return [1, 3, 5, 8].indexOf(x.n) >= 0; });
    h += secs.map(function (sec) {
      var b = '<div class="a-sec"><h4>' + sec.n + '. ' + esc(sec.h) + '</h4>';
      if (sec.items && sec.items.length) b += '<ul>' + sec.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
      if (sec.check) {
        b += '<div class="chk-box"><div class="chk-h">법령 검토 체크리스트 (실무자용)</div>' +
          sec.check.map(function (c, i) { return '<label class="chk-i"><input type="checkbox" data-c="' + i + '"><span>' + c + '</span></label>'; }).join('') + '</div>';
      }
      if (sec.summary) b += '<div class="sum-box"><b>한 줄 핵심 요약</b><p>' + sec.summary + '</p></div>';
      return b + '</div>';
    }).join('<hr class="a-hr">');
    if (e.tableHtml) h += e.tableHtml;
    h += guideBlock(e) + qnaBlock(e);
    return h + tailer(e);
  }

  /* 첨부 가이드(지식 파일) 인용 — 지식베이스 최우선 참조 원칙 */
  function guideBlock(e) {
    if (!e.guide || !e.guide.length) return '';
    return '<hr class="a-hr"><div class="gd"><h4>📎 첨부 가이드 기준</h4>' +
      '<p class="gd-n">아래는 기관에 등록된 <b>안내서·지침 파일</b>에서 직접 인용한 기준이에요. 법령과 함께 <b>우선 적용</b>해 주세요.</p>' +
      e.guide.map(function (g0) { var g = gnorm(g0);
        return '<div class="gd-i"><div class="gd-s">' + esc(g.s) + '</div>' + (g.t ? '<div class="gd-t">' + g.t + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  }

  /* ── 모드 2: 실무 검토 심화 ─────────────────────────────── */
  function sum2of2(e) {
    return ['이 사안은 <b>' + esc(e.title) + '</b> 문제예요. ' + ((e.sum2 && e.sum2[0]) || ''),
            '아래 <b>검토 의견</b>에서 결론·법적 근거·예상 리스크·실무 대안을 확인하고, <b>최종 판정은 담당자가</b> 체크리스트로 확정해 주세요.'];
  }
  function render2(e, q) {
    var h = render8(e, false);
    h += '<hr class="a-hr"><div class="rv"><h4>📑 [실무 사례 법령 검토 의견]</h4>' +
      '<p class="rv-q">검토 요청: <b>' + esc(q.length > 120 ? q.slice(0, 120) + '…' : q) + '</b></p>' +
      '<dl class="rv-dl">' +
      '<dt>검토 결론</dt><dd>아래 <b>3가지 조건</b>을 모두 충족하면 <b class="ok">적법</b>, 하나라도 비면 <b class="cond">조건부 가능</b>, 법령 근거도 별도 동의도 없으면 <b class="bad">부적법(위반 소지 높음)</b>이에요. 규칙 기반 도구라 <b>최종 판정은 담당자가</b> 아래 기준으로 확정해 주세요.</dd>' +
      (e.guide && e.guide.length
        ? '<dt>첨부 가이드 대조</dt><dd>' + e.guide.slice(0, 2).map(function (g0) { var g = gnorm(g0); return '· <b>' + esc(g.s) + '</b>' + (g.t ? ' — ' + g.t : ''); }).join('<br>') + '</dd>'
        : '') +
      '<dt>법적 근거 대조</dt><dd>' + (e.sections.filter(function (x) { return x.n === 3; })[0] || { items: [] }).items.slice(0, 3).map(function (i) { return '· ' + i; }).join('<br>') + '</dd>' +
      '<dt>예상 리스크</dt><dd>' + (e.sections.filter(function (x) { return x.n === 5; })[0] || { items: [] }).items.slice(0, 3).map(function (i) { return '· ' + i; }).join('<br>') + '</dd>' +
      '<dt>실무 대안·보완</dt><dd>· <b>최소수집</b>으로 항목을 줄일 수 있는지 먼저 보세요(대체 가능한 항목이 있으면 그 항목은 받지 않아요).<br>' +
        '· 법령 근거가 없으면 <b>별도 동의 서식</b>을 갖추고 거부 시 불이익이 없도록 설계하세요.<br>' +
        '· 처리가 불가피하면 <b>보유기간 단축 · 암호화 · 접근권한 최소화</b>로 위험을 낮추고 근거를 문서로 남기세요.</dd>' +
      '</dl></div>';
    return h;
  }

  function gnorm(g) { return (typeof g === 'string') ? { s: g, t: '' } : (g || { s: '', t: '' }); }

  /* ── 답변 형식: 인사 → 핵심 한 단락 → 핵심 표 → 자세히(접힘) → 깜짝 퀴즈 ── */
  function plain(h) { return String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function clip(h, n) {
    var t = String(h || '').replace(/^[^\w가-힣<]*\s*/, '');
    if (plain(t).length <= n) return t;
    var cut = plain(t).slice(0, n);
    var dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('요.'), cut.lastIndexOf('다.'));
    return esc(dot > n * 0.5 ? cut.slice(0, dot + 1) : cut + '…');
  }
  function secOf(e, n) { return (e.sections || []).filter(function (x) { return x.n === n; })[0] || { items: [] }; }

  /* 비교표가 있으면 그대로, 없으면 주제의 뼈대로 2열 표를 만든다 */
  function coreTable(e, used) {
    if (e.tableHtml) {
      String(e.tableHtml).split(/<\/t[dh]>/).forEach(function (cell) {
        var t = plain(cell);
        if (t && t.length > 12) used[t] = 1;
      });
      return e.tableHtml;
    }
    var rows = [
      ['무엇인가요?', secOf(e, 1).items[0]],
      ['언제 적용되나요?', secOf(e, 3).items[0]],
      ['공공기관은 무엇을 하나요?', secOf(e, 4).items[0]],
      ['어기면 어떻게 되나요?', secOf(e, 5).items[0]]
    ].filter(function (r) { return r[1]; });
    var last = (e.sections || []).filter(function (x) { return x.summary; })[0];
    if (last) rows.push(['꼭 기억할 한 가지', last.summary]);
    if (!rows.length) return '';
    rows.forEach(function (r) { used[plain(r[1])] = 1; });
    return '<table class="core-t"><tbody>' + rows.map(function (r) {
      return '<tr><th>' + esc(r[0]) + '</th><td>' + clip(r[1], 150) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }

  /* 위에서 이미 보여 준 내용은 빼고 8단계를 펼친다 */
  function detailBody(e, used) {
    var h = (e.sections || []).map(function (sec) {
      var items = (sec.items || []).filter(function (i) { return !used[plain(i)]; });
      if (!items.length && !sec.check && !(sec.summary && !used[plain(sec.summary)])) return '';
      var b = '<div class="a-sec"><h4>' + sec.n + '. ' + esc(sec.h) + '</h4>';
      if (items.length) b += '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
      if (sec.check) {
        b += '<div class="chk-box"><div class="chk-h">실무자 점검 목록</div>' +
          sec.check.map(function (c, i) { return '<label class="chk-i"><input type="checkbox" data-c="' + i + '"><span>' + c + '</span></label>'; }).join('') + '</div>';
      }
      if (sec.summary && !used[plain(sec.summary)]) b += '<div class="sum-box"><b>한 줄 핵심</b><p>' + sec.summary + '</p></div>';
      return b + '</div>';
    }).filter(Boolean).join('<hr class="a-hr">');
    return h + guideBlock(e) + qnaBlock(e) + tailer(e);
  }

  function quizBlock(e) {
    var qs = e.quiz || [];
    if (!qs.length) return '';
    var z = qs[Math.floor(Math.random() * qs.length)];
    return '<details class="dt qzs"><summary>💡 헷갈리기 쉬운 깜짝 퀴즈!</summary><div class="dt-in">' +
      '<p class="qzs-q"><b>문제</b> ' + z.q + '</p>' +
      '<p class="qzs-a"><b>정답: ' + esc(z.a) + '</b> — ' + z.why +
      (z.tip ? ' <span class="qzs-tip">💬 ' + z.tip + '</span>' : '') + '</p>' +
      (z.law ? '<p class="qzs-law">근거: ' + esc(z.law) + '</p>' : '') + '</div></details>';
  }

  function josaGa(w) {
    var t = String(w || '').replace(/[)\]\s]+$/, '');
    var c = t.charCodeAt(t.length - 1);
    if (c >= 0xac00 && c <= 0xd7a3) return ((c - 0xac00) % 28) ? '이' : '가';
    if (/[0-9]$/.test(t)) return '136780'.indexOf(t.slice(-1)) >= 0 ? '이' : '가';
    if (/[a-zA-Z]$/.test(t)) return /[lmnr]$/i.test(t) ? '이' : '가';
    return '가';
  }

  /* ───────── 질의응답 모음집(2025.12.) 99문항 ───────── */
  var lastTopic = null;
  /* 개인정보처리자 범위 질문에는 제주 행정시 의결을 함께 안내합니다.
     개인정보보호위원회 의결 제2022-116-035호(2022. 9. 28.) */
  function controllerNote(q) {
    if (!/개인정보처리자|처리자에 해당|행정시|제주시|서귀포시|지방자치단체/.test(String(q || ''))) return '';
    return '<div class="rul-box"><p class="rul-h">개인정보보호위원회 의결 제2022-116-035호 (2022. 9. 28.)</p>'
      + '<p class="o">제주특별자치도는 <b>개인정보처리자에 해당</b>하지만, 「제주특별법」 제10조에 따라 설치된 '
      + '행정시(제주시·서귀포시)는 지방자치단체가 아니어서 <b>개인정보처리자에 해당하지 않는다</b>고 판단했어요.</p>'
      + '<p class="o">같은 의결은 도의 개인정보 보호책임자가 관할 행정시를 포함해 보호 업무를 <b>총괄할 수 있다</b>고 보았습니다.</p></div>';
  }
  /* 모음집 단독 답변(포털 주제가 없을 때) */
  /* 모음집 문항의 조문·키워드로 가장 가까운 포털 주제를 찾아 5개 버튼을 붙입니다. */
  function nearTopic(hit){
    var KB2 = window.CHATKB || [];
    var arts = (hit.laws || []).map(function (L) { return (L.match(/제\d+조(?:의\d+)?/) || [''])[0]; }).filter(Boolean);
    var best = null, bs = 0;
    KB2.forEach(function (e) {
      var sc = 0;
      (e.laws || []).forEach(function (L) {
        var a = String(L.a || L.n || '').match(/제\d+조(?:의\d+)?/);
        if (a && arts.indexOf(a[0]) >= 0) sc += 3;
      });
      /* 태그가 같으면 가중 */
      if (hit.tag && e.title && hit.tag.split('·').some(function(t){return t.length>1 && e.title.indexOf(t)>=0;})) sc += 2;
      (e.kw || []).forEach(function (k) { if (k.length > 1 && hit.q.indexOf(k) >= 0) sc += k.length; });
      if (sc > bs) { bs = sc; best = e; }
    });
    return bs >= 2 ? best : null;
  }
  function qaOnly(hit, q) {
    var near = nearTopic(hit);
    if (near) lastTopic = near;
    return qaAnswer(hit) + controllerNote(q)
      + '<p class="note-x">※ 출처: 개인정보보호위원회 「개인정보 질의응답 모음집」(2025. 12.) 제' + hit.no + '문항</p>'
      + (near ? '<p class="note-x">관련 주제: ' + esc(near.title) + '</p>' + topicButtons(near.id) : '');
  }
  var QA = window.QA_COLLECTION || [];
  function qaNorm(x){ return String(x||'').toLowerCase().replace(/[\s·.,?!()「」｢｣'"]/g,''); }
  var QA_IDX = QA.map(function(it){ return {it:it, k:qaNorm(it.q)}; });
  /* 조사·어미를 떼고 2글자 이상 토큰만 남겨 동문서답을 줄입니다. */
  /* 어절 단위로 끊고 조사·어미를 떼어 2글자 이상 토큰만 남깁니다.
     (공백을 지운 문자열에서 돌리면 질문 전체가 한 토큰이 되어 매칭이 깨집니다) */
  function tokens(x){
    return String(x||'').toLowerCase()
      .replace(/[·.,?!()「」｢｣'"’“”]/g,' ')
      .split(/\s+/)
      .map(function(w){
        return w.replace(/(이란|란|이|가|은|는|을|를|의|에|도|만|과|와|로|으로|에서|에게|부터|까지|인가요|하나요|합니까|할까요|되나요|있나요|여부)$/,'');
      })
      .filter(function(w){ return w.length>=2; });
  }
  function qaFind(q){
    var nq=qaNorm(q);if(nq.length<4)return null;
    var generic=/^(개인정보|정보|보호법|법|관련|대해|무엇|방법|설명|알려|요청|가능|여부|경우)$/;
    var a=tokens(q).filter(function(t){return !generic.test(t);});
    var best=null,bs=0;
    for(var i=0;i<QA_IDX.length;i++){
      var it=QA_IDX[i].it,k=QA_IDX[i].k;
      if(k===nq)return it;
      if(!a.length||nq.length<7)continue;
      var b=tokens(it.q).filter(function(t){return !generic.test(t);});
      var hit=0;
      a.forEach(function(t){if(b.some(function(x){return x===t||(x.length>=3&&t.length>=3&&(x.indexOf(t)>=0||t.indexOf(x)>=0));}))hit++;});
      var cover=hit/a.length,sc=0;
      if(k.indexOf(nq)>=0&&nq.length>=9)sc=500+nq.length;
      else if(nq.indexOf(k)>=0&&k.length>=9)sc=480+k.length;
      else if(hit>=2&&cover>=0.75)sc=Math.round(cover*300)+hit*10;
      if(sc>bs){bs=sc;best=it;}
    }
    return bs>=220?best:null;
  }

  /* ───────── 간결한 첫 답변 ───────── */
  function oBullets(list){
    return (list||[]).map(function(b){
      var sub=/^—\s/.test(b);
      return '<p class="o'+(sub?' o-sub':'')+'">'+(sub?esc(b.replace(/^—\s*/,'')):esc(b))+'</p>';
    }).join('');
  }
  function noteLines(list){
    return (list||[]).map(function(n){ return '<p class="note-x">※ '+esc(n)+'</p>'; }).join('');
  }
  /* "네! ○○에 대해 알려 드릴께요." — 보내주신 예시 형식 */
  /* "…에 해당하나요?" → "…에 해당되는지" 처럼 명사절로 바꿔 인사말을 자연스럽게 만듭니다. */
  function clause(x){
    var t=String(x||'').trim().replace(/\?+$/,'');
    var R=[[/해당하나요$/,'해당되는지'],[/해당합니까$/,'해당되는지'],[/해당되나요$/,'해당되는지'],
      [/인가요$/,'인지'],[/입니까$/,'인지'],[/맞나요$/,'맞는지'],
      [/있나요$/,'있는지'],[/없나요$/,'없는지'],[/되나요$/,'되는지'],[/될까요$/,'될지'],
      [/가능한가요$/,'가능한지'],[/가능합니까$/,'가능한지'],
      [/해야 하나요$/,'해야 하는지'],[/해야 합니까$/,'해야 하는지'],
      [/하나요$/,'하는지'],[/합니까$/,'하는지'],[/할까요$/,'할지'],[/하는가요$/,'하는지']];
    for(var i=0;i<R.length;i++) if(R[i][0].test(t)) return t.replace(R[i][0],R[i][1]);
    return null;
  }
  function openLine(subject){
    var c=clause(subject);
    if(c) return '<p class="greet">네! '+esc(c)+' 알려 드릴께요.</p>';
    return '<p class="greet">네! <b>'+esc(String(subject||'').replace(/\?+$/,''))+'</b>에 대해 알려 드릴께요.</p>';
  }
  function qaAnswer(it){
    var detail = oBullets(it.bullets) + noteLines(it.notes) + (it.rulings&&it.rulings.length ? '<p class="rul">관련 결정·판례: '+it.rulings.map(esc).join(' · ')+'</p>':'');
    return '<p class="friendly-lead">네, <b>'+esc(it.q)+'</b>에 대해 궁금하셨군요! 알기 쉽게 설명해 드릴게요. 😊</p>' +
      '<p class="friendly-answer">'+esc(it.lead)+'</p>' +
      (detail ? '<p class="friendly-answer">구체적인 판단 기준과 사례도 함께 살펴보세요!</p><div class="friendly-detail">'+detail+'</div>':'');
  }

  /* ───────── 8개 상세 → 5개 주제로 통폐합 ───────── */
  var TOPIC5 = [
    { id:'core',  label:'① 한눈에 보는 핵심',        ask:'핵심 내용을 간단히 정리해 주세요.',              secs:[] },
    { id:'legal', label:'② 정의·조문·판례·유권해석', ask:'정의와 조문 근거, 판례·유권해석을 알려 주세요.', secs:[1,7] },
    { id:'case',  label:'③ 유형·공공사례·적법성',    ask:'주요 유형과 공공분야 사례, 적법성 판단 기준을 알려 주세요.', secs:[2,3] },
    { id:'ctrl',  label:'④ 안전조치·제재·위반 사례', ask:'공공기관 안전조치와 법적 제재, 위반 사례를 알려 주세요.', secs:[4,5,6] },
    { id:'check', label:'⑤ 체크리스트·교육 요약',    ask:'실무 체크리스트와 교육 핵심 요약을 알려 주세요.', secs:[8] }
  ];
  function renderTopic(e,q) {
    var lead = plain(e.intro || ((e.sum2 || [])[0] || ''));
    lead = String(lead || '').replace(/\s+/g,' ').trim();
    var sentences = lead.match(/[^.!?。]+[.!?。]?/g) || [lead];
    var brief = sentences.slice(0,2).join(' ').trim();
    if (brief.length > 270) brief = brief.slice(0,267) + '…';
    var notes=(e.sum2||[]).map(plain).map(function(x){return String(x||'').replace(/<[^>]+>/g,'').trim();}).filter(Boolean);
    var points=notes.slice(0,4).map(function(x){return '<li>'+esc(x)+'</li>';}).join('');
    var steps=(e.sections||[]).filter(function(x){return [3,8].indexOf(x.n)>=0;}).slice(0,2)
      .map(function(x){return '<p class="friendly-answer"><b>'+esc(x.h)+':</b> '+esc(plain((x.items||[])[0]||x.summary||'관련 요건을 확인해 주세요.'))+'</p>';}).join('');
    return (e.weak ? '<p class="warnline">비슷한 주제를 찾았어요. 정확한 상황을 알려주시면 더 잘 살펴볼게요.</p>' : '')
      + '<p class="friendly-lead">네, <b>' + esc(e.title) + '</b>에 대해 궁금하셨군요! 중요한 내용부터 차근차근 설명해 드릴게요. 😊</p>'
      + '<p class="friendly-answer">' + esc(brief || '관련 기준을 함께 살펴볼게요.') + '</p>'
      + (points?'<p class="friendly-answer">꼭 기억하면 좋은 내용은 다음과 같아요.</p><ul class="friendly-points">'+points+'</ul>':'')
      + steps
      + '<p class="friendly-answer">실제 업무에 적용할 때에는 <b>처리 목적과 관련 법령, 기관의 운영 기준</b>을 함께 확인해 주세요. 아래 버튼에서 사례와 체크리스트도 살펴보실 수 있어요!</p>'
      + (e.src ? '<div class="friendly-src">📌 <b>참고한 법령·자료:</b> ' + esc(e.src) + '</div>' : '')
      + controllerNote(q)
      + topicButtons(e.id);
  }
  /* 버튼을 누르면 질문이 사용자 말풍선으로 전송되고, 답변이 이어서 쌓입니다. */
  function topicButtons(topicId){
    return '<div class="t5" data-topic="' + esc(topicId) + '">'
      + TOPIC5.map(function(t){
          return '<button type="button" class="t5-b" data-t5="' + t.id + '" data-for="' + esc(topicId) + '">'
               + esc(t.label) + '</button>';
        }).join('')
      + '<button type="button" class="t5-b quiz" data-t5="quiz" data-for="' + esc(topicId) + '">교육 퀴즈 만들기</button>'
      + '</div>';
  }
  function sectionHtml(e, nums){
    var out = '';
    (e.sections || []).forEach(function(sc){
      if (nums.indexOf(sc.n) < 0) return;
      var body = '';
      if (sc.items && sc.items.length) body += '<ul>' + sc.items.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>';
      if (sc.check && sc.check.length) body += '<div class="chk-box"><div class="chk-h">실무 체크리스트</div><ul>'
        + sc.check.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
      if (sc.summary) body += '<div class="sum-box">' + sc.summary + '</div>';
      if (body) out += '<div class="a-sec"><h4>' + esc(sc.h) + '</h4>' + body + '</div>';
    });
    return out;
  }
  function topicAnswer(e, t5){
    if (t5.id === 'core') {
      var tb = coreTable(e, {});
      return openLine('한눈에 보는 핵심')
        + '<p class="lead">' + (e.intro || ((e.sum2 || [])[0] || '')) + '</p>'
        + (tb || oBullets((e.sum2 || []).map(plain)));
    }
    var body = sectionHtml(e, t5.secs);
    if (!body) return openLine(t5.label.replace(/^[①-⑤]\s*/, ''))
      + '<p class="lead">이 주제에는 준비된 상세 내용이 없습니다. 없는 내용을 만들어 적지 않았습니다.</p>';
    return openLine(t5.label.replace(/^[①-⑤]\s*/, '')) + body;
  }


  /* ── 모드 3: 교육 퀴즈 ──────────────────────────────────── */
  function render3(e, n) {
    var qs = (e.quiz || []).slice(0, n == null ? 3 : n);
    if (!qs.length) return '<p class="a-intro">이 주제는 아직 퀴즈가 준비되지 않았어요. 다른 주제로 요청해 주시겠어요?</p>' + tailer(e);
    var h = '<p class="a-intro"><b>' + esc(e.title) + '</b> 교육용 <b>OX 퀴즈 ' + qs.length + '문제</b>예요. 공공기관 직원이 실무에서 가장 헷갈리기 쉬운 지점으로 골랐어요. <b>O·X를 먼저 골라 보면</b> 바로 채점하고 해설을 펼쳐 드려요.</p>';
    h += qs.map(function (x, i) {
      var ans = (x.a === true || x.a === 'O') ? 'O' : (x.a === false || x.a === 'X') ? 'X' : String(x.a || '');
      var why = x.why || x.x || '';
      var law = x.law || e.src || '';
      var tip = x.tip || '';
      return '<div class="qz" data-ans="' + ans + '"><div class="qz-q"><b>[문제 ' + (i + 1) + ']</b> ' + x.q + '</div>' +
        '<div class="qz-pick"><button type="button" class="ox-b" data-ox="O">O</button>' +
        '<button type="button" class="ox-b" data-ox="X">X</button>' +
        '<button type="button" class="qz-btn" style="margin-top:0">정답·해설 보기</button>' +
        '<span class="qz-vd"></span></div>' +
        '<div class="qz-a" hidden>' +
          '<div class="qz-ans"><b>[정답]</b> <span class="ox">' + esc(ans) + '</span></div>' +
          '<div class="qz-why"><b class="h">왜 이 답일까요</b>' + why + '</div>' +
          (law ? '<div class="qz-law"><b class="h">근거 조문·자료</b>' + esc(law) + '</div>' : '') +
          (tip ? '<div class="qz-tip"><b class="h">💡 실무 핵심 팁</b>' + tip + '</div>' : '') +
        '</div></div>';
    }).join('');
    if (e.guide && e.guide.length) {
      h += '<p class="gd-n" style="margin-top:9px">📎 해설의 실무 기준은 <b>' +
        e.guide.map(function (g0) { return esc(gnorm(g0).s); }).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 3).join('</b>, <b>') +
        '</b> 등 등록된 안내서를 함께 참조했어요.</p>';
    }
    return h + tailer(e);
  }

  /* 개인정보보호위원회 질의응답 모음집(2025.12.) 연계 */
  function qnaBlock(e) {
    var list = QNA.filter(function (x) { return (x.t || []).indexOf(e.id) >= 0; }).slice(0, 5);
    if (!list.length) return '';
    return '<hr class="a-hr"><div class="qa"><h4>📋 관련 질의응답 <span class="qa-src">개인정보보호위원회 「개인정보 질의응답 모음집」(2025. 12.)</span></h4>' +
      list.map(function (x) {
        return '<details class="qa-i"><summary><b>Q' + x.no + '.</b> ' + esc(x.q) + '</summary>' +
          '<div class="qa-a"><b>A.</b> ' + esc(x.a) + '</div>' +
          (x.d && x.d.length ? '<div class="qa-d">' + x.d.slice(0, 3).map(function (d) { return esc(d); }).join('<br>') + '</div>' : '') +
          (x.law && x.law.length ? '<div class="qa-l">근거: ' + esc(x.law.join(', ')) + '</div>' : '') +
          '</details>';
      }).join('') + '</div>';
  }

  function tailer(e) {
    var h = '';
    if (e.laws && e.laws.length) {
      h += '<div class="a-chk">' + e.laws.map(function (L) {
        if (L.u) return '<a href="' + L.u + '" target="_blank" rel="noopener">⟳ ' + esc(L.n) + ' 현행본</a>';
        if (!L.a) return '<a href="https://www.law.go.kr/법령/' + encodeURIComponent(String(L.n).replace(/\s/g, '')) + '" target="_blank" rel="noopener">⟳ ' + esc(L.n) + ' 현행본</a>';
        return '<a href="https://www.law.go.kr/법령/' + encodeURIComponent(String(L.n).replace(/\s/g, '')) + '/' + encodeURIComponent(L.a) + '" target="_blank" rel="noopener">⟳ ' + esc(L.n + ' ' + L.a) + ' 현행본</a>';
      }).join('') + '</div>';
    }
    var acts = '<button type="button" class="chip-q rel" data-q="' + esc(e.kw[0]) + ' 적법성 검토해줘">🔍 실무 검토 받기</button>' +
               '<button type="button" class="chip-q rel" data-q="' + esc(e.kw[0]) + ' 퀴즈 3문제">📝 교육 퀴즈 만들기</button>';
    var rel = (e.related || []).map(function (id) {
      var t = KB.filter(function (x) { return x.id === id; })[0];
      return t ? '<button type="button" class="chip-q rel" data-q="' + esc(t.kw[0]) + '">' + esc(t.title) + '</button>' : '';
    }).filter(Boolean).join('');
    h += '<div class="a-rel"><span>이어서</span>' + acts + rel + '</div>';
    return h;
  }

  // 모든 챗봇 답변의 공통 대화형 형식. 원래 조문·퀴즈·근거 정보는 삭제하지 않습니다.
  function friendlyFormat(html, title) {
    var h=String(html||'');
    if (!lastQuestion) return h; // 첫 화면의 환영 메시지는 답변으로 오인하지 않도록 유지합니다.
    // 전용 답변에 이미 자연스러운 인사가 있다면 중복하지 않아요.
    if (!/<(?:p|div)[^>]*class="[^"]*(?:friendly-lead|greet|warm-lead)[^"]*"/.test(h)) {
      var label=title?String(title).replace(/\s*[—-].*$/,'').trim():'';
      var question=lastQuestion||label||'궁금한 내용';
      var lead='<p class="warm-lead">네, <b>'+esc(question.length>95?question.slice(0,95)+'…':question)+'</b>에 대해 궁금하셨군요! 이해하기 쉽게 차근차근 알려드릴게요. 😊</p>';
      h=lead+h;
    }
    // 법령 인용·상세 자료는 계속 제공하되 정서적으로 딱딱한 제목 바는 사용하지 않습니다.
    return h;
  }
  var lastQuestion='';
  function add(role, html, src, title) {
    var m = document.createElement('div');
    m.className = 'msg ' + role;
    m.innerHTML = (role === 'bot' ? '<div class="av">🧑🏻‍🦱</div>' : '<div class="av">🙋</div>') +
      '<div class="bubble' + (role === 'bot' && title ? ' long' : '') + '">' +
      (role === 'bot' ? friendlyFormat(html, title) : html) +
      (src ? '<span class="src law-cite">근거: ' + esc(src) + '</span>' : '') + '</div>';
    chat.appendChild(m); chat.scrollTop = chat.scrollHeight;
    if (role === 'bot' && window.PI && window.PI.linkifyLaws) window.PI.linkifyLaws(m);
  }

  /* 법 제2조: 짧은 정의 질문은 유사 FAQ로 대체하지 않습니다. */
  function baseDefinition(q) {
    var n = qaNorm(q).replace(/(이란|란|은|는|이|가|뭔가요|무엇인가요|무엇인가|뭐야|뭐예요|뜻|정의|알려줘|알려주세요|설명해줘|설명해주세요|인가요|입니까)+$/g,'');
    if (n !== '개인정보') return false;
    var e = KB.filter(function(x){ return x.id === '용어정의'; })[0];
    var h = '<p class="friendly-lead">개인정보란 무엇인가요?</p>'
      + '<p class="friendly-answer"><b>살아 있는 개인에 관한 정보</b>로서 ① 성명·주민등록번호·영상 등으로 개인을 알아볼 수 있는 정보, ② 다른 정보와 쉽게 결합하여 개인을 알아볼 수 있는 정보, ③ 법에서 정한 <b>가명정보</b>를 포함합니다.</p>'
      + '<p class="friendly-answer">이름, 연락처, 개인을 알아볼 수 있는 CCTV 영상 등이 예시입니다. ID나 기록도 다른 정보와 쉽게 결합하여 개인을 알아볼 수 있다면 개인정보에 해당할 수 있습니다.</p>'
      + '<p class="friendly-src">법적 근거: 「개인정보 보호법」 제2조제1호</p>'
      + '<div class="a-chk"><a href="https://www.law.go.kr/법령/개인정보보호법/제2조" target="_blank" rel="noopener noreferrer">법 제2조 원문 확인</a></div>';
    if (e) {lastTopic=e;h+=topicButtons(e.id);}
    add('bot',h,null,'개인정보의 정의');return true;
  }
  // 근거가 없는 추측을 방지: 질문의 행위·대상에 따라 의도를 먼저 분류합니다.
  function directQuestion(q) {
    var n=String(q||'').replace(/\s+/g,'');
    if (/CCTV|영상정보처리기기|영상정보/i.test(n) && /(며칠|몇일|얼마나|보관기간|저장기간|보존기간)/.test(n)) {
      add('bot','<p class="friendly-lead">네, CCTV 영상이 며칠이나 저장되는지 궁금하셨군요! 알기 쉽게 차근차근 설명해 드릴게요. 😊</p>'+
        '<p class="friendly-answer">사실 모든 CCTV에 똑같이 정해진 보관 기간은 없답니다. 설치한 곳마다 <b>촬영 목적에 꼭 필요한 기간</b>을 정해 보관하거든요.</p>'+
        '<p class="friendly-answer">그래도 많이 참고하는 기준을 알려드릴게요!</p>'+
        '<ul class="friendly-points"><li><b>일반적인 CCTV</b>는 일률적으로 30일을 보관해야 하는 것은 아니에요. 다만 <b>보관 목적을 달성하는 데 필요한 최소 기간을 정하기 어려울 때에는 30일 이내</b>로 정하도록 「표준 개인정보 보호지침」에서 안내하고 있어요.</li>'+
        '<li><b>어린이집 CCTV</b>는 아이들의 안전을 위해 <b>60일 이상</b> 보관해야 해요. 「영유아보육법」에 별도 기준이 있답니다.</li></ul>'+
        '<p class="friendly-answer">이처럼 장소와 법령에 따라 기간이 달라질 수 있어요. 정확한 날짜는 해당 장소의 안내판이나 홈페이지에 공개된 <b>영상정보처리기기 운영·관리 방침</b>을 살펴보시거나, 관리하는 곳에 문의해 보세요!</p>'+
        '<p class="friendly-src">📌 <b>참고한 법령:</b> 「개인정보 보호법」 제25조, 「표준 개인정보 보호지침」 제41조제2항, 「영유아보육법」 제15조의4제3항</p>',null,'CCTV 보관기간');return true;
    }
    // 법령·영상 장비로 설명할 수 없는 개인적 상황을 임의의 보안 질문으로 바꾸지 않습니다.
    if (/(CCTV|영상정보처리기기)/i.test(n) && /(바다에서|타고다니|수영|먹고싶|날아가|배를타)/.test(n)) {
      add('bot','<p class="friendly-answer">CCTV를 탈것처럼 이용하는 질문인지, <b>선박에 CCTV를 설치·운영하는 방법</b>을 묻는 질문인지 확인이 필요해요. 선박 영상정보처리기기 설치가 궁금하다면 설치 목적·촬영 장소·관리 주체를 알려 주세요.</p>',null,'질문 의도 확인');return true;
    }
    return false;
  }
  function answer(q) {
    if(directQuestion(q)) return;
    if(baseDefinition(q)) return;
    var e = match(q);
    lastTopic = e;
    /* 질문이 모음집 문항과 거의 같으면 모음집 답을 먼저 보여 줍니다. */
    var hit = qaFind(q);
    if (e && hit && qaNorm(hit.q).indexOf(qaNorm(q)) >= 0 && qaNorm(q).length >= 8) {
      return add('bot', qaAnswer(hit) + controllerNote(q)
        + '<p class="note-x">※ 출처: 개인정보보호위원회 「개인정보 질의응답 모음집」(2025. 12.) 제' + hit.no + '문항</p>'
        + topicButtons(e.id));
    }
    if (e && e.weak && !hit) {
      lastTopic = null;
      return add('bot',
        '<p class="friendly-lead">질문을 조금 더 구체적으로 알려주세요.</p>' +
        '<p class="friendly-answer"><b>' + esc(e.title) + '</b>와 관련 있을 수 있지만, 지금 문장만으로는 요청하신 행위나 상황을 정확히 판단하기 어려워요. 임의로 다른 질문으로 바꾸어 답하지 않겠습니다.</p>' +
        '<p class="lead">예: 적용 대상, 목적, 기간, 원하는 조치 등을 알려주시면 맞는 자료를 찾아볼게요.</p>',
        null,'질문 의도 재확인');
    }
    if (!e) {
      /* 포털 주제가 없더라도 질의응답 모음집(99문항)에 있으면 그 답을 드립니다. */
      var only = qaFind(q);
      if (only) return add('bot', qaOnly(only, q));
      var topics = KB.map(function (x) { return '<button type="button" class="chip-q rel" data-q="' + esc(x.kw[0]) + '">' + esc(x.title) + '</button>'; }).join('');
      return add('bot',
        '<p class="greet">안녕하세요! 😊 죄송해요, 이 질문에 딱 맞는 주제를 아직 못 찾았어요.</p>' +
        '<p class="lead">조금 더 <b>법령 용어</b>로 좁혀 주시면 정확히 답해 드릴 수 있어요. 주제명을 입력하면 <b>핵심 정리</b>로, “○○ 검토해줘”는 <b>실무 검토</b>로, “○○ 퀴즈 3문제”는 <b>교육 퀴즈</b>로 답해요.</p>' +
        '<div class="blk"><h4>💡 이런 주제는 바로 답해 드려요</h4>' +
        '<div class="a-rel">' + topics + '</div></div>' +
        '<p style="margin:10px 0 0;font-size:12.5px;color:var(--muted)">구체적 사안은 <b>개인정보보호위원회(pipc.go.kr)</b> 상담이나 전문가 검토가 필요할 수 있어요.</p>',
        null, '주제를 찾지 못했어요');
    }
    var m = mode(q);
    if (m === 3) {
      var n = (q.match(/(\d+)\s*(문제|문항|개)/) || [])[1];
      var available=(e.quiz||[]).length;
      var desired=n ? Math.max(1,Math.min(+n,20)) : 3;
      var cnt=Math.min(desired,available);
      var availabilityNote=desired>available?'<p class="warnline">요청하신 '+desired+'문제 중 검증된 문제는 '+available+'문제만 준비돼 있어요. 근거 없는 문제를 추가로 만들지 않고 준비된 문제만 보여 드립니다.</p>':'';
      return add('bot',
        '<p class="greet">네, <b>' + esc(e.title) + '</b> 퀴즈를 풀어 보고 싶으셨군요! 문제와 해설을 차근차근 준비했어요. 😊</p>' +
        '<p class="lead">실무에서 가장 헷갈리는 지점으로 <b>' + cnt + '문제</b>를 골랐어요. O·X를 먼저 고르면 바로 채점하고, 문제마다 <b>왜 그런지</b>와 <b>실무 팁</b>까지 펼쳐 드릴게요.</p>' +
        availabilityNote + '<div class="blk"><h4>💡 함께 풀어 볼까요?</h4>' + render3(e, cnt) + '</div>',
        e.src, e.title + ' — 교육 퀴즈');
    }
    if (m === 2) return add('bot',
      '<p class="greet">네, <b>' + esc(e.title) + '</b>에 관한 상황이 궁금하셨군요! 법적 근거와 확인할 부분을 함께 살펴볼게요. 😊</p>' +
      '<p class="lead">핵심은 <b>법적 근거와 필요한 정보인지</b>예요. 아래에서 결론·근거·위험·대안을 확인해 보세요.</p>' +
      '<details class="dt"><summary>💡 검토 의견 자세히 보기</summary><div class="dt-in">' + render2(e, q) + '</div></details>' +
      quizBlock(e), e.src, e.title + ' — 실무 검토');
    return add('bot', renderTopic(e, q), e.src, e.title);
  }

  var QS = ['민감정보', '고유식별정보', '제18조 목적 외 이용', '접속기록', '암호화', 'CCTV',
            'CCTV 영상 열람 요청하는 방법', '공모전 참가자 건강정보 수집해도 되나요?', '가명정보 퀴즈 3문제', 'CCTV는 며칠이나 보관해요?'];
  var chips = document.getElementById('chips');
  chips.innerHTML = QS.map(function (q) { return '<button type="button" class="chip-q">' + esc(q) + '</button>'; }).join('');

  function ask(t) { lastQuestion=String(t||'').trim(); add('me', esc(t)); setTimeout(function () { answer(t); }, 160); }
  chips.addEventListener('click', function (ev) { var b = ev.target.closest('.chip-q'); if (b) ask(b.dataset.q || b.textContent); });
  chat.addEventListener('click', function (ev) {
    var ox = ev.target.closest('.ox-b');
    if (ox) {
      var card = ox.closest('.qz'), pick = ox.dataset.ox, correct = card.dataset.ans;
      Array.prototype.forEach.call(card.querySelectorAll('.ox-b'), function (b) { b.classList.toggle('sel', b === ox); });
      var vd = card.querySelector('.qz-vd');
      vd.textContent = pick === correct ? '정답이에요!' : '아쉬워요 — 정답은 ' + correct + '예요.';
      vd.className = 'qz-vd ' + (pick === correct ? 'good' : 'miss');
      var bx = card.querySelector('.qz-a'), bt = card.querySelector('.qz-btn');
      bx.hidden = false; if (bt) bt.textContent = '해설 접기';
      return;
    }
    var qb = ev.target.closest('.qz-btn');
    if (qb) { var box = qb.closest('.qz').querySelector('.qz-a'); box.hidden = !box.hidden; qb.textContent = box.hidden ? '정답·해설 보기' : '해설 접기'; return; }
    var b = ev.target.closest('.chip-q'); if (b) ask(b.dataset.q || b.textContent);
  });
  var qEl = document.getElementById('q');
  /* 5개 주제 버튼 — 누르면 질문이 입력창에 들어가 사용자 말풍선으로 전송되고,
     답변이 아래에 이어서 쌓입니다(기존 대화는 지우지 않습니다). */
  chat.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.t5-b'); if (!b) return;
    var tid = b.dataset.t5, forId = b.dataset.for;
    var e = (window.CHATKB || []).filter(function (x) { return x.id === forId; })[0] || lastTopic;
    if (!e) return;
    if (tid === 'quiz') {
      var qq = e.title + ' 교육 퀴즈를 만들어 주세요.';
      if (qEl) qEl.value = qq;
      lastQuestion=qq;
      add('me', esc(qq));
      add('bot', openLine(e.title + ' 교육 퀴즈') + quizBlock(e) + topicButtons(e.id));
      if (qEl) qEl.value = '';
      return;
    }
    var t5 = TOPIC5.filter(function (x) { return x.id === tid; })[0]; if (!t5) return;
    var ask = e.title + ' — ' + t5.ask;
    if (qEl) qEl.value = ask;
    lastQuestion=ask;
    add('me', esc(ask));
    add('bot', topicAnswer(e, t5) + topicButtons(e.id));
    if (qEl) qEl.value = '';
  });

  document.getElementById('form').addEventListener('submit', function (ev) {
    ev.preventDefault(); var i = document.getElementById('q'), v = i.value.trim();
    if (!v) return; i.value = ''; ask(v);
  });

  document.getElementById('asofBar').innerHTML = '📘 법령·자료를 바탕으로 간단히 안내해요. 중요한 결정은 <a href="https://www.law.go.kr/" target="_blank" rel="noopener">현행 법령</a>도 확인해 주세요.';

  [
    '안녕하세요! 저는 <b>요망진 간세다리</b>입니다. 😊 공공분야 개인정보 보호 업무를 도와드려요.',
    '<b>용어·조문을 입력하면</b> 정의·근거부터 판례·체크리스트까지 <b>표준 8단계</b>로 설명해요.<br>예) <i>민감정보</i>, <i>제18조 목적 외 이용</i>',
    '<b>사업 적법성을 물으면 실무 검토 의견</b>(결론·근거·리스크·대안)을 덧붙여요.<br>예) <i>공모전 참가자 건강정보 수집해도 되나요?</i>',
    '<b>퀴즈를 요청하면</b> 직원 교육용 <b>OX 문제</b>를 해설·실무 팁과 함께 만들어요.<br>예) <i>가명정보 퀴즈 3문제</i>',
    '<b>무엇을 도와드릴까요?</b> 💬'
  ].forEach(function(t){ add('bot', t); });
  var initialQuestion = new URLSearchParams(location.search).get('q');
  if (initialQuestion) document.getElementById('q').value = initialQuestion.slice(0, 500);
})();
