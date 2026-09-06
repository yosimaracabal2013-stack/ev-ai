(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');
  if(!frame)return;
  const FKEY='ev-fish-api-key',FREF='ev-fish-reference-id',FISH='https://api.fish.audio/v1/tts',DEFAULT_REF='933563129e564b19a115bedd57b7406a';
  function add(w,text){try{w.add(text)}catch(_){}
  }
  async function fishSpeak(w,text,key,ref){
    const r=await w.fetch(FISH,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','model':'s2.1-pro-free'},body:JSON.stringify({text:String(text||'').trim(),reference_id:ref||DEFAULT_REF,format:'mp3',temperature:.7,top_p:.7,normalize:true})});
    if(!r.ok)throw new Error('Fish Audio '+r.status+': '+(await r.text().catch(()=>'')));
    const blob=await r.blob(),url=URL.createObjectURL(blob),a=new w.Audio(url);
    w.document.getElementById('voiceState').textContent='FISH AUDIO';w.document.getElementById('voiceBar').style.width='100%';
    a.onended=()=>{w.document.getElementById('voiceState').textContent='READY';w.document.getElementById('voiceBar').style.width='92%';URL.revokeObjectURL(url)};
    a.onerror=()=>{w.document.getElementById('voiceState').textContent='VOICE ERROR';URL.revokeObjectURL(url)};
    await a.play();return true;
  }
  function patch(){
    try{
      const w=frame.contentWindow;if(!w||w.__evFishRepairV2)return;w.__evFishRepairV2=true;
      const originalSpeak=w.speak;
      w.speak=async function(text){
        const key=(w.localStorage.getItem(FKEY)||'').trim();
        if(!key)return originalSpeak?originalSpeak(text):false;
        try{return await fishSpeak(w,text,key,w.localStorage.getItem(FREF)||DEFAULT_REF)}
        catch(e){w.speechSynthesis?.cancel();add(w,'Fish Audio is configured, but its voice request failed. E.V. will not silently switch back to the old voice. '+(e.message||''));w.document.getElementById('voiceState').textContent='FISH ERROR';return false}
      };
      w.setupFish=async function(){
        const k=w.prompt('Paste your Fish Audio API key. It stays on this device and is not saved to GitHub.');
        if(k===null)return false;
        if(!k.trim()){w.localStorage.removeItem(FKEY);w.localStorage.removeItem(FREF);add(w,'Fish Audio voice is off.');return false}
        w.localStorage.setItem(FKEY,k.trim());w.localStorage.setItem(FREF,DEFAULT_REF);
        try{await fishSpeak(w,'Fish Audio voice test successful.',k.trim(),DEFAULT_REF);add(w,'Fish Audio is connected and the new voice is working.');return true}
        catch(e){w.localStorage.removeItem(FKEY);w.localStorage.removeItem(FREF);w.speechSynthesis?.cancel();add(w,'Fish Audio did not connect: '+(e.message||'unknown error')+'. Your old voice was not used as a fallback.');return false}
      };
    }catch(e){console.warn('Fish repair attach failed',e)}
  }
  frame.addEventListener('load',patch);setTimeout(patch,100);setTimeout(patch,800);setTimeout(patch,1800);
})();
