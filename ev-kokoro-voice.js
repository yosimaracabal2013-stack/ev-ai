/* E.V. LOCAL NEURAL VOICE — Kokoro TTS
   Kokoro is attempted only where browser audio playback is supported reliably.
   iPhone/iPad Safari currently has known Kokoro.js playback/generation issues,
   so E.V. uses her reliable Web Speech voice there instead of becoming silent.
*/
(function(){
  'use strict';
  let engine=null, loading=null, speaking=false, stopToken=0, currentAudio=null;
  const MODEL='onnx-community/Kokoro-82M-v1.0-ONNX';
  const DEFAULT_VOICE='af_bella';
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);

  function status(text){
    const el=document.getElementById('coreStatus'); if(el)el.textContent=text;
    const b=document.getElementById('voiceBtn'); if(b)b.classList.toggle('speaking',speaking);
  }
  function selectedVoice(){return localStorage.getItem('ev-kokoro-voice')||DEFAULT_VOICE;}
  function setupVoiceMenu(){
    const sel=document.getElementById('voiceSelect');
    if(!sel)return;
    sel.innerHTML='';
    const voices=isIOS?[
      ['ios_auto','E.V. — iPhone voice (recommended)']
    ]:[
      ['af_bella','E.V. Neural — Bella'],['af_heart','E.V. Neural — Heart'],['af_nicole','E.V. Neural — Nicole'],['af_sarah','E.V. Neural — Sarah'],['af_sky','E.V. Neural — Sky'],['af_kore','E.V. Neural — Kore'],['af_alloy','E.V. Neural — Alloy'],['af_aoede','E.V. Neural — Aoede']
    ];
    for(const [id,label] of voices){
      const o=document.createElement('option');o.value=id;o.textContent=label;if(id===selectedVoice()||isIOS)o.selected=true;sel.appendChild(o);
    }
    sel.addEventListener('change',()=>localStorage.setItem('ev-kokoro-voice',sel.value));
  }
  setupVoiceMenu();

  async function load(){
    if(isIOS)throw new Error('Kokoro.js is not reliable on iOS Safari');
    if(engine)return engine;
    if(loading)return loading;
    loading=(async()=>{
      status('LOADING E.V. VOICE…');
      const mod=await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js');
      const KokoroTTS=mod.KokoroTTS;
      if(!KokoroTTS)throw new Error('KokoroTTS unavailable');
      engine=await KokoroTTS.from_pretrained(MODEL,{dtype:'q8',device:'wasm'});
      status('E.V. VOICE READY');
      return engine;
    })();
    try{return await loading;}catch(e){loading=null;status('VOICE FALLBACK');throw e;}
  }

  async function speak(text){
    if(localStorage.getItem('ev-voice-replies')==='0'||localStorage.getItem('ev-quiet-mode')==='1')return true;
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean)return true;
    const my=++stopToken;
    if(isIOS){
      status('SPEAKING…');
      if(window.EVReliableVoice&&typeof window.EVReliableVoice.speak==='function'){
        window.EVReliableVoice.speak(clean);return true;
      }
      return false;
    }
    try{
      const tts=await load(); if(my!==stopToken)return true;
      speaking=true;status('GENERATING VOICE…');
      const sentences=clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean];
      for(const sentence of sentences){
        if(my!==stopToken)break;
        const audio=await tts.generate(sentence.trim(),{voice:selectedVoice(),speed:0.92});
        if(my!==stopToken)break;
        const blob=audio.toBlob();const url=URL.createObjectURL(blob);const player=new Audio(url);
        currentAudio=player;player.preload='auto';player.volume=1;status('SPEAKING…');
        await new Promise((resolve,reject)=>{player.onended=()=>{URL.revokeObjectURL(url);resolve()};player.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('audio playback failed'))};player.play().catch(reject)});
        if(currentAudio===player)currentAudio=null;
      }
      if(my===stopToken){speaking=false;status('ONLINE')};return true;
    }catch(e){
      console.warn('E.V. Kokoro unavailable; using existing voice fallback.',e);speaking=false;status('VOICE FALLBACK');
      if(my===stopToken&&window.EVReliableVoice&&typeof window.EVReliableVoice.speak==='function')window.EVReliableVoice.speak(clean);
      return false;
    }
  }
  function stop(){stopToken++;speaking=false;try{if(currentAudio){currentAudio.pause();currentAudio.src=''}}catch(_){}currentAudio=null;status('ONLINE');if(window.EVReliableVoice&&window.EVReliableVoice.stop)window.EVReliableVoice.stop()}
  window.EVKokoroVoice={speak,stop,load,isSpeaking:()=>speaking,setVoice:v=>localStorage.setItem('ev-kokoro-voice',v),getVoice:selectedVoice};
  window.speak=speak;
  window.addEventListener('pagehide',()=>{}, {passive:true});
})();
