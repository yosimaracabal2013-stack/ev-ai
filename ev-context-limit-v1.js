(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');
  if(!frame)return;

  const MAX_CHARS=24000;
  const SYSTEM_CHARS=11000;
  const HISTORY_CHARS=9000;

  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const clip=(s,n)=>{s=text(s);return s.length<=n?s:s.slice(0,n-180)+' … '+s.slice(-170)};

  function compactMemory(w){
    try{
      const raw=w.localStorage.getItem('ev-core-memory-v1');
      if(!raw)return '';
      const m=JSON.parse(raw)||{};
      const all=[];
      for(const bucket of ['facts','preferences','projects','tasks']){
        const a=Array.isArray(m[bucket])?m[bucket]:[];
        for(const x of a){
          const s=text(x);
          if(s)all.push({bucket,s});
        }
      }
      const priority=all.filter(x=>/\b(name|my name|called|username|user name|i am|i'm)\b/i.test(x.s));
      const rest=all.filter(x=>!priority.includes(x));
      const ordered=priority.concat(rest);
      const out=[];
      let used=0;
      for(const x of ordered){
        const line='['+x.bucket+'] '+x.s;
        if(used+line.length+1>8500)break;
        out.push(line);used+=line.length+1;
      }
      return out.join('\n');
    }catch(_){return ''}
  }

  function limitBody(w,init){
    try{
      if(!init||typeof init.body!=='string')return init;
      const body=JSON.parse(init.body);
      if(!Array.isArray(body.messages))return init;
      const original=body.messages;
      const sys=original.filter(m=>m&&m.role==='system');
      const non=original.filter(m=>m&&m.role!=='system');
      const compact=compactMemory(w);
      const systemText=sys.map(m=>text(m.content)).filter(Boolean).join('\n\n');
      let compactSystem=clip(systemText,SYSTEM_CHARS);
      if(compact){
        compactSystem += '\n\nLONG-TERM MEMORY (relevant compact copy):\n'+compact;
      }
      compactSystem=clip(compactSystem,SYSTEM_CHARS);

      const kept=[];
      let used=0;
      for(let i=non.length-1;i>=0;i--){
        const m=non[i];
        const c=clip(m.content,1800);
        const item={role:m.role,content:c};
        const cost=c.length+30;
        if(kept.length>=8 || used+cost>HISTORY_CHARS)break;
        kept.unshift(item);used+=cost;
      }
      body.messages=[];
      if(compactSystem)body.messages.push({role:'system',content:compactSystem});
      body.messages.push(...kept);

      // Final safety pass: keep the JSON request comfortably below an 8k-token context.
      while(JSON.stringify(body).length>MAX_CHARS && body.messages.length>2){
        body.messages.splice(1,1);
      }
      if(JSON.stringify(body).length>MAX_CHARS && body.messages.length){
        const last=body.messages[body.messages.length-1];
        if(last&&typeof last.content==='string')last.content=clip(last.content,1200);
      }
      init={...init,body:JSON.stringify(body)};
      return init;
    }catch(_){return init}
  }

  function patch(){
    try{
      const w=frame.contentWindow;
      if(!w||w.__evContextLimitV1)return;
      const originalFetch=w.fetch.bind(w);
      w.fetch=function(input,init){
        try{
          const raw=typeof input==='string'?input:(input&&input.url)||'';
          if(raw.includes('api.groq.com/openai/v1/chat/completions')){
            init=limitBody(w,init);
          }
        }catch(_){ }
        return originalFetch(input,init);
      };
      w.__evContextLimitV1=true;
    }catch(_){ }
  }

  frame.addEventListener('load',patch);
  setTimeout(patch,100);
  setTimeout(patch,700);
  setTimeout(patch,1800);
})();