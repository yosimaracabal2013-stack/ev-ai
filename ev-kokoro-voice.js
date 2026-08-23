/* E.V. NATURAL NEURAL VOICE v5
   HeadTTS/Kokoro runs locally in-browser: no API key or paid service.
   Uses WebGPU when available and WASM fallback for iPhone Safari.
   Tuned for calm, warm, precise cinematic delivery; does not clone a real actor.
*/
(function(){
'use strict';
let tts=null,loading=null,token=0,playing=null,speaking=false;
const DEFAULT='af_bella',CDN='https://cdn.jsdelivr.net/npm/@met4citizen/headtts@1.3/';
const voices=[['af_bella','E.V. Neural — Bella'],['af_heart','E.V. Neural — Heart'],['af_nicole','E.V. Neural — Nicole'],['af_sarah','E.V. Neural — Sarah'],['af_sky','E.V. Neural — Sky'],['af_aoede','E.V. Neural — Aoede'],['af_kore','E.V. Neural — Kore'],['af_alloy','E.V. Neural — Alloy']];
function status(x){const s=document.getElementById('coreStatus');if(s)s.textContent=x;const b=document.getElementById('voiceBtn');if(b)b.classList.toggle('speaking',speaking)}
function selected(){return localStorage.getItem('ev-neural-voice')||DEFAULT}
function menu(){const s=document.getElementById('voiceSelect');if(!s)return;s.innerHTML='';for(const [id,label] of voices){const o=document.createElement('option');o.value=id;o.textContent=label;if(id===selected())o.selected=true;s.appendChild(o)}s.addEventListener('change',()=>{localStorage.setItem('ev-neural-voice',s.value);tts=null;loading=null})}
menu();
async function load(){if(tts)return tts;if(loading)return loading;loading=(async()=>{status('LOADING NEURAL VOICE…');const mod=await import('https://cdn.jsdelivr.net/npm/@met4citizen/headtts@1.3/+esm');tts=new mod.HeadTTS({endpoints:['webgpu','wasm'],languages:['en-us'],voices:[selected()],workerModule:CDN+'modules/worker-tts.mjs',dictionaryURL:CDN+'dictionaries/',dtypeWebgpu:'q4f16',dtypeWasm:'q4',defaultVoice:selected(),defaultLanguage:'en-us',defaultSpeed:.92,defaultAudioEncoding:'wav',splitSentences:true,splitLength:260});await tts.connect();tts.setup({voice:selected(),language:'en-us',speed:.92,audioEncoding:'wav'});status('E.V. VOICE READY');return tts})();try{return await loading}catch(e){loading=null;tts=null;status('VOICE FALLBACK');throw e}}
function play(data){return new Promise((resolve,reject)=>{try{const blob=data instanceof Blob?data:new Blob([data],{type:'audio/wav'}),url=URL.createObjectURL(blob),a=new Audio(url);playing=a;a.preload='auto';a.volume=1;a.onended=()=>{URL.revokeObjectURL(url);if(playing===a)playing=null;resolve()};a.onerror=()=>{URL.revokeObjectURL(url);if(playing===a)playing=null;reject(new Error('audio playback failed'))};const p=a.play();if(p)p.catch(reject)}catch(e){reject(e)}})}
async function speak(text){if(localStorage.getItem('ev-voice-replies')==='0'||localStorage.getItem('ev-quiet-mode')==='1')return true;const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return true;const me=++token;try{if(playing){playing.pause();playing=null}}catch(_){}try{const engine=await load();if(me!==token)return true;speaking=true;status('GENERATING VOICE…');const messages=await engine.synthesize({input:clean});for(const m of messages){if(me!==token)break;if(m.type==='audio')await play(m.data)}if(me===token){speaking=false;status('ONLINE')}return true}catch(e){console.warn('E.V. neural voice fallback',e);speaking=false;status('VOICE FALLBACK');if(me===token&&window.EVReliableVoice)window.EVReliableVoice.speak(clean);return false}}
function stop(){token++;speaking=false;try{if(playing){playing.pause();playing.src=''}}catch(_){}playing=null;status('ONLINE');if(window.EVReliableVoice&&window.EVReliableVoice.stop)window.EVReliableVoice.stop()}
window.EVKokoroVoice={speak,stop,load,isSpeaking:()=>speaking,setVoice:v=>{localStorage.setItem('ev-neural-voice',v);tts=null;loading=null},getVoice:selected};window.speak=speak;
})();
