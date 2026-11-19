/* HONDI PWA install helper. No analytics, no user data storage. */
(function(){
  'use strict';
  const manifest=document.querySelector('link[rel="manifest"]');
  if(!manifest){const link=document.createElement('link');link.rel='manifest';link.href='manifest.webmanifest';document.head.appendChild(link);}
  if(!document.querySelector('meta[name="theme-color"]')){const m=document.createElement('meta');m.name='theme-color';m.content='#0b0c0b';document.head.appendChild(m);}
  if('serviceWorker' in navigator && location.protocol==='https:'){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
  }
  let deferred=null;
  const button=document.getElementById('pwaInstallButton');
  const status=document.getElementById('pwaInstallStatus');
  function message(t){if(status)status.textContent=t;}
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();deferred=event;
    if(button)button.hidden=false;
    message('설치할 준비가 되었습니다. 아래 버튼을 선택하세요.');
  });
  window.addEventListener('appinstalled',()=>{
    deferred=null;if(button)button.hidden=true;
    message('앱이 설치되었습니다. 기기의 앱 목록에서 실행할 수 있습니다.');
  });
  if(button){
    button.addEventListener('click',async()=>{
      if(!deferred){message('현재 브라우저의 공유 또는 메뉴에서 “홈 화면에 추가” 또는 “앱 설치”를 선택해 주세요.');return;}
      const prompt=deferred;deferred=null;
      try{await prompt.prompt();const result=await prompt.userChoice;message(result.outcome==='accepted'?'설치가 시작되었습니다.':'설치를 취소했습니다. 브라우저 메뉴에서도 설치할 수 있습니다.');}
      catch(e){message('설치 기능을 사용할 수 없습니다. 브라우저 메뉴에서 설치해 주세요.');}
    });
  }
  const installed=window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if(installed){if(button)button.hidden=true;message('이미 앱 형태로 실행 중입니다.');}
  else if(!deferred && status){message('Android Chrome·Samsung Internet: 메뉴 → 앱 설치 / iPhone Safari: 공유 → 홈 화면에 추가 / PC Chrome·Edge: 주소창의 설치 아이콘');}
})();
