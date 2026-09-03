/* E.V. core stability v3
   Repairs the command dashboard without replacing the existing brain.
   - Direct dashboard -> inner-engine send bridge
   - Enter key support
   - Local conversation archive continuity
   - Real browser/network/location status
   - Loads the existing reliable voice + location layers into the real engine
   - Keeps external-app actions in the dashboard companion
*/
(function(){
  'use strict';
  if(window.__EV_CORE_STABILITY_V3__) return;
  window.__EV_CORE_STABILITY_V3__=true;

  const KEY='ev-groq-api-key';
  const ARCHIVE='ev-conversation-archive-v1';
  const SESSION='ev-active-session-v1';
  const clean=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function dashboard(){ return document.getElementById('evDashboard'); }
  function dashDoc(){ try{return dashboard()?.contentDocument||null}catch(_){return null} }
  function engineFrame(){ try{return dashDoc()?.getElementById('engine')||null}catch(_){return null} }
  function engineWin(){ try{return engineFrame()?.contentWindow||null}catch(_){return null} }
  function engineDoc(){ try{return engineFrame()?.contentDocument||null}catch(_){return null} }

  function setActivity(text,error){
    const d=dashDoc();
    try{ const a=d?.getElementById('activity'); if(a)a.textContent=text; }catch(_){}
    try{ const c=d?.getElementById('coreLabel'); if(c)c.textContent=error?'BRAIN OFFLINE':'STANDING BY'; }catch(_){}
  }

  function outerAdd(text,user){
    const d=dashDoc(); if(!d||!text)return;
    const feed=d.getElementById('feed'); if(!feed)return;
    const row=d.createElement('div'); row.className='msg'+(user?' user':''); row.textContent=text;
    feed.appendChild(row); while(feed.children.length>6)feed.firstElementChild.remove(); feed.scrollTop=feed.scrollHeight;
  }

  function saveTurn(role,content){
    content=clean(content); if(!content)return;
    try{
      let archive=JSON.parse(localStorage.getItem(ARCHIVE)||'[]');
      let session=archive.find(x=>x.id===sessionId);
      if(!session){session={id:sessionId,title:'E.V. chat',createdAt:Date.now(),updatedAt:Date.now(),messages:[]};archive.push(session)}
      session.updatedAt=Date.now(); session.messages.push({role,content,at:Date.now()});
      if(session.messages.length>120)session.messages=session.messages.slice(-120);
      if(archive.length>40)archive=archive.slice(-40);
      localStorage.setItem(ARCHIVE,JSON.stringify(archive));
    }catch(_){}
  }

  let sessionId='';
  try{sessionId=localStorage.getItem(SESSION)||('session-'+Date.now());localStorage.setItem(SESSION,sessionId)}catch(_){sessionId='session-'+Date.now()}

  function setNativeValue(el,value){
    if(!el)return;
    try{
      const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
      if(setter)setter.call(el,value);else el.value=value;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(_){el.value=value}
  }

  async function waitEngine(max=15000){
    const start=Date.now();
    while(Date.now()-start<max){
      const f=engineFrame(),w=engineWin(),d=engineDoc();
      if(f&&w&&d&&typeof w.sendMessage==='function')return {f,w,d};
      await sleep(200);
    }
    return null;
  }

  async function loadIntoEngine(src,name){
    const d=engineDoc(); if(!d?.head)return false;
    if(d.querySelector('script[data-ev-stability="'+name+'"]'))return true;
    return await new Promise(resolve=>{
      const s=d.createElement('script'); s.src=src+'?v=20260903-stability3'; s.dataset.evStability=name;
      s.onload=()=>resolve(true); s.onerror=()=>resolve(false); d.head.appendChild(s);
    });
  }

  function latestEngineText(d){
    if(!d?.body)return '';
    const selectors=['[data-role="assistant"]','.assistant','.ev-message.ev','.message.ev','.message.assistant','#messages .assistant','#chat .assistant','#chatMessages .assistant'];
    for(const sel of selectors){
      try{const a=[...d.querySelectorAll(sel)].map(x=>clean(x.textContent)).filter(Boolean);if(a.length)return a[a.length-1]}catch(_){}
    }
    return '';
  }

  async function directSend(text){
    text=clean(text); if(!text)return false;
    const pair=await waitEngine();
    if(!pair){setActivity('Brain connection unavailable — tap reload once.',true);return false}
    const {w,d}=pair;
    outerAdd(text,true); saveTurn('user',text);
    setActivity('Processing request…');
    try{
      const before=latestEngineText(d);
      let result=await w.sendMessage(text,null);
      let answer=typeof result==='string'?clean(result):'';
      if(!answer){
        for(let i=0;i<30;i++){
          await sleep(250);
          const now=latestEngineText(d);
          if(now&&now!==before){answer=now;break}
        }
      }
      if(answer){outerAdd(answer,false);saveTurn('assistant',answer);try{w.EVReliableVoice?.speak?.(answer)}catch(_){} }
      setActivity('Engine connected · memory active · ready.');
      return true;
    }catch(err){
      console.error('E.V. direct send failed',err);
      setActivity('Brain request failed — check the Groq key or connection.',true);
      outerAdd('E.V. could not complete that request. Check the brain connection and try again.',false);
      return false;
    }
  }

  function installControls(){
    const d=dashDoc(); if(!d)return false;
    const input=d.getElementById('commandInput'),send=d.getElementById('send');
    if(!input||!send)return false;
    if(!send.__EV_STABILITY3__){
      send.__EV_STABILITY3__=true;
      send.addEventListener('click',function(e){
        e.preventDefault();e.stopImmediatePropagation();
        const text=clean(input.value);if(!text)return;
        input.value=''; directSend(text);
      },true);
    }
    if(!input.__EV_STABILITY3__){
      input.__EV_STABILITY3__=true;
      input.addEventListener('keydown',function(e){
        if(e.key!=='Enter'||e.shiftKey)return;
        e.preventDefault();e.stopImmediatePropagation();
        const text=clean(input.value);if(!text)return;
        input.value='';directSend(text);
      },true);
    }
    return true;
  }

  function installStatus(){
    const d=dashDoc(); if(!d)return;
    const loc=d.getElementById('locStatus');
    if(loc&&!loc.__EV_STABILITY3__){
      loc.__EV_STABILITY3__=true;loc.style.cursor='pointer';loc.title='Tap to grant precise location permission';
      loc.addEventListener('click',async()=>{try{const w=engineWin();if(w?.EVLocation?.setup){await w.EVLocation.setup();loc.textContent='LOCKED';return}if(navigator.geolocation){navigator.geolocation.getCurrentPosition(()=>{loc.textContent='READY'},()=>{loc.textContent='DENIED'},{enableHighAccuracy:true,maximumAge:0,timeout:15000})}}catch(_){loc.textContent='ERROR'}});
    }
    if(navigator.onLine){const a=d.getElementById('activity');if(a&&!/Processing|failed|unavailable/i.test(a.textContent||''))a.textContent='Engine online · dashboard ready.'}
  }

  function bootClock(){
    const tick=()=>{const d=dashDoc();const c=d?.getElementById('clock');if(!c)return;const now=new Date();const time=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'}).format(now);const date=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'}).format(now);c.innerHTML='LOCAL TIME '+time+'<small>'+date+'</small>'};
    tick();setInterval(tick,1000);
  }

  async function boot(){
    const f=dashboard();if(!f)return;
    await waitEngine();
    const w=engineWin();
    try{const key=localStorage.getItem(KEY);if(key&&w?.localStorage)w.localStorage.setItem(KEY,key)}catch(_){}
    await loadIntoEngine('./ev-voice-fix.js','voice-fix');
    await loadIntoEngine('./ev-location-accuracy-v2.js','location-v2');
    await loadIntoEngine('./ev-mic-autosend.js','mic-autosend');
    installControls();installStatus();bootClock();
    setActivity('Engine connected · memory active · ready.');
    try{w?.EVLocation?.get?.()}catch(_){}
  }

  function hook(){
    const f=dashboard();if(!f)return;
    f.addEventListener('load',()=>setTimeout(boot,250),{once:false});
    setTimeout(boot,300);
    setInterval(()=>{if(!dashboard()?.contentDocument)return;installControls();installStatus()},1200);
  }

  window.EVCoreStability={send:directSend,reconnect:boot};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
