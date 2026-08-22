/* E.V. cinematic voice layer v2
   Free/browser-only voice system.
   - Keeps the existing voice controls and E.V. API intact.
   - Uses the best English voice available on the device.
   - Warms Safari's speech engine before long replies.
   - Speaks in short queued chunks instead of one long utterance.
   - Detects silent/stuck speech and retries automatically.
   - Keeps the calm, warm, measured cinematic-assistant delivery.
   Note: this is a style approximation, not a clone of a movie actor's voice.
*/
(function(){
  'use strict';
  const synth=window.speechSynthesis;
  if(!synth) return;

  let speaking=false;
  let token=0;
  let keepAlive=null;
  let watchdog=null;
  let voices=[];
  let voiceReady=false;

  function refreshVoices(){
    try { voices=synth.getVoices ? synth.getVoices() : []; } catch(_) { voices=[]; }
    voiceReady=voices.length>0;
    return voices;
  }

  refreshVoices();
  if('onvoiceschanged' in synth){
    synth.addEventListener('voiceschanged', refreshVoices);
  }

  function waitForVoices(){
    if(refreshVoices().length) return Promise.resolve(voices);
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{ if(done)return; done=true; refreshVoices(); resolve(voices); };
      if('onvoiceschanged' in synth) synth.addEventListener('voiceschanged',finish,{once:true});
      setTimeout(finish,900);
    });
  }

  function selectedVoice(){
    const sel=document.getElementById('voiceSelect');
    const wanted=sel && String(sel.value||'').trim();
    const list=refreshVoices();

    if(wanted){
      const exact=list.find(v=>v.name===wanted || v.voiceURI===wanted || v.name.includes(wanted));
      if(exact) return exact;
    }

    // Favor voices that tend to give E.V. a calm, polished assistant sound.
    const preferred=[
      v=>/en[-_]AU/i.test(v.lang||'') && /female|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]AU/i.test(v.lang||''),
      v=>/en[-_]GB/i.test(v.lang||'') && /female|serena|kate|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]GB/i.test(v.lang||''),
      v=>/en[-_]US/i.test(v.lang||'') && /female|samantha|ava|allison|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]US/i.test(v.lang||''),
      v=>/^en[-_]/i.test(v.lang||'')
    ];
    for(const pick of preferred){ const found=list.find(pick); if(found) return found; }
    return list[0] || null;
  }

  function chunks(text){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean) return [];
    const out=[];
    let rest=clean;
    while(rest.length>150){
      let cut=Math.max(
        rest.lastIndexOf('. ',150),
        rest.lastIndexOf('! ',150),
        rest.lastIndexOf('? ',150),
        rest.lastIndexOf('; ',150),
        rest.lastIndexOf(', ',150),
        rest.lastIndexOf(' ',150)
      );
      if(cut<65) cut=150;
      out.push(rest.slice(0,cut+1).trim());
      rest=rest.slice(cut+1).trim();
    }
    if(rest) out.push(rest);
    return out;
  }

  function clearTimers(){
    if(keepAlive){clearInterval(keepAlive);keepAlive=null;}
    if(watchdog){clearTimeout(watchdog);watchdog=null;}
  }

  function setUi(on){
    const b=document.getElementById('voiceBtn');
    if(b){
      b.classList.toggle('speaking',on);
      if(on)b.classList.add('on');
    }
    const status=document.getElementById('coreStatus');
    if(status && on) status.textContent='SPEAKING…';
  }

  function stopEngine(){
    try{synth.cancel();}catch(_){}
    try{synth.resume();}catch(_){}
  }

  // A tiny user-independent warm-up. It does not produce audible text.
  // This helps iOS/Safari recover when the speech engine has gone stale.
  function warmEngine(){
    try{
      synth.cancel();
      synth.resume();
      const u=new SpeechSynthesisUtterance('');
      u.volume=0;
      u.rate=1;
      u.onend=()=>{};
      synth.speak(u);
      setTimeout(()=>{try{synth.cancel();synth.resume();}catch(_){}},60);
    }catch(_){}
  }

  function speakReliable(text){
    if(localStorage.getItem('ev-voice-replies')==='0') return;
    if(localStorage.getItem('ev-quiet-mode')==='1') return;
    const parts=chunks(text);
    if(!parts.length) return;

    const my=++token;
    speaking=true;
    setUi(true);
    clearTimers();
    stopEngine();

    waitForVoices().then(()=>{
      if(my!==token)return;
      // Give Safari a moment after voice enumeration before speaking.
      setTimeout(()=>runQueue(parts,my),110);
    });
  }

  function runQueue(parts,my){
    let i=0;
    let retry=0;

    function finish(){
      if(my!==token)return;
      speaking=false;
      setUi(false);
      clearTimers();
    }

    function next(){
      if(my!==token){finish();return;}
      if(i>=parts.length){finish();return;}

      const voice=selectedVoice();
      const text=parts[i];
      const u=new SpeechSynthesisUtterance(text);
      if(voice) u.voice=voice;
      u.lang=voice && voice.lang ? voice.lang : 'en-US';
      u.rate=0.92;
      u.pitch=0.92;
      u.volume=1;

      let started=false;
      let finished=false;
      const expected=Math.max(3500,text.length*105);

      u.onstart=()=>{
        started=true;
        retry=0;
        clearTimeout(watchdog);
        watchdog=setTimeout(()=>{
          if(finished||my!==token)return;
          // Safari can leave speechSynthesis in a stuck state. Reset just the
          // speech engine and retry this chunk; memory/camera/agenda are untouched.
          finished=true;
          stopEngine();
          retry++;
          if(retry<=2) setTimeout(next,180);
          else {i++;retry=0;setTimeout(next,120);}
        },expected);
      };

      u.onend=()=>{
        if(finished)return;
        finished=true;
        clearTimeout(watchdog);
        i++;
        setTimeout(next,90);
      };

      u.onerror=()=>{
        if(finished)return;
        finished=true;
        clearTimeout(watchdog);
        stopEngine();
        retry++;
        if(retry<=2) setTimeout(next,180);
        else {i++;retry=0;setTimeout(next,120);}
      };

      try{
        // Keep the queue healthy and recover from an iOS paused state.
        if(synth.paused) synth.resume();
        synth.speak(u);
        if(!started){
          setTimeout(()=>{try{if(synth.paused)synth.resume();}catch(_){}},250);
        }
      }catch(_){
        retry++;
        if(retry<=2) setTimeout(next,220);
        else {i++;retry=0;setTimeout(next,120);}
      }
    }

    // Safari can silently stop a long speech session; periodically resume,
    // but never cancel an utterance that is actively speaking.
    keepAlive=setInterval(()=>{
      if(!speaking||my!==token)return;
      try{
        if(synth.paused) synth.resume();
        // If Safari reports neither speaking nor pending while E.V. should be
        // talking, restart the queue rather than leaving her mute.
        if(!synth.speaking && !synth.pending && i<parts.length){
          stopEngine();
          setTimeout(next,120);
        }
      }catch(_){}
    },2200);

    next();
  }

  window.speak=speakReliable;
  window.EVReliableVoice={
    speak:speakReliable,
    warm:function(){warmEngine();},
    stop:function(){
      token++;
      speaking=false;
      setUi(false);
      clearTimers();
      stopEngine();
    },
    isSpeaking:function(){return speaking;}
  };

  // Voice lists on iOS can appear after page load.
  window.addEventListener('pageshow',()=>{refreshVoices();});
  window.addEventListener('pagehide',()=>{
    token++;
    speaking=false;
    clearTimers();
    try{synth.cancel();}catch(_){}
  });

  // Do not auto-start audible speech. Warm only after an actual user gesture.
  document.addEventListener('click',()=>{
    if(!voiceReady)refreshVoices();
    try{synth.resume();}catch(_){}
  },{passive:true,capture:true});
})();
