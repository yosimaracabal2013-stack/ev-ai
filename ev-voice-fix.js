/* E.V. cinematic voice layer v6 — fallback only; neural voice layer owns the selector when available. */
(function(){
  'use strict';
  const synth=window.speechSynthesis;
  if(!synth) return;
  try{if(navigator.audioSession&&'type' in navigator.audioSession)navigator.audioSession.type='playback';}catch(_){}
  let token=0,speaking=false,keepAlive=null,voices=[];
  const DEFAULT_NAME='Karen';
  function refresh(){try{voices=synth.getVoices?synth.getVoices():[]}catch(_){voices=[]}return voices}
  function neuralActive(){return !!window.__EV_NEURAL_VOICE__}
  function choose(){
    const sel=document.getElementById('voiceSelect'), list=refresh();
    const wanted=sel&&String(sel.value||'').trim();
    if(wanted){const x=list.find(v=>v.name===wanted||v.voiceURI===wanted);if(x)return x}
    const prefs=[/^Karen$/i,v=>/en[-_]AU/i.test(v.lang||''),/^Samantha$/i,/^Ava$/i,/^Moira$/i,v=>/en[-_]US/i.test(v.lang||''),v=>/^en[-_]/i.test(v.lang||'')];
    for(const p of prefs){const x=list.find(typeof p==='function'?p:(v=>p.test(v.name||'')));if(x)return x}
    return list[0]||null;
  }
  function syncMenu(){
    if(neuralActive()) return;
    const sel=document.getElementById('voiceSelect');if(!sel)return;
    const list=refresh();if(!list.length)return;
    const preferred=['Karen','Samantha','Ava','Moira','Daniel'];
    const available=[];
    for(const name of preferred){const v=list.find(x=>x.name===name);if(v&&!available.some(a=>a.name===v.name))available.push(v)}
    if(!available.length)return;
    const current=sel.value;sel.innerHTML='';
    available.forEach(v=>{const o=document.createElement('option');o.value=v.name;o.textContent=v.name+' ('+v.lang+')';sel.appendChild(o)});
    sel.value=available.some(v=>v.name===current)?current:(available.find(v=>v.name===DEFAULT_NAME)?.name||available[0].name);
  }
  refresh();
  if('onvoiceschanged' in synth)synth.addEventListener('voiceschanged',()=>{refresh();syncMenu()});
  setTimeout(()=>{refresh();syncMenu()},250);
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
    const start=()=>{if(me!==token)return;let i=0;function make(t){const v=choose(),u=new SpeechSynthesisUtterance(t);if(v)u.voice=v;u.lang=v&&v.lang?v.lang:'en-US';u.rate=0.82;u.pitch=0.90;u.volume=1;return u}while(i<ps.length){const u=make(ps[i++]);u.onend=()=>{if(me===token&&!synth.speaking&&!synth.pending&&i>=ps.length){speaking=false;ui(false);clear()}};u.onerror=()=>{};try{synth.speak(u)}catch(_){} }};
    if(refresh().length)setTimeout(start,60);else if('onvoiceschanged' in synth){const f=()=>{synth.removeEventListener('voiceschanged',f);start()};synth.addEventListener('voiceschanged',f);setTimeout(start,900)}else start();
    keepAlive=setInterval(()=>{if(me!==token)return;session();try{if(synth.paused)synth.resume()}catch(_){}},2000);
  }
  window.EVReliableVoice={speak:speakReliable,stop:function(){token++;speaking=false;ui(false);clear();try{synth.cancel();synth.resume()}catch(_){}},isSpeaking:function(){return speaking}};
  window.addEventListener('pageshow',()=>{refresh();syncMenu();session();try{if(synth.paused)synth.resume()}catch(_){}},{passive:true});
  document.addEventListener('visibilitychange',()=>{session();if(document.visibilityState==='visible'){try{if(synth.paused)synth.resume()}catch(_){}}},{passive:true});
})();
