/* E.V. wake-word listener v2: isolated recognition sessions prevent old transcript repetition. */
(function(){
'use strict';
const KEY='ev-wake-enabled';
const R=window.SpeechRecognition||window.webkitSpeechRecognition;
let armed=false, listening=false, speaking=false, recognizer=null, last='', lastAt=0;
const norm=s=>String(s||'').toLowerCase().replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim();
const strip=s=>norm(s).replace(/^(?:hey\s+)?e\s*[.]?\s*v\s*[,:;!?-]?\s*/,'').trim();
const wake=s=>/\be\s*[.]?\s*v\b/i.test(String(s||''));
function say(t){try{if(typeof addRow==='function')addRow('ev',t);if(typeof speak==='function')speak(t);}catch(_){} }
async function command(raw){const c=strip(raw),now=Date.now();if(!c)return say("I'm listening.");if(c===last&&now-lastAt<2500)return;last=c;lastAt=now;if(/^(wake|wake up|start|power on|turn on)$/.test(c))return say("I'm awake. What do you need?");if(typeof window.EVSend==='function')return window.EVSend(c);say('My main connection is still starting up.');}
function stop(){if(recognizer){try{recognizer.abort();}catch(_){}try{recognizer.stop();}catch(_){}}recognizer=null;listening=false;}
function start(){if(!armed||!R||speaking||listening||document.hidden)return;listening=true;let r;try{r=new R();recognizer=r;}catch(_){listening=false;return;}r.lang='en-US';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)t=e.results[i][0]?.transcript||'';}if(t&&wake(t)){stop();Promise.resolve(command(t)).finally(()=>{if(!speaking)setTimeout(start,700);});}};r.onerror=e=>{stop();if(e?.error==='not-allowed'){armed=false;try{localStorage.setItem(KEY,'false')}catch(_){}return;}if(armed&&!speaking)setTimeout(start,900);};r.onend=()=>{listening=false;recognizer=null;if(armed&&!speaking)setTimeout(start,500);};try{r.start()}catch(_){stop();setTimeout(start,1000);}}
function arm(){if(!R){say('Wake-word listening is not supported by this browser.');return false;}armed=true;try{localStorage.setItem(KEY,'true')}catch(_){}start();return true;}
document.addEventListener('pointerdown',()=>arm(),{once:true,capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(armed&&!speaking)setTimeout(start,400)});
if('speechSynthesis'in window){const old=window.speechSynthesis.speak.bind(window.speechSynthesis);window.speechSynthesis.speak=u=>{speaking=true;stop();u.addEventListener('end',()=>{speaking=false;if(armed)setTimeout(start,800)},{once:true});u.addEventListener('error',()=>{speaking=false;if(armed)setTimeout(start,800)},{once:true});return old(u);};}
window.EVWake={supported:()=>!!R,enabled:()=>armed,enable:arm,disable:()=>{armed=false;try{localStorage.setItem(KEY,'false')}catch(_){}stop()},restart:()=>{stop();start()}};
try{if(localStorage.getItem(KEY)==='true')armed=true}catch(_){}setTimeout(start,900);
})();
