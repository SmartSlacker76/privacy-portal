/* One presentation-only order for maps, sequences and packet logs; protocol bytes are unchanged. */
(()=>{'use strict';
function mark(n){if(!Number.isInteger(n)||n<1)return '';if(n<=20)return String.fromCodePoint(0x2460+n-1);if(n<=35)return String.fromCodePoint(0x3251+n-21);if(n<=50)return String.fromCodePoint(0x32B1+n-36);return '('+n+')';}
function text(index,value){return mark(index+1)+' '+String(value??'');}
function lines(value,limit=34,maxLines=2){const input=String(value??'').split('\n')[0];const result=[];let line='',units=0;for(const ch of input){const width=ch.codePointAt(0)>255?2:1;if(units+width>limit&&line){result.push(line);line='';units=0;if(result.length===maxLines){result[maxLines-1]=result[maxLines-1].replace(/.$/u,'…');return result;}}line+=ch;units+=width;}if(line)result.push(line);return result;}
window.StepOrder={mark,text,lines};
})();
