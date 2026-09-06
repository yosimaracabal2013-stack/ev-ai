(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');
  if(!frame)return;
  const FKEY='ev-fish-api-key',FREF='ev-fish-reference-id',FISH='https://api.fish.audio/v1/tts',DEFAULT_REF='933563129e564b19a115bedd57b7406a',MODEL='s2.1-pro-free';
  function add(w,text){try{w.add(text)}catch(_){}
  }
  function explain(status,body){
    const s=String(body||'').toLowerCase();
    if(status===401)return 'The Fish Audio key was rejected (401). Check that the key is valid.';
    if(status===402)return 'Fish Audio returned 402, which usually means the account needs available API credits or the free access window is no longer available.';
    if(status===403)return 'Fish Audio returned 403. The free S2.1 Pro API access window has ended or this account/model is not authorized.';
    if(status===404)return 'Fish Audio could not find the requested voice/model.';
    if(s.includes('insufficient')||s.includes('credit')||s.includes('balance'))return 'Fish Audio says the account needs API credits for this request.';
    return 'Fish Audio returned '+status+'. '+String(body||'').slice(0,300);
  }
  async function fishSpeak(w,text,key,ref){
    const r=await w.fetch(FISH,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','model':MODEL},body:JSON.stringify({text:String(text||'').trim(),reference_id:ref||DEFAULT_REF,format:'mp3'})});
    if(!r.ok){const body=await r.text().catch(()=> '');throw new Error(explain(r.status,body))}
    const blob=await r.blob(),url=URL.createObjectURL(blob),a=new w.Audio(url);
    w.document.getElementById('voiceState').textContent='FISH AUDIO';w.document.getElementById('voiceBar').style.width='100%';
    a.onended=()=>{w.document.getElementById('voiceState').textContent='READY';w.document.getElementById('voiceBar').style.width='92%';URL.revokeObjectURL(url)};
    a.onerror=()=>{w.document.getElementById('voiceState').textContent='VOICE ERROR';URL.revokeObjectURL(url)};
    await a.play();return true;
  }
  function patch(){
    try{
      const w=frame.contentWindow;if(!w||w.__evFishRepairV3)return;w.__evFishRepairV3=true;
      const originalSpeak=w.speak;
      w.speak=async function(text){
        const key=(w.localStorage.getItem(FKEY)||'').trim();
        if(!key)return originalSpeak?originalSpeak(text):false;
        try{return await fishSpeak(w,text,key,w.localStorage.getItem(FREF)||DEFAULT_REF)}
        catch(e){w.speechSynthesis?.cancel();add(w,'Fish Audio is not available right now. '+(e.message||'voice request failed')+' I kept your Fish key saved, and I did not pretend the old voice was Fish.');w.document.getElementById('voiceState').textContent='FISH ERROR';return false}
      };
      w.setupFish=async function(){
        const k=w.prompt('Paste your Fish Audio API key. It stays on this device and is not saved to GitHub.');
        if(k===null)return false;
        if(!k.trim()){w.localStorage.removeItem(FKEY);w.localStorage.removeItem(FREF);add(w,'Fish Audio voice is off.');return false}
        w.localStorage.setItem(FKEY,k.trim());w.localStorage.setItem(FREF,DEFAULT_REF);
        try{await fishSpeak(w,'Fish Audio voice test successful.',k.trim(),DEFAULT_REF);add(w,'Fish Audio is connected and the voice test worked.');return true}
        catch(e){w.document.getElementById('voiceState').textContent='FISH ERROR';add(w,'Fish Audio connection test failed: '+(e.message||'unknown error')+'. I kept the key saved so you do not have to enter it again.');return false}
      };
    }catch(e){console.warn('Fish repair attach failed',e)}
  }
  frame.addEventListener('load',patch);setTimeout(patch,100);setTimeout(patch,800);setTimeout(patch,1800);
})();
