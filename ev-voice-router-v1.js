/* E.V. Voice Router v1
   Provider-agnostic speech output with explicit interruption support.
   Browser speech is the safe local fallback; provider API keys stay server-side.
*/
(function(){'use strict';
 const frame=document.getElementById('evDashboard'); if(!frame)return;
 const KEY='ev-voice-provider-v1',URLKEY='ev-backend-url-v1',TOKENKEY='ev-backend-token-v1';
 function attach(){try{const w=frame.contentWindow;if(!w||w.__evVoiceRouterV1)return;w.__evVoiceRouterV1=true;
  let activeAudio=null;
  const state=()=>{try{return JSON.parse(w.localStorage.getItem(KEY)||'{"provider":"browser"}')}catch(_){return {provider:'browser'}}};
  const save=v=>{try{w.localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}};
  const backend=()=>String(w.localStorage.getItem(URLKEY)||'').replace(/\/$/,'');
  const token=()=>String(w.localStorage.getItem(TOKENKEY)||'');
  const stop=()=>{try{w.speechSynthesis?.cancel()}catch(_){};try{if(activeAudio){activeAudio.pause();activeAudio.currentTime=0;activeAudio.src='';activeAudio=null}}catch(_){};try{w.document.querySelectorAll('audio').forEach(a=>{try{a.pause();a.currentTime=0}catch(_){}})}catch(_){};return true};
  w.addEventListener('ev:voice-stop',stop);
  const oldSpeak=typeof w.speak==='function'?w.speak.bind(w):null;
  async function remote(text,provider){const base=backend();if(!base)throw new Error('E.V. backend URL is not configured');const headers={'Content-Type':'application/json'};if(token())headers['X-EV-Token']=token();const r=await fetch(base+'/tts',{method:'POST',headers,body:JSON.stringify({provider,text,voiceId:w.localStorage.getItem('ev-voice-id-v1')||null,referenceId:w.localStorage.getItem('ev-fish-reference-id')||null})});if(!r.ok)throw new Error('voice backend HTTP '+r.status);const blob=await r.blob(),url=URL.createObjectURL(blob),a=new Audio(url);activeAudio=a;a.onended=()=>{URL.revokeObjectURL(url);if(activeAudio===a)activeAudio=null};await a.play();return true}
  async function speak(text,opts){const t=String(text||'').trim();if(!t)return;const s=Object.assign(state(),opts||{});if(s.provider&&s.provider!=='browser'){try{return await remote(t,s.provider)}catch(e){console.warn('E.V. remote voice failed, using browser voice',e)}}if(oldSpeak)return oldSpeak(t);return false}
  w.EVVoice={state,save,setProvider:p=>{save(Object.assign(state(),{provider:String(p||'browser')}));return state()},setBackend:url=>{try{w.localStorage.setItem(URLKEY,String(url||''))}catch(_){}return backend()},setToken:v=>{try{w.localStorage.setItem(TOKENKEY,String(v||''))}catch(_){}return true},getBackend:backend,speak,stop,providers:['browser','fish','elevenlabs','custom']};
  if(oldSpeak){w.speak=async function(text){return speak(text)};w.__evLocalSpeak=oldSpeak}
 }catch(e){console.warn('E.V. voice router attach failed',e)}}
 frame.addEventListener('load',()=>setTimeout(attach,300));setTimeout(attach,700);setTimeout(attach,1800);
})();
