/* E.V. connection resilience layer
   Keeps E.V.'s existing brain/UI intact while reducing unnecessary Groq load.
   If the primary model is temporarily rate-limited, try the smaller GPT-OSS 20B
   model before giving up. */
(function(){
  const originalFetch = window.fetch.bind(window);
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  function setStatus(text){
    try{
      const el=document.getElementById('linkStatus');
      if(el) el.textContent=text;
    }catch(_){ }
  }

  function showMessage(text){
    try{ if(typeof addRow==='function') addRow('ev',text); }catch(_){ }
  }

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  async function resilientFetch(input,init){
    const url=typeof input==='string' ? input : (input&&input.url)||'';
    if(url!==GROQ_URL || !init || String(init.method||'GET').toUpperCase()!=='POST'){
      return originalFetch(input,init);
    }

    let nextInit={...init};
    let body={};
    try{
      body=JSON.parse(init.body||'{}');
      if(Array.isArray(body.messages) && body.messages.length>13){
        const system=body.messages.find(m=>m.role==='system');
        const rest=body.messages.filter(m=>m.role!=='system').slice(-12);
        body.messages=system ? [system,...rest] : rest;
      }
      body.max_completion_tokens=Math.min(Number(body.max_completion_tokens||700),700);
      if(body.model==='openai/gpt-oss-120b') body.reasoning_effort='low';
      nextInit.body=JSON.stringify(body);
    }catch(_){ }

    // Primary model gets one normal attempt. If it is rate-limited, immediately
    // try the smaller GPT-OSS 20B model instead of hammering the same endpoint.
    const models=[];
    if(body.model) models.push(body.model);
    if(body.model==='openai/gpt-oss-120b') models.push('openai/gpt-oss-20b');

    for(let modelIndex=0;modelIndex<models.length;modelIndex++){
      const model=models[modelIndex];
      let modelInit={...nextInit};
      try{
        const b=JSON.parse(nextInit.body||'{}');
        b.model=model;
        b.max_completion_tokens=Math.min(Number(b.max_completion_tokens||700),700);
        if(model==='openai/gpt-oss-120b') b.reasoning_effort='low';
        else delete b.reasoning_effort;
        modelInit.body=JSON.stringify(b);
      }catch(_){ }

      for(let attempt=0;attempt<2;attempt++){
        try{
          setStatus(model==='openai/gpt-oss-20b' ? 'FALLBACK CORE' : (attempt ? 'RECONNECTING' : 'LINK ACTIVE'));
          const response=await originalFetch(input,modelInit);
          if(response.status!==429) return response;

          const retryAfter=Number(response.headers.get('retry-after')||0);
          if(modelIndex<models.length-1){
            // Don't wait through several identical 120B retries; move to 20B.
            setStatus('FALLBACK CORE');
            break;
          }
          if(attempt<1){
            const waitMs=Math.min(Math.max(retryAfter*1000,1500),8000);
            setStatus('RATE LIMITED');
            await sleep(waitMs);
            continue;
          }
          showMessage('E.V. is temporarily rate-limited by Groq. Her memory and features are still safe — wait a moment and try again.');
          setStatus('RATE LIMITED');
          return response;
        }catch(err){
          if(modelIndex<models.length-1){
            setStatus('FALLBACK CORE');
            break;
          }
          if(attempt<1){
            setStatus('RECONNECTING');
            await sleep(700);
            continue;
          }
          setStatus('LINK DOWN');
          showMessage('E.V. could not reach Groq. Check the connection and try again.');
          throw err;
        }
      }
    }
    return originalFetch(input,nextInit);
  }

  window.fetch=resilientFetch;
})();
