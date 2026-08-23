/* E.V. NATURAL NEURAL VOICE v7
   Free local Kokoro/HeadTTS voice. Uses WebGPU/WASM for synthesis and
   an AudioContext that is explicitly unlocked by an iPhone user gesture.
*/
(function(){
'use strict';
window.__EV_NEURAL_VOICE__=true;
let tts=null,loading=null,token=0,speaking=false,audioCtx=null,currentSource=null,primed=false;
const DEFAULT='af_bella';
const CDN='https://cdn.jsdelivr.net/npm/@met4citizen/headtts@1.3/';
const voices=[['af_bella','E.V. Neural — Bella'],['af_heart','E.V. Neural — Heart'],['af_nicole','E.V. Neural — Nicole'],['af_sarah','E.V. Neural — Sarah'],['af_sky','E.V. Neural — Sky'],['af_aoede','E.V. Neural — Aoede'],['af_kore','E.V. Neural — Kore'],['af_alloy','E.V. Neural — Alloy']];
function status(x){const s=document.getElementById('coreStatus');if(s)s.textContent=x;const b=document.getElementById('voiceBtn');if(b)b.classList.toggle('speaking',speaking)}
function selected(){return localStorage.getItem('ev-neural-voice')||DEFAULT}
function menu(){const s=document.getElementById('voiceSelect');if(!s)return;s.dataset.evNeural='1';s.innerHTML='';for(const [id,label] of voices){const o=document.createElement('option');o.value=id;o.textContent=label;if(id===selected())o.selected=true;s.appendChild(o)}if(!s.dataset.evBound){s.dataset.evBound='1';s.addEventListener('change',()=>{localStorage.setItem('ev-neural-voice',s.value);tts=null;loading=null})}}
function ensureAudio(){
  try{
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
    if(!primed){
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();g.gain.value=0;o.connect(g);g.connect(audioCtx.destination);const now=audioCtx.currentTime;o.start(now);o.stop(now+0.01);primed=true;
    }
    return audioCtx;
  }catch(e){console.warn('E.V. audio context unavailable',e);return null}
}
function prime(){const c=ensureAudio();if(c&&c.state==='suspended')c.resume().catch(()=>{});}
menu();
['pointerdown','touchstart','click'].forEach(ev=>document.addEventListener(ev,prime,{passive:true,capture:true}));
const vb=document.getElementById('voiceBtn');if(vb)vb.addEventListener('click',prime,{passive:true});
async function load(){
 if(tts)return tts;if(loading)return loading;
 loading=(async()=>{
  status('LOADING NEURAL VOICE…');ensureAudio();
  const mod=await import('https://cdn.jsdelivr.net/npm/@met4citizen/headtts@1.3/+esm');
  tts=new mod.HeadTTS({endpoints:['webgpu','wasm'],languages:['en-us'],voices:[selected()],workerModule:CDN+'modules/worker-tts.mjs',dictionaryURL:CDN+'dictionaries/',dtypeWebgpu:'q4f16',dtypeWasm:'q4',defaultVoice:selected(),defaultLanguage:'en-us',defaultSpeed:.90,defaultAudioEncoding:'wav',splitSentences:true,splitLength:220});
  await tts.connect();await tts.setup({voice:selected(),language:'en-us',speed:.90,audioEncoding:'wav'});status('E.V. VOICE READY');return tts;
 })();
 try{return await loading}catch(e){loading=null;tts=null;status('VOICE FALLBACK');throw e}
}
async function play(data){
 const c=ensureAudio();if(!c)throw new Error('AudioContext unavailable');
 if(c.state==='suspended')await c.resume();
 let buf=data;if(data instanceof Blob)buf=await data.arrayBuffer();else if(ArrayBuffer.isView(data))buf=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
 const decoded=await c.decodeAudioData(buf.slice?buf.slice(0):buf);
 await new Promise((resolve,reject)=>{const src=c.createBufferSource();src.buffer=decoded;src.connect(c.destination);currentSource=src;src.onended=()=>{if(currentSource===src)currentSource=null;resolve()};try{src.start(0)}catch(e){reject(e)}});
}
async function speak(text){
 if(localStorage.getItem('ev-voice-replies')==='0'||localStorage.getItem('ev-quiet-mode')==='1')return true;
 const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return true;
 const me=++token;try{if(currentSource)try{currentSource.stop()}catch(_){}currentSource=null;const engine=await load();if(me!==token)return true;speaking=true;status('GENERATING VOICE…');const messages=await engine.synthesize({input:clean});
  for(const m of messages){if(me!==token)break;if(m.type==='audio')await play(m.data)}
  if(me===token){speaking=false;status('ONLINE')}return true;
 }catch(e){console.warn('E.V. neural voice error',e);speaking=false;status('VOICE FALLBACK');if(me===token&&window.EVReliableVoice)window.EVReliableVoice.speak(clean);return false}
}
function stop(){token++;speaking=false;try{if(currentSource)currentSource.stop()}catch(_){}currentSource=null;status('ONLINE');if(window.EVReliableVoice&&window.EVReliableVoice.stop)window.EVReliableVoice.stop()}
window.EVKokoroVoice={speak,stop,load,isSpeaking:()=>speaking,setVoice:v=>{localStorage.setItem('ev-neural-voice',v);tts=null;loading=null},getVoice:selected,prime};
window.speak=speak;
})();