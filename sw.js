/* PWA offline shell only. Never persist user inputs, messages, documents or HTTP responses. */
'use strict';
const VERSION='hondi-offline-v1-20261119';
const OFFLINE=new URL('./offline.html',self.registration.scope).href;
const SAFE=[OFFLINE,new URL('./assets/pwa/icon-192.png',self.registration.scope).href,new URL('./assets/pwa/icon-512.png',self.registration.scope).href];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SAFE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hondi-offline-')&&k!==VERSION).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode!=='navigate')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match(OFFLINE).then(response=>response||Response.error())));
});
