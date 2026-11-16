const assert=require('node:assert/strict');
global.window={};require('../assets/data/network-lessons.js');
const all=window.NETWORK_LESSONS;assert.equal(all.length,121);assert.equal(all.filter(l=>l.core).length,100);assert.equal(new Set(all.map(l=>l.key)).size,121);
for(const l of all){const nodes=new Set(l.nodes.map(n=>n.id));assert(l.steps.length>=2);for(const s of l.steps){assert(nodes.has(s.f),`${l.port} source ${s.f}`);assert(nodes.has(s.to),`${l.port} destination ${s.to}`);assert(s.explain&&s.title&&s.wire);assert(Number.isInteger(s.servicePort));if(l.transport==='UDP')assert.notEqual(s.phase,'connect',`UDP ${l.port} cannot use a TCP handshake`);}assert.equal(l.check[1].length,3);assert(l.check[2]>=0&&l.check[2]<3);}
const get=p=>all.find(l=>l.port===p);assert(get(143).steps.some(s=>s.wire.includes('SELECT INBOX')));assert(!get(143).steps.some(s=>s.wire.includes('RETR')));assert(get(110).steps.some(s=>s.wire.includes('RETR')));
for(const p of [443,465,587,993,995]){const l=get(p);const application=l.steps.filter(s=>['auth','exchange'].includes(s.phase));assert(application.some(s=>s.encrypted),`${p}: protected application data`);}
const mail587=get(587).steps;assert(mail587.findIndex(s=>s.wire.includes('STARTTLS'))<mail587.findIndex(s=>s.wire.includes('ClientHello')));assert(mail587.findIndex(s=>s.wire.includes('ClientHello'))<mail587.findIndex(s=>s.wire.includes('SMTP AUTH')));
const mail465=get(465).steps;assert(mail465.findIndex(s=>s.wire.includes('ClientHello'))<mail465.findIndex(s=>s.wire.includes('220 mail')));
assert(get(514).steps.filter(s=>s.f==='s').every(s=>s.to==='s'),'UDP syslog must not fabricate a reply');
const ssh=get(22).steps;assert(ssh.findIndex(s=>s.wire.includes('NEWKEYS'))<ssh.findIndex(s=>s.phase==='auth'));
assert(get(20).steps.some(s=>s.endpoints?.server===20&&s.f==='s'));assert(get(21).steps.some(s=>s.endpoints?.server===50000));assert(get(554).steps.some(s=>s.protocol==='RTP'&&s.transport==='UDP'&&s.endpoints?.server===60000));
console.log(`PASS ${all.length} ports: valid routes, UDP/TCP separation, TLS timing, SSH authentication, IMAP/POP3, FTP/RTSP channels, syslog one-way delivery`);

for(const l of all){assert(l.profile&&l.schema.length>0,`profile/schema ${l.port}`);assert(l.securityPairs.length>=2);assert(l.securityPairs.every(r=>r.risk&&r.why&&r.prevent));for(const s of l.steps){assert(s.processing&&s.nextMeaning);assert(s.osi>=0&&s.osi<=7);if(s.f!==s.to)assert(s.fields.length>0,`fields ${l.port}`);else assert.equal(s.osi,0);}}
const rtsp=get(554).steps.filter(s=>s.protocol==='RTP');assert.equal(rtsp.length,3);assert(rtsp.every(s=>s.endpoints.client===50000));assert(get(21).steps.some(s=>s.wire.includes('195,80')));
console.log('PASS all 121 profiles: OSI, per-step fields, processing, risk/controls, active/passive FTP ports, RTSP/RTP transport');
