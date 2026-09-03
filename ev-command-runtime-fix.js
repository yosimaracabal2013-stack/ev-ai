/* E.V. command runtime fix v2
   The command UI is a dashboard iframe, and the actual Groq brain is a second
   iframe inside that dashboard. v1 waited for sendMessage on the dashboard
   itself, so it could time out forever. v2 resolves the real inner engine,
   patches that engine's fetch, and gives the dashboard a reliable send bridge.
*/
(function(){
  'use strict';

  const KEY='ev-groq-api-key';
  const MAX_SYSTEM_CHARS=5600;
  const MAX_HISTORY_MESSAGES=8;
  const MAX_MESSAGE_CHARS=1400;
  const MAX_OUTPUT_TOKENS=650;
  const WAIT_MS=12000;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clean=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();

  function dashboard(){
    return document.getElementById('evDashboard');
  }

  function setStatus(message, error=false){
    try{
      const frame=dashboard();
      const d=frame?.contentDocument;
      const el=d?.getElementById('activity');
      if(el)el.textContent=message;
      const label=d?.getElementById('coreLabel');
      if(label)label.textContent=error?'BRAIN OFFLINE':'STANDING BY';
    }catch(_){}
  }

  function trimSystem(value){
    const s=String(value||'');
    if(s.length<=MAX_SYSTEM_CHARS)return s;
    return s.slice(0,3800)+'\n\n[older continuity context trimmed]\n\n'+s.slice(-1600);
  }

  function boundBody(body){
    const b={...body};
    if(Array.isArray(b.messages)){
      const system=b.messages.find(m=>m?.role==='system');
      const rest=b.messages
        .filter(m=>m?.role!=='system')
        .slice(-MAX_HISTORY_MESSAGES)
        .map(m=>{
          const x={...m};
          if(typeof x.content==='string' && x.content.length>MAX_MESSAGE_CHARS){
            x.content=x.content.slice(-MAX_MESSAGE_CHARS);
          }
          return x;
        });
      b.messages=system?[{...system,content:trimSystem(system.content)},...rest]:rest;
    }
    b.max_completion_tokens=Math.min(Number(b.max_completion_tokens||MAX_OUTPUT_TOKENS),MAX_OUTPUT_TOKENS);
    if(b.model==='openai/gpt-oss-120b')b.reasoning_effort='low';
    return b;
  }

  function installFetch(engineWindow){
    if(!engineWindow || engineWindow.__EV_RUNTIME_FETCH_V2__)return;
    const original=engineWindow.fetch?.bind(engineWindow);
    if(!original)return;

    engineWindow.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(!url.includes('api.groq.com/openai/v1/chat/completions') || !init?.body){
        return original(input,init);
      }

      let body;
      try{ body=boundBody(JSON.parse(init.body)); }
      catch(_){ return original(input,init); }

      try{
        const response=await original(input,{...init,body:JSON.stringify(body)});
        if(response.status!==429 || body.model!=='openai/gpt-oss-120b')return response;
        const fallback={...body,model:'openai/gpt-oss-20b',reasoning_effort:'low'};
        return await original(input,{...init,body:JSON.stringify(fallback)});
      }catch(err){
        setStatus('Brain link failed — check the Groq key or connection.',true);
        throw err;
      }
    };
    engineWindow.__EV_RUNTIME_FETCH_V2__=true;
  }

  async function findEngine(frame){
    const started=Date.now();
    while(Date.now()-started<WAIT_MS){
      try{
        const dd=frame.contentDocument;
        const inner=dd?.getElementById('engine');
        const ew=inner?.contentWindow;
        const ed=inner?.contentDocument;
        if(inner && ew && ed && typeof ew.sendMessage==='function'){
          return {inner,ew,ed};
        }
      }catch(_){}
      await sleep(200);
    }
    return null;
  }

  async function install(){
    const frame=dashboard();
    if(!frame)return;

    setStatus('Connecting to E.V. brain…');
    const pair=await findEngine(frame);
    if(!pair){
      setStatus('Brain connection unavailable — reload once and try again.',true);
      return;
    }

    const {inner,ew}=pair;

    try{
      const key=localStorage.getItem(KEY);
      if(key)ew.localStorage.setItem(KEY,key);
    }catch(_){}

    installFetch(ew);

    try{
      const dw=frame.contentWindow;
      const old=typeof dw.sendToEngine==='function'?dw.sendToEngine.bind(dw):null;
      dw.sendToEngine=async function(message){
        const text=clean(message);
        if(!text)return false;

        try{
          const current=inner.contentWindow;
          if(current && typeof current.sendMessage==='function'){
            await current.sendMessage(text,null);
            return true;
          }
        }catch(err){
          setStatus('E.V. brain request failed — check the Groq key or connection.',true);
          throw err;
        }

        if(old)return await old(text);
        return false;
      };
      dw.__EV_RUNTIME_BRIDGE_V2__=true;
    }catch(err){
      setStatus('E.V. bridge could not be installed.',true);
      return;
    }

    try{
      const d=frame.contentDocument;
      const input=d?.getElementById('commandInput');
      if(input)input.autocomplete='off';
      setStatus('Engine connected. Memory active. Brain ready.');
      const label=d?.getElementById('coreLabel');
      if(label)label.textContent='STANDING BY';
    }catch(_){}
  }

  function boot(){
    const frame=dashboard();
    if(!frame)return;
    frame.addEventListener('load',()=>install(),{once:true});
    install();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.EVRuntime={reconnect:install};
})();
