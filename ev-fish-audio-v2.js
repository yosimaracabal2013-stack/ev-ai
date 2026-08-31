/* E.V. Fish Audio v2 — verified-on-device Sarah bridge. */
(function(){
'use strict';
const KEY='ev-fish-api-key', REF='ev-fish-reference-id';
const SARAH='933563129e564b19a115bedd57b7406a';
const MODEL='s2.1-pro-free', ENDPOINT='https://api.fish.audio/v1/tts';
let token=0, active=null, original=null, hooked=false, commands=false, audioCtx=null, unlocked=false;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const key=()=>localStorage.getItem(KEY)||'';
const ref=()=>localStorage.getItem(REF)||SARAH;
const configured=()=>!!key();
function ui(t){const e=document.getElementById('evVoiceState');if(e)e.textContent=t;window.dispatchEvent(new CustomEvent('ev:fish-status',{detail:{status:t}}))}
function stop(){token++;if(active){try{active.pause();active.src=''}catch(_){}active=null}}
function unlock(){try{if(audioCtx){audioCtx.resume();unlocked=true;return}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();const b=audioCtx.createBuffer(1,1,audioCtx.sampleRate),s=audioCtx.createBufferSource();s.buffer=b;s.connect(audioCtx.destination);s.start(0);unlocked=true}catch(_){} }
async function make(text,my){const r=await fetch(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+key(),'Content-Type':'application/json',model:MODEL},body:JSON.stringify({text:clean(text),reference_id:ref(),format:'mp3',latency:'low'})});if(!r.ok)throw new Error('Fish Audio '+r.status);const blob=await r.blob();if(my!==token)throw new Error('cancelled');return URL.createObjectURL(blob)}
async function play(url){const a=new Audio(url);a.preload='auto';a.playsInline=true;active=a;try{await a.play();await new Promise((res,rej)=>{a.onended=res;a.onerror=()=>rej(new Error('audio playback failed'))})}catch(e){if(audioCtx){await audioCtx.resume();const ab=await fetch(url).then(r=>r.arrayBuffer());const buf=await audioCtx.decodeAudioData(ab);await new Promise((res,rej)=>{const src=audioCtx.createBufferSource();src.buffer=buf;src.connect(audioCtx.destination);src.onended=res;try{src.start()}catch(err){rej(err)}})}else throw e}active=null;URL.revokeObjectURL(url)}
async function speak(text){if(!configured()||!text)return false;const my=++token;stop();ui('FISH // SARAH');try{const u=await make(text,my);if(my!==token){URL.revokeObjectURL(u);return false}await play(u);ui('FISH ONLINE');return true}catch(e){console.warn('E.V. Fish v2:',e);ui('FISH ERROR');return false}}
async function verify(){const u=await make('E.V. voice test successful.',++token);await play(u);return true}
async function configure(){const k=prompt('Paste your Fish Audio API key. It stays on this device and is not saved to GitHub.');if(k===null)return false;const v=k.trim();if(!v){localStorage.removeItem(KEY);ui('FISH OFF');return false}localStorage.setItem(KEY,v);localStorage.setItem(REF,SARAH);unlock();ui('FISH TESTING');try{await verify();ui('FISH ONLINE');if(typeof addRow==='function')addRow('ev','Fish Audio Sarah is working. E.V. is now using the Fish voice.');return true}catch(e){localStorage.removeItem(KEY);ui('FISH ERROR');if(typeof addRow==='function')addRow('ev','Fish Audio did not pass the voice test, so I did not claim it was connected. Check the API key and try again.');return false}}
function clear(){localStorage.removeItem(KEY);localStorage.removeItem(REF);stop();ui('VOICE OFF')}
window.EVFishAudio={speak,stop,configure,clear,configured,unlock,verify,getReferenceId:ref,model:MODEL,endpoint:ENDPOINT,sarahReferenceId:SARAH};
['pointerdown','touchstart','keydown'].forEach(ev=>window.addEventListener(ev,unlock,{once:false,passive:true}));
function install(){if(hooked||!window.EVReliableVoice?.speak)return;original={speak:window.EVReliableVoice.speak,stop:window.EVReliableVoice.stop};window.EVReliableVoice.speak=function(t){if(configured())speak(t).then(ok=>{if(!ok&&original?.speak)original.speak(t)});else original.speak(t)};window.EVReliableVoice.stop=function(){stop();original?.stop?.()};hooked=true}
function cmd(t){const s=clean(t);if(/^(?:hey\s+)?e\.?\s*v\.?[,: -]*(?:set up|setup|configure)\s+fish(?:\s+audio)?$/i.test(s)){configure();return true}if(/^(?:hey\s+)?e\.?\s*v\.?[,: -]*(?:test)\s+(?:fish|sarah)(?:\s+audio)?$/i.test(s)){if(configured())verify().then(()=>addRow?.('ev','Sarah voice test complete.')).catch(()=>addRow?.('ev','Sarah voice test failed.'));else configure();return true}if(/^(?:hey\s+)?e\.?\s*v\.?[,: -]*(?:turn off|disable|remove)\s+fish(?:\s+audio)?$/i.test(s)){clear();return true}return false}
function init(){const f=document.getElementById('composer'),i=document.getElementById('input');if(f&&i&&!commands){f.addEventListener('submit',e=>{if(cmd(i.value)){e.preventDefault();e.stopImmediatePropagation();i.value=''}},true);commands=true}install();const t=setInterval(()=>{install();if(hooked&&commands)clearInterval(t)},250);setTimeout(()=>clearInterval(t),20000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();