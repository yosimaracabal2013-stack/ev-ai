/* E.V. COMMAND RUNTIME FIX v1
   Keeps the new command interface, but makes the hidden brain bridge reliable.
   Main fixes:
   - waits for the real engine before sending
   - bounds Groq context so the free-tier token window is not accidentally flooded
   - retries GPT-OSS 120B with GPT-OSS 20B on rate-limit responses
   - surfaces the real connection state instead of leaving E.V. stuck on PROCESSING
   - preserves local memory/history in the engine
*/
(function(){
  'use strict';
  const KEY='ev-groq-api-key';
  const MAX_SYSTEM_CHARS=5600;
  const MAX_HISTORY_MESSAGES=8;
  const MAX_MESSAGE_CHARS=1400;
  const MAX_OUTPUT_TOKENS=650;

  function text(v){return String(v==null?'':v);}
  function clean(v){return text(v).replace(/\s+/g,' ').trim();}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

  function setDashboardStatus(msg){
    try{
      const d=window.parent?.document;
      const frame=d?.querySelector('#evDashboard');
      const doc=frame?.contentDocument;
      const el=doc?.getElementById('activity');
      if(el) el.innerHTML=msg;
      const label=doc?.getElementById('coreLabel');
      if(label && /error|offline|missing|failed/i.test(msg)) label.textContent='BRAIN OFFLINE';
    }catch(_){}
  }

  function trimSystem(value){
    const s=text(value);
    if(s.length<=MAX_SYSTEM_CHARS)return s;
    return s.slice(0,3800)+'\n\n[older continuity context trimmed to keep the live brain responsive]\n\n'+s.slice(-1600);
  }

  function boundBody(body){
    const b={...body};
    if(Array.isArray(b.messages)){
      const system=b.messages.find(m=>m?.role==='system');
      const rest=b.messages.filter(m=>m?.role!=='system').slice(-MAX_HISTORY_MESSAGES).map(m=>{
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

  function installFetch(ew){
    if(!ew || ew.__EV_RUNTIME_FETCH_FIX__)return;
    const original=ew.fetch.bind(ew);
    ew.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(!url.includes('api.groq.com/openai/v1/chat/completions') || !init?.body){
        return original(input,init);
      }
      let body;
      try{body=boundBody(JSON.parse(init.body));}
      catch(_){return original(input,init);}

      const base={...init,body:JSON.stringify(body)};
      try{
        const response=await original(input,base);
        if(response.status!==429)return response;
        if(body.model!=='openai/gpt-oss-120b')return response;
        const fallback={...body,model:'openai/gpt-oss-20b',reasoning_effort:'low'};
        return await original(input,{...init,body:JSON.stringify(fallback)});
      }catch(err){
        setDashboardStatus('Brain link failed — check the Groq key or connection.');
        throw err;
      }
    };
    ew.__EV_RUNTIME_FETCH_FIX__=true;
  }

  async function waitForEngine(frame){
    for(let i=0;i<30;i++){
      try{
        const ew=frame.contentWindow;
        const ed=frame.contentDocument;
        if(ed && ew && typeof ew.sendMessage==='function')return {ew,ed};
      }catch(_){}
      await sleep(250);
    }
    return null;
  }

  async function install(frame){
    if(!frame)return;
    const pair=await waitForEngine(frame);
    if(!pair)return;
    const {ew,ed}=pair;
    try{
      const key=localStorage.getItem(KEY);
      if(key && !ew.localStorage.getItem(KEY))ew.localStorage.setItem(KEY,key);
    }catch(_){}

    installFetch(ew);

    try{
      const old=frame.contentWindow.sendToEngine;
      frame.contentWindow.sendToEngine=async function(message){
        const t=clean(message);
        if(!t)return false;
        const engineWindow=frame.contentWindow.document.getElementById('engine')?.contentWindow || ew;
        if(typeof engineWindow.sendMessage==='function'){
          await engineWindow.sendMessage(t,null);
          return true;
        }
        if(typeof old==='function')return await old(t);
        return false;
      };
      frame.contentWindow.__EV_RUNTIME_BRIDGE_FIX__=true;
    }catch(_){}

    try{
      const d=frame.contentDocument;
      const input=d.getElementById('commandInput');
      if(input)input.autocomplete='off';
      const activity=d.getElementById('activity');
      if(activity)activity.innerHTML='Engine connected. Memory active. Brain ready.';
      const label=d.getElementById('coreLabel');
      if(label)label.textContent='STANDING BY';
    }catch(_){}
  }

  function boot(){
    const frame=document.getElementById('evDashboard');
    if(!frame)return;
    frame.addEventListener('load',()=>setTimeout(()=>install(frame),150));
    setTimeout(()=>install(frame),300);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
