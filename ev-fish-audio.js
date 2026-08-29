/* E.V. Fish Audio voice bridge — browser-safe setup for GitHub Pages.
   API keys are entered by the user on-device and kept only in localStorage.
   No key is committed to GitHub. Falls back to the existing E.V. voice when
   Fish Audio is not configured or unavailable.
*/
(function(){
  'use strict';
  const KEY='ev-fish-api-key';
  const REF='ev-fish-reference-id';
  const MODEL='s2.1-pro-free';
  const ENDPOINT='https://api.fish.audio/v1/tts';
  let token=0, active=null, original=null, hooked=false;

  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const getKey=()=>localStorage.getItem(KEY)||'';
  const getRef=()=>localStorage.getItem(REF)||'';
  const configured=()=>!!getKey();
  const stop=()=>{token++;if(active){try{active.pause();active.src='';}catch(_){}active=null;} };

  function status(text){
    const el=document.getElementById('evVoiceState');
    if(el)el.textContent=text;
  }

  function split(text){
    const s=clean(text), out=[]; let rest=s;
    while(rest.length>700){
      let cut=Math.max(rest.lastIndexOf('. ',700),rest.lastIndexOf('! ',700),rest.lastIndexOf('? ',700),rest.lastIndexOf('; ',700));
      if(cut<220)cut=rest.lastIndexOf(' ',700);
      if(cut<220)cut=700;
      out.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim();
    }
    if(rest)out.push(rest);
    return out;
  }

  function direction(text){
    const s=String(text||'');
    if(/[!?]{2,}|\b(amazing|awesome|great|wow|yes)\b/i.test(s))return '[excited] '+s;
    if(/\b(sorry|unfortunately|sad|miss|lost)\b/i.test(s))return '[gentle] '+s;
    return '[calm, confident, natural] '+s;
  }

  async function makeAudio(text,myToken){
    const body={text:direction(text),format:'mp3'};
    const ref=getRef();if(ref)body.reference_id=ref;
    const res=await fetch(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+getKey(),'Content-Type':'application/json',model:MODEL},body:JSON.stringify(body)});
    if(!res.ok)throw new Error('Fish Audio '+res.status+' '+(await res.text()).slice(0,180));
    const blob=await res.blob();
    if(myToken!==token)throw new Error('cancelled');
    return URL.createObjectURL(blob);
  }

  async function speak(text){
    if(!configured()||!text)return false;
    const myToken=++token;stop();
    status('FISH AUDIO');
    try{
      const parts=split(text);
      for(const part of parts){
        if(myToken!==token)break;
        const url=await makeAudio(part,myToken);
        if(myToken!==token){URL.revokeObjectURL(url);break;}
        await new Promise((resolve,reject)=>{
          const a=new Audio(url);active=a;
          a.preload='auto';a.onended=()=>{URL.revokeObjectURL(url);active=null;resolve()};
          a.onerror=()=>{URL.revokeObjectURL(url);active=null;reject(new Error('audio playback failed'))};
          a.play().catch(reject);
        });
      }
      status('ONLINE');
      return true;
    }catch(err){
      console.warn('E.V. Fish Audio:',err);
      status('VOICE FALLBACK');
      return false;
    }
  }

  function configure(){
    const key=prompt('Paste your Fish Audio API key. It stays on this device and is not saved to GitHub.');
    if(key===null)return false;
    const trimmed=key.trim();
    if(!trimmed){localStorage.removeItem(KEY);localStorage.removeItem(REF);status('FISH OFF');return true;}
    localStorage.setItem(KEY,trimmed);
    const ref=prompt('Optional: paste a Fish Audio reference/voice ID. Leave blank to use the model default voice.');
    if(ref&&ref.trim())localStorage.setItem(REF,ref.trim());else localStorage.removeItem(REF);
    status('FISH READY');
    return true;
  }

  function clear(){localStorage.removeItem(KEY);localStorage.removeItem(REF);stop();status('VOICE FALLBACK');}

  window.EVFishAudio={
    speak,stop,configure,clear,configured,
    getReferenceId:getRef,
    model:MODEL,
    endpoint:ENDPOINT
  };

  function installVoiceBridge(){
    if(hooked)return;
    if(!window.EVReliableVoice||typeof window.EVReliableVoice.speak!=='function')return;
    original={speak:window.EVReliableVoice.speak,stop:window.EVReliableVoice.stop};
    window.EVReliableVoice.speak=function(text){
      if(configured()){
        speak(text).then(ok=>{if(!ok&&original?.speak)original.speak(text)});
      }else original.speak(text);
    };
    window.EVReliableVoice.stop=function(){stop();if(original?.stop)original.stop()};
    hooked=true;
  }

  function installCommands(){
    if(typeof window.EVSend!=='function')return false;
    const current=window.EVSend;
    if(current.__fishWrapped)return true;
    const wrapped=async function(text){
      const c=clean(text),n=c.toLowerCase();
      if(/^(?:hey\s+)?e\.?\s*v\.?,?\s*(?:set up|setup|configure)\s+fish\s+audio\b/i.test(c)||/^(?:set up|setup|configure)\s+fish\s+audio\b/i.test(c)){
        configure();
        if(typeof addRow==='function')addRow('ev',configured()?'Fish Audio is ready.':'Fish Audio setup cancelled.');
        return true;
      }
      if(/^(?:hey\s+)?e\.?\s*v\.?,?\s*(?:turn off|disable|remove)\s+fish\s+audio\b/i.test(c)||/^(?:turn off|disable|remove)\s+fish\s+audio\b/i.test(c)){
        clear();
        if(typeof addRow==='function')addRow('ev','Fish Audio is off. I\'ll use the normal E.V. voice.');
        return true;
      }
      return current.apply(this,arguments);
    };
    wrapped.__fishWrapped=true;window.EVSend=wrapped;return true;
  }

  function init(){
    installVoiceBridge();installCommands();
    const timer=setInterval(()=>{installVoiceBridge();if(installCommands()&&hooked)clearInterval(timer)},300);
    setTimeout(()=>clearInterval(timer),10000);
    window.addEventListener('pageshow',()=>{installVoiceBridge();installCommands()},{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
