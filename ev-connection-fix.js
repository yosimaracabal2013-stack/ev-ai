/* E.V. connection resilience layer v2
   Keeps E.V.'s existing brain/UI intact while reducing unnecessary Groq load.
   If Groq is rate-limited, try the smaller model once, then enter a short
   cooldown instead of repeatedly hammering the API.
*/
(function(){
  const originalFetch = window.fetch.bind(window);
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const COOLDOWN_KEY = 'ev-groq-cooldown-until';
  const COOLDOWN_MS = 30000;

  function setStatus(text){try{const el=document.getElementById('linkStatus');if(el)el.textContent=text;}catch(_){}}
  function showMessage(text){try{if(typeof addRow==='function')addRow('ev',text);}catch(_){} }
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function cooldownUntil(){try{return Number(localStorage.getItem(COOLDOWN_KEY)||0)}catch(_){return 0}}
  function setCooldown(ms){try{localStorage.setItem(COOLDOWN_KEY,String(Date.now()+ms))}catch(_){} }

  async function resilientFetch(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url!==GROQ_URL||!init||String(init.method||'GET').toUpperCase()!=='POST')return originalFetch(input,init);

    const until=cooldownUntil();
    if(until>Date.now()){
      setStatus('RATE LIMITED');
      showMessage('E.V. is in a short Groq cooldown so I don’t keep sending requests while the limit is active. Her local memory and tools are still available. Please try the main chat again in a little while.');
      const e=new Error('Groq rate-limit cooldown');e.name='EVRateLimitCooldown';throw e;
    }

    let nextInit={...init},body={};
    try{
      body=JSON.parse(init.body||'{}');
      if(Array.isArray(body.messages)&&body.messages.length>13){
        const system=body.messages.find(m=>m.role==='system');
        const rest=body.messages.filter(m=>m.role!=='system').slice(-12);
        body.messages=system?[system,...rest]:rest;
      }
      body.max_completion_tokens=Math.min(Number(body.max_completion_tokens||700),700);
      if(body.model==='openai/gpt-oss-120b')body.reasoning_effort='low';
      nextInit.body=JSON.stringify(body);
    }catch(_){}

    const models=[];
    if(body.model)models.push(body.model);
    if(body.model==='openai/gpt-oss-120b')models.push('openai/gpt-oss-20b');

    for(let modelIndex=0;modelIndex<models.length;modelIndex++){
      const model=models[modelIndex];
      let modelInit={...nextInit};
      try{
        const b=JSON.parse(nextInit.body||'{}');
        b.model=model;b.max_completion_tokens=Math.min(Number(b.max_completion_tokens||700),700);
        if(model==='openai/gpt-oss-120b')b.reasoning_effort='low';else delete b.reasoning_effort;
        modelInit.body=JSON.stringify(b);
      }catch(_){}

      try{
        setStatus(model==='openai/gpt-oss-20b'?'FALLBACK CORE':'LINK ACTIVE');
        const response=await originalFetch(input,modelInit);
        if(response.status!==429)return response;
        if(modelIndex<models.length-1){setStatus('FALLBACK CORE');continue;}
        setCooldown(COOLDOWN_MS);
        setStatus('RATE LIMITED');
        showMessage('E.V. is temporarily rate-limited by Groq. I stopped retrying automatically so the limit doesn’t get worse. Her memory and local features are safe.');
        return response;
      }catch(err){
        setStatus('RECONNECTING');
        if(modelIndex<models.length-1)continue;
        showMessage('E.V. could not reach Groq. Check the connection and try again.');
        throw err;
      }
    }
    return originalFetch(input,nextInit);
  }
  window.fetch=resilientFetch;
})();