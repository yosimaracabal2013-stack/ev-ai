(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');
  if(!frame)return;
  const FKEY='ev-fish-api-key',FREF='ev-fish-reference-id',FISH='https://api.fish.audio/v1/tts',DEFAULT_REF='933563129e564b19a115bedd57b7406a',PRIMARY_MODEL='s2.1-pro',FREE_MODEL='s2.1-pro-free';
  function add(w,text){try{w.add(text)}catch(_){}
  }
  function explain(status,body){
    const s=String(body||'').toLowerCase();
    if(status===401)return 'The Fish Audio key was rejected (401).';
    if(status===402)return 'Fish Audio requires available API credits for this model/account.';
    if(status===403)return 'Fish Audio denied this model request.';
    if(status===404)return 'Fish Audio could not find the requested voice/model.';
    if(s.includes('insufficient')||s.includes('credit')||s.includes('balance'))return 'Fish Audio says the account needs API credits for this request.';
    return 'Fish Audio returned '+status+'. '+String(body||'').slice(0,220);
  }
  async function fishRequest(w,text,key,ref,model){
    const r=await w.fetch(FISH,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','model':model},body:JSON.stringify({text:String(text||'').trim(),reference_id:ref||DEFAULT_REF,format:'mp3'})});
    if(!r.ok){const body=await r.text().catch(()=> '');const e=new Error(explain(r.status,body));e.status=r.status;throw e}
    return r;
  }
  async function fishSpeak(w,text,key,ref){
    let r;
    try{r=await fishRequest(w,text,key,ref,PRIMARY_MODEL)}
    catch(e){if(e.status!==402&&e.status!==403&&e.status!==404)throw e;r=await fishRequest(w,text,key,ref,FREE_MODEL)}
    const blob=await r.blob(),url=URL.createObjectURL(blob),a=new w.Audio(url);
    w.document.getElementById('voiceState').textContent='FISH AUDIO';w.document.getElementById('voiceBar').style.width='100%';
    a.onended=()=>{w.document.getElementById('voiceState').textContent='READY';w.document.getElementById('voiceBar').style.width='92%';URL.revokeObjectURL(url)};
    a.onerror=()=>{w.document.getElementById('voiceState').textContent='VOICE ERROR';URL.revokeObjectURL(url)};
    await a.play();return true;
  }
  function localFallback(w,text,reason){
    try{w.speechSynthesis?.cancel();const u=new w.SpeechSynthesisUtterance(String(text||''));u.lang='en-US';u.rate=.98;u.pitch=1.04;const voices=w.speechSynthesis?.getVoices?.()||[];const female=voices.find(v=>/en-US|en_US/i.test(v.lang)&&/Samantha|Karen|Ava|Female|Zoe/i.test(v.name));if(female)u.voice=female;u.onstart=()=>{w.document.getElementById('voiceState').textContent='LOCAL VOICE'};u.onend=()=>{w.document.getElementById('voiceState').textContent='READY';w.document.getElementById('voiceBar').style.width='92%'};w.speechSynthesis?.speak(u);if(reason)add(w,'Fish Audio is unavailable, so I switched to the local voice instead of going silent.');return true}catch(_){return false}
  }
  function patch(){
    try{
      const w=frame.contentWindow;if(!w||w.__evFishRepairV5)return;w.__evFishRepairV5=true;
      const originalSpeak=w.speak;
      w.speak=async function(text){
        const key=(w.localStorage.getItem(FKEY)||'').trim();
        if(!key)return originalSpeak?originalSpeak(text):false;
        try{return await fishSpeak(w,text,key,w.localStorage.getItem(FREF)||DEFAULT_REF)}
        catch(e){w.document.getElementById('voiceState').textContent='LOCAL FALLBACK';return localFallback(w,text,true)}
      };
      w.setupFish=async function(){
        const k=w.prompt('Paste your Fish Audio API key. It stays on this device and is not saved to GitHub.');
        if(k===null)return false;
        if(!k.trim()){w.localStorage.removeItem(FKEY);w.localStorage.removeItem(FREF);add(w,'Fish Audio voice is off.');return false}
        w.localStorage.setItem(FKEY,k.trim());w.localStorage.setItem(FREF,DEFAULT_REF);
        try{await fishSpeak(w,'Fish Audio voice test successful.',k.trim(),DEFAULT_REF);add(w,'Fish Audio is connected and the voice test worked.');return true}
        catch(e){w.document.getElementById('voiceState').textContent='LOCAL FALLBACK';localFallback(w,'Fish Audio did not connect, so E.V. is still able to speak. '+(e.message||'voice request failed'));return false}
      };
    }catch(e){console.warn('Fish repair attach failed',e)}
  }
  frame.addEventListener('load',patch);setTimeout(patch,100);setTimeout(patch,800);setTimeout(patch,1800);
})();
