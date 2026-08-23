/* E.V. cinematic voice layer v3
   iPhone/Safari background-audio hardening.
   - Keeps the existing E.V. voice API intact.
   - Uses the best English voice available on the device.
   - Uses the iOS playback audio session when available.
   - Queues speech chunks up front so lock-screen/background timer throttling
     cannot interrupt the gaps between chunks.
   - Never cancels speech on pagehide/visibility changes.
   - Recovers from Safari's paused/interrupted speech state when the page returns.
*/
(function(){
  'use strict';
  const synth=window.speechSynthesis;
  if(!synth) return;

  // iOS 17+ WebKit exposes an audio session API. Playback is the correct
  // category for spoken audio that should remain audible outside the page.
  try{
    if(navigator.audioSession && 'type' in navigator.audioSession){
      navigator.audioSession.type='playback';
    }
  }catch(_){}

  let speaking=false;
  let token=0;
  let keepAlive=null;
  let watchdog=null;
  let voices=[];
  let voiceReady=false;
  let activeParts=[];

  function setPlaybackSession(){
    try{
      if(navigator.audioSession && 'type' in navigator.audioSession){
        navigator.audioSession.type='playback';
      }
    }catch(_){}
  }

  function refreshVoices(){
    try { voices=synth.getVoices ? synth.getVoices() : []; } catch(_) { voices=[]; }
    voiceReady=voices.length>0;
    return voices;
  }

  refreshVoices();
  if('onvoiceschanged' in synth) synth.addEventListener('voiceschanged',refreshVoices);

  function waitForVoices(){
    if(refreshVoices().length) return Promise.resolve(voices);
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;refreshVoices();resolve(voices)};
      if('onvoiceschanged' in synth) synth.addEventListener('voiceschanged',finish,{once:true});
      setTimeout(finish,900);
    });
  }

  function selectedVoice(){
    const sel=document.getElementById('voiceSelect');
    const wanted=sel && String(sel.value||'').trim();
    const list=refreshVoices();
    if(wanted){
      const exact=list.find(v=>v.name===wanted||v.voiceURI===wanted||v.name.includes(wanted));
      if(exact)return exact;
    }
    const preferred=[
      v=>/en[-_]AU/i.test(v.lang||'')&&/female|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]AU/i.test(v.lang||''),
      v=>/en[-_]GB/i.test(v.lang||'')&&/female|serena|kate|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]GB/i.test(v.lang||''),
      v=>/en[-_]US/i.test(v.lang||'')&&/female|samantha|ava|allison|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]US/i.test(v.lang||''),
      v=>/^en[-_]/i.test(v.lang||'')
    ];
    for(const pick of preferred){const found=list.find(pick);if(found)return found;}
    return list[0]||null;
  }

  function chunks(text){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean)return [];
    const out=[];
    let rest=clean;
    while(rest.length>180){
      let cut=Math.max(
        rest.lastIndexOf('. ',180),rest.lastIndexOf('! ',180),rest.lastIndexOf('? ',180),
        rest.lastIndexOf('; ',180),rest.lastIndexOf(', ',180),rest.lastIndexOf(' ',180)
      );
      if(cut<75)cut=180;
      out.push(rest.slice(0,cut+1).trim());
      rest=rest.slice(cut+1).trim();
    }
    if(rest)out.push(rest);
    return out;
  }

  function clearTimers(){
    if(keepAlive){clearInterval(keepAlive);keepAlive=null;}
    if(watchdog){clearTimeout(watchdog);watchdog=null;}
  }

  function setUi(on){
    const b=document.getElementById('voiceBtn');
    if(b){b.classList.toggle('speaking',on);if(on)b.classList.add('on');}
    const status=document.getElementById('coreStatus');
    if(status&&on)status.textContent='SPEAKING…';
  }

  function stopEngine(){
    try{synth.cancel();}catch(_){}
    try{synth.resume();}catch(_){}
  }

  function warmEngine(){
    try{
      setPlaybackSession();
      synth.cancel();
      synth.resume();
      const u=new SpeechSynthesisUtterance('');
      u.volume=0;u.rate=1;u.onend=()=>{};
      synth.speak(u);
      setTimeout(()=>{try{synth.cancel();synth.resume();}catch(_){}},60);
    }catch(_){}
  }

  function speakReliable(text){
    if(localStorage.getItem('ev-voice-replies')==='0'||localStorage.getItem('ev-quiet-mode')==='1')return;
    const parts=chunks(text);
    if(!parts.length)return;
    const my=++token;
    speaking=true;
    activeParts=parts.slice();
    setUi(true);
    clearTimers();
    setPlaybackSession();
    stopEngine();
    waitForVoices().then(()=>{
      if(my!==token)return;
      setTimeout(()=>runQueue(parts,my),80);
    });
  }

  function runQueue(parts,my){
    if(my!==token)return;
    let index=0;
    let retry=0;
    let current=null;

    function finish(){
      if(my!==token)return;
      speaking=false;
      activeParts=[];
      setUi(false);
      clearTimers();
    }

    function makeUtterance(text){
      const voice=selectedVoice();
      const u=new SpeechSynthesisUtterance(text);
      if(voice)u.voice=voice;
      u.lang=voice&&voice.lang?voice.lang:'en-US';
      u.rate=0.92;u.pitch=0.92;u.volume=1;
      return u;
    }

    function queueRemaining(){
      if(my!==token)return;
      if(index>=parts.length){finish();return;}
      setPlaybackSession();
      while(index<parts.length){
        const part=parts[index++];
        const u=makeUtterance(part);
        u.onend=()=>{
          if(my!==token)return;
          if(!synth.speaking&&!synth.pending&&index>=parts.length)finish();
        };
        u.onerror=()=>{
          if(my!==token)return;
          // If one chunk fails, retry only that chunk once instead of killing
          // the whole reply. The remaining speech stays queued when possible.
          if(retry<2){
            retry++;
            try{synth.speak(makeUtterance(part));}catch(_){}
          }else{
            retry=0;
            if(index>=parts.length)finish();
          }
        };
        try{synth.speak(u);}catch(_){
          if(retry<2){retry++;index--;setTimeout(queueRemaining,120);return;}
          retry=0;
        }
      }
    }

    keepAlive=setInterval(()=>{
      if(my!==token||!speaking)return;
      try{
        setPlaybackSession();
        if(synth.paused)synth.resume();
      }catch(_){}
    },2000);

    // Do not use a short timer to feed the speech queue. iOS can throttle that
    // timer when the phone locks, which was the source of E.V.'s cut-outs.
    queueRemaining();
  }

  window.speak=speakReliable;
  window.EVReliableVoice={
    speak:speakReliable,
    warm:warmEngine,
    stop:function(){
      token++;speaking=false;activeParts=[];setUi(false);clearTimers();stopEngine();
    },
    isSpeaking:function(){return speaking;}
  };

  window.addEventListener('pageshow',()=>{
    refreshVoices();
    setPlaybackSession();
    try{if(synth.paused)synth.resume();}catch(_){}
  });

  document.addEventListener('visibilitychange',()=>{
    // IMPORTANT: never cancel speech here. Safari may background the iframe
    // when the phone locks; canceling would cut E.V. off immediately.
    setPlaybackSession();
    if(document.visibilityState==='visible'){
      try{if(synth.paused)synth.resume();}catch(_){}
    }
  },{passive:true});

  // pagehide used to call synth.cancel(), which directly caused replies to be
  // cut off as soon as iOS backgrounded/locked the page. Deliberately do not
  // cancel here.
  document.addEventListener('click',()=>{
    if(!voiceReady)refreshVoices();
    setPlaybackSession();
    try{synth.resume();}catch(_){}
  },{passive:true,capture:true});
})();
