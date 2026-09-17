/* E.V. Voice Router v1
   Provider-agnostic speech output.
   Browser speech is the safe local fallback; remote providers are selected
   through a backend URL so API keys do not live in the public GitHub page.
   Supported adapter names: browser, fish, elevenlabs, custom.
*/
(function(){'use strict';
 const frame=document.getElementById('evDashboard'); if(!frame)return;
 const KEY='ev-voice-provider-v1', URLKEY='ev-backend-url-v1';
 function attach(){try{const w=frame.contentWindow;if(!w||w.__evVoiceRouterV1)return;w.__evVoiceRouterV1=true;
  const state=()=>{try{return JSON.parse(w.localStorage.getItem(KEY)||'{"provider":"browser"}')}catch(_){return {provider:'browser'}}};
  const save=v=>{try{w.localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}};
  const backend=()=>String(w.localStorage.getItem(URLKEY)||'').replace(/\/$/,'');
  const oldSpeak=typeof w.speak==='function'?w.speak.bind(w):null;
  async function remote(text,provider){const base=backend();if(!base)throw new Error('E.V. backend URL is not configured');const r=await fetch(base+'/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,text,voiceId:w.localStorage.getItem('ev-voice-id-v1')||null})});if(!r.ok)throw new Error('voice backend HTTP '+r.status);const type=r.headers.get('content-type')||'';if(type.includes('audio/')){const blob=await r.blob(),url=URL.createObjectURL(blob),a=new Audio(url);await a.play();a.onended=()=>URL.revokeObjectURL(url);return true}const j=await r.json();if(j.audioUrl){const a=new Audio(j.audioUrl);await a.play();return true}throw new Error('backend returned no audio');}
  async function speak(text,opts){const t=String(text||'').trim();if(!t)return;const s=Object.assign(state(),opts||{});if(s.provider&&s.provider!=='browser'){try{return await remote(t,s.provider)}catch(e){console.warn('E.V. remote voice failed, using browser voice',e)}}if(oldSpeak)return oldSpeak(t);return false}
  w.EVVoice={state,save,setProvider:p=>{save(Object.assign(state(),{provider:String(p||'browser')}));return state()},setBackend:url=>{try{w.localStorage.setItem(URLKEY,String(url||''))}catch(_){}return backend()},getBackend:backend,speak,providers:['browser','fish','elevenlabs','custom']};
  w.EVVoice.speak=speak;
  const original=typeof w.speak==='function'?w.speak.bind(w):null;
  if(original){w.speak=async function(text){return speak(text)};w.__evLocalSpeak=original}
 }catch(e){console.warn('E.V. voice router attach failed',e)}}
 frame.addEventListener('load',()=>setTimeout(attach,300));setTimeout(attach,700);setTimeout(attach,1800);
})();
