const assert=require('node:assert/strict');
global.window={};require('../assets/data/network-lessons.js');require('../assets/data/security-evidence.js');require('../assets/data/cve-index.js');
const d=window.SECURITY_EVIDENCE;assert.equal(d.cases.length,6);assert.equal(new Set(d.cases.map(x=>x.id)).size,6);
for(const c of d.cases){assert(c.portEvidence&&c.mapping&&c.prevention);assert(c.sources.length);assert(c.flow.length>=3);for(const [_,u]of c.sources)assert.equal(new URL(u).protocol,'https:');for(const id of c.cves){assert.match(id,/^CVE-\d{4}-\d{4,}$/);assert.equal(window.CVE_INDEX[id].state,'PUBLISHED');}for(const t of c.attack){assert.match(t,/^T\d{4}(\.\d{3})?$/);assert(d.techniques[t]);}}
for(const l of window.NETWORK_LESSONS)for(const id of JSON.stringify(l.entry).match(/CVE-\d{4}-\d{4,}/g)||[])assert(window.CVE_INDEX[id],id);
const fs=require('node:fs');const html=fs.readFileSync(__dirname+'/../port-lookup.html','utf8');for(const p of ['assets/data/security-evidence.js','assets/data/cve-index.js','assets/js/security-evidence.js','assets/css/security-evidence.css']){assert(html.includes(p));assert(fs.existsSync(__dirname+'/../'+p));}assert(html.indexOf('assets/js/security-evidence.js')<html.indexOf('assets/js/network-lab.js'));
console.log('PASS 6 evidence cards: sources, port caveats, CVE records, ATT&CK identifiers and asset loading');
