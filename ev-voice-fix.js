/* E.V. cinematic voice layer.
   Keeps the existing browser voice path, but tunes it toward a calm,
   warm, composed movie-assistant delivery and keeps Safari from going silent. */
(function(){
  'use strict';
  const synth=window.speechSynthesis;
  if(!synth) return;
  let speaking=false, token=0, keepAlive=null;

  function getVoices(){ return synth.getVoices ? synth.getVoices() : []; }

  function selectedVoice(){
    const sel=document.getElementById('voiceSelect');
    const wanted=sel && String(sel.value||'').trim();
    const voices=getVoices();
    if(wanted){
      const exact=voices.find(v=>v.name===wanted||v.voiceURI===wanted||v.name.includes(wanted));
      if(exact) return exact;
    }
    // Prefer an Australian/UK female English voice when the device provides one.
    // This is an approximation of the movie E.V. sound, not a voice clone.
    const preferred=[
      v=>/en[-_]AU/i.test(v.lang||'') && /female|karen|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]AU/i.test(v.lang||''),
      v=>/en[-_]GB/i.test(v.lang||'') && /female|serena|kate|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]GB/i.test(v.lang||''),
      v=>/en[-_]US/i.test(v.lang||'') && /female|samantha|ava|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]US/i.test(v.lang||''),
      v=>/^en[-_]/i.test(v.lang||'')
    ];
    for(const pick of preferred){ const v=voices.find(pick); if(v) return v; }
    return voices[0] || null;
  }

  function chunks(text){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean) return [];
    const out=[]; let rest=clean;
    while(rest.length>180){
      let cut=Math.max(rest.lastIndexOf('. ',180),rest.lastIndexOf('! ',180),rest.lastIndexOf('? ',180),rest.lastIndexOf(', ',180),rest.lastIndexOf(' ',180));
      if(cut<80) cut=180;
      out.push(rest.slice(0,cut+1).trim());
      rest=rest.slice(cut+1).trim();
    }
    if(rest) out.push(rest);
    return out;
  }

  function stopKeepAlive(){
    if(keepAlive){ clearInterval(keepAlive); keepAlive=null; }
  }

  function setUi(on){
    const b=document.getElementById('voiceBtn');
    if(b){ b.classList.toggle('speaking',on); if(on)b.classList.add('on'); }
  }

  function speakReliable(text){
    if(localStorage.getItem('ev-voice-replies')==='0') return;
    if(localStorage.getItem('ev-quiet-mode')==='1') return;
    const parts=chunks(text); if(!parts.length) return;
    const my=++token;
    speaking=true; setUi(true); stopKeepAlive();
    try{synth.cancel();}catch(_){ }
    let i=0;
    const next=()=>{
      if(my!==token){ speaking=false; setUi(false); return; }
      if(i>=parts.length){ speaking=false; setUi(false); stopKeepAlive(); return; }
      const u=new SpeechSynthesisUtterance(parts[i++]);
      const v=selectedVoice();
      if(v) u.voice=v;
      u.lang=v?.lang || 'en-US';
      // Calm, measured, warm assistant delivery.
      u.rate=0.94;
      u.pitch=0.93;
      u.volume=1;
      u.onend=()=>setTimeout(next,90);
      u.onerror=()=>setTimeout(next,140);
      try{synth.speak(u);}catch(_){setTimeout(next,220);return;}
    };
    // Safari can occasionally pause speech; periodically resume it while E.V. is speaking.
    keepAlive=setInterval(()=>{
      if(!speaking) return;
      try{ if(synth.paused) synth.resume(); }catch(_){ }
    },1800);
    setTimeout(next,100);
  }

  window.speak=speakReliable;
  window.EVReliableVoice={
    speak:speakReliable,
    stop:function(){
      token++; speaking=false; setUi(false); stopKeepAlive();
      try{synth.cancel();}catch(_){ }
    }
  };
  window.addEventListener('pagehide',()=>{try{synth.cancel();}catch(_){};stopKeepAlive();});
})();
