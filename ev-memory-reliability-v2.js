(function(){
  'use strict';
  const KEY='ev-core-memory-v1', ARCH='ev-conversation-archive-v1', VERSION='3-reliable-save-retrieve';
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(_){return {}}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));window.__evMemoryLastWrite=Date.now();return true}catch(_){return false}};
  const normalize=m=>({facts:Array.isArray(m?.facts)?m.facts:[],preferences:Array.isArray(m?.preferences)?m.preferences:[],projects:Array.isArray(m?.projects)?m.projects:[],tasks:Array.isArray(m?.tasks)?m.tasks:[]});
  function bucketFor(text){const t=text.toLowerCase();if(/\b(favorite|favourite|prefer|likes?|love|hate|don'?t like)\b/.test(t))return 'preferences';if(/\b(project|building|working on|making|creating|developing)\b/.test(t))return 'projects';if(/\b(task|todo|to-do|need to|remind me)\b/.test(t))return 'tasks';return 'facts'}
  function extract(text){
    const t=clean(text); if(!t)return null;
    let m=t.match(/^(?:e\.?\s*v\.?[,:]?\s*)?(?:please\s+)?(?:remember|save|store|keep in memory|memorize)\s+(?:that\s+)?(.+)$/i);
    if(!m)return null;
    let value=clean(m[1]).replace(/[.!]+$/,''); if(!value)return null;
    if(/^this\b/i.test(value)) value=value.replace(/^this\b\s*/i,'');
    return {value,bucket:bucketFor(value)};
  }
  function save(text){const x=extract(text);if(!x)return null;const m=normalize(read());const v=x.value;const sig=v.toLowerCase();let exists=false;for(const b of Object.keys(m)){for(const item of m[b])if(clean(item).toLowerCase()===sig)exists=true}if(!exists)m[x.bucket].push(v);const ok=write(m);window.__evMemoryLastSaved=ok?{value:v,bucket:x.bucket}:null;window.__evMemoryCount=Object.values(m).reduce((n,a)=>n+a.length,0);return {ok,value:v,bucket:x.bucket,exists,count:window.__evMemoryCount}}
  function summary(){const m=normalize(read());return Object.entries(m).flatMap(([bucket,items])=>items.map(v=>({bucket,value:clean(v)}))).filter(x=>x.value)}
  function isMemoryQuestion(t){return /\b(what do you remember|what did i tell you to remember|what'?s in your memory|show me my memory|do you remember|remember about me|what do you know about me)\b/i.test(t)}
  function memoryPrompt(){const all=summary();if(!all.length)return 'No saved user memory is currently available. Do not claim that something was saved unless a memory record exists.';return 'VERIFIED E.V. MEMORY (use these as saved facts only):\n'+all.map(x=>'- ['+x.bucket+'] '+x.value).join('\n')}
  function install(){
    window.EVMemory={save,summary,memoryPrompt,extract,isMemoryQuestion,version:VERSION};
    window.__evMemoryReliabilityVersion=VERSION;
    const originalFetch=window.fetch?.bind(window); if(originalFetch&&!window.__evMemoryFetchPatched){
      window.fetch=async function(input,init){
        try{
          const url=typeof input==='string'?input:(input&&input.url)||'';
          if(url.includes('/openai/v1/chat/completions')&&init?.body){
            const body=JSON.parse(init.body); const msgs=Array.isArray(body.messages)?body.messages:null;
            if(msgs){const user=msgs.filter(m=>m?.role==='user').slice(-1)[0]?.content||''; if(isMemoryQuestion(user)){body.messages=[...msgs,{role:'system',content:memoryPrompt()}];init={...init,body:JSON.stringify(body)}}}
          }
        }catch(_){}
        return originalFetch(input,init)
      };window.__evMemoryFetchPatched=true;
    }
    const process=()=>{try{const el=document.getElementById('input');const t=el?.value||'';const result=save(t);if(result&&result.ok){window.__evMemoryLastSaved=result;setTimeout(()=>{try{const status=document.getElementById('statusText');if(status)status.textContent='MEMORY SAVED'}catch(_){}},0)}}catch(_){} };
    document.addEventListener('click',e=>{if(e.target?.id==='sendBtn')process()},true);
    document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement?.id==='input')process()},true);
    document.addEventListener('change',process,true);
    setInterval(()=>{try{const el=document.getElementById('input');if(el&&el.value&&extract(el.value))save(el.value)}catch(_){}},800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();