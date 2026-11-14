/* 개인정보 처리방침 자가 진단 엔진 — 작성지침 2026.4. 기준. 모든 처리는 브라우저 내에서만. */
(function(){
'use strict';
var D = window.PCHK; if(!D) return;
var $ = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
var esc = function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };

/* ───────────── 라벨 스프라이트 ───────────── */
var SHEET = { color:'assets/img/label-color.png', line:'assets/img/label-line.png', mono:'assets/img/label-mono.png' };
var sheetStyle = 'color';
function labIcon(name, px){
  var L = D.labels[name]; if(!L) return '';
  px = px||64; var sc = px/128;
  return '<span class="ic" style="width:'+px+'px;height:'+px+'px;background-image:url('+SHEET[sheetStyle]+');'+
         'background-size:'+(1536*sc)+'px '+(384*sc)+'px;background-position:-'+(L.c*128*sc)+'px -'+(L.r*128*sc)+'px"></span>';
}

/* ───────────── 비식별 ───────────── */
function mask(t){
  return String(t)
    .replace(/\b(\d{6})[-–](\d)\d{6}\b/g, '$1-$2******')                       // 주민등록번호
    .replace(/\b(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{2})(\d{2})\b/g, '$1-****-**$4')
    .replace(/\b(0\d{1,2})[-.\s](\d{3,4})[-.\s](\d{2})(\d{2})\b/g, '$1-$2-**$4')
    .replace(/[\w.+-]+@([\w-]+\.[\w.-]+)/g, '****@$1')
    .replace(/\b\d{2,3}-\d{2,6}-\d{4,8}\b/g, '***-****-****')                   // 계좌
    .replace(/((성\s*명|담당자|책임자|이\s*름)\s*[:：]\s*)([가-힣]{2,4})/g, function(m,a,b,c){ return a + c.charAt(0)+'○'.repeat(c.length-1); });
}

/* ───────────── 파일 읽기 (브라우저 내) ───────────── */
async function inflateRaw(buf){
  if(typeof DecompressionStream === 'undefined') throw new Error('nozip');
  var ds = new DecompressionStream('deflate-raw');
  var out = new Response(new Blob([buf]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
async function unzip(ab){
  var u = new Uint8Array(ab), dv = new DataView(ab), files = {};
  var eocd = -1;
  for(var i=u.length-22; i>=0 && i>u.length-66000; i--){ if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; } }
  if(eocd<0) throw new Error('zip');
  var n = dv.getUint16(eocd+10,true), off = dv.getUint32(eocd+16,true), p = off;
  for(var k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    var meth = dv.getUint16(p+10,true), csz = dv.getUint32(p+20,true);
    var nl = dv.getUint16(p+28,true), el = dv.getUint16(p+30,true), cl = dv.getUint16(p+32,true);
    var lho = dv.getUint32(p+42,true);
    var name = new TextDecoder('utf-8').decode(u.subarray(p+46, p+46+nl));
    var lnl = dv.getUint16(lho+26,true), lel = dv.getUint16(lho+28,true);
    var ds = lho+30+lnl+lel;
    files[name] = { meth:meth, data:u.subarray(ds, ds+csz) };
    p += 46+nl+el+cl;
  }
  return files;
}
async function zipText(ab, pick){
  var fs = await unzip(ab), names = Object.keys(fs).filter(pick).sort(), out = '';
  for(var i=0;i<names.length;i++){
    var f = fs[names[i]];
    var raw = f.meth===0 ? f.data : await inflateRaw(f.data);
    out += new TextDecoder('utf-8').decode(raw);
  }
  return out;
}
function xml2txt(x){
  return x.replace(/<(w:p|hp:p|hp:linesegarray)\b[^>]*\/?>/g,'\n')
          .replace(/<\/(w:p|hp:p)>/g,'\n')
          .replace(/<w:tab\b[^>]*\/>/g,'\t')
          .replace(/<[^>]+>/g,'')
          .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
          .replace(/\n{3,}/g,'\n\n');
}
async function pdfText(ab){
  var u = new Uint8Array(ab), s = '', i;
  var bin = ''; for(i=0;i<u.length;i++) bin += String.fromCharCode(u[i]);
  var re = /stream\r?\n?/g, m, chunks = [];
  while((m = re.exec(bin))){
    var st = m.index + m[0].length, en = bin.indexOf('endstream', st);
    if(en<0) continue;
    chunks.push(u.subarray(st, en));
    re.lastIndex = en;
  }
  for(i=0;i<chunks.length;i++){
    var t = null;
    try{
      var ds = new DecompressionStream('deflate');
      var r = new Response(new Blob([chunks[i]]).stream().pipeThrough(ds));
      t = new TextDecoder('utf-8',{fatal:false}).decode(await r.arrayBuffer());
    }catch(e){ t = null; }
    if(!t) continue;
    var tj = t.match(/\((?:\\.|[^\\()])*\)\s*Tj|\[(?:[^\]\\]|\\.)*\]\s*TJ/g);
    if(!tj) continue;
    tj.forEach(function(x){
      var parts = x.match(/\((?:\\.|[^\\()])*\)/g) || [];
      parts.forEach(function(p){ s += p.slice(1,-1).replace(/\\([()\\])/g,'$1'); });
      s += /TJ$/.test(x.trim()) ? '' : '\n';
    });
    s += '\n';
  }
  return s;
}
async function readFile(f){
  var ext = (f.name.split('.').pop()||'').toLowerCase();
  if(ext==='txt') return await f.text();
  var ab = await f.arrayBuffer();
  if(ext==='docx') return xml2txt(await zipText(ab, function(n){ return /^word\/(document|header\d*|footer\d*)\.xml$/.test(n); }));
  if(ext==='hwpx') return xml2txt(await zipText(ab, function(n){ return /^Contents\/section\d+\.xml$/.test(n); }));
  if(ext==='pdf'){ var t = await pdfText(ab); if(t.replace(/\s/g,'').length<80) throw new Error('pdftext'); return t; }
  throw new Error('ext');
}

/* ───────────── 점검 ───────────── */
function rx(p){ try{ return new RegExp(p,'i'); }catch(e){ return /$a^/; } }
function evaluate(text, otype){
  var isPub = (otype==='public');
  var res = [];
  D.items.forEach(function(it){
    if(it.scope==='public' && !isPub) return;
    var hit = rx(it.det).test(text);
    var applies = it.cond ? rx(it.cond).test(text) : true;
    var subs = it.sub.map(function(s){ return { label:s.label, ok: rx(s.re).test(text) }; });
    var miss = subs.filter(function(s){ return !s.ok; });
    var state;
    if(hit && miss.length===0) state='ok';
    else if(hit) state='warn';
    else if(!applies && /해당시/.test(it.kind)) state='ask';
    else state='bad';
    res.push({ it:it, state:state, subs:subs, miss:miss, quote: hit? snippet(text, it.det) : '' });
  });
  D.format.forEach(function(q){
    var found = rx(q.pat).test(text);
    var state = q.mode==='bad' ? (found?'bad':'ok') : (found?'ok':'bad');
    res.push({ it:{ id:q.id, no:q.no, area:'Z', title:q.title, kind:q.kind, law:q.law, page:0,
                    why:q.why, how:q.how, sample:'', icon:null, easy:null, fmt:true, fix:q.fix, mode:q.mode },
               state:state, subs:[], miss:[], quote: found? snippet(text, q.pat):'' });
  });
  return res;
}
function snippet(text, pat){
  var m = rx(pat).exec(text); if(!m) return '';
  var i = Math.max(0, m.index-70);
  return mask(text.slice(i, m.index + m[0].length + 330)).replace(/\s+/g,' ').trim();
}
var W = { ok:1, warn:0.5, bad:0, ask:null };
function score(res){
  var s=0,n=0; res.forEach(function(r){ var w=W[r.state]; if(w===null) return; s+=w; n++; });
  return n? Math.round(s/n*100) : 0;
}
function grade(v){ return v>=90?['S','매우 우수']:v>=80?['A','우수']:v>=70?['B','보통']:v>=60?['C','미흡']:['D','매우 미흡']; }

/* ───────────── 렌더 ───────────── */
var S = { org:'', otype:'public', url:'', text:'', res:[], date:'' };
var STN = { ok:'✔ 충족', warn:'▲ 일부 미흡', bad:'✖ 누락', ask:'? 해당여부 확인' };
var AREAN = {}; D.areas.forEach(function(a){ AREAN[a.id]=a.name; });

function ring(v){
  var c = 2*Math.PI*52, off = c*(1-v/100);
  var col = v>=80?'var(--ok2)':v>=60?'var(--warn2)':'var(--bad2)';
  return '<svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-2)" stroke-width="12"/>'+
    '<circle cx="60" cy="60" r="52" fill="none" stroke="'+col+'" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" transform="rotate(-90 60 60)"/>'+
    '<text x="60" y="68" text-anchor="middle" font-size="30" font-weight="800" fill="'+col+'">'+v+'</text></svg>';
}
function tabDash(){
  var v = score(S.res), g = grade(v);
  var cnt = { ok:0, warn:0, bad:0, ask:0 }; S.res.forEach(function(r){ cnt[r.state]++; });
  var byArea = {}; S.res.forEach(function(r){ var a=r.it.area; (byArea[a]=byArea[a]||[]).push(r); });
  var h = '<div class="pc-card"><h2>종합 점수</h2><div class="score">'+ring(v)+
    '<div><div class="big">'+v+'<span> / 100</span></div><div class="grade">'+g[0]+' 등급 · '+g[1]+'</div>'+
    '<div class="ssub">'+esc(S.org)+' · '+esc(orgName(S.otype))+'<br>점검일 '+S.date+' · 기준 「개인정보 처리방침 작성지침」 '+D.version+'<br>'+
    '점검 항목 '+S.res.length+'개 (‘해당여부 확인’ '+cnt.ask+'개는 점수에서 제외)</div></div></div>'+
    '<div class="dist">'+
      '<div class="d-ok"><b>'+cnt.ok+'</b><small>✔ 충족</small></div>'+
      '<div class="d-warn"><b>'+cnt.warn+'</b><small>▲ 일부 미흡</small></div>'+
      '<div class="d-bad"><b>'+cnt.bad+'</b><small>✖ 누락</small></div>'+
      '<div class="d-ask"><b>'+cnt.ask+'</b><small>? 해당여부 확인</small></div>'+
    '</div></div>';

  h += '<div class="pc-card"><h2>영역별 충족률</h2><div class="bars">';
  D.areas.forEach(function(a){
    var g2 = byArea[a.id]; if(!g2) return;
    var s=0,n=0; g2.forEach(function(r){ var w=W[r.state]; if(w===null) return; s+=w; n++; });
    var p = n? Math.round(s/n*100):0;
    h += '<div class="bar"><span>'+esc(a.name)+'</span><span class="tr"><i style="width:'+p+'%"></i></span><span class="v">'+p+'%</span></div>';
  });
  h += '</div></div>';

  h += '<div class="pc-card"><h2>항목별 상태</h2><table class="pt"><thead><tr><th>No</th><th>영역</th><th>점검 항목</th><th>구분</th><th>상태</th></tr></thead><tbody>';
  S.res.forEach(function(r){
    h += '<tr><td class="c">'+r.it.no+'</td><td>'+esc(AREAN[r.it.area]||'')+'</td><td>'+esc(r.it.title)+'</td>'+
         '<td class="c"><span class="pill">'+esc(r.it.kind)+'</span></td>'+
         '<td class="c"><span class="st '+r.state+'">'+STN[r.state]+'</span></td></tr>';
  });
  h += '</tbody></table></div>';

  h += '<div class="pc-card"><h2>📚 법령 최신성</h2><table class="pt"><thead><tr><th>확인 사항</th><th>상태</th><th>근거</th></tr></thead><tbody>';
  S.res.filter(function(r){ return r.it.fmt; }).forEach(function(r){
    h += '<tr><td>'+esc(r.it.title)+'</td><td class="c"><span class="st '+r.state+'">'+STN[r.state]+'</span></td><td>'+esc(r.it.law)+'</td></tr>';
  });
  h += '</tbody></table></div>';
  return h;
}

function tabReport(){
  var v = score(S.res), g = grade(v);
  var bad = S.res.filter(function(r){ return r.state==='bad'; });
  var warn = S.res.filter(function(r){ return r.state==='warn'; });
  var ok = S.res.filter(function(r){ return r.state==='ok'; });
  var ask = S.res.filter(function(r){ return r.state==='ask'; });

  var h = '<div class="pc-card"><h2>개인정보 처리방침 점검 보고서</h2>'+
    '<table class="pt"><tbody>'+
    '<tr><th>기관명</th><td>'+esc(S.org)+'</td></tr>'+
    '<tr><th>기관 유형</th><td>'+esc(orgName(S.otype))+'</td></tr>'+
    '<tr><th>점검 대상</th><td>'+esc(S.url||'직접 입력한 본문')+'</td></tr>'+
    '<tr><th>점검일</th><td>'+S.date+'</td></tr>'+
    '<tr><th>점검 기준</th><td>「개인정보 보호법」 제30조·시행령 제31조·「표준 개인정보 보호지침」, 개인정보보호위원회 「개인정보 처리방침 작성지침」('+D.version+')</td></tr>'+
    '<tr><th>종합 결과</th><td><b>'+v+'점 / 100점 · '+g[0]+' 등급('+g[1]+')</b> — 충족 '+ok.length+' · 일부 미흡 '+warn.length+' · 누락 '+bad.length+' · 해당여부 확인 '+ask.length+'</td></tr>'+
    '<tr><th>비식별</th><td>본문에서 이름·연락처·전자우편·주민등록번호·계좌번호로 보이는 값은 자동으로 가린 상태입니다.</td></tr>'+
    '</tbody></table></div>';

  h += '<div class="pc-card"><h2>1. 점검 결과</h2>'+
       '<h3>1-1. 종합</h3><p style="font-size:13.5px;line-height:1.85;margin:0">'+
       esc(S.org)+'의 개인정보 처리방침은 전체 '+S.res.length+'개 점검 항목 가운데 '+ok.length+'개를 충족하고, '+
       warn.length+'개가 일부 미흡하며, '+bad.length+'개가 누락되어 있습니다. '+
       (bad.length? '우선 보완이 필요한 항목은 '+bad.slice(0,4).map(function(r){return r.it.title;}).join(', ')+(bad.length>4?' 등':'')+'입니다.' : '법정 기재사항의 누락은 발견되지 않았습니다.')+
       '</p>';
  h += '<h3>1-2. 항목별 결과</h3><table class="pt"><thead><tr><th>No</th><th>점검 항목</th><th>상태</th><th>미흡한 세부 사항</th></tr></thead><tbody>';
  S.res.forEach(function(r){
    h += '<tr><td class="c">'+r.it.no+'</td><td>'+esc(r.it.title)+'</td><td class="c"><span class="st '+r.state+'">'+STN[r.state]+'</span></td>'+
         '<td>'+(r.miss.length? esc(r.miss.map(function(m){return m.label;}).join(' / ')) : (r.state==='bad'?'항목 전체 누락':'—'))+'</td></tr>';
  });
  h += '</tbody></table>';
  if(ok.length) h += '<h3>1-3. 충족 항목</h3><p style="font-size:13.5px;line-height:1.9;margin:0">'+esc(ok.map(function(r){return r.it.title;}).join(' · '))+'</p>';
  if(ask.length) h += '<h3>1-4. 해당 여부 확인이 필요한 항목</h3><p style="font-size:13.5px;line-height:1.9;margin:0 0 6px">아래 항목은 ‘해당되는 경우에만’ 적는 사항입니다. 실제로 해당 처리를 하고 있다면 반드시 기재해야 하고, 하지 않는다면 “해당 개인정보를 처리하지 않습니다”라고 적는 것이 권장됩니다.</p><p style="font-size:13.5px;line-height:1.9;margin:0">'+esc(ask.map(function(r){return r.it.title;}).join(' · '))+'</p>';
  h += '</div>';

  var need = bad.concat(warn);
  h += '<div class="pc-card"><h2>2. 개선 방법 및 근거</h2>';
  if(!need.length) h += '<p style="font-size:13.5px">개선이 필요한 항목이 없습니다.</p>';
  need.forEach(function(r){
    h += '<div class="fix'+(r.state==='bad'?' bad':'')+'"><h4>'+(r.it.icon? labIcon(r.it.icon,28):'')+
      '<span>'+r.it.no+'. '+esc(r.it.title)+'</span><span class="st '+r.state+'">'+STN[r.state]+'</span></h4>'+
      '<p class="meta">근거 : '+esc(r.it.law)+(r.it.page? ' · 작성지침 '+r.it.page+'쪽':'')+'</p>';
    if(r.quote) h += '<div class="blk"><div class="k">현행 내용 (비식별)</div><div class="quote">'+esc(r.quote)+'…</div></div>';
    else h += '<div class="blk"><div class="k">현행 내용</div><div class="t">해당 내용을 찾지 못했습니다.</div></div>';
    h += '<div class="blk"><div class="k">미흡한 부분</div>';
    if(r.miss.length) h += '<ul class="miss">'+r.miss.map(function(m){return '<li>'+esc(m.label)+'</li>';}).join('')+'</ul>';
    else h += '<div class="t">'+esc(r.it.why)+'</div>';
    h += '</div>';
    if(r.miss.length) h += '<div class="blk"><div class="k">왜 문제인가</div><div class="t">'+esc(r.it.why)+'</div></div>';
    h += '<div class="blk"><div class="k">개선 방법</div><div class="t">'+esc(r.it.how)+'</div></div>';
    if(r.it.sample) h += '<div class="blk"><div class="k">작성 예시</div><pre class="ex">'+esc(fill(r.it.sample))+'</pre></div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function orgName(id){ var t = D.orgTypes.filter(function(o){return o.id===id;})[0]; return t? t.name : id; }
function fill(s){ return String(s).replace(/<기관명>/g, S.org || '<기관명>'); }

function tabImproved(){
  var inc = S.res.filter(function(r){ return !r.it.fmt && (r.state!=='ask'); });
  var h = '<div class="pc-card"><h2>✍️ 개선된 처리방침(안)</h2>'+
    '<p class="pc-note" style="margin:0 0 14px">누락·미흡 항목의 표준 문구를 채워 넣은 <b>초안</b>입니다. ○○ 부분은 기관 실제 현황으로 바꿔 주세요. ‘해당여부 확인’ 항목은 빠져 있으니, 해당하면 직접 추가하셔야 합니다.</p>';

  h += '<h3>주요 개인정보 처리 표시(라벨링)</h3>'+
    '<div class="pc-actions" style="margin:0 0 10px"><button class="btn" data-ls="color" type="button">색깔형</button>'+
    '<button class="btn" data-ls="line" type="button">라인형</button><button class="btn" data-ls="mono" type="button">흑백형</button></div>'+
    '<div class="lab lgrid" id="labgrid">'+labGrid(inc)+'</div>'+
    '<p class="pc-note" style="margin-top:4px">기호 아래·옆에 항목 수나 간략 설명을 덧붙여 쓰세요. 라벨링은 요약이므로 본문 공개는 별도로 해야 합니다(작성지침 Part Ⅴ).</p>';

  h += '<h3>목차</h3><div class="doc" style="max-height:none">'+esc(inc.map(function(r,i){ return rn(i+1)+'. '+r.it.title; }).join('\n'))+'</div>';
  h += '<h3>본문</h3><div class="doc">'+esc(buildDoc())+'</div></div>';
  return h;
}
function labGrid(inc){
  var seen = {}, h='';
  inc.forEach(function(r){ var n=r.it.icon; if(!n||seen[n]) return; seen[n]=1;
    h += '<figure>'+labIcon(n,64)+'<figcaption>'+esc(n)+'</figcaption></figure>'; });
  return h;
}
var RN = ['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ','ⅩⅠ','ⅩⅡ','ⅩⅢ','ⅩⅣ','ⅩⅤ','ⅩⅥ','ⅩⅦ','ⅩⅧ','ⅩⅨ','ⅩⅩ','ⅩⅩⅠ','ⅩⅩⅡ','ⅩⅩⅢ','ⅩⅩⅣ','ⅩⅩⅤ','ⅩⅩⅥ','ⅩⅩⅦ','ⅩⅩⅧ'];
function rn(i){ return RN[i]||('제'+i); }
function buildDoc(){
  var inc = S.res.filter(function(r){ return !r.it.fmt && r.state!=='ask'; });
  var out = [];
  inc.forEach(function(r,i){
    var body = fill(r.it.sample||'');
    body = body.replace(/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*/m, rn(i+1)+'. ');
    if(!/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/.test(body) && !/^\s*▶/.test(body)) body = rn(i+1)+'. '+r.it.title+'\n\n'+body;
    out.push(body.trim());
  });
  return out.join('\n\n\n');
}

function tabCompare(){
  var need = S.res.filter(function(r){ return r.state==='bad' || r.state==='warn'; });
  var h = '<div class="pc-card"><h2>📑 신구대조표</h2>'+
    '<p class="pc-note" style="margin:0 0 12px">현행(비식별)과 개선안을 나란히 둔 표입니다. 그대로 결재 문서에 붙여 쓰실 수 있어요.</p>'+
    '<table class="pt"><thead><tr><th style="width:52px">No</th><th style="width:19%">점검 항목</th><th style="width:34%">현 행</th><th style="width:34%">개 정 안</th><th>사유</th></tr></thead><tbody>';
  if(!need.length) h += '<tr><td colspan="5">개정이 필요한 항목이 없습니다.</td></tr>';
  need.forEach(function(r){
    var now = r.quote ? r.quote.slice(0,260)+'…' : '〈해당 내용 없음 — 신설〉';
    var nxt;
    if(r.it.fmt) nxt = r.it.fix ? ('“'+r.it.fix[0]+'” → “'+r.it.fix[1]+'”') : '〈'+r.it.how.slice(0,120)+'…〉';
    else nxt = fill(r.it.sample||'').slice(0,420)+'…';
    h += '<tr><td class="c">'+r.it.no+'</td><td>'+esc(r.it.title)+'</td><td>'+esc(now)+'</td><td class="new">'+esc(nxt)+'</td><td>'+esc(r.it.law)+'</td></tr>';
  });
  h += '</tbody></table></div>';
  return h;
}

function tabTier(){
  var inc = S.res.filter(function(r){ return !r.it.fmt && r.it.easy && r.state!=='ask'; });
  var T = [['child','👧 어린이용 (만 14세 미만)','아동이 쉽게 이해할 수 있는 양식과 명확하고 알기 쉬운 언어로 알려야 합니다(법 제22조의2제3항).'],
           ['teen','🧑 청소년용','또래가 쓰는 말로, 권리 행사 방법을 중심으로 짧게 안내합니다.'],
           ['senior','🧓 어르신용','큰 글씨와 짧은 문장으로, 전화 문의처를 함께 안내합니다.']];
  var h = '<div class="pc-card"><h2>👨‍👩‍👧 계층별 처리방침</h2>'+
    '<p class="pc-note" style="margin:0 0 12px">작성지침 부록2(아동을 위한 처리방침)와 부록5(알기 쉬운 처리방침)를 바탕으로, 본문 항목을 대상별 쉬운 문장으로 바꾼 요약본입니다.</p>';
  T.forEach(function(t){
    h += '<div class="tier"><h4>'+t[1]+'</h4><p style="font-size:12.5px;color:var(--mut2);margin:0 0 9px;line-height:1.7">'+esc(t[2])+'</p><ul>';
    inc.forEach(function(r){ h += '<li><b>'+esc(r.it.title)+'</b> — '+esc(r.it.easy[t[0]])+'</li>'; });
    h += '</ul></div>';
  });
  h += '<p class="pc-note">문의 : '+esc(S.org)+' 개인정보 보호책임자 ☎ ○○○-○○○-○○○○</p></div>';
  return h;
}
function tabRaw(){
  return '<div class="pc-card"><h2>🔒 원문(비식별)</h2>'+
    '<p class="pc-note" style="margin:0 0 12px">점검에 사용한 본문입니다. 이름·연락처·전자우편·주민등록번호·계좌번호로 보이는 값은 가려져 있습니다. 이 내용은 서버로 전송되지 않습니다.</p>'+
    '<div class="doc">'+esc(mask(S.text))+'</div></div>';
}

var TAB = { dash:tabDash, report:tabReport, improved:tabImproved, compare:tabCompare, tier:tabTier, raw:tabRaw };
function render(k){
  $('#rbody').innerHTML = TAB[k]();
  $$('#rtabs button').forEach(function(b){ b.classList.toggle('on', b.dataset.r===k); });
  window.scrollTo({ top: $('#rbody').offsetTop-70, behavior:'smooth' });
}

/* ───────────── 내려받기 ───────────── */
function plain(){
  var v = score(S.res), g = grade(v), L = [];
  L.push('개인정보 처리방침 점검 보고서');
  L.push('');
  L.push('기관명 : '+S.org);
  L.push('기관 유형 : '+orgName(S.otype));
  L.push('점검 대상 : '+(S.url||'직접 입력 본문'));
  L.push('점검일 : '+S.date);
  L.push('점검 기준 : 개인정보 보호법 제30조·시행령 제31조, 개인정보 처리방침 작성지침 '+D.version);
  L.push('종합 결과 : '+v+'점 / 100점 · '+g[0]+' 등급('+g[1]+')');
  L.push('');
  L.push('■ 1. 항목별 점검 결과');
  S.res.forEach(function(r){
    L.push(' '+r.it.no+'. ['+STN[r.state].replace(/[✔▲✖?]\s*/,'')+'] '+r.it.title+
      (r.miss.length? ' — 미흡 : '+r.miss.map(function(m){return m.label;}).join(' / ') : ''));
  });
  L.push('');
  L.push('■ 2. 개선 방법 및 근거');
  S.res.filter(function(r){ return r.state==='bad'||r.state==='warn'; }).forEach(function(r){
    L.push('');
    L.push('['+r.it.no+'] '+r.it.title+'  ('+STN[r.state]+')');
    L.push(' 근거 : '+r.it.law+(r.it.page?' · 작성지침 '+r.it.page+'쪽':''));
    L.push(' 미흡한 부분 : '+(r.miss.length? r.miss.map(function(m){return m.label;}).join(' / ') : r.it.why));
    L.push(' 개선 방법 : '+r.it.how);
    if(r.it.sample){ L.push(' 작성 예시 :'); L.push(fill(r.it.sample).split('\n').map(function(x){return '   '+x;}).join('\n')); }
  });
  L.push('');
  L.push('■ 3. 개선 후 개인정보 처리방침(안)');
  L.push('');
  L.push(buildDoc());
  L.push('');
  L.push('■ 4. 계층별 처리방침 요약');
  [['child','어린이용'],['teen','청소년용'],['senior','어르신용']].forEach(function(t){
    L.push(''); L.push('< '+t[1]+' >');
    S.res.filter(function(r){ return !r.it.fmt && r.it.easy && r.state!=='ask'; }).forEach(function(r){
      L.push(' · '+r.it.title+' — '+r.it.easy[t[0]]);
    });
  });
  L.push('');
  L.push('※ 규칙 기반 점검 결과이며 표준 문구 기반 초안입니다. 공개 전 소관 부서 검토를 거치세요.');
  return L.join('\n');
}
function save(blob, name){
  var a = document.createElement('a'), u = URL.createObjectURL(blob);
  a.href=u; a.download=name; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); }, 400);
}
/* 최소 ZIP(무압축) — DOCX/HWPX 생성용 */
function crc32(u){
  var t = crc32.t; if(!t){ t = crc32.t = []; for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } }
  var c2 = 0xFFFFFFFF; for(var i=0;i<u.length;i++) c2 = t[(c2^u[i])&0xFF]^(c2>>>8);
  return (c2^0xFFFFFFFF)>>>0;
}
function zipStore(files){ // [{name, data:Uint8Array}]
  var parts=[], cd=[], off=0, enc=new TextEncoder();
  function u16(v){ return [v&255,(v>>8)&255]; }
  function u32(v){ return [v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255]; }
  files.forEach(function(f){
    var nm = enc.encode(f.name), c = crc32(f.data), n = f.data.length;
    var lh = [].concat([80,75,3,4], u16(20), u16(0), u16(0), u16(0), u16(0), u32(c), u32(n), u32(n), u16(nm.length), u16(0));
    parts.push(new Uint8Array(lh), nm, f.data);
    cd.push({ nm:nm, c:c, n:n, off:off });
    off += lh.length + nm.length + n;
  });
  var cds=[], clen=0;
  cd.forEach(function(e){
    var h = [].concat([80,75,1,2], u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(e.c), u32(e.n), u32(e.n),
      u16(e.nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.off));
    cds.push(new Uint8Array(h), e.nm); clen += h.length + e.nm.length;
  });
  var eo = new Uint8Array([].concat([80,75,5,6], u16(0), u16(0), u16(cd.length), u16(cd.length), u32(clen), u32(off), u16(0)));
  return new Blob(parts.concat(cds, [eo]), { type:'application/zip' });
}
function xq(s){ return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
function enc(s){ return new TextEncoder().encode(s); }
function docxBlob(txt){
  var ps = txt.split('\n').map(function(l){
    var b = /^■/.test(l);
    return '<w:p><w:pPr>'+(b?'<w:pStyle w:val="Heading1"/>':'')+'</w:pPr><w:r>'+(b?'<w:rPr><w:b/><w:sz w:val="28"/></w:rPr>':'')+
           '<w:t xml:space="preserve">'+xq(l)+'</w:t></w:r></w:p>';
  }).join('');
  var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+ps+'</w:body></w:document>';
  var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  var rel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  return zipStore([{name:'[Content_Types].xml',data:enc(ct)},{name:'_rels/.rels',data:enc(rel)},{name:'word/document.xml',data:enc(doc)}]);
}
function hwpxBlob(txt){
  var ps = txt.split('\n').map(function(l){
    return '<hp:p id="0" paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t>'+xq(l)+'</hp:t></hp:run></hp:p>';
  }).join('');
  var sec = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">'+ps+'</hs:sec>';
  var ct = '<?xml version="1.0" encoding="UTF-8"?><opf:package xmlns:opf="http://www.idpf.org/2007/opf/" version="" unique-identifier="" id=""><opf:metadata><opf:title>'+xq(S.org)+' 개인정보 처리방침 점검 보고서</opf:title></opf:metadata><opf:manifest><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/></opf:manifest><opf:spine><opf:itemref idref="section0"/></opf:spine></opf:package>';
  var mani = '<?xml version="1.0" encoding="UTF-8"?><manifest xmlns="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"><file-entry full-path="/" media-type="application/hwp+zip"/><file-entry full-path="Contents/section0.xml" media-type="application/xml"/></manifest>';
  return zipStore([{name:'mimetype',data:enc('application/hwp+zip')},
                   {name:'META-INF/manifest.xml',data:enc(mani)},
                   {name:'Contents/content.hpf',data:enc(ct)},
                   {name:'Contents/section0.xml',data:enc(sec)}]);
}

/* ───────────── 입력 ───────────── */
function initTypes(){
  var s = $('#otype');
  s.innerHTML = D.orgTypes.map(function(o){ return '<option value="'+o.id+'">'+esc(o.name)+'</option>'; }).join('');
  function d(){ var o = D.orgTypes.filter(function(x){return x.id===s.value;})[0]; $('#otdesc').textContent = o? o.desc : ''; }
  s.addEventListener('change', d); d();
}
async function fetchUrl(u){
  var r = await fetch(u, { mode:'cors' });
  if(!r.ok) throw new Error('http '+r.status);
  var html = await r.text();
  var dom = new DOMParser().parseFromString(html,'text/html');
  dom.querySelectorAll('script,style,nav,header,footer').forEach(function(e){ e.remove(); });
  return (dom.body? dom.body.innerText || dom.body.textContent : html).replace(/\n{3,}/g,'\n\n');
}
function msg(t){ var n = $('#fname'); n.style.display='block'; n.innerHTML = t; }

async function run(){
  var org = $('#org').value.trim(), url = $('#url').value.trim(), paste = $('#paste').value.trim();
  if(!org){ alert('기관명을 입력해 주세요.'); $('#org').focus(); return; }
  if(!url && !paste && !S.text){ alert('처리방침 주소(URL)를 넣거나, 아래에서 본문을 붙여넣거나 파일을 올려 주세요.'); return; }
  var btn = $('#run'); btn.disabled = true; btn.textContent = '점검 중…';
  var text = paste || S.text || '';
  if(!text && url){
    try{ text = await fetchUrl(url); }
    catch(e){
      $('#altbox').open = true;
      msg('⚠ 해당 사이트가 외부에서 불러오는 것을 막고 있어 주소로 가져오지 못했습니다. 처리방침 본문을 붙여넣거나 파일을 올려 주세요.');
      btn.disabled=false; btn.textContent='점검 시작'; return;
    }
  }
  if(text.replace(/\s/g,'').length < 200){
    alert('본문이 너무 짧습니다. 처리방침 전문을 넣어 주세요.');
    btn.disabled=false; btn.textContent='점검 시작'; return;
  }
  S.org = org; S.otype = $('#otype').value; S.url = url; S.text = text;
  S.date = new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
  S.res = evaluate(text, S.otype);
  $('#results').hidden = false;
  render('dash');
  btn.disabled=false; btn.textContent='다시 점검';
}

var DEMO = [
 '○○기관 개인정보취급방침',
 '○○기관은 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 개인정보를 보호합니다.',
 '1. 개인정보의 처리 목적 : 서비스 제공을 위하여 개인정보를 처리합니다.',
 '2. 처리하는 개인정보의 항목 : 성명, 생년월일, 주소, 전화번호, 전자우편주소, 주민등록번호를 수집합니다.',
 '3. 개인정보의 처리 및 보유 기간 : 목적 달성 시까지 보유합니다.',
 '4. 개인정보의 파기 : 파기 사유가 발생한 개인정보는 파기합니다.',
 '5. 개인정보의 제3자 제공 : 관계기관에 제공할 수 있습니다.',
 '6. 개인정보 처리업무의 위탁 : 수탁자 ○○(주)에게 위탁하고 있습니다.',
 '7. 개인정보의 안전성 확보조치 : 기술적·관리적·물리적 조치를 하고 있습니다.',
 '8. 정보주체의 권리 : 정보주체는 개인정보 열람을 요구할 수 있습니다.',
 '9. 개인정보 보호책임자 : ○○과 (전화 064-710-0000)',
 '10. 쿠키 : 본 누리집은 쿠키를 사용합니다.',
 '11. 고정형 영상정보처리기기 : 청사에 CCTV를 설치·운영하고 있습니다.',
 '본 처리방침은 서비스를 이용하면 동의한 것으로 봅니다.',
 '이 개인정보취급방침은 2019년 1월 1일부터 시행합니다.',
 '개인정보가 유출된 사실을 안 때부터 5일 이내에 신고합니다.'
].join('\n\n');

document.addEventListener('DOMContentLoaded', function(){
  initTypes();
  $('#run').addEventListener('click', run);
  $('#demo').addEventListener('click', function(){
    $('#org').value = $('#org').value || '제주특별자치도 ○○과';
    $('#url').value = $('#url').value || 'https://example.go.kr/privacy';
    $('#altbox').open = true; $('#paste').value = DEMO; S.text = '';
    run();
  });
  var drop = $('#drop'), fi = $('#file');
  drop.addEventListener('click', function(){ fi.click(); });
  ['dragenter','dragover'].forEach(function(e){ drop.addEventListener(e, function(ev){ ev.preventDefault(); drop.classList.add('hl'); }); });
  ['dragleave','drop'].forEach(function(e){ drop.addEventListener(e, function(ev){ ev.preventDefault(); drop.classList.remove('hl'); }); });
  drop.addEventListener('drop', function(ev){ if(ev.dataTransfer.files[0]) take(ev.dataTransfer.files[0]); });
  fi.addEventListener('change', function(){ if(fi.files[0]) take(fi.files[0]); });
  async function take(f){
    msg('⏳ ' + esc(f.name) + ' 읽는 중…');
    try{
      var t = await readFile(f); S.text = t; $('#paste').value = '';
      msg('✅ <b>'+esc(f.name)+'</b> — 본문 '+t.replace(/\s/g,'').length.toLocaleString()+'자를 읽었습니다.');
    }catch(e){
      S.text = '';
      msg(e.message==='pdftext'
        ? '⚠ 이 PDF는 글자가 이미지로 들어 있어 본문을 뽑지 못했습니다. 한글·워드 파일을 올리거나 본문을 붙여넣어 주세요.'
        : '⚠ 파일을 읽지 못했습니다(.hwpx · .docx · .pdf · .txt만 됩니다). 본문을 붙여넣어 주세요.');
    }
  }
  $('#rtabs').addEventListener('click', function(e){
    var b = e.target.closest('button[data-r]'); if(b) render(b.dataset.r);
  });
  document.addEventListener('click', function(e){
    var ls = e.target.closest('button[data-ls]');
    if(ls){ sheetStyle = ls.dataset.ls; var g = $('#labgrid');
      if(g) g.innerHTML = labGrid(S.res.filter(function(r){ return !r.it.fmt && r.state!=='ask'; })); return; }
    var dl = e.target.closest('button[data-dl]'); if(!dl) return;
    var k = dl.dataset.dl, base = (S.org||'기관')+'_개인정보 처리방침 점검보고서_'+(S.date||'');
    if(k==='pdf'){ window.print(); return; }
    if(k==='txt') save(new Blob(['﻿'+plain()],{type:'text/plain;charset=utf-8'}), base+'.txt');
    if(k==='docx') save(docxBlob(plain()), base+'.docx');
    if(k==='hwpx') save(hwpxBlob(plain()), base+'.hwpx');
  });
});
})();
