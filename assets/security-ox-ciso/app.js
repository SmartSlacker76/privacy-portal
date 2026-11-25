/* 3-minute CISO·CPO OX speed challenge (security-ox-CISO.html). Local ranking only.
   Based on the 5-minute security-ox app. Static demo supports local-only ranking.
   Set API_BASE to a Cloudflare Worker URL for public ranking and server-verified answers. */
(()=>{'use strict';
const API_BASE = String(window.SECURITY_OX_CISO_API_URL || '').trim().replace(/\/$/,''); // Cloudflare Worker, otherwise local demo
const BANK = window.SECURITY_OX_CISO_QUESTIONS || [];
const LEVEL_SCORE={하:10,중:20,상:30};
const TOTAL_MS=180000,QUESTION_MS=15000,DAY_MS=86400000,REVIEW_MS=3000;
const QUESTION_COUNT=BANK.length||30;
const $=id=>document.getElementById(id);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const screens=['screen-start','screen-game','screen-results'];
let session=null,interval=null,busy=false,result=null,leaderboard=[];
let timeoutOpen=false,timeoutAuto=null,timeoutReview=null;
const isOnline=Boolean(API_BASE.trim());
const showScreen=id=>{screens.forEach(s=>$(s).classList.toggle('active',s===id));if(window.self===window.top)window.scrollTo({top:0,behavior:'instant'});};
if(new URLSearchParams(location.search).has('embed'))document.body.classList.add('embed');
const formatTime=ms=>{const sec=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`};
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const shuffle=(items,seed)=>{let a=items.slice(),s=seed||1;const rnd=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296};for(let i=a.length-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const saveDemoRows=rows=>{try{localStorage.setItem('securityOxCisoLocal24h',JSON.stringify(rows))}catch(e){}};
const readDemoRows=()=>{try{const rows=JSON.parse(localStorage.getItem('securityOxCisoLocal24h')||'[]');const fresh=(Array.isArray(rows)?rows:[]).filter(r=>r && r.at <= Date.now() && Date.now()-r.at<DAY_MS);saveDemoRows(fresh);return fresh}catch(e){return []}};
const makeRanking=rows=>rows.slice().sort((a,b)=>b.score-a.score||b.correct-a.correct||a.elapsed-b.elapsed||a.at-b.at).slice(0,50);
const getDemoRanking=()=>makeRanking(readDemoRows());
const appendDemoRanking=r=>{let rows=readDemoRows();const prev=rows.find(x=>x.nickname===r.nickname);const better=!prev||r.score>prev.score||r.score===prev.score&&(r.correct>prev.correct||r.correct===prev.correct&&r.elapsed<prev.elapsed);if(better){rows=rows.filter(x=>x.nickname!==r.nickname);rows.push({...r,at:Date.now()})}saveDemoRows(rows);return getDemoRanking()};
async function api(path,options={}){const r=await fetch(API_BASE+path,{headers:{'Content-Type':'application/json'},...options});const data=await r.json();if(!r.ok)throw Error(data.error||`서버 오류 ${r.status}`);return data}
async function getRanking(){try{return isOnline?(await api('/leaderboard')).ranking:getDemoRanking()}catch(e){return []}}
function drawLeaderboard(id,rows){const el=$(id);if(!rows.length){el.innerHTML='<div class="empty-state">아직 기록이 없습니다. 첫 번째 도전자가 되어 보세요!</div>';return}el.innerHTML=rows.slice(0,10).map((r,i)=>`<div class="rank-row"><span class="rank-no">${i<3?['🥇','🥈','🥉'][i]:i+1}</span><span class="rank-user">${esc(r.nickname)}</span><span class="rank-score">${Number(r.score)||0}점</span><span class="rank-meta">${Number(r.correct)||0}문제</span></div>`).join('')}
async function refreshRanking(){leaderboard=await getRanking();drawLeaderboard('leaderboard-start',leaderboard);drawLeaderboard('leaderboard-final',leaderboard);drawLeaderboard('leaderboard-game',leaderboard.slice(0,5))}
$('rank-mode').textContent=isOnline?'공용':'이 기기에서만';$('final-rank-mode').textContent=isOnline?'공용':'이 기기에서만';$('game-rank-mode').textContent=isOnline?'공용':'이 기기 기록';
$('refresh-rank').addEventListener('click',refreshRanking);
function startLocal(nickname){const nonce=(Date.now()^Math.floor(Math.random()*1000000))>>>0;const order=shuffle(BANK,hash(nickname+'|'+nonce));return {mode:'local',nickname,order,index:0,started:Date.now(),questionStarted:Date.now(),answers:[],score:0,correct:0}}
async function startOnline(nickname){const s=await api('/start',{method:'POST',body:JSON.stringify({nickname})});return {mode:'online',id:s.sessionId,nickname,index:0,started:Date.now(),questionStarted:Date.now(),answers:[],score:0,correct:0,question:s.question}}
$('start-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;let nickname=$('nickname').value.trim().replace(/\s+/g,' ');const err=$('start-error');err.textContent='';if(!/^[가-힣a-zA-Z0-9 _-]{2,12}$/.test(nickname)){err.textContent='닉네임은 한글·영문·숫자 2~12자로 입력하세요.';return}busy=true;try{session=isOnline?await startOnline(nickname):startLocal(nickname);$('player-name').textContent=nickname;showScreen('screen-game');renderQuestion();refreshRanking();interval=setInterval(tick,100)}catch(e){err.textContent='연결에 실패했습니다: '+e.message}finally{busy=false}});
function getQuestion(){return session?.mode==='online'?session.question:session?.order[session.index]}
function setQuestionText(s){const el=$('question-text');const m=/^\[상황\]\s*(.*)$/.exec(s||'');if(!m){el.textContent=s||'';return}const body=m[1];const i=body.lastIndexOf('. ',body.length-2);if(i<0){el.textContent=body;return}el.innerHTML=`<span class="q-situ"><b>상황</b> ${esc(body.slice(0,i+1))}</span><span class="q-stmt">${esc(body.slice(i+2))}</span>`}
function renderQuestion(){hideTimeoutReview();const q=getQuestion();if(!session||!q){finish();return}session.questionStarted=Date.now();$('q-count').textContent=`${String(session.index+1).padStart(2,'0')} / ${QUESTION_COUNT}`;$('score-current').textContent=`점수는 종료 후 공개`;
$('level-label').textContent=`난이도 ${q.level} · ${LEVEL_SCORE[q.level]}점`;$('level-label').className='difficulty'+(q.level==='상'?' hard':q.level==='중'?' medium':'');
setQuestionText(q.text);$('terms').textContent=q.term||'';$('hint-text').textContent=q.hint||'';$('hint-text').hidden=true;$('hint-btn').disabled=false;$('hint-btn').textContent='힌트 보기';$('companion-talk').textContent=['“책임자의 눈으로 판단!”','“빠르게, 그래도 정확하게!”','“답은 끝나고 함께 확인해요!”','“혼자가 아니라 함께 지켜요!”'][(session.index)%4];
document.querySelectorAll('.answer-btn').forEach(b=>b.disabled=false);$('question-text').focus({preventScroll:true});tick()}
$('hint-btn').addEventListener('click',()=>{$('hint-text').hidden=false;$('hint-btn').disabled=true;$('hint-btn').textContent='힌트 확인 완료';});
function tick(){if(!session||busy)return;const now=Date.now();const totalLeft=TOTAL_MS-(now-session.started);const qLeft=QUESTION_MS-(now-session.questionStarted);$('global-time').textContent=formatTime(totalLeft);$('question-time').innerHTML=`${Math.max(0,Math.ceil(qLeft/1000))}<small>초</small>`;$('q-meter').style.width=Math.max(0,Math.min(100,qLeft/QUESTION_MS*100))+'%';$('q-meter').style.background=qLeft<5000?'#e2564c':'#3aab79';document.querySelector('.main-timer').classList.toggle('urgent',totalLeft<20000);if(timeoutOpen)return;if(totalLeft<=0){finish();return}if(qLeft<=0){recordAnswer(null);}}
function hideTimeoutReview(){timeoutOpen=false;if(timeoutAuto){clearTimeout(timeoutAuto);timeoutAuto=null}const el=$('timeout-overlay');el.hidden=true;el.setAttribute('aria-hidden','true')}
function revealTimeoutReview(q){if(!q)return;timeoutReview=q;timeoutOpen=true;const el=$('timeout-overlay');$('timeout-q').textContent=q.text||'';$('timeout-answer').textContent='정답: '+(q.answer?'O (맞다)':'X (아니다)');const fields=[['핵심 요약',q.summary],['법령·규정',q.regulation],['위반 시 제재',q.sanction],['실제 사례',q.case],['예방법',q.prevention],['용어 풀이',q.term]].filter(x=>x[1]);$('timeout-details').innerHTML=fields.map(([a,b])=>`<b>${esc(a)}</b><span>${esc(b)}</span>`).join('');el.hidden=false;el.setAttribute('aria-hidden','false');$('timeout-next').focus({preventScroll:true});const until=Date.now()+REVIEW_MS;const countdown=()=>{if(!timeoutOpen)return;const left=Math.max(0,Math.ceil((until-Date.now())/1000));$('timeout-next-note').textContent=left?`${left}초 뒤 다음 문제로 자동 이동합니다. 자세한 해설은 최종 결과에서도 다시 확인할 수 있어요.`:'다음 문제로 이동합니다.';if(left)timeoutAuto=setTimeout(countdown,300);else advanceTimeoutReview()};countdown()}
function advanceTimeoutReview(){if(!timeoutOpen)return;hideTimeoutReview();if(!session)return;const exhausted=session.index>=QUESTION_COUNT||(session.mode==='online'&&!session.question)||Date.now()-session.started>=TOTAL_MS;if(exhausted)finish();else renderQuestion()}
$('timeout-next').addEventListener('click',advanceTimeoutReview);
document.querySelectorAll('.answer-btn').forEach(btn=>btn.addEventListener('click',()=>recordAnswer(btn.dataset.answer)));
async function recordAnswer(answer){if(!session||busy)return;busy=true;document.querySelectorAll('.answer-btn').forEach(b=>b.disabled=true);const q=getQuestion();const now=Date.now();const spent=Math.min(QUESTION_MS,now-session.questionStarted);const ended=now-session.started>=TOTAL_MS;const chosen=(spent>=QUESTION_MS||ended)?null:answer;
try{
 if(session.mode==='online'){
   const data=await api('/answer',{method:'POST',body:JSON.stringify({sessionId:session.id,qid:q.id,answer:chosen})});
   session.answers.push({id:q.id,selected:chosen,level:q.level,text:q.text});session.index++;
   session.question=data.next;if(chosen===null){revealTimeoutReview(data.timeoutReview||q);return}if(data.done||ended||session.index>=QUESTION_COUNT){await finish();return}
 }else{
   const correct=chosen!==null&&((chosen==='O')===q.answer);if(correct){session.score+=LEVEL_SCORE[q.level];session.correct++}
   session.answers.push({id:q.id,selected:chosen,level:q.level,text:q.text,correct});session.index++;
   if(chosen===null){revealTimeoutReview(q);return}if(ended||session.index>=QUESTION_COUNT){await finish();return}
 }
 renderQuestion();
}catch(e){alert('답안 저장 중 통신 오류가 발생했습니다. 다시 시도해 주세요.\n'+e.message);document.querySelectorAll('.answer-btn').forEach(b=>b.disabled=false)}finally{busy=false}}
$('quit-btn').addEventListener('click',()=>{if(session&&!busy&&confirm('현재까지의 기록으로 종료하고 정답을 공개할까요?'))finish()});
async function finish(){if(!session||session.finishing)return;hideTimeoutReview();session.finishing=true;clearInterval(interval);interval=null;let report;
try{if(session.mode==='online'){report=await api('/finish',{method:'POST',body:JSON.stringify({sessionId:session.id})});leaderboard=report.ranking||await getRanking()}else{
 const elapsed=Math.min(TOTAL_MS,Date.now()-session.started),items=session.answers.map(a=>{const q=BANK.find(x=>x.id===a.id);return {...q,selected:a.selected,correct:a.correct}});report={nickname:session.nickname,score:session.score,correct:session.correct,answered:session.answers.length,elapsed:Math.ceil(elapsed/1000),items};leaderboard=appendDemoRanking({nickname:report.nickname,score:report.score,correct:report.correct,answered:report.answered,elapsed:report.elapsed})}}
catch(e){session.finishing=false;alert('결과 저장에 실패했습니다: '+e.message);return}
result=report;renderResults(report,leaderboard);session=null;showScreen('screen-results')}
function renderResults(r,rows){$('result-title').textContent=r.score>=300?'야전사령관급 판단력!':r.score>=150?'든든한 보안 총괄!':'도전 완료! 계속 성장해요';$('result-desc').textContent=`${r.nickname}님의 판단 기록입니다. 실제 사고·법령 해설을 확인해 보세요.`;$('result-sentence').textContent=`${r.nickname}의 최종 점수는 ${Number(r.score)||0}점입니다.`;$('final-score').textContent=r.score;$('final-answered').textContent=r.answered;$('final-correct').textContent=r.correct;$('final-time').textContent=`${r.elapsed}초`;const myRank=rows.findIndex(x=>x.nickname===r.nickname);$('final-rank').textContent=myRank>=0?`${myRank+1}위`:'기록 확인';drawLeaderboard('leaderboard-final',rows);
const reviews=$('reviews');reviews.innerHTML=(r.items||[]).map((q,i)=>{const right=q.selected!==null&&q.selected!==undefined&&((q.selected==='O')===q.answer);const st=q.selected===null||q.selected===undefined?'시간초과':right?'정답':'오답';const cl=st==='정답'?'correct':st==='오답'?'wrong':'timeout';return `<details class="review"><summary><span class="status ${cl}">${st}</span><span class="review-level">${esc(q.level)}</span><span class="review-text">${i+1}. ${esc(q.text)}</span></summary><div class="review-content"><div class="answer-banner">정답: ${q.answer?'O (맞다)':'X (아니다)'} · 내 선택: ${esc(q.selected||'미응답')}</div><div class="detail-grid"><b>핵심 요약</b><span>${esc(q.summary)}</span><b>법령·규정</b><span>${esc(q.regulation)}</span><b>위반 시 제재</b><span>${esc(q.sanction)}</span><b>실제 사례</b><span>${esc(q.case)}</span><b>예방법</b><span>${esc(q.prevention)}</span>${q.term?`<b>쉬운 용어</b><span>${esc(q.term)}</span>`:''}</div>${q.source?`<a class="source-link" href="${esc(q.source)}" target="_blank" rel="noopener noreferrer">공식 근거 자료 확인 ↗</a>`:''}</div></details>`}).join('')||'<div class="empty-state">풀이 기록이 없습니다.</div>';
}
$('expand-reviews').addEventListener('click',()=>{const ds=[...document.querySelectorAll('.review')];const expand=ds.some(d=>!d.open);ds.forEach(d=>d.open=expand);$('expand-reviews').textContent=expand?'모든 해설 접기':'모든 해설 펼치기'});
$('restart-btn').addEventListener('click',()=>{session=null;result=null;document.querySelector('.main-timer').classList.remove('urgent');$('start-error').textContent='';showScreen('screen-start');refreshRanking()});
$('copy-btn').addEventListener('click',async()=>{if(!result)return;const summary=`[CISO·CPO 3분 OX퀴즈] ${result.nickname} / ${result.score}점 / ${result.correct}개 정답 / ${result.answered}개 풀이 / ${result.elapsed}초`;try{await navigator.clipboard.writeText(summary);$('copy-btn').textContent='복사 완료!';setTimeout(()=>$('copy-btn').textContent='결과 복사',1300)}catch(e){prompt('결과 복사',summary)}});
window.addEventListener('keydown',e=>{if(session&&!busy&&!timeoutOpen&&document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='BUTTON'){if(e.key==='o'||e.key==='O'||e.key==='ArrowLeft')recordAnswer('O');if(e.key==='x'||e.key==='X'||e.key==='ArrowRight')recordAnswer('X')}});
if(!isOnline && (BANK.length!==QUESTION_COUNT||BANK.some(q=>typeof q.answer!=='boolean'))){$('start-error').textContent='공용 랭킹용 배포본입니다. 먼저 config.js에 공용 랭킹 서버 주소를 입력해 주세요. 체험하려면 체험용 파일을 사용하세요.';$('start-form').querySelector('button').disabled=true}
refreshRanking();
setInterval(refreshRanking, 30000); // 새 참가자 기록 30초 주기로 반영
// Update embedded iframe height on any screen or answer change, same-origin only.
if (document.body.classList.contains('embed') && window.parent !== window) {
  let lastH=0,scheduled=false;
  const reportHeight=()=>{scheduled=false;const el=document.querySelector('.main');const h=Math.ceil(el.getBoundingClientRect().height+22);if(Math.abs(h-lastH)>6){lastH=h;window.parent.postMessage({type:'security-ox-ciso-resize',height:h},location.origin)}};
  const changed=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(reportHeight)}};
  if('ResizeObserver' in window)new ResizeObserver(changed).observe(document.querySelector('.main'));
  window.addEventListener('load',changed);
  window.addEventListener('resize',changed);
  setTimeout(changed,300);
}
})();