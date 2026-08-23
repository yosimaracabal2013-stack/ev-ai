/* E.V. LOCAL NEURAL VOICE — optional desktop enhancement.
   On iPhone/iPad Safari, keep the reliable native voice layer.
*/
(function(){
  'use strict';
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios){
    window.EVKokoroVoice={disabledOnIOS:true,speak:(t)=>window.EVReliableVoice&&window.EVReliableVoice.speak(t),stop:()=>window.EVReliableVoice&&window.EVReliableVoice.stop()};
    return;
  }
  let engine=null,loading=null,speaking=false,stopToken=0,currentAudio=null;
  const MODEL='onnx-community/Kokoro-82M-v1.0-ONNX',DEFAULT_VOICE='af_bella';
  async function load(){
    if(engine)return engine;if(loading)return loading;
    loading=(async()=>{const mod=await import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js');const T=mod.KokoroTTS;if(!T)throw new Error('KokoroTTS unavailable');engine=await T.from_pretrained(MODEL,{dtype:'q8',device:'wasm'});return engine})();
    try{return await loading}catch(e){loading=null;throw e}
  }
  async function speak(text){
    const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return true;const my=++stopToken;
    try{const tts=await load();if(my!==stopToken)return true;speaking=true;const sentences=clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean];for(const sentence of sentences){if(my!==stopToken)break;const audio=await tts.generate(sentence.trim(),{voice:localStorage.getItem('ev-kokoro-voice')||DEFAULT_VOICE,speed:.92});if(my!==stopToken)break;const url=URL.createObjectURL(audio.toBlob()),p=new Audio(url);currentAudio=p;await new Promise((res,rej)=>{p.onended=()=>{URL.revokeObjectURL(url);res()};p.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('audio playback failed'))};p.play().catch(rej)});currentAudio=null}speaking=false;return true}catch(e){speaking=false;if(window.EVReliableVoice)window.EVReliableVoice.speak(clean);return false}
  }
  function stop(){stopToken++;if(currentAudio){try{currentAudio.pause();currentAudio.src=''}catch(_){}currentAudio=null}speaking=false}
  window.EVKokoroVoice={speak,stop,load,isSpeaking:()=>speaking};
})();
