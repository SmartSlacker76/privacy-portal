/* HONDI GanSe mascot: accessible, lightweight purposeful motion. */
(function(){
  'use strict';
  var media=window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if(media && media.matches)return;
  var visual=document.querySelector('.academy-home .ox-feature-visual');
  if(!visual)return;
  var mascot=visual.querySelector('img');
  if(!mascot)return;
  document.documentElement.classList.add('ganse-motion-ready');
  var bubble=document.createElement('span');
  bubble.className='ganse-greeting';
  bubble.setAttribute('aria-hidden','true');
  bubble.textContent='혼디 배워봅써! 👋';
  var hello=document.createElement('button');
  hello.type='button';
  hello.className='ganse-motion-button';
  hello.textContent='👋 간세에게 인사하기';
  hello.setAttribute('aria-label','간세 캐릭터에게 인사하기');
  visual.appendChild(bubble);
  visual.appendChild(hello);
  var hideId=null;
  function greet(){
    bubble.classList.add('is-visible');
    if(hideId)clearTimeout(hideId);
    hideId=setTimeout(function(){bubble.classList.remove('is-visible');},2400);
  }
  hello.addEventListener('click',greet);
  var finePointer=window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(finePointer){
    visual.addEventListener('pointermove',function(event){
      if(event.target.closest('.ganse-motion-button'))return;
      var rect=visual.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      var x=((event.clientX-rect.left)/rect.width-.5)*2;
      var y=((event.clientY-rect.top)/rect.height-.5)*2;
      x=Math.max(-1,Math.min(1,x));y=Math.max(-1,Math.min(1,y));
      visual.style.setProperty('--ganse-tilt-x',(y*-2.8).toFixed(1)+'deg');
      visual.style.setProperty('--ganse-tilt-y',(x*3.8).toFixed(1)+'deg');
      visual.style.setProperty('--ganse-shift-x',(x*4).toFixed(1)+'px');
    },{passive:true});
    visual.addEventListener('pointerleave',function(){
      visual.style.removeProperty('--ganse-tilt-x');
      visual.style.removeProperty('--ganse-tilt-y');
      visual.style.removeProperty('--ganse-shift-x');
    },{passive:true});
  }
  if(!('IntersectionObserver' in window))return;
  var selectors=['.gd-editorial-intro','.nist-resource-hub','.assistant-section','#learning','.challenge-banner'];
  var targets=selectors.map(function(sel){return document.querySelector(sel)}).filter(Boolean);
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('ganse-entered');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.04,rootMargin:'0px 0px 20px 0px'});
  targets.forEach(function(target){
    target.classList.add('ganse-observed');
    observer.observe(target);
  });
})();
