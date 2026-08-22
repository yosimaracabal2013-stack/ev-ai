/* E.V. connection resilience layer
   Keeps the existing E.V. brain/UI intact while reducing unnecessary Groq load,
   retrying temporary rate limits, and surfacing real connection problems. */
(function(){
  const originalFetch = window.fetch.bind(window);
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  function setStatus(text){
    try{
      const el = document.getElementById('linkStatus');
      if(el) el.textContent = text;
    }catch(_){ }
  }

  function showMessage(text){
    try{
      if(typeof addRow === 'function') addRow('ev', text);
    }catch(_){ }
  }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function resilientFetch(input, init){
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if(url !== GROQ_URL || !init || String(init.method || 'GET').toUpperCase() !== 'POST'){
      return originalFetch(input, init);
    }

    let nextInit = {...init};
    try{
      const body = JSON.parse(init.body || '{}');
      if(Array.isArray(body.messages) && body.messages.length > 13){
        const system = body.messages.find(m => m.role === 'system');
        const rest = body.messages.filter(m => m.role !== 'system').slice(-12);
        body.messages = system ? [system, ...rest] : rest;
      }
      // Keep replies fast and reduce token pressure on free-tier limits.
      body.max_completion_tokens = Math.min(Number(body.max_completion_tokens || 700), 700);
      if(body.model === 'openai/gpt-oss-120b') body.reasoning_effort = 'low';
      nextInit.body = JSON.stringify(body);
    }catch(_){ }

    for(let attempt=0; attempt<3; attempt++){
      try{
        const response = await originalFetch(input, nextInit);
        if(response.status !== 429) return response;

        const retryAfter = Number(response.headers.get('retry-after') || 0);
        const waitMs = Math.min(Math.max(retryAfter * 1000, 1500 * (attempt + 1)), 10000);
        setStatus('RATE LIMITED');
        if(attempt < 2){
          await sleep(waitMs);
          setStatus('RECONNECTING');
          continue;
        }
        showMessage('Groq is rate-limiting E.V. right now. I reduced the request size and retried automatically; please wait a little and try again.');
        return response;
      }catch(err){
        if(attempt >= 2){
          setStatus('LINK DOWN');
          showMessage('E.V. could not reach Groq. Check the connection and try again.');
          throw err;
        }
        setStatus('RECONNECTING');
        await sleep(900 * (attempt + 1));
      }
    }
    return originalFetch(input, nextInit);
  }

  window.fetch = resilientFetch;
})();
