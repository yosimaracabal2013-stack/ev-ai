(function(){
'use strict';
const frame=document.getElementById('evDashboard');if(!frame)return;
function patch(){try{const w=frame.contentWindow;if(!w||w.__evVoiceDefaultV1)return;w.__evVoiceDefaultV1=true;
  const fishSpeak=w.speak;
  w.EVFishVoice=fishSpeak;
  function localSpeak(text){
    try{w.speechSynthesis?.cancel();const u=new w.SpeechSynthesisUtterance(String(text||''));u.lang='en-US';u.rate=.98;u.pitch=1.04;const voices=w.speechSynthesis?.getVoices?.()||[];const v=voices.find(x=>/en-US|en_US/i.test(x.lang)&&/Samantha|Karen|Ava|Female|Zoe/i.test(x.name));if(v)u.voice=v;u.onstart=()=>{const e=w.document.getElementById('voiceState');if(e)e.textContent='LOCAL VOICE'};u.onend=()=>{const e=w.document.getElementById('voiceState');if(e)e.textContent='READY'};w.speechSynthesis?.speak(u);return true}catch(_){return false}
  }
  w.speak=localSpeak;
  w.useFishVoice=async function(on=true){if(on&&typeof w.EVFishVoice==='function'){w.speak=w.EVFishVoice;return true}w.speak=localSpeak;return false};
  w.useLocalVoice=()=>{w.speak=localSpeak;return true};
}catch(e){console.warn('voice default patch failed',e)}}
frame.addEventListener('load',patch);setTimeout(patch,1200);setTimeout(patch,2500);setTimeout(patch,4000);
})();
