const assert=require('node:assert/strict');global.window={};require('../assets/js/step-order.js');require('../assets/data/network-lessons.js');
const O=window.StepOrder;assert.equal(O.text(2,'passwd 입력: qwer1234'),'③ passwd 입력: qwer1234');assert.equal(O.mark(20),'⑳');assert.equal(O.mark(21),'㉑');assert.equal(O.mark(35),'㉟');assert.equal(O.mark(36),'㊱');assert.equal(O.mark(50),'㊿');assert.equal(O.mark(51),'(51)');
const els={},spans=[{textContent:''},{textContent:''},{textContent:''}];const log=spans.map((s,i)=>({dataset:{log:String(i)},querySelector:()=>s}));
global.document={addEventListener(){},querySelector(s){if(s==='#sequencePacket')return null;return els[s]||=( {innerHTML:'',textContent:'',setAttribute(){},classList:{toggle(){}}});},querySelectorAll(s){return s==='[data-log]'?log:[];}};
window.HondiLab={portFields:()=>({source:'49152',destination:'80',note:''})};require('../assets/js/network-lab-v3.js');
const l=window.NETWORK_LESSONS.find(x=>x.port===80),state={lesson:l,steps:l.steps,i:2,progress:0.5};const before=JSON.stringify(l.steps);
window.LabV3.sequence(state);window.LabV3.current(state);
assert(els['#sequenceView'].innerHTML.includes('③ SYN'));assert(els['#movingMessage'].innerHTML.includes('③ SYN'));assert(els['#packetLabel'].textContent.startsWith('③ '));assert(spans[2].textContent.startsWith('③ '));assert.equal(JSON.stringify(l.steps),before);
// A newly inserted step uses its displayed index, never an inherited protocol-data index.
state.steps=[l.steps[0],{...l.steps[0],wire:'가상 누락'},...l.steps.slice(1)];state.i=2;window.LabV3.current(state);assert(els['#packetLabel'].textContent.startsWith('③ '));assert(spans[2].textContent.startsWith('③ '));
console.log('PASS identical circled action numbers across map label, moving message, sequence and packet log; inserted steps and original bytes preserved');

assert.equal(O.lines('③ passwd 입력: qwer1234').join(''),'③ passwd 입력: qwer1234');assert(O.lines('긴 메시지 '.repeat(30)).length<=2);assert(O.lines('긴 메시지 '.repeat(30)).at(-1).endsWith('…'));assert(els['#packetLabel'].innerHTML.includes('<tspan'));console.log('PASS two-line enlarged moving labels: short text retained, long text bounded with ellipsis');
