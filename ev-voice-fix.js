/* E.V. cinematic voice layer v4 — calm, warm, precise delivery. */
(function(){
  'use strict';
  const synth=window.speechSynthesis;
  if(!synth) return;
  try{if(navigator.audioSession&&'type' in navigator.audioSession)navigator.audioSession.type='playback';}catch(_){}
  let token=0,speaking=false,keepAlive=null,voices=[];
  function refresh(){try{voices=synth.getVoices?synth.getVoices():[]}catch(_){voices=[]}return voices}
  refresh();
  if('onvoiceschanged' in synth)synth.addEventListener('voiceschanged',refresh);
  function voice(){
    const sel=document.getElementById('voiceSelect'), wanted=sel&&String(sel.value||'').trim(), list=refresh();
    if(wanted){const x=list.find(v=>v.name===wanted||v.voiceURI===wanted||v.name.includes(wanted));if(x)return x}
    const pref=[
      v=>/en[-_]AU/i.test(v.lang||''),
      v=>/en[-_]GB/i.test(v.lang||'')&&/female|serena|kate|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]GB/i.test(v.lang||''),
      v=>/en[-_]US/i.test(v.lang||'')&&/female|samantha|ava|allison|english/i.test((v.name||'')+' '+(v.lang||'')),
      v=>/en[-_]US/i.test(v.lang||''),v=>/^en[-_]/i.test(v.lang||'')
    ];
    for(const p of pref){const x=list.find(p);if(x)return x}return list[0]||null;
  }
  function parts(text){
    const s=String(text||'').replace(/\s+/g,' ').trim(),out=[];let r=s;
    while(r.length>180){let c=Math.max(r.lastIndexOf('. ',180),r.lastIndexOf('! ',180),r.lastIndexOf('? ',180),r.lastIndexOf('; ',180),r.lastIndexOf(', ',180),r.lastIndexOf(' ',180));if(c<75)c=180;out.push(r.slice(0,c+1).trim());r=r.slice(c+1).trim()}
    if(r)out.push(r);return out;
  }
  function clear(){if(keepAlive){clearInterval(keepAlive);keepAlive=null}}
  function session(){try{if(navigator.audioSession&&'type' in navigator.audioSession)navigator.audioSession.type='playback'}catch(_){}
  }
  function ui(on){const b=document.getElementById('voiceBtn');if(b){b.classList.toggle('speaking',on);if(on)b.classList.add('on')}const s=document.getElementById('coreStatus');if(s)s.textContent=on?'SPEAKING…':'ONLINE'}
  function speakReliable(text){
    if(localStorage.getItem('ev-voice-replies')==='0'||localStorage.getItem('ev-quiet-mode')==='1')return;
    const ps=parts(text);if(!ps.length)return;const me=++token;speaking=true;ui(true);clear();session();try{synth.cancel();synth.resume()}catch(_){}
    const start=()=>{
      if(me!==token)return;let i=0;
      function make(t){const v=voice(),u=new SpeechSynthesisUtterance(t);if(v)u.voice=v;u.lang=v&&v.lang?v.lang:'en-US';
        /* Cinematic delivery: measured, controlled, warm, never rushed. */
        u.rate=0.86;u.pitch=0.94;u.volume=1;return u}
      while(i<ps.length){const u=make(ps[i++]);u.onend=()=>{if(me===token&&!synth.speaking&&!synth.pending&&i>=ps.length){speaking=false;ui(false);clear()}};u.onerror=()=>{};try{synth.speak(u)}catch(_){}
      }
    };
    if(refresh().length) setTimeout(start,60); else if('onvoiceschanged' in synth){const f=()=>{synth.removeEventListener('voiceschanged',f);start()};synth.addEventListener('voiceschanged',f);setTimeout(start,900)} else start();
    keepAlive=setInterval(()=>{if(me!==token)return;session();try{if(synth.paused)synth.resume()}catch(_){}},2000);
  }
  window.speak=speakReliable;
  window.EVReliableVoice={speak:speakReliable,stop:function(){token++;speaking=false;ui(false);clear();try{synth.cancel();synth.resume()}catch(_){}},isSpeaking:function(){return speaking}};
  window.addEventListener('pageshow',()=>{refresh();session();try{if(synth.paused)synth.resume()}catch(_){}},{passive:true});
  document.addEventListener('visibilitychange',()=>{session();if(document.visibilityState==='visible'){try{if(synth.paused)synth.resume()}catch(_){}}},{passive:true});
  document.addEventListener('click',()=>{refresh();session();try{synth.resume()}catch(_){}},{passive:true,capture:true});
})();
