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

  function openApp(w,kind){
    const url=kind==='youtube'?'https://www.youtube.com/':'https://open.spotify.com/';
    const name=kind==='youtube'?'YouTube':'Spotify';
    addReply(w,'Opening '+name+'.');
    try{
      const tab=w.open(url,'_blank','noopener,noreferrer');
      if(tab){return;}
    }catch(_){ }
    try{w.location.href=url;}catch(_){ }
  }

  function command(text,w){
    const q=String(text||'').toLowerCase().replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim();
    if(/\b(?:open|launch|start|go to|pull up)\s+(?:up\s+)?youtube\b/.test(q) || /^youtube$/.test(q)){
      openApp(w,'youtube');
      speakLocal(w,'Opening YouTube.');
      return true;
    }
    if(/\b(?:open|launch|start|go to|pull up)\s+(?:up\s+)?spotify\b/.test(q) || /^spotify$/.test(q)){
      openApp(w,'spotify');
      speakLocal(w,'Opening Spotify.');
      return true;
    }
    return false;
  }

  function patch(){
    try{
      const w=frame.contentWindow, doc=frame.contentDocument;
      if(!w||!doc)return;

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

        const form=doc.querySelector('form') || doc.getElementById('composer');
        const inp=doc.getElementById('input');
        if(form && inp){
          form.addEventListener('submit',function(e){
            const t=inp.value.trim();
            if(command(t,w)){
              e.preventDefault();
              e.stopImmediatePropagation();
              inp.value='';
            }
          },true);
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
