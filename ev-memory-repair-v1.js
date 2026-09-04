(function(){
  'use strict';
  try{
    const MEMORY_KEY='ev-core-memory-v1';
    const ARCHIVE_KEY='ev-conversation-archive-v1';
    const safeJSON=(s)=>{try{return JSON.parse(s)}catch(_){return null}};
    const arr=(v)=>Array.isArray(v)?v:[];
    const clean=(s)=>String(s??'').replace(/\s+/g,' ').trim();

    // Convert every legacy memory shape into the string format the current E.V. core expects.
    const factText=(x)=>{
      if(x==null)return '';
      if(typeof x==='string'||typeof x==='number'||typeof x==='boolean')return clean(x);
      if(Array.isArray(x))return x.map(factText).filter(Boolean).join(' | ');
      if(typeof x==='object'){
        for(const key of ['fact','text','content','value','memory','detail','description','name']){
          if(x[key]!=null){
            const s=factText(x[key]);
            if(s)return s;
          }
        }
        // Older versions sometimes stored a single fact as an object with a label/value pair.
        const parts=Object.entries(x)
          .filter(([k])=>!['id','savedAt','createdAt','updatedAt','timestamp'].includes(k))
          .map(([k,v])=>{
            const s=factText(v);
            return s ? (k==='label'?s:(k+': '+s)) : '';
          }).filter(Boolean);
        return parts.join(' | ');
      }
      return '';
    };

    const current=safeJSON(localStorage.getItem(MEMORY_KEY)||'')||{};
    const out={facts:[],preferences:[],projects:[],tasks:[]};
    const seen=new Set();
    const add=(bucket,v)=>{
      if(v==null)return;
      const vals=Array.isArray(v)?v:[v];
      for(const x of vals){
        const value=factText(x);
        if(value.length<2)continue;
        const sig=value.toLowerCase();
        if(!seen.has(sig)){
          out[bucket].push(value);
          seen.add(sig);
        }
      }
    };

    // First normalize whatever is already in the current store.
    for(const bucket of Object.keys(out)) add(bucket,current[bucket]);

    let migrated=false;
    // Recover memory from every legacy E.V. storage name, including the old ev-memory store
    // and the browser-backup names used by earlier memory builds.
    const memoryKeyRe=/(^|[-_])(memory|memories|profile|facts|preferences|projects|tasks|personal)([-_]|$)|ev-memory|ev-backup-ev-memory|ev-fallback-ev-memory|ev-memory-backup-ev-memory/i;
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(key===MEMORY_KEY||key===ARCHIVE_KEY)continue;
      const raw=localStorage.getItem(key)||'';
      const data=safeJSON(raw);
      if(data==null)continue;
      const k=key.toLowerCase();
      if(!memoryKeyRe.test(k))continue;

      const before=seen.size;
      if(Array.isArray(data)) add('facts',data);
      if(data&&typeof data==='object'&&!Array.isArray(data)){
        if(data.facts!=null)add('facts',data.facts);
        if(data.preferences!=null)add('preferences',data.preferences);
        if(data.projects!=null)add('projects',data.projects);
        if(data.tasks!=null)add('tasks',data.tasks);
        // Legacy ev-memory is commonly [{fact:"..."}], so preserve each entry's fact text.
        if(data.memory!=null)add('facts',data.memory);
        if(data.fact!=null)add('facts',data.fact);
        if(data.text!=null)add('facts',data.text);
        if(data.name!=null)add('facts','User name: '+factText(data.name));
        if(data.username!=null)add('facts','Username: '+factText(data.username));
        if(data.userName!=null)add('facts','User name: '+factText(data.userName));
        if(data.owner!=null)add('facts',data.owner);
      }
      if(seen.size>before)migrated=true;
    }

    // Keep the current store clean: no objects, no [object Object] entries.
    localStorage.setItem(MEMORY_KEY,JSON.stringify(out));

    // Merge older conversation/history archives into the current archive without deleting anything.
    let archive=safeJSON(localStorage.getItem(ARCHIVE_KEY)||'');
    if(!Array.isArray(archive))archive=[];
    const sigs=new Set(archive.map(x=>JSON.stringify(x)));
    const normalizeMessages=(v)=>{
      if(!Array.isArray(v))return [];
      return v.map(m=>{
        if(!m||typeof m!=='object')return null;
        const role=m.role==='assistant'||m.role==='user'?m.role:null;
        if(!role)return null;
        const content=factText(m.content);
        return content?{role,content}:null;
      }).filter(Boolean);
    };
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
        const messages=normalizeMessages(Array.isArray(item.messages)?item.messages:item.history);
        if(!messages.length)continue;
        const normalized={messages};
        const sig=JSON.stringify(normalized);
        if(!sigs.has(sig)){archive.push(normalized);sigs.add(sig);migrated=true;}
      }
    }
    if(archive.length)localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archive));

    window.__evMemoryRepairRan=true;
    window.__evMemoryRepairMigrated=!!migrated;
    window.__evMemoryRepairVersion='2-object-normalizer';
  }catch(err){
    try{window.__evMemoryRepairError=String(err)}catch(_){}
  }
})();