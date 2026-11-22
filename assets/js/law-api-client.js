/* Shared public law API client for law search and 상담 챗봇.
 * Reuses APP_CONFIG.WORKER_URL, never exposes the law.go.kr OC secret.
 * An empty URL explicitly means that live DRF verification is unavailable.
 */
(function(){
  'use strict';
  function origin(){
    var value=String((window.APP_CONFIG||{}).WORKER_URL||'').trim();
    if(!value)return '';
    try{
      var u=new URL(value);
      if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/' || u.port)return '';
      return u.origin;
    }catch(e){return ''}
  }
  function input(x){
    if(!x||!['법령','행정규칙'].includes(x.kind||'법령'))return null;
    var name=String(x.name||'').trim(),jo=Number(x.jo),branch=Number(x.branch||0);
    if(!/^[가-힣a-z0-9 ().·ㆍ,_-]{1,100}$/i.test(name)||!Number.isInteger(jo)||jo<1||jo>9999||!Number.isInteger(branch)||branch<0||branch>9999)return null;
    return {kind:x.kind||'법령',name:name,jo:jo,branch:branch};
  }
  function link(x){
    var v=input(x);if(!v)return 'https://www.law.go.kr/';
    var type=v.kind==='행정규칙'?'행정규칙':'법령';
    return 'https://www.law.go.kr/'+type+'/'+encodeURIComponent(v.name.replace(/\s+/g,''))+'/제'+v.jo+'조'+(v.branch?'의'+v.branch:'');
  }
  async function health(){
    if(!origin())return {ok:false,law:false,reason:'not-configured'};
    try{
      var response=await fetch(origin()+'/health',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(6500)});
      if(!response.ok)throw Error('status');
      var result=await response.json();
      return {ok:!!result.ok,law:result.law===true};
    }catch(e){return {ok:false,law:false,reason:'network-error'}}
  }
  async function article(params){
    var v=input(params);if(!v)throw Error('invalid-input');
    var base=origin();if(!base)throw Error('not-configured');
    var controller=new AbortController();
    var timer=setTimeout(function(){controller.abort()},9500);
    try{
      var response=await fetch(base+'/law?'+new URLSearchParams(v),{credentials:'omit',cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('worker-status-'+response.status);
      var data=await response.json();
      var content=String(data&&data.content||'').trim();
      if(!data||data.ok!==true||content.length<12||/찾지 못했습니다|조회가 제한|원문 링크로 확인/.test(content))throw Error('unverified');
      return {ok:true,kind:v.kind,name:v.name,article:String(data.article||''),content:content,source:String(data.source||'법제처 국가법령정보 공동활용 API'),url:link(v)};
    }finally{clearTimeout(timer)}
  }
  /* 원문 대신 Worker가 3줄로 요약·검증한 결과만 받습니다(원문 텍스트는 응답에 없음) */
  async function summary(params){
    var v=input(params);if(!v)throw Error('invalid-input');
    var hang=Number(params.hang||0);if(!Number.isInteger(hang)||hang<0||hang>20)hang=0;
    var base=origin();if(!base)throw Error('not-configured');
    var controller=new AbortController();
    var timer=setTimeout(function(){controller.abort()},15000);
    try{
      var response=await fetch(base+'/law-summary?'+new URLSearchParams({kind:v.kind,name:v.name,jo:v.jo,branch:v.branch,hang:hang}),{credentials:'omit',cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('worker-status-'+response.status);
      var data=await response.json();
      var lines=Array.isArray(data&&data.summary)?data.summary.map(String).filter(Boolean).slice(0,3):[];
      if(!data||data.ok!==true||!lines.length)throw Error('unverified');
      return {ok:true,cite:String(data.cite||''),article:String(data.article||''),summary:lines,source:String(data.source||''),url:link(v)};
    }finally{clearTimeout(timer)}
  }
  window.HondiLawAPI=Object.freeze({origin:origin,enabled:function(){return !!origin()},health:health,article:article,summary:summary,link:link});
})();
