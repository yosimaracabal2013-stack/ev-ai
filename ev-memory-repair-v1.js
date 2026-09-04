(function(){
  'use strict';
  try{
    const MEMORY_KEY='ev-core-memory-v1';
    const ARCHIVE_KEY='ev-conversation-archive-v1';
    const safeJSON=(s)=>{try{return JSON.parse(s)}catch(_){return null}};
    const arr=(v)=>Array.isArray(v)?v:[];
    const clean=(s)=>String(s??'').replace(/\s+/g,' ').trim();
    const current=safeJSON(localStorage.getItem(MEMORY_KEY)||'')||{facts:[],preferences:[],projects:[],tasks:[]};
    const out={facts:arr(current.facts),preferences:arr(current.preferences),projects:arr(current.projects),tasks:arr(current.tasks)};
    const seen=new Set();
    Object.values(out).forEach(a=>a.forEach(x=>seen.add(typeof x==='string'?x:JSON.stringify(x))));
    let migrated=false;
    const add=(bucket,v)=>{
      if(v==null)return;
      const vals=Array.isArray(v)?v:[v];
      for(const x of vals){
        if(x==null)continue;
        const value=typeof x==='string'?clean(x):x;
        if(!value || (typeof value==='string'&&value.length<2))continue;
        const sig=typeof value==='string'?value:JSON.stringify(value);
        if(!seen.has(sig)){out[bucket].push(value);seen.add(sig);migrated=true;}
      }
    };
    // Recover memory from older E.V. storage names if they still exist.
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(key===MEMORY_KEY||key===ARCHIVE_KEY)continue;
      const value=localStorage.getItem(key)||'';
      const data=safeJSON(value);
      if(!data)continue;
      const k=key.toLowerCase();
      if(/memory|memories|profile|facts|preferences|projects|tasks|personal/.test(k)){
        if(data.facts)add('facts',data.facts);
        if(data.preferences)add('preferences',data.preferences);
        if(data.projects)add('projects',data.projects);
        if(data.tasks)add('tasks',data.tasks);
        if(Array.isArray(data))add('facts',data);
        if(typeof data==='object'&&!Array.isArray(data)){
          if(data.name||data.username||data.userName||data.owner||data.user) add('facts',[data.name&&('User name: '+data.name),data.username&&('Username: '+data.username),data.userName&&('User name: '+data.userName)]);
        }
      }
    }
    localStorage.setItem(MEMORY_KEY,JSON.stringify(out));
    // Merge older conversation/history archives into the current archive without deleting anything.
    let archive=safeJSON(localStorage.getItem(ARCHIVE_KEY)||'');
    if(!Array.isArray(archive))archive=[];
    const sigs=new Set(archive.map(x=>JSON.stringify(x)));
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(key===MEMORY_KEY||key===ARCHIVE_KEY)continue;
      const data=safeJSON(localStorage.getItem(key)||'');
      if(!data)continue;
      const k=key.toLowerCase();
      if(!/chat|history|conversation|archive|messages/.test(k))continue;
      const candidates=Array.isArray(data)?data:[data];
      for(const item of candidates){
        if(!item||typeof item!=='object')continue;
        if(Array.isArray(item.messages)||Array.isArray(item.history)){
          const normalized={messages:Array.isArray(item.messages)?item.messages:item.history};
          const sig=JSON.stringify(normalized);
          if(!sigs.has(sig)){archive.push(normalized);sigs.add(sig);migrated=true;}
        }
      }
    }
    if(archive.length)localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archive));
    window.__evMemoryRepairRan=true;
    window.__evMemoryRepairMigrated=!!migrated;
  }catch(err){
    try{window.__evMemoryRepairError=String(err)}catch(_){}
  }
})();