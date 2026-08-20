/* E.V. wake-word listener — additive only; does not alter the existing interface. */
(function(){
  'use strict';

  const KEY='ev-wake-enabled';
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null;
  let running=false;
  let armed=false;
  let restarting=false;
  let speaking=false;
  let lastCommand='';
  let lastCommandAt=0;

  function add(role,text){
    try{ if(typeof addRow==='function') addRow(role,text); }catch(_){}
  }
  function say(text){
    add('ev',text);
    try{ if(typeof speak==='function') speak(text); }catch(_){}
  }
  function normalize(s){
    return String(s||'')
      .toLowerCase()
      .replace(/[’‘]/g,"'")
      .replace(/[.,!?;:]/g,' ')
      .replace(/\be\s*[.]?\s*v\s*[.]?\b/g,' ev ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function stripWake(s){
    return normalize(s).replace(/^(?:hey\s+)?e\s*v(?:\s+please)?(?:\s*[-,:])?\s*/i,'').trim();
  }
  function canRecognize(){ return !!Recognition; }

  async function handleWake(text){
    const command=stripWake(text);
    const now=Date.now();
    if(command && command===lastCommand && now-lastCommandAt<1800) return;
    lastCommand=command; lastCommandAt=now;

    if(!command){
      say("I'm listening.");
      return;
    }
    if(/^(?:wake|wake up|start|power on|turn on)$/.test(command)){
      say("I'm awake. What do you need?");
      return;
    }

    if(/^(?:(?:what(?:'s| is)\s+)?(?:on )?the agenda|what(?:'s| is) on my agenda)\??$/.test(command)){
      try{
        if(typeof window.EVSend==='function') await window.EVSend("What's on my agenda?");
        else say('I can answer that once my main connection is ready.');
      }catch(_){ say('I could not reach my agenda right now.'); }
      return;
    }

    if(/^(?:what(?:'s| is)\s+)?(?:the )?weather(?: like)?(?: today| right now)?\??$/.test(command)){
      try{
        if(window.EVFeatures&&typeof window.EVFeatures.weather==='function'){
          const w=await window.EVFeatures.weather(new Date());
          say(`Right now it is about ${Math.round(w.temp)}°F, ${w.desc}, with a ${w.rain}% chance of rain.`);
        }else if(typeof window.EVSend==='function') await window.EVSend("What's the weather right now?");
      }catch(_){
        if(typeof window.EVSend==='function') await window.EVSend("What's the weather right now?");
        else say('I need location permission to check the weather.');
      }
      return;
    }

    if(typeof window.EVSend==='function'){
      await window.EVSend(command);
    }else{
      say('My main connection is still starting up.');
    }
  }

  function stopRecognition(){
    if(!recognition) return;
    try{ recognition.stop(); }catch(_){}
    running=false;
  }

  function startRecognition(){
    if(!armed||!Recognition||speaking||running||restarting) return;
    if(document.visibilityState==='hidden') return;
    restarting=true;
    try{ recognition=new Recognition(); }
    catch(_){ restarting=false; return; }

    recognition.lang='en-US';
    recognition.continuous=true;
    recognition.interimResults=true;
    recognition.maxAlternatives=3;

    recognition.onstart=function(){ running=true; restarting=false; };
    recognition.onresult=function(event){
      let finalText='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const r=event.results[i];
        const t=r&&r[0]&&r[0].transcript||'';
        if(r.isFinal) finalText+=(finalText?' ':'')+t;
      }
      if(finalText && /\be\s*[.]?\s*v\s*[.]?\b/i.test(finalText)){
        stopRecognition();
        handleWake(finalText).finally(()=>{
          setTimeout(startRecognition,450);
        });
      }
    };
    recognition.onerror=function(e){
      running=false; restarting=false;
      if(e&&e.error==='not-allowed'){
        armed=false;
        try{localStorage.setItem(KEY,'false');}catch(_){}
      }
    };
    recognition.onend=function(){
      running=false; restarting=false;
      if(armed&&!speaking&&!document.hidden) setTimeout(startRecognition,650);
    };
    try{ recognition.start(); }
    catch(_){ running=false; restarting=false; setTimeout(startRecognition,1000); }
  }

  function arm(){
    if(!Recognition){
      say('Wake-word listening is not supported by this browser.');
      return false;
    }
    armed=true;
    try{localStorage.setItem(KEY,'true');}catch(_){}
    startRecognition();
    return true;
  }

  function autoArm(){
    let saved=false;
    try{saved=localStorage.getItem(KEY)==='true';}catch(_){}
    if(saved && Recognition){
      armed=true;
      startRecognition();
    }
  }

  // iPhone Safari requires a user gesture before microphone use.
  // The first tap/click anywhere on E.V. arms the listener without adding UI.
  document.addEventListener('pointerdown',function(){arm();},{once:true,capture:true});
  document.addEventListener('click',function(){arm();},{once:true,capture:true});

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'&&armed&&!speaking) setTimeout(startRecognition,350);
    if(document.visibilityState==='hidden') stopRecognition();
  });

  if('speechSynthesis' in window){
    const oldSpeak=window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak=function(utterance){
      speaking=true;
      stopRecognition();
      utterance.addEventListener('end',function(){speaking=false;setTimeout(startRecognition,500);},{once:true});
      utterance.addEventListener('error',function(){speaking=false;setTimeout(startRecognition,500);},{once:true});
      return oldSpeak(utterance);
    };
  }

  window.EVWake={
    supported:canRecognize,
    enabled:()=>armed,
    enable:arm,
    disable:function(){armed=false;try{localStorage.setItem(KEY,'false');}catch(_){} stopRecognition();},
    restart:function(){stopRecognition();startRecognition();}
  };

  setTimeout(autoArm,900);
})();
