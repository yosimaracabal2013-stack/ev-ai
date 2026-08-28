/* E.V. Hands-Free v4 — Safari/iOS resilient wake-word listener + voice command routing. */
(function(){'use strict';
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let armed=false,rec=null,speaking=false,waiting=false,restarting=false,last='',lastAt=0,watch=null,prime=null;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).toLowerCase().replace(/[.,!?;:]/g,' ');
const hasWake=s=>/\b(?:hey\s+)?e\.?\s*v\.?\b/i.test(s);
const strip=s=>clean(s).replace(/^(?:hey\s+)?e\.?\s*v\.?\s*[,:;!?-]?\s*/i,'');
function state(t){const x=document.getElementById('evVoiceState');if(x){x.textContent=t;x.className=(t==='LISTENING'||t==='COMMAND')?'listening':''}}
function say(t){try{if(typeof addRow==='function')addRow('ev',t);if(typeof window.speak==='function')window.speak(t)}catch(_){} }
function stop(){clearTimeout(watch);if(rec){try{rec.onend=null;rec.onerror=null;rec.onresult=null;rec.abort()}catch(_){}try{rec.stop()}catch(_){}}rec=null;restarting=false}
async function prime(){if(!navigator.mediaDevices?.getUserMedia)return;try{prime=await navigator.mediaDevices.getUserMedia({audio:true});prime.getTracks().forEach(t=>t.stop());prime=null}catch(_){} }
function start(){if(!armed||!SR||speaking||document.hidden||rec||restarting)return;restarting=true;state(waiting?'COMMAND':'LISTENING');try{const r=new SR();rec=r;r.lang='en-US';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>{const t=[...e.results].map(x=>x[0]?.transcript||'').join(' ').trim();if(!t)return;const w=t.match(/(?:hey\s+)?e\.?\s*v\.?/i);if(!waiting){if(!w){stop();if(armed)setTimeout(start,250);return}const rest=strip(t);stop();if(rest)dispatch(rest);else{waiting=true;state('COMMAND');say("I'm listening.");setTimeout(()=>{if(armed&&!speaking){waiting=false;start()}},8000)}}else{stop();waiting=false;dispatch(strip(t))}};r.onerror=e=>{stop();if(e?.error==='not-allowed'||e?.error==='service-not-allowed'){armed=false;state('MIC PERMISSION');return}if(armed&&!speaking)setTimeout(start,1200)};r.onend=()=>{if(rec===r)rec=null;restarting=false;if(armed&&!speaking&&!waiting)setTimeout(start,650)};r.start();restarting=false;watch=setTimeout(()=>{if(rec){stop();if(armed&&!speaking)setTimeout(start,900)}},10000)}catch(_){stop();if(armed)setTimeout(start,1200)}}
async function enable(){if(!SR){state('VOICE UNSUPPORTED');say('Safari did not provide speech recognition on this page.');return false}armed=true;state('STARTING VOICE');await prime();start();return true}
function videoPause(){if(rec){stop();if(armed&&!speaking)setTimeout(start,4500)}}
document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement)videoPause()},true);
document.addEventListener('pause',e=>{if(e.target instanceof HTMLMediaElement)videoPause()},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(armed&&!speaking)setTimeout(start,900)});
if('speechSynthesis' in window){const old=window.speechSynthesis.speak.bind(window.speechSynthesis);window.speechSynthesis.speak=u=>{speaking=true;stop();state('SPEAKING');const done=()=>{speaking=false;if(armed)setTimeout(start,900)};u.addEventListener('end',done,{once:true});u.addEventListener('error',done,{once:true});return old(u)}}
async function dispatch(c){c=clean(c);if(!c)return;if(norm(c)===norm(last)&&Date.now()-lastAt<2500)return;last=c;lastAt=Date.now();state('THINKING');const s=c.toLowerCase();try{
 if(/^start\s+(?:study|studying)|^(?:study|learn|research)\b/.test(s)){const m=s.match(/for\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);let mins=m?Number(m[1]):30;if(m&&/hour|hr/i.test(m[2]))mins*=60;const topic=c.replace(/^(?:start\s+)?(?:study|studying|learn|research)\s*/i,'').replace(/\s+for\s+\d+\s*(?:minutes?|mins?|hours?|hrs?).*$/i,'').trim()||'the requested topic';if(window.EVNext?.study){window.EVNext.study(topic,mins);return}}
 if(/^(?:design|make|create)\b/i.test(c)&&window.EVNext?.design){window.EVNext.design(c.replace(/^(?:design|make|create)\s+/i,''));return}
 if(/^(?:open|start|activate)\s+vision$|^(?:show|let me see)\s+(?:what you see|my camera|the camera)$/i.test(c)&&window.EVNext?.vision){window.EVNext.vision();return}
 if(/^(?:show|bring up|open|play|find|look up|display)\s+(?:some\s+)?(?:youtube\s+)?videos?\s+(?:about|of|for)\s+(.+)/i.test(c)&&window.EVVideo?.search){window.EVVideo.search(c.match(/(?:about|of|for)\s+(.+)/i)[1]);return}
 if(/^show\s+(?:me\s+)?(?:this\s+)?video\s+(https?:\/\/\S+)/i.test(c)&&window.EVVideo?.show){window.EVVideo.show(c.match(/https?:\/\/\S+/i)[0]);return}
 if(/^(?:bring up|show|open|display)\s+(?:spider\s*-?\s*man|spiderman)/i.test(c)&&window.EVVisual?.open){window.EVVisual.open('spider');say('Opening the Spider-Man visual feed.');return}
 if(/^(?:bring up|show|open|display)\s+(?:iron\s*man|tony stark)/i.test(c)&&window.EVVisual?.open){window.EVVisual.open('iron');say('Opening the Iron Man visual feed.');return}
 if(typeof window.EVSend==='function'){await window.EVSend(c);return}
 const input=document.querySelector('#input,textarea,input[type=text]'),form=document.querySelector('#composer');if(input&&form){input.value=c;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return}say('I heard you, but my main command connection is not ready.');
 }catch(e){say('I hit a problem running that command.');}finally{state(armed?'LISTENING':'VOICE OFF');if(armed&&!speaking&&!rec&&!waiting)setTimeout(start,900)}}
function init(){const old=window.EVHandsFree;if(old?.disable)try{old.disable()}catch(_){}let x=document.getElementById('evVoiceState');if(!x){x=document.createElement('div');x.id='evVoiceState';x.textContent='VOICE OFF';document.body.appendChild(x)}let st=document.getElementById('evHandsFree');if(st)st.style.display='none';document.querySelectorAll('#evCommandCenter button').forEach(b=>b.style.display='none');window.EVHandsFree={enable,disable:()=>{armed=false;waiting=false;stop();state('VOICE OFF')},enabled:()=>armed,restart:()=>{stop();start()},supported:()=>!!SR};document.addEventListener('pointerdown',()=>{if(!armed)enable()},{once:true,capture:true});state('VOICE OFF')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
