/* E.V. Hands-Free v6 — iPhone/Safari recovery + voice-first text sending. */
(function(){
  'use strict';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let armed=false, rec=null, restarting=false, speaking=false, waiting=false;
  let watchdog=null, restartTimer=null, lastCommand='', lastAt=0;

  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase().replace(/[.,!?;:]/g,' ');
  const hasWake=s=>/\b(?:hey\s+)?(?:e\.?\s*v\.?|ev)\b/i.test(s);
  const stripWake=s=>clean(s).replace(/^(?:hey\s+)?(?:e\.?\s*v\.?|ev)\s*[,:;!?-]?\s*/i,'');
  const state=t=>{const el=document.getElementById('evVoiceState');if(el)el.textContent=t;};
  const say=t=>{try{if(typeof addRow==='function')addRow('ev',t);if(typeof window.speak==='function')window.speak(t)}catch(_) {}};

  function clearTimers(){
    clearTimeout(watchdog); clearTimeout(restartTimer);
    watchdog=restartTimer=null;
  }

  function stopRecognition(){
    clearTimeout(watchdog); watchdog=null;
    const r=rec; rec=null; restarting=false;
    if(r){
      try{r.onend=null;r.onerror=null;r.onresult=null;r.onspeechend=null;}catch(_){}
      try{r.abort();}catch(_){}
      try{r.stop();}catch(_){}
    }
  }

  function scheduleRestart(delay=700){
    clearTimeout(restartTimer);
    if(!armed || speaking || waiting || document.hidden) return;
    restartTimer=setTimeout(()=>{restartTimer=null;startRecognition();},delay);
  }

  function startRecognition(){
    if(!armed || !SR || speaking || waiting || document.hidden || rec || restarting) return;
    restarting=true; state('LISTENING');
    let r;
    try{
      r=new SR(); rec=r;
      r.lang='en-US';
      r.continuous=false;
      r.interimResults=true;
      r.maxAlternatives=3;

      let finalText='';
      let gotResult=false;
      r.onresult=e=>{
        gotResult=true;
        let interim='';
        for(let i=e.resultIndex||0;i<e.results.length;i++){
          const text=e.results[i]?.[0]?.transcript||'';
          if(e.results[i].isFinal) finalText += text+' ';
          else interim += text;
        }
        const heard=clean(finalText+' '+interim);
        if(!heard) return;
        const live=document.getElementById('input');
        if(live && !waiting) live.value=heard;

        if(clean(finalText)){
          const text=clean(finalText);
          if(!waiting){
            if(hasWake(text)){
              const command=stripWake(text);
              stopRecognition();
              if(command) dispatch(command);
              else{
                waiting=true; state('COMMAND'); say("I'm listening.");
                setTimeout(()=>{ if(armed && !speaking){waiting=false;startRecognition();} },8000);
              }
            }
          }else{
            const command=stripWake(text);
            stopRecognition(); waiting=false;
            if(command) dispatch(command); else scheduleRestart(250);
          }
        }
      };

      r.onerror=e=>{
        const code=e?.error||'';
        if(rec===r) rec=null;
        restarting=false;
        clearTimeout(watchdog); watchdog=null;
        if(code==='not-allowed'||code==='service-not-allowed'||code==='audio-capture'){
          state(code==='audio-capture'?'MIC BUSY':'MIC PERMISSION');
          if(armed) scheduleRestart(1800);
          return;
        }
        if(armed && !speaking) scheduleRestart(code==='no-speech'?450:900);
      };

      r.onend=()=>{
        if(rec===r) rec=null;
        restarting=false;
        clearTimeout(watchdog); watchdog=null;
        if(armed && !speaking && !waiting) scheduleRestart(gotResult?450:900);
      };

      r.onspeechend=()=>{
        // iOS often ends a recognition session after a short pause. Let onend
        // perform the restart rather than starting a second session here.
      };

      // Important: start() happens synchronously when possible. The previous
      // version awaited getUserMedia first, which could lose iOS user activation.
      r.start();
      restarting=false;

      watchdog=setTimeout(()=>{
        if(rec===r){
          stopRecognition();
          if(armed && !speaking) scheduleRestart(1100);
        }
      },12000);
    }catch(e){
      if(rec===r) rec=null;
      restarting=false;
      clearTimeout(watchdog); watchdog=null;
      if(armed) scheduleRestart(1200);
    }
  }

  function dispatch(command){
    const c=clean(command); if(!c)return;
    if(norm(c)===norm(lastCommand) && Date.now()-lastAt<2500)return;
    lastCommand=c; lastAt=Date.now(); state('THINKING');
    try{
      // Preserve all existing command routing first.
      if(typeof window.EVHandsFreeV5Dispatch==='function'){
        const handled=window.EVHandsFreeV5Dispatch(c);
        if(handled!==false) return;
      }
      if(typeof window.EVSend==='function'){ Promise.resolve(window.EVSend(c)).finally(()=>{if(armed&&!speaking)scheduleRestart(700);}); return; }
      const input=document.querySelector('#input,textarea,input[type=text]');
      const form=document.querySelector('#composer');
      if(input&&form){input.value=c;form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}
    }catch(e){say('I hit a problem sending that command.');}
    finally{if(armed&&!speaking)setTimeout(()=>state('LISTENING'),250);}
  }

  function installTextSend(){
    const form=document.getElementById('composer');
    const input=document.getElementById('input');
    if(!form||!input)return;
    const style=document.createElement('style');
    style.id='ev-v6-text-ui';
    style.textContent=`
      #ev-v6-text-wrap{display:flex!important;align-items:center!important;gap:8px!important;padding:8px 12px 12px!important;border-top:1px solid rgba(158,232,197,.12)!important;background:rgba(5,9,8,.92)!important;position:relative!important;z-index:20!important}
      #ev-v6-text-input{flex:1!important;min-width:0!important;height:42px!important;border-radius:22px!important;padding:0 16px!important;background:rgba(13,20,18,.95)!important;border:1px solid rgba(158,232,197,.25)!important;color:#edf8f2!important;font:13px ui-monospace,SFMono-Regular,Menlo,monospace!important;outline:none!important}
      #ev-v6-text-input:focus{border-color:rgba(158,232,197,.55)!important;box-shadow:0 0 18px rgba(158,232,197,.08)!important}
      #ev-v6-text-input::placeholder{color:#668073!important}
      #ev-v6-send{display:none!important}
      #composer{display:none!important}
    `;
    document.head.appendChild(style);
    if(document.getElementById('ev-v6-text-wrap'))return;
    const wrap=document.createElement('div');wrap.id='ev-v6-text-wrap';
    const box=document.createElement('input');box.id='ev-v6-text-input';box.type='text';box.autocomplete='off';box.autocapitalize='sentences';box.placeholder='Talk to E.V. or type a message…';
    wrap.appendChild(box);
    const anchor=document.querySelector('.frame')||document.body; anchor.appendChild(wrap);
    const send=async()=>{
      const text=clean(box.value);if(!text)return;box.value='';
      try{
        if(typeof addRow==='function')addRow('user',text);
        if(typeof window.EVSend==='function') await window.EVSend(text);
        else{
          input.value=text;
          form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        }
      }catch(_){say('I could not send that message right now.');}
    };
    box.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  }

  function hideOldControls(){
    const style=document.createElement('style');style.id='ev-v6-clean-ui';
    style.textContent=`#evCommandCenter,.controls-row,.tabs,#micBtn,#micButton,#voiceInputBtn,#recordBtn,#attachBtn,button#send,.send-btn{display:none!important}`;
    document.head.appendChild(style);
  }

  function init(){
    hideOldControls(); installTextSend();
    if(!SR){state('VOICE UNSUPPORTED');return;}
    const old=window.EVHandsFree;
    if(old?.disable)try{old.disable();}catch(_){}
    window.EVHandsFree={
      enable:()=>{armed=true;state('STARTING');startRecognition();return true;},
      disable:()=>{armed=false;waiting=false;clearTimers();stopRecognition();state('VOICE OFF');},
      restart:()=>{stopRecognition();scheduleRestart(200);},
      enabled:()=>armed,
      supported:()=>!!SR
    };

    // First real interaction arms voice. No dedicated button is required.
    const armOnce=()=>{if(!armed){armed=true;state('STARTING');startRecognition();}};
    document.addEventListener('pointerdown',armOnce,{once:true,capture:true});
    document.addEventListener('touchstart',armOnce,{once:true,capture:true,passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){stopRecognition();return;}
      if(armed&&!speaking)setTimeout(startRecognition,900);
    });

    if('speechSynthesis' in window){
      const original=window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak=u=>{
        speaking=true;stopRecognition();state('SPEAKING');
        const done=()=>{speaking=false;if(armed)setTimeout(startRecognition,1200);};
        u.addEventListener('end',done,{once:true});u.addEventListener('error',done,{once:true});
        return original(u);
      };
    }

    state('READY — TAP ONCE TO ARM');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
