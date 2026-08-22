/* E.V. reliable iPhone voice patch.
   Keeps the selected voice, but prevents Safari from going silent mid-response. */
(function(){
  'use strict';
  const synth=window.speechSynthesis;
  if(!synth) return;
  let speaking=false, token=0, keepAlive=null;
  const oldSpeak=window.speak;
  function selectedVoice(){
    const sel=document.getElementById('voiceSelect');
    const wanted=sel && String(sel.value||'').trim();
    const voices=synth.getVoices();
    if(wanted){
      const exact=voices.find(v=>v.name===wanted||v.voiceURI===wanted||v.name.includes(wanted));
      if(exact) return exact;
    }
    return voices.find(v=>/^en(-|_)/i.test(v.lang)) || voices.find(v=>/english/i.test(v.lang||'')) || voices[0] || null;
  }
  function chunks(text){
    const clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean) return [];
    const out=[];
    let rest=clean;
    while(rest.length>180){
      let cut=Math.max(rest.lastIndexOf('. ',180),rest.lastIndexOf('! ',180),rest.lastIndexOf('? ',180),rest.lastIndexOf(', ',180),rest.lastIndexOf(' ',180));
      if(cut<80) cut=180;
      out.push(rest.slice(0,cut+1).trim());
      rest=rest.slice(cut+1).trim();
    }
    if(rest) out.push(rest);
    return out;
  }
  function stopKeepAlive(){if(keepAlive){clearInterval(keepAlive);keepAlive=null;}}
  function setUi(on){
    const b=document.getElementById('voiceBtn');
    if(b){b.classList.toggle('speaking',on);if(on)b.classList.add('on');}
  }
  function speakReliable(text){
    if(localStorage.getItem('ev-voice-replies')==='0') return;
    const parts=chunks(text); if(!parts.length) return;
    const my=++token;
    speaking=true; setUi(true); stopKeepAlive();
    try{synth.cancel();}catch(_){ }
    let i=0;
    const next=()=>{
      if(my!==token){speaking=false;setUi(false);return;}
      if(i>=parts.length){speaking=false;setUi(false);stopKeepAlive();return;}
      const u=new SpeechSynthesisUtterance(parts[i++]);
      const v=selectedVoice(); if(v) u.voice=v;
      u.lang=v?.lang||'en-US';
      u.rate=0.98; u.pitch=1; u.volume=1;
      u.onend=()=>setTimeout(next,60);
      u.onerror=()=>setTimeout(next,120);
      try{synth.speak(u);}catch(_){setTimeout(next,200);return;}
    };
    keepAlive=setInterval(()=>{if(!speaking)return;try{if(synth.paused)synth.resume();}catch(_){ }},2000);
    if(synth.onvoiceschanged) synth.onvoiceschanged=()=>{};
    setTimeout(next,80);
  }
  window.speak=speakReliable;
  window.EVReliableVoice={speak:speakReliable,stop:function(){token++;speaking=false;setUi(false);stopKeepAlive();try{synth.cancel()}catch(_){}}};
  window.addEventListener('pagehide',()=>{try{synth.cancel()}catch(_){};stopKeepAlive()});
})();
