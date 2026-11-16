const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/../port-lookup.html','utf8');
assert.equal((html.match(/id="messageRows"/g)||[]).length,1);
const log=html.indexOf('<section class="message-log"'), nmap=html.indexOf('<section id="nmapLab"'), incidents=html.indexOf('<section id="incidentCatalog"');
// 요청에 따라 Nmap 실습을 가장 아래로 옮김: 패킷 흐름 목록 → 사고 사례 → Nmap
assert(log<incidents&&incidents<nmap);const block=html.slice(log,incidents);assert.equal((block.match(/<th>/g)||[]).length,6);for(const col of ['단계','보내는 곳','받는 곳','프로토콜','어떤 대화인가요?','보호'])assert(block.includes(col));
const js=fs.readFileSync(__dirname+'/../assets/js/network-lab.js','utf8');assert(js.includes('state.steps.map((s,i)=>`<tr data-log='));assert(js.includes('${esc(window.StepOrder.text(i,s.wire))}'));assert(js.includes('data-step="${i}"'));
const v3=fs.readFileSync(__dirname+'/../assets/js/network-lab-v3.js','utf8');assert(!v3.includes(':short(x.wire,100)'));console.log('PASS six-column packet log: order (log < incidents < nmap), all-step rows, row navigation and full multi-line messages');
