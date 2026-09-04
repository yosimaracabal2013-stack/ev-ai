(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');
  if(!frame)return;

  function pickVoice(w){
    const voices=(w.speechSynthesis&&w.speechSynthesis.getVoices?w.speechSynthesis.getVoices():[])||[];
    const preferred=['Samantha','Ava','Karen','Tessa','Victoria','Allison','Susan','Zoe','Moira','Google US English'];
    for(const p of preferred){
      const v=voices.find(x=>x.lang&&/^en(-|_)?US/i.test(x.lang)&&x.name.toLowerCase().includes(p.toLowerCase()));
      if(v)return v;
    }
    return voices.find(x=>x.lang&&/^en(-|_)?US/i.test(x.lang)) || voices.find(x=>/^en/i.test(x.lang||'')) || voices[0] || null;
  }

  function speakLocal(w,text){
    try{
      if(!w.speechSynthesis || !w.SpeechSynthesisUtterance)return false;
      const clean=String(text||'').replace(/\s+/g,' ').trim();
      if(!clean)return false;
      const synth=w.speechSynthesis;
      synth.cancel();
      synth.resume();
      const voice=pickVoice(w);
      const parts=clean.match(/.{1,180}(?:\s+|$)/g)||[clean];
      let i=0;
      const next=()=>{
        if(i>=parts.length)return;
        const u=new w.SpeechSynthesisUtterance(parts[i++].trim());
        if(voice)u.voice=voice;
        u.lang=(voice&&voice.lang)||'en-US';
        u.rate=0.98;
        u.pitch=1.04;
        u.volume=1;
        u.onend=next;
        u.onerror=next;
        synth.speak(u);
      };
      next();
      return true;
    }catch(e){
      console.warn('E.V. local voice fallback failed',e);
      return false;
    }
  }

  function addReply(w,text){
    try{
      const d=w.document.createElement('div');
      d.className='msg';
      d.textContent=text;
      const feed=w.document.getElementById('feed');
      if(feed){
        feed.appendChild(d);
        while(feed.children.length>7)feed.firstElementChild.remove();
        feed.scrollTop=feed.scrollHeight;
      }
    }catch(_){ }
  }

  function openExternal(w,url){
    try{
      const a=w.document.createElement('a');
      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.style.display='none';
      w.document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }catch(_){ }
    try{w.parent.location.href=url;return true}catch(_){ }
    try{w.location.href=url;return true}catch(_){ }
    return false;
  }

  function openApp(w,kind,query){
    const hasQuery=!!String(query||'').trim();
    const q=encodeURIComponent(String(query||'').trim());
    const url=kind==='youtube'
      ? (hasQuery?'https://www.youtube.com/results?search_query='+q:'https://www.youtube.com/')
      : (hasQuery?'https://open.spotify.com/search/'+q:'https://open.spotify.com/');
    const name=kind==='youtube'?'YouTube':'Spotify';
    addReply(w,'Opening '+name+(hasQuery?' for '+String(query).trim():'.'));
    openExternal(w,url);
    speakLocal(w,'Opening '+name+(hasQuery?' for '+String(query).trim():'.'));
    return true;
  }

  function parseCommand(text,w){
    const q=String(text||'').toLowerCase().replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim();
    if(!q)return false;

    const yt=q.match(/(?:open|launch|start|go to|pull up)?\s*(?:up\s+)?youtube(?:\s+(?:and\s+)?(?:search|for)\s+(.+))?$/i);
    if(yt){
      return openApp(w,'youtube',yt[1]||'');
    }
    const yt2=q.match(/(?:open|launch|start|go to|pull up)\s+(.+?)\s+(?:on|in)\s+youtube$/i);
    if(yt2){
      return openApp(w,'youtube',yt2[1]);
    }
    const sp=q.match(/(?:open|launch|start|go to|pull up)?\s*(?:up\s+)?spotify(?:\s+(?:and\s+)?(?:search|for)\s+(.+))?$/i);
    if(sp){
      return openApp(w,'spotify',sp[1]||'');
    }
    const sp2=q.match(/(?:open|launch|start|go to|pull up)\s+(.+?)\s+(?:on|in)\s+spotify$/i);
    if(sp2){
      return openApp(w,'spotify',sp2[1]);
    }
    return false;
  }

  function intercept(w,doc){
    if(w.__evCommandRepairV2)return;
    w.__evCommandRepairV2=true;
    const inp=doc.getElementById('input');
    const send=doc.getElementById('sendBtn');
    const run=()=>{
      const t=inp&&inp.value?inp.value.trim():'';
      if(parseCommand(t,w)){
        if(inp)inp.value='';
        return true;
      }
      return false;
    };
    if(send){
      send.addEventListener('click',function(e){
        if(run()){
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },true);
    }
    if(inp){
      inp.addEventListener('keydown',function(e){
        if(e.key==='Enter' && run()){
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },true);
      inp.addEventListener('change',run,true);
    }
    const form=doc.querySelector('form');
    if(form)form.addEventListener('submit',function(e){if(run()){e.preventDefault();e.stopImmediatePropagation();}},true);
  }

  function patch(){
    try{
      const w=frame.contentWindow, doc=frame.contentDocument;
      if(!w||!doc)return;
      intercept(w,doc);

      if(!w.__evVoiceRepairV1){
        w.__evVoiceRepairV1=true;
        if(w.speechSynthesis && w.speechSynthesis.addEventListener){
          w.speechSynthesis.addEventListener('voiceschanged',function(){ pickVoice(w); });
        }
        const prime=()=>{try{w.speechSynthesis&&w.speechSynthesis.resume();}catch(_){} };
        doc.addEventListener('touchstart',prime,{passive:true});
        doc.addEventListener('click',prime,{passive:true});

        const feed=doc.getElementById('feed');
        if(feed && w.MutationObserver){
          let last='';
          const obs=new w.MutationObserver(function(){
            const nodes=Array.from(feed.querySelectorAll('.msg:not(.user)'));
            const n=nodes[nodes.length-1];
            if(!n)return;
            const t=(n.textContent||'').trim();
            if(!t || t===last || n.classList.contains('thinking'))return;
            last=t;
            w.setTimeout(function(){
              if(!w.speechSynthesis || !w.speechSynthesis.speaking) speakLocal(w,t);
            },350);
          });
          obs.observe(feed,{childList:true,subtree:true,characterData:true});
        }
      }

      if(!w.__evBrainCareRepairV1){
        w.__evBrainCareRepairV1=true;
        const originalFetch=w.fetch.bind(w);
        w.fetch=function(input,init){
          try{
            const raw=typeof input==='string'?input:(input&&input.url)||'';
            if(raw.includes('api.groq.com/openai/v1/chat/completions') && init && typeof init.body==='string'){
              const body=JSON.parse(init.body);
              if(Array.isArray(body.messages)){
                const care='\n\nE.V. BEHAVIOR: Be warm, calm, attentive, and genuinely supportive. Pay attention to how the user is doing, not only the task. If the user sounds stressed, sad, overwhelmed, or asks whether they are okay, gently check in and ask how they are doing. For mental-health concerns, respond supportively and encourage talking with a trusted person or adult when appropriate. Never guilt the user, claim to be a human, or imply that the user should rely only on E.V. Show care through helpful words and actions. Keep responses natural and not overly formal.';
                const sys=body.messages.find(m=>m&&m.role==='system');
                if(sys && typeof sys.content==='string' && !sys.content.includes('E.V. BEHAVIOR:'))sys.content+=care;
                else if(!sys)body.messages.unshift({role:'system',content:care.trim()});
                init={...init,body:JSON.stringify(body)};
              }
            }
          }catch(_){ }
          return originalFetch(input,init);
        };
      }
    }catch(e){console.warn('E.V. behavior repair could not attach',e)}
  }

  frame.addEventListener('load',patch);
  setTimeout(patch,100);
  setTimeout(patch,700);
  setTimeout(patch,1800);
})();
