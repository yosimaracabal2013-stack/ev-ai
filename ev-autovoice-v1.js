(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');
  if(!frame)return;
  function patch(){
    try{
      const w=frame.contentWindow;if(!w||w.__evAutoVoiceV1)return;w.__evAutoVoiceV1=true;
      let active=false,restarting=false,recognition=null,lastText='',lastAt=0;
      const add=t=>{try{w.add(t)}catch(_) {}};
      const normalize=text=>String(text||'').replace(/^\s*(?:hey\s+)?(?:e\.?\s*v\.?|e\.?v|eevee|evie|if)(?:\s*[,:;\-])?\s*/i,'').trim();
      function makeRecognition(){
        const R=w.SpeechRecognition||w.webkitSpeechRecognition;
        if(!R)return null;
        const r=new R();r.lang='en-US';r.continuous=true;r.interimResults=false;r.maxAlternatives=3;
        r.onresult=async e=>{
          for(let i=e.resultIndex;i<e.results.length;i++){
            if(!e.results[i].isFinal)continue;
            const text=String(e.results[i][0]?.transcript||'').trim();
            if(!text)continue;
            const now=Date.now();if(text===lastText&&now-lastAt<2500)continue;lastText=text;lastAt=now;
            const cleaned=normalize(text);
            if(!cleaned)continue;
            const input=w.document.getElementById('input');if(input){input.value=cleaned;input.dispatchEvent(new Event('input',{bubbles:true}))}
            try{if(typeof w.sendMessage==='function')await w.sendMessage(cleaned);else w.document.getElementById('sendBtn')?.click()}catch(_){}
          }
        };
        r.onend=()=>{if(active&&!restarting){restarting=true;setTimeout(()=>{restarting=false;startListening()},350)}};
        r.onerror=e=>{if(e?.error==='not-allowed'||e?.error==='service-not-allowed'){active=false;add('Microphone permission is needed once before E.V. can keep listening.');}}
        return r;
      }
      function startListening(){
        if(!active)return false;
        if(!recognition)recognition=makeRecognition();
        if(!recognition)return false;
        try{recognition.start();w.document.getElementById('micBtn')?.classList.add('active');w.document.getElementById('hfBtn')?.classList.add('active');w.document.getElementById('micBar').style.width='100%';w.setActivity('Listening for you…')}catch(_){}
        return true;
      }
      function stopListening(){active=false;try{recognition?.stop()}catch(_){}try{w.document.getElementById('micBtn')?.classList.remove('active');w.document.getElementById('hfBtn')?.classList.remove('active');w.document.getElementById('micBar').style.width='15%'}catch(_){} }
      async function enable(){
        active=true;w.handsFree=true;w.voiceOn=true;
        const R=w.SpeechRecognition||w.webkitSpeechRecognition;
        if(!R){add('Hands-free voice is not supported by this browser.');return false}
        return startListening();
      }
      w.EVAutoVoice={enable,disable:stopListening,state:()=>active,normalize};
      const originalSend=w.sendMessage;
      if(typeof originalSend==='function')w.sendMessage=async function(text){const r=await originalSend.call(w,text);if(active)setTimeout(startListening,700);return r};
      w.document.addEventListener('visibilitychange',()=>{if(!w.document.hidden&&active)setTimeout(startListening,300)});
      // Browsers require one user activation for microphone permission. After permission is granted, E.V. keeps listening automatically.
      const activateOnce=()=>{if(!active)enable();w.document.removeEventListener('click',activateOnce);w.document.removeEventListener('touchend',activateOnce)};
      w.document.addEventListener('click',activateOnce,{passive:true});w.document.addEventListener('touchend',activateOnce,{passive:true});
    }catch(e){console.warn('auto voice attach failed',e)}
  }
  frame.addEventListener('load',patch);setTimeout(patch,300);setTimeout(patch,1200);setTimeout(patch,2500);
})();
