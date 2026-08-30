/* E.V. Fish Audio voice bridge — browser-safe setup for GitHub Pages.
   The Fish API key is entered on-device and kept only in localStorage.
   Never commit a key to GitHub. Falls back to the existing E.V. voice.
*/
(function(){
'use strict';
const KEY='ev-fish-api-key', REF='ev-fish-reference-id';
const SARAH='933563129e564b19a115bedd57b7406a';
const MODEL='s2.1-pro-free', ENDPOINT='https://api.fish.audio/v1/tts';
let token=0,active=null,original=null,hooked=false,commandWrapped=false;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const getKey=()=>localStorage.getItem(KEY)||'';
const getRef=()=>localStorage.getItem(REF)||SARAH;
const configured=()=>!!getKey();
function status(t){const e=document.getElementById('evVoiceState');if(e)e.textContent=t}
function stop(){token++;if(active){try{active.pause();active.src=''}catch(_){}active=null}}
function split(t){let s=clean(t),o=[];while(s.length>700){let c=Math.max(s.lastIndexOf('. ',700),s.lastIndexOf('! ',700),s.lastIndexOf('? ',700),s.lastIndexOf('; ',700));if(c<220)c=s.lastIndexOf(' ',700);if(c<220)c=700;o.push(s.slice(0,c+1).trim());s=s.slice(c+1).trim()}if(s)o.push(s);return o}
function direction(t){const s=String(t||'');if(/[!?]{2,}|\b(amazing|awesome|great|wow|yes)\b/i.test(s))return '[excited] '+s;if(/\b(sorry|unfortunately|sad|miss|lost)\b/i.test(s))return '[gentle] '+s;return '[calm, confident, natural] '+s}
async function makeAudio(text,myToken){
 const body={text:direction(text),reference_id:getRef(),format:'mp3'};
 const r=await fetch(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+getKey(),'Content-Type':'application/json',model:MODEL},body:JSON.stringify(body)});
 if(!r.ok)throw new Error('Fish Audio '+r.status);
 const b=await r.blob();if(myToken!==token)throw new Error('cancelled');return URL.createObjectURL(b)
}
async function speak(text){if(!configured()||!text)return false;const myToken=++token;stop();status('FISH AUDIO');try{for(const p of split(text)){if(myToken!==token)break;const u=await makeAudio(p,myToken);if(myToken!==token){URL.revokeObjectURL(u);break}await new Promise((res,rej)=>{const a=new Audio(u);active=a;a.onended=()=>{URL.revokeObjectURL(u);active=null;res()};a.onerror=()=>{URL.revokeObjectURL(u);active=null;rej(new Error('audio playback failed'))};a.play().catch(rej)})}status('ONLINE');return true}catch(e){console.warn('E.V. Fish Audio:',e);status('VOICE FALLBACK');return false}}
function configure(){
 const k=prompt('Paste your Fish Audio API key. It stays on this device and is not saved to GitHub.');
 if(k===null)return false;const key=k.trim();if(!key){localStorage.removeItem(KEY);status('FISH OFF');return false}
 localStorage.setItem(KEY,key);localStorage.setItem(REF,SARAH);status('FISH READY');
 if(typeof addRow==='function')addRow('ev','Fish Audio is configured with the Sarah voice.');
 return true
}
function clear(){localStorage.removeItem(KEY);localStorage.removeItem(REF);stop();status('VOICE FALLBACK')}
window.EVFishAudio={speak,stop,configure,clear,configured,getReferenceId:getRef,model:MODEL,endpoint:ENDPOINT,sarahReferenceId:SARAH};
function installVoiceBridge(){
 if(hooked||!window.EVReliableVoice||typeof window.EVReliableVoice.speak!=='function')return;
 original={speak:window.EVReliableVoice.speak,stop:window.EVReliableVoice.stop};
 window.EVReliableVoice.speak=function(t){if(configured())speak(t).then(ok=>{if(!ok&&original?.speak)original.speak(t)});else original.speak(t)};
 window.EVReliableVoice.stop=function(){stop();if(original?.stop)original.stop()};hooked=true
}
function handleCommand(c){
 const s=clean(c);
 if(/^(?:hey\s+)?e\.?\s*v\.?[,:\s-]*(?:set up|setup|configure)\s+fish(?:\s+audio)?\s*$/i.test(s)||/^(?:set up|setup|configure)\s+fish(?:\s+audio)?\s*$/i.test(s)){configure();return true}
 if(/^(?:hey\s+)?e\.?\s*v\.?[,:\s-]*(?:turn off|disable|remove)\s+fish(?:\s+audio)?\s*$/i.test(s)){clear();if(typeof addRow==='function')addRow('ev','Fish Audio is off. I will use the normal E.V. voice.');return true}
 return false
}
function installCommands(){
 if(commandWrapped)return;
 const form=document.getElementById('composer'),input=document.getElementById('input');if(!form||!input)return;
 form.addEventListener('submit',function(e){const text=clean(input.value);if(handleCommand(text)){e.preventDefault();e.stopImmediatePropagation();input.value='';}},true);
 commandWrapped=true
}
function init(){installVoiceBridge();installCommands();const t=setInterval(()=>{installVoiceBridge();installCommands();if(hooked&&commandWrapped)clearInterval(t)},250);setTimeout(()=>clearInterval(t),15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
