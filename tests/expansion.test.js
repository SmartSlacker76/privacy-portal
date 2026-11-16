const assert=require('node:assert/strict');global.window={};require('../assets/data/network-lessons.js');require('../assets/data/nmap-model.js');require('../assets/data/port-registry.js');
const all=window.NETWORK_LESSONS,core=all.filter(x=>x.core),get=k=>all.find(x=>x.key===String(k));
assert.equal(core.length,100);assert.equal(new Set(core.map(x=>x.port)).size,99);assert.equal(all.filter(x=>!x.core).length,21);assert.equal(get('514-rsh').transport,'TCP');assert.equal(get(514).transport,'UDP');
const sizes={};core.forEach(x=>sizes[x.group]=(sizes[x.group]||0)+1);assert.deepEqual(Object.values(sizes).sort((a,b)=>a-b),[10,11,14,14,16,17,18]);
for(const l of all){for(const v of l.variants||[]){assert(v.steps.length>=2);for(const s of v.steps){assert((v.nodes||l.nodes).some(n=>n.id===s.f));assert((v.nodes||l.nodes).some(n=>n.id===s.to));assert(s.fields.length);assert.equal(s.transport,v.transport);if(v.transport==='UDP')assert.notEqual(s.protocol,'TCP');}}}
for(const p of [67,68])for(const s of get(p).steps){assert.equal(s.endpoints.client,68);assert.equal(s.endpoints.server,67);}
assert(get(443).variants.find(x=>x.id==='quic').steps.every(s=>s.transport==='UDP'));assert(get(853).variants.find(x=>x.id==='quic'));assert(get(9).variants.find(x=>x.id==='wol').steps.at(-1).f==='s');
const scan=(extra={})=>window.NmapModel.buildScan({type:'syn',origin:'external',policy:'restricted',scope:'top',version:false,...extra});
assert.equal(scan().rows.find(x=>x.port===22).status,'filtered');assert.equal(scan({origin:'admin'}).rows.find(x=>x.port===22).status,'open');assert.equal(scan({policy:'exposed'}).rows.find(x=>x.port===3306).status,'open');assert.equal(scan().rows.find(x=>x.port===23).status,'closed');
assert(!scan().events.some(e=>e.message.includes('TCP ACK')));assert(scan({type:'connect'}).events.some(e=>e.message.includes('TCP ACK')));
const udp=scan({type:'udp'});assert.deepEqual(udp.rows.map(x=>x.status),['open','open|filtered','closed']);assert(!udp.events.some(e=>/TCP/.test(e.message)));assert(udp.events.some(e=>e.message.includes('Type 3 Code 3')));assert(scan({version:true}).events.some(e=>e.message.includes('서비스 탐지')));assert(!scan().events.some(e=>e.message.includes('서비스 탐지')));
assert(window.PORT_REGISTRY.length>10000);assert(window.PORT_REGISTRY.some(x=>x[0]==='53'&&x[1]==='udp'&&x[2]==='domain'));
console.log('PASS 100 core + 21 supplements, all variants, DHCP endpoints, SYN/Connect/UDP scan model, exposure policy and IANA snapshot');
