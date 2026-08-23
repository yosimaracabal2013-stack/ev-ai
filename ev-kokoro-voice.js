/* E.V. local neural voice — free, no API key.
   Uses Kokoro TTS entirely in the browser. Falls back to the existing voice layer
   if the model cannot load. First use downloads the model and caches it locally.
*/
(function(){
  'use strict';
  let engine=null, loading=null, speaking=false, stopToken=0, currentAudio=null;
  const MODEL='onnx-community/Kokoro-82M-v1.0-ONNX';
  const VOICE='af_heart';

  function status(text){
    const el=document.getElementById('coreStatus'); if(el)el.textContent=text;
    const b=document.getElementById('voiceBtn'); if(b)b.classList.toggle('speaking',speaking);
  }
  function split(text){return String(text||'').replace(/\s+/g,' ').trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]}
  async function load(){
    if(engine)return engine;
    if(loading)return loading;
    loading=(async()=>{
      status('LOADING VOICE…');
      const mod=await import('https://cdn.jsdelivr.net/npm/kokoro-js/dist/kokoro.web.js');
      const KokoroTTS=mod.KokoroTTS||window.KokoroTTS;
      if(!KokoroTTS)throw new Error('KokoroTTS unavailable');
      const device=navigator.gpu?'webgpu':'wasm';
      engine=await KokoroTTS.from_pretrained(MODEL,{dtype:'q8',device});
      status('ONLINE');
      return engine;
    })().catch(e=>{loading=null;status('VOICE FALLBACK');throw e});
    return loading;
  }
  async function speak(text){
    if(localStorage.getItem('ev-voice-replies')==='0'||localStorage.getItem('ev-quiet-mode')==='1')return;
    const my=++stopToken;
    try{
      const tts=await load(); if(my!==stopToken)return;
      speaking=true;status('SPEAKING…');
      for(const sentence of split(text)){
        if(my!==stopToken)break;
        const audio=await tts.generate(sentence,{voice:VOICE,speed:0.92});
        if(my!==stopToken)break;
        currentAudio=audio;
        await audio.play();
      }
      if(my===stopToken){speaking=false;status('ONLINE')}
    }catch(e){
      console.warn('E.V. Kokoro voice unavailable; using fallback.',e);
      speaking=false;status('VOICE FALLBACK');
      if(my===stopToken && typeof window.EVReliableVoice==='object')window.EVReliableVoice.speak(text);
    }
  }
  function stop(){stopToken++;speaking=false;try{if(currentAudio&&currentAudio.pause)currentAudio.pause()}catch(_){}currentAudio=null;status('ONLINE')}
  window.EVKokoroVoice={speak,stop,load,isSpeaking:()=>speaking};
  window.speak=speak;
  window.addEventListener('pagehide',()=>{ /* audio is intentionally not cancelled */ },{passive:true});
})();
