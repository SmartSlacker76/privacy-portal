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
    var h = '<p class="friendly-lead">네, 개인정보가 무엇인지 궁금하셨군요! 쉬운 예시로 차근차근 설명해 드릴게요. 😊</p>'
      + '<p class="friendly-answer">간단히 말해 <b>살아 있는 사람을 알아볼 수 있게 하는 정보</b>가 개인정보예요. 이름처럼 바로 알아볼 수 있는 정보뿐 아니라 다른 정보와 쉽게 결합해서 특정인을 알아볼 수 있는 정보도 포함돼요.</p>'
      + '<p class="friendly-answer">대표적인 사례를 살펴볼까요?</p>'
      + '<ul class="friendly-points"><li><b>직접 알아볼 수 있는 정보:</b> 이름·주민등록번호·특정인을 알아볼 수 있는 사진이나 영상 등이에요.</li><li><b>다른 정보와 결합하면 알아볼 수 있는 정보:</b> ID·기록 등도 다른 자료와 쉽게 결합해 개인을 식별할 수 있다면 개인정보에 해당할 수 있어요.</li><li><b>가명정보:</b> 법에서 정한 방법으로 가명처리된 정보도 개인정보의 범위에 포함돼요.</li></ul>'
      + '<p class="friendly-answer">실무에서는 이름을 지웠다고 안심하기보다, <b>다른 자료와 결합해서 누구인지 알아볼 수 있는지</b>도 확인해 주세요!</p>'
      + '<p class="friendly-src">📌 <b>참고한 법령:</b> 「개인정보 보호법」 제2조제1호</p>'
      + '<div class="a-chk"><a href="https://www.law.go.kr/법령/개인정보보호법/제2조" target="_blank" rel="noopener noreferrer">법 제2조 원문 확인</a></div>';
    if (e) {lastTopic=e;h+=topicButtons(e.id);}
    add('bot',h,null,'개인정보의 정의');return true;
  }
  // 근거가 없는 추측을 방지: 질문의 행위·대상에 따라 의도를 먼저 분류합니다.
  // CCTV 관련 경찰 요청과 대리인 요청은 일반 키워드 답변보다 먼저 처리합니다.
  function proxyCctvAnswer(){
    return '<p class="friendly-lead">네, <b>보험회사나 가족 같은 대리인이 CCTV 영상을 신청하면 어떻게 되는지</b> 궁금하셨군요! 필요한 서류와 절차를 쉽게 설명해 드릴게요. 😊</p>'+
      '<p class="friendly-answer"><b>정당한 위임을 받은 대리인은 본인을 대신해 CCTV 영상의 열람을 신청할 수 있어요.</b> 하지만 개인정보 열람청구와 정보공개청구는 적용 법령과 대리인 확인 서류가 다르답니다.</p>'+
      '<p class="friendly-answer"><b>1. 본인이 위임한 대리인</b></p>'+
      '<p class="friendly-answer">교통사고 당사자가 가족·보험사 직원·손해사정사에게 본인 영상의 열람을 위임했다면 다음 사항을 확인해 주세요.</p>'+
      '<ul class="friendly-points">'+
        '<li><b>개인영상정보 열람·존재확인 청구서</b>와 신청 범위</li>'+
        '<li><b>위임장</b>과 본인의 서명·날인 등 실제 위임 의사 및 대리 권한</li>'+
        '<li><b>위임인·대리인 신분 확인 자료</b>(필요한 범위에서 확인, 과도한 사본 수집 방지)</li>'+
        '<li><b>보험회사 직원이라면</b> 사원증·재직증명서 등 소속 확인 자료</li>'+
        '<li><b>제3자가 함께 촬영된 경우</b> 모자이크·부분 열람 등 다른 사람의 권리 보호조치</li>'+
      '</ul>'+
      '<p class="friendly-answer"><b>2. 정보공개청구의 대리인</b></p>'+
      '<p class="friendly-answer">공공기관의 정보공개청구를 대신한다면 <b>정보공개법령상 위임장과 신분 확인 요건</b>을 적용해야 해요. 개인정보 열람용 서식과 혼동하지 않도록 확인해 주세요.</p>'+
      '<p class="friendly-answer"><b>3. 보험회사가 위임장 없이 자체 조사 목적으로 요청한다면?</b></p>'+
      '<p class="friendly-answer"><b>보험회사 공문만으로 영상 제공이 자동 허용되지는 않아요.</b> 정당한 위임이나 동의, 별도의 법적 근거 또는 정보공개법상 공개 가능성을 사안별로 검토해요. 경찰의 요청도 공문만 받았다고 무조건 제공하는 것은 아니랍니다.</p>'+
      '<p class="friendly-answer">담당자분께서는 <b>대리인 자격 → 요청 범위 → 제3자 보호 → 제공 기록</b> 순서로 확인해 주세요! 😊</p>'+
      '<p class="friendly-src">📌 <b>참고 법령:</b> 「개인정보 보호법」 제35조·제38조 및 같은 법 시행령 제45조, 「공공기관의 정보공개에 관한 법률 시행령」 제15조</p>';
  }
  function policeCctvAnswer(){
    return '<p class="friendly-lead">네, <b>경찰이 범죄 수사를 위해 CCTV 영상 제공을 요청하면 어떻게 처리해야 하는지</b> 궁금하셨군요! 담당자 입장에서 차근차근 알려드릴게요. 😊</p>'+
      '<p class="friendly-answer"><b>공공기관이 운영하는 CCTV</b>라면 「개인정보 보호법」 <b>제18조제2항제7호</b>에 따라 범죄의 수사·공소의 제기와 유지에 필요한 범위에서 <b>정보주체 동의 없이 영상을 제공할 수 있어요.</b> 다만 경찰이 요청했다는 이유만으로 무조건 제공하는 것은 아니고, 수사 목적·법적 근거·제공 범위·제3자 권리를 먼저 검토해야 한답니다.</p>'+
      '<p class="friendly-answer"><b>필요한 범위의 원본 영상을 모자이크 없이 제공할 수도 있지만</b>, 사건과 무관한 영상까지 제공해서는 안 돼요. 민간 사업장 CCTV는 제18조제2항제7호가 직접 적용되는 공공기관 사례와 달라 <b>별도의 적법한 제공 근거</b>를 확인해야 해요.</p>'+
      '<p class="friendly-answer">아래 제목을 누르면 자세한 절차와 담당자 체크리스트를 확인할 수 있어요! 👇</p>'+
      '<div class="cctv-disclosure-more" role="group" aria-label="경찰의 CCTV 영상 요청 처리 안내">'+
      '<details class="dt"><summary><b>1. 경찰 요청 시 제공 근거와 핵심 원칙</b></summary><div class="dt-in">'+
        '<ul class="friendly-points">'+
        '<li><b>공공기관:</b> 범죄 수사·공소 제기·유지에 필요하고 제3자의 이익을 부당하게 침해하지 않는 범위인지 검토해요. 근거는 「개인정보 보호법」 제18조제2항제7호예요.</li>'+
        '<li><b>수사협조 공문:</b> 일반적으로 수사에 대한 협조 요청이며, 그 자체가 압수·수색영장은 아니에요. 요청기관·법적 근거·사건 목적·촬영 시각과 장소 등을 확인하고 제공 여부를 판단해요.</li>'+
        '<li><b>압수·수색영장:</b> 영장이 제시된다면 발부 여부, 유효기간, 대상·범위를 확인하고 해당 절차에 따라 협조해요. 영장에 적힌 범위를 넘어서는 자료까지 제공할 필요는 없어요.</li>'+
        '<li><b>원본 제공과 모자이크:</b> 적법한 수사 목적상 식별이 필요하다면 필요한 부분의 원본을 제공할 수 있어요. 모든 경찰 요청에서 무조건 모자이크가 면제된다는 뜻은 아니에요.</li>'+
        '<li><b>민간 CCTV:</b> 공공기관 전용 예외 조항을 그대로 적용할 수 없으므로, 영장·법률상 근거·유효한 동의·급박한 이익 보호 등 해당 사안의 적법성을 따로 검토해야 해요.</li>'+
        '</ul>'+
      '</div></details>'+
      '<details class="dt"><summary><b>2. 담당자가 반드시 확인할 4단계 절차</b></summary><div class="dt-in">'+
        '<ol class="friendly-points">'+
        '<li><b>공식 요청 내용 확인:</b> 수사협조 공문 또는 영장 등 요청 자료의 진위, 요청기관, 법적 근거, 사건 목적, 대상 카메라·시간대를 확인해요. 전화나 구두 요청만으로 영상 파일을 바로 넘기지 마세요. 긴급상황에는 별도 법적 요건과 기관 내부 절차를 우선 확인해요.</li>'+
        '<li><b>경찰관 신분·권한 확인:</b> 방문자의 경찰공무원증과 소속·담당 업무를 확인하고, 필요한 경우 해당 수사기관에 공식 연락처로 확인해요.</li>'+
        '<li><b>최소 범위 추출·안전한 전달:</b> 사건 관련 시간·장소·카메라의 영상만 추출하고, 안전한 저장매체·전송 방법과 인수인계를 확인해요. 매체 반입·반출 보안 절차도 준수해 주세요.</li>'+
        '<li><b>개인영상정보 관리대장 기록:</b> 제공 일시, 제공받은 기관·담당자, 사건 관련 제공 목적·법적 근거, 제공 영상의 촬영 시각·카메라 위치·파일 형태, 담당자 및 인계 사항을 기록해요.</li>'+
        '</ol>'+
        '<p class="friendly-answer"><b>특히 유의할 점:</b> 긴급한 상황이라고 해서 항상 먼저 영상을 열람·제공하고 나중에 공문을 받는 방식이 허용되는 것은 아니에요. 법률상 긴급한 제공 요건과 내부 승인·기록 절차를 확인해 주세요.</p>'+
      '</div></details>'+
      '<details class="dt"><summary><b>3. 한눈에 보는 담당자 체크리스트</b></summary><div class="dt-in">'+
        '<ul class="friendly-points">'+
        '<li><b>구두·전화 요청만 있는 경우:</b> 원본을 곧바로 제공하지 말고 공식 요청 서류와 적법한 근거를 확인해요.</li>'+
        '<li><b>공문과 신분이 확인된 경우:</b> 수사 목적의 필요성과 제공 가능 근거를 심사한 뒤, 허용되는 최소 범위만 제공해요.</li>'+
        '<li><b>영장이 제시된 경우:</b> 영장에 표시된 기기·날짜·대상·범위를 확인하여 적법한 집행에 협조해요.</li>'+
        '<li><b>제공 완료 후:</b> 개인영상정보 관리대장에 제공기관·담당자·목적·근거·영상 범위·제공 일시를 기록해요.</li>'+
        '</ul>'+
        '<p class="friendly-answer">📌 <b>경찰·민원인 응대 예시:</b> “요청하신 영상의 수사 목적과 제공 근거를 확인하고, 필요한 범위에서 검토한 뒤 안내드리겠습니다. 공문 또는 영장 등 관련 자료와 담당 경찰관 신분 확인에 협조해 주세요.”</p>'+
      '</div></details>'+
      '</div>'+
      '<p class="friendly-src">📌 <b>참고 법령:</b> 「개인정보 보호법」 제18조제2항·제5항, 「형사소송법」 제199조·제215조 등. 실제 제공 판단은 공공·민간 구분, 요청서류와 사건별 법적 요건에 따라 달라져요.</p>';
  }
  var lastCctvDisclosure=false;
  // 사망자 관련 영상·기록은 유족 및 생존자 정보와 구분하여 안내합니다.
  function deceasedInformationAnswer(){
    return '<p class="friendly-lead">네, <b>사망하신 분의 정보도 「개인정보 보호법」상 개인정보인지</b> 궁금하셨군요! 사망자 정보와 유족의 권리를 구분해서 차근차근 알려드릴게요. 😊</p>'+
      '<p class="friendly-answer"><b>사망자에 관한 정보 자체는 원칙적으로 「개인정보 보호법」 제2조제1호의 개인정보에 해당하지 않아요.</b> 법에서 개인정보를 “살아 있는 개인”에 관한 정보로 정의하고 있기 때문이랍니다.</p>'+
      '<p class="friendly-answer">그렇다고 사망자의 CCTV 영상이나 진료·행정 기록을 <b>아무에게나 공개해도 되는 것은 아니에요!</b> 유족의 개인정보가 함께 포함되거나, 다른 법률에 따른 비밀유지·비공개 의무가 적용될 수 있거든요. 아래 내용을 함께 살펴보세요.</p>'+
      '<div class="cctv-disclosure-more" role="group" aria-label="사망자 정보 및 CCTV 열람 관련 기준">'+
      '<details class="dt"><summary><b>1. 사망자와 유족의 개인정보는 어떻게 구분하나요?</b></summary><div class="dt-in">'+
        '<p class="friendly-answer">사망 사실·과거 기록이라도 <b>유족의 성명·연락처·가족관계 등을 알아볼 수 있다면</b> 살아 있는 유족의 개인정보에 해당할 수 있어요.</p>'+
        '<p class="friendly-answer">CCTV 영상에 <b>다른 생존자의 얼굴, 차량번호 등 식별 가능한 정보</b>가 함께 담겨 있다면 공개 전 제3자의 권리를 검토해 주세요. 필요한 경우 모자이크·부분공개 등의 조치가 필요해요.</p>'+
        '<p class="friendly-answer">사망자의 의료기록·수사기록·상담기록 등은 개인정보 보호법 적용 여부와 별개로 <b>다른 법령의 비밀유지 규정과 사생활 보호 기준</b>에 따라 제한될 수 있답니다.</p>'+
      '</div></details>'+
      '<details class="dt"><summary><b>2. 유족이 사망자의 CCTV 영상 열람·제공을 요청하면?</b></summary><div class="dt-in">'+
        '<p class="friendly-answer"><b>가족이라는 이유만으로 사망자의 개인정보 열람권을 그대로 승계하거나, 사망자를 대신한 법정대리인으로 청구할 수 있는 것은 아니에요.</b> 본인이 사망한 경우 「개인정보 보호법」 제35조의 정보주체 본인 열람청구와는 구분해야 해요.</p>'+
        '<ul class="friendly-points">'+
          '<li><b>공공기관이 보유한 CCTV:</b> 유족이 「정보공개법」에 따라 정보공개청구를 할 수 있어요. 다만 공개 결정은 청구 목적, 다른 생존자의 정보, 사생활 침해 및 법률상 비공개 사유를 종합적으로 검토해요.</li>'+
          '<li><b>민간시설 CCTV:</b> 유족이라는 이유만으로 자동 제공되는 것은 아니에요. 영상에 포함된 다른 사람의 개인정보, 관련 법령상 공개·제공 근거, 다른 비밀유지 의무 등을 개별적으로 확인해요.</li>'+
          '<li><b>경찰 수사 관련 요청:</b> 필요하다면 관할 수사기관을 통해 요청할 수 있지만, 경찰 공문만으로 언제나 원본 제공이 가능한 것은 아니에요. 요청기관·수사 목적·법적 근거·범위를 검토해야 해요.</li>'+
        '</ul>'+
      '</div></details>'+
      '<details class="dt"><summary><b>3. CCTV 담당자라면 무엇을 확인해야 하나요?</b></summary><div class="dt-in">'+
        '<ul class="friendly-points">'+
          '<li>사망자 정보 외에 <b>유족·제3자의 개인정보</b>가 포함되어 있는지 확인해요.</li>'+
          '<li>영상이 남아 있는지와 <b>보관기간·파기 여부</b>를 먼저 확인해요.</li>'+
          '<li>공공기관이면 <b>정보공개법상 공개·부분공개·비공개</b> 여부와 다른 법률의 제한을 검토해요.</li>'+
          '<li>필요한 경우 <b>모자이크·열람 범위 제한</b> 등 제3자 보호조치를 해요.</li>'+
          '<li>열람·제공을 결정했다면 <b>결정 근거와 실제 제공 범위</b>를 기관 관리기준에 맞게 기록해요.</li>'+
        '</ul>'+
        '<p class="friendly-answer">📌 <b>응대 예시:</b> “유족분께서 요청하신 영상은 보유 여부와 공개 가능 범위를 확인한 뒤 안내드리겠습니다. 다른 분의 개인정보가 포함되어 있거나 다른 법률상 제한이 있는지도 함께 살펴보겠습니다.”</p>'+
      '</div></details></div>'+
      '<p class="friendly-src">📌 <b>참고 법령·자료:</b> 「개인정보 보호법」 제2조제1호·제35조, 「공공기관의 정보공개에 관한 법률」 제9조제1항제6호·제14조, 개인정보보호위원회의 사망자 정보 관련 법령 해석. 구체적인 공개 여부는 사안별로 판단해야 해요.</p>';
  }
  // 공공기관 홈페이지 신규 구축·개편 시 개인정보 보호 체크리스트
  function websitePrivacyAnswer(){
    return '<p class="friendly-lead">안녕하세요! <b>공공기관 홈페이지를 새롭게 구축하거나 개편</b>하시려는군요! 😊 처음 기획할 때부터 개인정보 보호를 함께 설계하면 운영 이후 실수를 크게 줄일 수 있어요.</p>'+
      '<p class="friendly-answer"><b>꼭 챙기면 좋은 핵심 6가지</b>를 준비했어요. 아래 제목을 하나씩 눌러 자세한 내용과 실무 팁을 확인해 보세요!</p>'+
      '<div class="cctv-disclosure-more" role="group" aria-label="홈페이지 구축 개인정보 보호 6가지 체크리스트">'+
      '<details class="dt"><summary><b>1. 법령 근거 수집과 동의 수집을 구분해 주세요!</b></summary><div class="dt-in">'+
        '<p class="friendly-answer">민원·행정업무와 관련해 <b>법령상 의무 이행이나 공공기관의 소관 업무 수행을 위해 불가피한 경우</b>에는 「개인정보 보호법」 제15조제1항의 요건에 따라 별도 동의 없이 수집·이용할 수 있어요. 단순히 조례나 업무가 있다는 이유만으로 무조건 동의가 면제되는 것은 아니니 <b>정확한 처리 근거와 필요한 항목</b>을 먼저 확인해 주세요.</p>'+
        '<ul class="friendly-points"><li><b>동의가 처리 근거인 경우:</b> 수집·이용 목적, 수집 항목, 보유·이용 기간, 동의 거부권 및 불이익 등 고지사항을 알리고 직접 선택하도록 해요. 선택 동의는 필수 동의와 분리해 주세요.</li>'+
        '<li><b>동의 외 법적 근거인 경우:</b> 불필요한 동의 체크박스를 요구하기보다 처리 목적·항목·법적 근거를 적절히 안내해요.</li>'+
        '<li><b>주민등록번호:</b> 별도 동의만으로 수집할 수 없어요. 「개인정보 보호법」 제24조의2에 따른 구체적인 허용 요건을 확인하고, 불필요한 경우 대체 인증을 검토해 주세요.</li></ul>'+
      '</div></details>'+
      '<details class="dt"><summary><b>2. 구축 전·오픈 후 행정 절차를 확인해 주세요!</b></summary><div class="dt-in">'+
        '<p class="friendly-answer"><b>사업계획·발주 전</b>에는 해당 기관의 국가사이버보안 관련 지침에 따라 <b>보안성 검토 대상과 검토기관·시기</b>를 확인해요. 모든 단순 홈페이지 수정에 동일한 검토 절차가 적용된다고 단정할 수는 없어요.</p>'+
        '<p class="friendly-answer">개인정보파일의 규모·유형·연계 등 요건에 따라 <b>개인정보 영향평가 대상인지</b>도 사업계획 단계에서 확인해 주세요.</p>'+
        '<p class="friendly-answer">운영을 시작한 뒤 새로 등록 대상 <b>개인정보파일</b>을 운용한다면 「개인정보 보호법 시행령」 제34조에 따라 원칙적으로 <b>운용 시작일부터 60일 이내</b>에 등록을 신청해야 해요. 법정 등록 제외 대상도 있으니 함께 확인해 주세요.</p>'+
      '</div></details>'+
      '<details class="dt"><summary><b>3. 개인정보 처리방침을 홈페이지에 쉽게 공개해 주세요!</b></summary><div class="dt-in">'+
        '<p class="friendly-answer">홈페이지 이용자가 쉽게 찾고 이해할 수 있는 위치에 <b>개인정보 처리방침</b>을 공개해 주세요. 보통 홈페이지 하단에 독립된 링크를 배치하면 좋아요.</p>'+
        '<ul class="friendly-points"><li>처리 목적·항목·보유기간, 제3자 제공·위탁 여부 등을 실제 운영 현황과 맞춰 적어요.</li>'+
        '<li><b>개인정보 보호책임자 및 열람청구 담당부서</b>, 정보주체의 권리 행사 방법, 권익침해 구제방법을 확인해요.</li>'+
        '<li>공공기관이라면 <b>개인정보파일 등록 현황</b> 등 적용 항목을 반영하고, 변경 이력과 시행일을 관리해요.</li>'+
        '<li><b>라벨·아이콘</b>은 이용자 이해를 돕는 유용한 표시 방식이지만, 모든 경우에 같은 디자인의 라벨 부착이 법적 의무인 것은 아니에요.</li></ul>'+
      '</div></details>'+
      '<details class="dt"><summary><b>4. 해킹과 유출을 막는 보안 기능을 설계해 주세요!</b></summary><div class="dt-in">'+
        '<ul class="friendly-points"><li><b>관리자 페이지:</b> 업무망 분리·IP 허용목록·다중인증 등을 위험도에 맞게 적용하고, 관리자 권한은 필요한 사람에게만 부여해요.</li>'+
        '<li><b>접속기록:</b> 개인정보처리시스템의 접속기록은 원칙적으로 <b>1년 이상</b>, 법정 요건에 해당하면 <b>2년 이상</b> 보관해야 해요. 모든 홈페이지에 무조건 2년이 적용되는 것은 아니랍니다.</li>'+
        '<li><b>게시판:</b> 주민등록번호 등 개인정보가 게시글·첨부파일에 노출되지 않도록 입력 점검·노출 탐지·관리 절차를 마련해요.</li>'+
        '<li><b>오픈 전 점검:</b> 시큐어코딩, 웹 취약점 점검, 인증·접근통제, 암호화, 백업·복구, 로그 점검과 보안 설정을 검증해요.</li></ul>'+
      '</div></details>'+
      '<details class="dt"><summary><b>5. 보유기간과 파기 절차를 업무별로 정해 주세요!</b></summary><div class="dt-in">'+
        '<p class="friendly-answer">개인정보 보유기간은 <b>수집 목적·관계 법령·기록물 보존 의무·기관의 기록관리기준표</b>를 함께 검토해 결정해 주세요. 기록관리기준표의 기간을 모든 개인정보에 기계적으로 똑같이 적용하는 것은 아니에요.</p>'+
        '<p class="friendly-answer">필요한 기간이 지나거나 처리 목적이 달성되었다면, 다른 법령상 보존 의무가 있는지 확인한 뒤 <b>지체 없이 안전하게 파기</b>하도록 설계해요. 자동 삭제 기능은 실제로 작동하는지도 정기적으로 확인해 주세요!</p>'+
      '</div></details>'+
      '<details class="dt"><summary><b>6. 유지보수 위탁과 운영 중 점검도 놓치지 마세요!</b></summary><div class="dt-in">'+
        '<p class="friendly-answer">외부 업체에 홈페이지 구축·운영·유지보수를 맡긴다면 <b>개인정보 처리업무 위탁에 해당하는지</b> 확인하고, 해당 시 「개인정보 보호법」 제26조에 따른 문서·계약 사항과 수탁자 관리·감독을 챙겨 주세요.</p>'+
        '<ul class="friendly-points"><li>업체의 시스템 접근 권한을 최소화하고 계정 공유를 금지해요.</li>'+
        '<li>접속기록·다운로드 이력·개인정보 노출·취약점 조치 현황을 정기적으로 점검해요.</li>'+
        '<li>계약 종료 시 접근 권한 회수, 자료 반환·파기, 개인정보파일 변경·등록 사항을 확인해요.</li></ul>'+
      '</div></details></div>'+
      '<p class="friendly-answer">💡 <b>마지막으로 담당자분께 드리는 팁!</b> “계획 단계 법적 근거 확인 → 구축 단계 보호조치 구현 → 오픈 전 점검 → 운영 중 기록·위탁 관리” 순서로 체크리스트를 관리하면 좋아요. 😊</p>'+
      '<p class="friendly-src">📌 <b>참고 법령·지침:</b> 「개인정보 보호법」 제15조·제24조의2·제26조·제29조·제30조·제32조·제33조, 같은 법 시행령 제34조·제35조, 「개인정보의 안전성 확보조치 기준」 제8조, 국가사이버보안 관련 지침. 실제 사업과 기관 유형에 따라 적용 여부를 확인해 주세요.</p>';
  }
  function directQuestion(q) {
    var n=String(q||'').replace(/\s+/g,'');
    var isWebsitePrivacy=/(홈페이지|웹사이트|누리집|웹페이지|사이트)/i.test(n) &&
      /(제작|구축|개편|개발|오픈|설계|만들|운영|준비|체크|주의|개인정보|보호|보안|필수|챙겨|필요)/.test(n);
    if(isWebsitePrivacy){
      lastCctvDisclosure=false;
      add('bot',websitePrivacyAnswer(),null,'홈페이지 제작 시 개인정보 보호');
      return true;
    }
    if (/(사망자|사망한사람|사망하신분|돌아가신분|고인|망인|사망인)/.test(n) &&
        /(개인정보|기록|영상|CCTV|시시티비|열람|제공|청구|공개|가족|유족|보호|정보)/i.test(n)) {
      lastCctvDisclosure=false;
      add('bot',deceasedInformationAnswer(),null,'사망자 개인정보와 CCTV 영상');
      return true;
    }
    var asksPolice=/(경찰|수사기관|형사|검찰)/.test(n) && /(영상|CCTV|시시티비|개인영상|제공|수사협조|압수|영장)/i.test(n) &&
      /(요청|제공|받|달라|주|보내|협조|열람|가능|영장)/.test(n);
    if(asksPolice){
      lastCctvDisclosure=true;
      add('bot',policeCctvAnswer(),null,'경찰의 CCTV 영상 제공 요청');
      return true;
    }
    // 대리인 + CCTV(영상) 조합 자체로 충분한 의도가 있으므로 동사가 생략되어도 대리인 답변을 우선합니다.
    // '대리인이 cctv영상 하면', '대리인 CCTV영상?', '보험회사에서 CCTV를 요구하면' 등.
    var hasProxy=/(대리인|보험회사|보험사|손해사정사|가족)/.test(n);
    var hasVideo=/(CCTV|시시티비|폐쇄회로|영상|개인영상|정보공개)/i.test(n);
    var proxyAction=/(신청|청구|위임|열람|제공|서류|접수|방법|경우|하면|이면|요청|요구|받|확인|어떻게|가능)/.test(n);
    var asksProxy=hasProxy && ((hasVideo && !/(사망자|사망하신|고인)/.test(n)) ||
      (lastCctvDisclosure && proxyAction) ||
      (/^(대리인|보험회사|보험사|가족|손해사정사)/.test(n) && proxyAction));
    if(asksProxy){
      lastCctvDisclosure=true;
      add('bot',proxyCctvAnswer(),null,'CCTV 대리인 신청');
      return true;
    }
    // '대리인이 신청하면?'처럼 앞선 CCTV 정보공개 질문을 이어받는 경우를 인식합니다.
    var disclosureRequest=/(?:CCTV|시시티비|폐쇄회로|개인영상정보|영상정보처리기기)/i.test(n) &&
        /(정보공개|공개청구|공개요청|공개받|공개가능)/.test(n) && !hasProxy;
    // CCTV 정보공개청구: 요약 + 각 항목별 펼침으로 제공합니다.
    if (disclosureRequest) {
      lastCctvDisclosure=true;
      add('bot',
        '<p class="friendly-lead">네, <b>CCTV 영상도 정보공개청구로 제공받을 수 있는지</b> 궁금하셨군요! 사례별로 쉽게 설명해 드릴게요. 😊</p>'+
        '<p class="friendly-answer"><b>공공기관이 보유·관리하는 CCTV 영상은 정보공개청구의 대상이 될 수 있어요.</b> 하지만 청구했다고 해서 원본 영상을 언제나 받을 수 있는 것은 아니랍니다.</p>'+
        '<p class="friendly-answer">본인이 촬영되었는지, 다른 사람이 함께 나오는지, 사생활 침해나 다른 비공개 사유가 있는지를 살펴본 뒤 공개·부분공개·비공개 여부를 판단해요.</p>'+
        '<p class="friendly-answer"><b>알기 쉽게 사례별로 설명해 드릴게요!</b> 아래 제목을 누르면 자세한 내용을 펼쳐 볼 수 있어요. 👇</p>'+
        '<div class="cctv-disclosure-more" role="group" aria-label="CCTV 정보공개청구 상세 설명">'+
          '<details class="dt"><summary><b>1. 어떤 경우에 제공받을 수 있나요?</b></summary><div class="dt-in">'+
            '<ul class="friendly-points">'+
              '<li><b>본인만 촬영된 영상:</b> 본인 확인 후 열람·공개 가능 여부를 검토해요. 본인 영상 열람청구를 이용하는 방법도 있어요.</li>'+
              '<li><b>본인과 다른 사람이 함께 나오는 영상:</b> 다른 사람의 얼굴·차량번호 등을 가릴 수 있는지 살펴보고 부분공개를 검토해요.</li>'+
              '<li><b>다른 사람만 촬영된 영상:</b> 사생활 침해 우려가 있으면 비공개할 수 있어요. 다만 공익이나 권리구제 등 법률상 예외가 있는지도 개별적으로 살펴봐야 해요.</li>'+
              '<li><b>사고·범죄 관련 영상:</b> 요청 목적만으로 자동 공개되지는 않아요. 제3자 권리, 비공개 사유, 수사·재판에 미치는 영향 등을 함께 검토해요.</li>'+
            '</ul><p class="friendly-answer">특히 영상 전체가 비공개 대상인 것은 아니라면, <b>가릴 부분을 제외하고 공개하는 부분공개</b>가 가능한지도 확인해 주세요.</p>'+
          '</div></details>'+
          '<details class="dt"><summary><b>2. 정보공개청구와 개인정보 열람청구는 어떻게 다를까요?</b></summary><div class="dt-in">'+
            '<p class="friendly-answer"><b>① 정보공개청구</b>는 공공기관이 보유·관리하는 정보의 공개를 요청하는 절차예요. <a href="https://www.open.go.kr/" target="_blank" rel="noopener noreferrer">정보공개포털(open.go.kr)</a>에서 신청할 수 있고, 원칙적으로 <b>10일 이내 공개 여부를 결정</b>해요. 법률에 따른 연장이나 비공개 사유가 적용될 수 있어요.</p>'+
            '<p class="friendly-answer"><b>② 개인정보 열람청구</b>는 <b>본인의 개인정보·개인영상정보</b>를 확인하는 절차예요. CCTV 운영기관에 직접 요구하거나 <a href="https://www.privacy.go.kr/" target="_blank" rel="noopener noreferrer">개인정보 포털(privacy.go.kr)</a>을 이용할 수 있어요. 타인이 함께 찍혔다면 다른 사람의 권리를 보호하는 조치가 필요할 수 있어요.</p>'+
            '<p class="friendly-answer">두 절차는 적용 법률과 처리 방식이 다르니, <b>무엇을 확인하거나 제공받고 싶은지</b>에 따라 알맞은 방법을 선택해 주세요.</p>'+
          '</div></details>'+
          '<details class="dt"><summary><b>3. CCTV 담당자라면 특히 기억해 주세요!</b></summary><div class="dt-in">'+
            '<p class="friendly-answer">담당자분께서는 정보공개청구가 접수되어도 <b>CCTV 원본을 곧바로 USB나 이메일로 전달하지 않도록</b> 주의해 주세요! 😊</p>'+
            '<ul class="friendly-points">'+
              '<li>요청한 날짜·장소의 영상이 실제로 보관되어 있는지 먼저 확인해요.</li>'+
              '<li>본인 여부, 제3자 촬영 여부, 사생활 침해 우려와 다른 법률상 비공개 사유를 검토해요.</li>'+
              '<li>필요하면 <b>모자이크·부분공개</b> 등 보호조치를 검토해요.</li>'+
              '<li>결정 근거와 실제 열람·제공 내역을 관련 법령 및 기관 관리기준에 따라 기록해요.</li>'+
              '<li>보관기간 경과로 이미 파기되었다면 실제 존재 여부를 확인하고 그 사실을 안내해요.</li>'+
            '</ul><p class="friendly-answer">무엇보다 <b>정보공개청구가 가능하다는 사실과 실제 영상 제공이 허용된다는 사실은 다르다</b>는 점을 기억해 주세요.</p>'+
          '</div></details>'+
          '<details class="dt"'+(proxyFollowUp?' open':'')+'><summary><b>4. 보험회사나 가족 등 대리인이 신청하면?</b></summary><div class="dt-in">'+
            '<p class="friendly-answer">네, <b>보험회사 직원·손해사정사·가족도 정당한 권한을 확인받으면</b> 본인을 대신해 CCTV 영상의 열람이나 정보공개를 신청할 수 있어요! 😊 다만 <b>정보주체의 개인정보 열람 요구인지, 공공기관의 정보공개청구인지</b>를 먼저 구분해야 해요.</p>'+
            '<p class="friendly-answer"><b>① 본인이 위임한 대리인이 개인정보 열람을 신청하는 경우</b></p>'+
            '<ul class="friendly-points">'+
              '<li><b>개인영상정보 열람·존재확인 청구서</b>에 열람 대상과 신청 정보를 기재해요.</li>'+
              '<li><b>정보주체의 위임장</b>으로 대리 권한과 범위를 확인해요. 「개인정보 보호법」 제38조 및 시행령 제45조에 따른 위임장 서식을 이용하고, 본인의 서명 등 위임 의사를 확인해요.</li>'+
              '<li><b>대리인 신분증</b>과 위임인의 신원 확인에 필요한 자료를 확인해요. 보험사 직원이라면 사원증·재직증명서 등으로 소속도 추가 확인할 수 있어요.</li>'+
              '<li>다른 사람의 영상이 포함되었다면 <b>식별 가능한 부분을 가리는 등 제3자 권리 보호조치</b>를 검토해요. 모든 상황에서 반드시 원본 전체를 제공하는 것은 아니에요.</li>'+
            '</ul>'+
            '<p class="friendly-answer"><b>② 공공기관에 정보공개청구를 대리하는 경우</b></p>'+
            '<p class="friendly-answer">정보공개 절차에는 별도의 신원 확인 규정이 있어요. 「정보공개법 시행령」 <b>제15조제2항</b>에 따라 임의대리인은 정해진 위임장과 대리인 신분증, 청구인 신분증 사본 등을 제출하도록 규정되어 있어요. <b>개인정보 열람용 위임장과 정보공개용 위임장은 구분</b>해 준비해 주세요.</p>'+
            '<p class="friendly-answer"><b>③ 보험회사가 본인 위임 없이 자체 조사 목적으로 요청하는 경우</b></p>'+
            '<p class="friendly-answer">보험회사라는 이유만으로 CCTV 영상에 대한 <b>자동적인 제공 권한이 생기지는 않아요.</b> 사고 당사자의 위임장이 없다면 제3자 제공을 허용하는 <b>다른 법률상 근거, 유효한 동의, 정보공개법상 공개 가능성</b>이 있는지 개별적으로 검토해야 해요. 단순히 보험사 공문을 받았다는 이유만으로 영상을 전달해서는 안 됩니다.</p>'+
            '<p class="friendly-answer">가장 안전한 안내 방법은 <b>“사고 당사자의 정당한 위임을 받아 신청하거나, 적용 가능한 별도 법적 근거를 구체적으로 제시해 주세요”</b>라고 요청하는 거예요. 경찰을 통한 요청도 <b>공문만으로 무조건 제공할 수 있다는 뜻은 아니며</b>, 수사기관의 권한·요청 범위·법적 근거를 따로 확인해야 해요.</p>'+
            '<p class="friendly-src">📌 <b>대리인 관련 근거:</b> 「개인정보 보호법」 제35조·제38조, 같은 법 시행령 제45조·제46조, 「공공기관의 정보공개에 관한 법률 시행령」 제15조제2항</p>'+
          '</div></details>'+
        '</div>'+
        '<p class="friendly-src">📌 <b>참고한 법령:</b> 「공공기관의 정보공개에 관한 법률」 제9조·제10조·제14조 및 같은 법 시행령 제15조, 「개인정보 보호법」 제18조·제35조·제38조. 구체적인 공개 가능 여부는 사안별로 판단해야 해요.</p>',
        null,'CCTV 정보공개청구');return true;
    }
    lastCctvDisclosure=false;
    // 개인 자가용·업무용 차량, 외부 촬영·실내 CCTV를 구분하여 설명합니다.
    // 축약형·의문형 모두 같은 응답으로 연결 (예: "블랙박스도 영상정보처리기기?")
    if (/블랙박스|차량용카메라|차량영상기록장치/i.test(n) &&
        /(영상정보처리기기|영상처리기기|해당|적용|법|무엇|뭔가|어떤|종류|고정형|이동형|CCTV|설치|운영|규정)/i.test(n)) {
      add('bot',
        '<p class="friendly-lead">네, <b>블랙박스가 「개인정보 보호법」의 영상정보처리기기에 해당하는지</b> 궁금하셨군요! 사용 목적과 촬영 방향에 따라 차근차근 나눠 설명해 드릴게요. 😊</p>'+
        '<p class="friendly-answer"><b>차량용 블랙박스도 영상정보처리기기에 해당할 수 있어요.</b> 다만 모든 블랙박스에 일반 CCTV 규칙을 똑같이 적용하는 것은 아니랍니다. <b>누가, 어떤 목적으로, 차량 안팎의 어디를 촬영하는지</b>가 중요해요.</p>'+
        '<ul class="friendly-points">'+
          '<li><b>🚗 개인 자가용 블랙박스</b> — 사고 기록이나 개인적인 안전을 위해 순수하게 사적으로 사용하는 경우에는 일반적으로 업무 목적의 이동형 영상정보처리기기에 관한 제25조의2 규정이 적용되지 않아요. 이런 경우 업무용 CCTV처럼 안내판이나 관리대장을 일률적으로 요구하지는 않습니다. 다만 영상에 찍힌 사람의 얼굴이나 차량번호를 온라인에 공개할 때는 다른 사람의 개인정보와 사생활을 침해하지 않도록 조심해 주세요.</li>'+
          '<li><b>🚕 회사·기관·영업용 차량에서 외부를 촬영하는 블랙박스</b> — 업무 목적으로 도로와 보행자 등을 촬영하면 <b>이동형 영상정보처리기기</b>의 운영기준을 검토해야 해요. 촬영의 법적 요건을 갖추고, 적용 대상인 경우 불빛·안내판·안내방송 등 적절한 방법으로 촬영 사실을 알려야 합니다.</li>'+
          '<li><b>🚌 택시·버스 등 차량 실내를 촬영하는 CCTV</b> — 특정 실내 공간을 고정적으로 촬영하는 장치는 <b>고정형 영상정보처리기기</b>로 분류되어 제25조상 안내판, 목적 외 임의조작 금지, <b>녹음기능 사용 금지</b> 등의 의무가 적용될 수 있어요. 실제 기기 설치·운영 방식과 촬영 장소를 확인해야 합니다.</li>'+
        '</ul>'+
        '<p class="friendly-answer">즉, <b>차량 바깥을 촬영하는 업무용 블랙박스인지, 차량 내부를 고정 촬영하는 CCTV인지</b> 먼저 구분해 보세요! 기관 담당자라면 촬영 목적·방향·운영 주체·녹음 설정을 점검하고, 해당 법령에 맞게 안내와 영상 보관·접근권한을 관리하면 좋겠습니다. 😊</p>'+
        '<p class="friendly-src">📌 <b>참고한 법령:</b> 「개인정보 보호법」 제2조·제25조·제25조의2, 같은 법 시행령 제27조의2 및 개인정보보호위원회 영상정보처리기기 관련 안내자료</p>',
        null,'블랙박스와 영상정보처리기기');return true;
    }
    if (/CCTV|영상정보처리기기|영상정보/i.test(n) && /(며칠|몇일|얼마나|보관기간|저장기간|보존기간)/.test(n)) {
      add('bot','<p class="friendly-lead">네, CCTV 영상이 며칠이나 저장되는지 궁금하셨군요! 알기 쉽게 차근차근 설명해 드릴게요. 😊</p>'+
        '<p class="friendly-answer">사실 모든 CCTV에 똑같이 정해진 보관 기간은 없답니다. 설치한 곳마다 <b>촬영 목적에 꼭 필요한 기간</b>을 정해 보관하거든요.</p>'+
        '<p class="friendly-answer">그래도 많이 참고하는 기준을 알려드릴게요!</p>'+
        '<ul class="friendly-points"><li><b>일반적인 CCTV</b>는 일률적으로 30일을 보관해야 하는 것은 아니에요. 다만 <b>보관 목적을 달성하는 데 필요한 최소 기간을 정하기 어려울 때에는 30일 이내</b>로 정하도록 「표준 개인정보 보호지침」에서 안내하고 있어요.</li>'+
        '<li><b>어린이집 CCTV</b>는 아이들의 안전을 위해 <b>60일 이상</b> 보관해야 해요. 「영유아보육법」에 별도 기준이 있답니다.</li></ul>'+
        '<p class="friendly-answer">이처럼 장소와 법령에 따라 기간이 달라질 수 있어요. 정확한 날짜는 해당 장소의 안내판이나 홈페이지에 공개된 <b>영상정보처리기기 운영·관리 방침</b>을 살펴보시거나, 관리하는 곳에 문의해 보세요!</p>'+
        '<p class="friendly-answer"><b>특히 CCTV 담당자분께서는 보관기간에 맞춰 영상이 제대로 삭제되는지 정기적으로 확인하는 일이 중요해요!</b> 😊</p>'+
        '<p class="friendly-answer">예를 들어 <b>영상마다 30일이 지나면 자동 삭제되도록 설정</b>했다면, 오래된 영상이 실제로 삭제되었는지 주기적으로 확인해 주세요. <b>30일 보관</b>이 반드시 <b>30일마다 한꺼번에 삭제</b>한다는 뜻은 아니랍니다.</p>'+
        '<p class="friendly-answer">파기한 영상은 기관의 <b>개인영상정보 관리대장</b>에 파기 일시·대상·방법·담당자 등 필요한 사항을 기록하고, 관리대장에 <b>파기 항목</b>이 있다면 빠뜨리지 말고 체크해 주세요. 자동 삭제 기능의 작동 여부와 실제 파기 내역도 점검 기록으로 남기면 더 안전해요.</p>'+
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
