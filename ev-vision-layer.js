/* E.V. vision + wake-word layer.
   - Photo upload -> multimodal E.V. analysis.
   - Camera toggle -> live local preview.
   - Every normal message can include the current camera frame when Vision is ON.
   - Wake-word toggle -> listen for "E.V." and auto-send the command that follows.
   Camera stays OFF until the user explicitly turns Vision ON.
*/
(function(){
  'use strict';
  const w=window, d=document;
  const $=id=>d.getElementById(id);
  const say=t=>{try{if(typeof w.addRow==='function')w.addRow('ev',t);if(typeof w.speak==='function')w.speak(t)}catch(_) {}};
  const store=(k,v)=>{try{localStorage.setItem('ev-vision-'+k,JSON.stringify(v));}catch(_) {}};
  const load=(k,f)=>{try{const v=localStorage.getItem('ev-vision-'+k);return v===null?f:JSON.parse(v)}catch(_){return f}};

  let pendingImage=null;
  let stream=null;
  let liveVision=!!load('live',false);
  let wakeEnabled=!!load('wake',false);
  let wakeRec=null;
  let wakeStarting=false;
  let wakeCooldownUntil=0;
  let wakeArmedUntil=0;
  let currentFrame=null;

  function resizeInput(){const i=$('input');if(i){i.style.height='auto';i.style.height=Math.min(i.scrollHeight,120)+'px';}}
  function addButton(label,id){
    const b=d.createElement('button'); b.id=id; b.type='button'; b.textContent=label;
    b.className='evVisionBtn'; return b;
  }

  const style=d.createElement('style');
  style.textContent=`
    .evVisionBar{display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap;padding:5px 10px 2px;z-index:6}
    .evVisionBtn{background:rgba(2,12,8,.9);border:1px solid rgba(57,233,145,.3);color:#79cba2;font:9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.3px;padding:6px 9px;border-radius:7px;text-transform:uppercase}
    .evVisionBtn.on{color:#c3ffe3;border-color:#39e991;box-shadow:0 0 12px rgba(57,233,145,.14)}
    .evVisionBtn.warn{color:#ff9b9b;border-color:#8c4141}
    #evVisionOverlay{position:fixed;inset:0;background:rgba(0,0,0,.84);z-index:100;display:none;align-items:center;justify-content:center;padding:18px}
    #evVisionOverlay.show{display:flex}
    #evVisionCard{width:min(680px,96vw);max-height:92vh;background:#030907;border:1px solid rgba(57,233,145,.3);border-radius:14px;padding:12px;box-shadow:0 0 40px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:10px}
    #evVisionVideo{width:100%;max-height:65vh;object-fit:contain;background:#000;border-radius:9px;display:block}
    #evVisionPreview{width:100%;max-height:65vh;object-fit:contain;background:#000;border-radius:9px;display:none}
    .evVisionActions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.evVisionActions button{padding:8px 12px}
    #evVisionStatus{font:10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#5f9b7d;text-align:center;letter-spacing:1px}
    #evVisionFile{display:none}
    @media(max-width:700px){.evVisionBtn{font-size:8px;padding:6px 7px}.evVisionBar{gap:4px}}
  `;
  d.head.appendChild(style);

  const bar=d.createElement('div'); bar.className='evVisionBar';
  const visionBtn=addButton('VISION OFF','evVisionToggle');
  const wakeBtn=addButton('WAKE E.V. OFF','evWakeToggle');
  const cameraBtn=addButton('CAMERA','evCameraOpen');
  const photoBtn=addButton('PHOTO','evPhotoPick');
  bar.append(visionBtn,wakeBtn,cameraBtn,photoBtn);

  const composer=$('composer');
  if(composer) composer.parentNode.insertBefore(bar,composer);

  const file=d.createElement('input'); file.type='file'; file.accept='image/*'; file.id='evVisionFile'; file.capture='environment'; d.body.appendChild(file);
  const overlay=d.createElement('div'); overlay.id='evVisionOverlay';
  overlay.innerHTML=`<div id="evVisionCard"><video id="evVisionVideo" autoplay playsinline muted></video><img id="evVisionPreview" alt="E.V. camera snapshot"><div id="evVisionStatus">CAMERA OFF</div><div class="evVisionActions"><button class="evVisionBtn" id="evVisionLook">LOOK</button><button class="evVisionBtn" id="evVisionUpload">UPLOAD PHOTO</button><button class="evVisionBtn" id="evVisionClose">CLOSE</button></div></div>`;
  d.body.appendChild(overlay);

  const video=$('evVisionVideo'), preview=$('evVisionPreview'), status=$('evVisionStatus');
  const look=$('evVisionLook'), upload=$('evVisionUpload'), close=$('evVisionClose');

  function setButton(b,on,onText,offText){b.classList.toggle('on',on);b.textContent=on?onText:offText;}
  function updateUi(){
    setButton(visionBtn,liveVision,'VISION ON','VISION OFF');
    setButton(wakeBtn,wakeEnabled,'WAKE E.V. ON','WAKE E.V. OFF');
    if(liveVision){status.textContent='VISION ON // CAMERA AVAILABLE';}
  }

  async function startCamera(){
    if(stream) return true;
    if(!navigator.mediaDevices?.getUserMedia){say('This browser does not provide camera access.');return false;}
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
      video.srcObject=stream; await video.play().catch(()=>{}); status.textContent='VISION ON // LIVE CAMERA'; return true;
    }catch(e){
      status.textContent='CAMERA BLOCKED';
      say('I could not open the camera. Please allow camera access for E.V. in Safari.');
      return false;
    }
  }
  function stopCamera(){
    if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
    video.srcObject=null; status.textContent='CAMERA OFF';
  }
  async function setLive(on){
    liveVision=!!on; store('live',liveVision);
    if(liveVision){const ok=await startCamera(); if(!ok){liveVision=false;store('live',false);}}
    else stopCamera();
    updateUi();
    if(liveVision) say('Vision is on. I can use the current camera view when you ask me what I see.');
    else say('Vision is off. Camera access is stopped.');
  }

  function canvasFrame(){
    if(!video.videoWidth||!video.videoHeight) return null;
    const maxW=1280, scale=Math.min(1,maxW/video.videoWidth);
    const c=d.createElement('canvas'); c.width=Math.round(video.videoWidth*scale); c.height=Math.round(video.videoHeight*scale);
    const x=c.getContext('2d'); x.drawImage(video,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',0.72);
  }
  function setPending(data,label){
    pendingImage=data; currentFrame=data;
    preview.src=data; preview.style.display='block'; video.style.display='none';
    status.textContent=label||'IMAGE READY FOR E.V.';
  }

  function submitText(text){
    const input=$('input'); const form=$('composer'); if(!input||!form)return;
    input.value=text; resizeInput();
    setTimeout(()=>{try{form.requestSubmit()}catch(_){const s=$('send');if(s)s.click()}},100);
  }

  async function lookNow(){
    if(!stream){const ok=await startCamera();if(!ok)return;}
    const data=canvasFrame(); if(!data){say('The camera is still starting. Try LOOK again in a second.');return;}
    setPending(data,'CURRENT FRAME READY');
    submitText('E.V., what do you see right now? Describe the important things in the camera view.');
  }

  photoBtn.addEventListener('click',()=>file.click());
  upload.addEventListener('click',()=>file.click());
  file.addEventListener('change',()=>{
    const f=file.files&&file.files[0]; if(!f)return;
    if(!f.type.startsWith('image/')){say('That file is not an image.');return;}
    const r=new FileReader(); r.onload=()=>{
      setPending(String(r.result),'PHOTO READY FOR E.V.');
      const input=$('input');
      if(input&&!input.value.trim()) submitText('E.V., analyze this photo and tell me what you notice.');
      else say('Photo ready. Ask me to analyze it, then press Send.');
    }; r.readAsDataURL(f); file.value='';
  });

  cameraBtn.addEventListener('click',async()=>{overlay.classList.add('show');if(liveVision)await startCamera();else await startCamera();});
  close.addEventListener('click',()=>{overlay.classList.remove('show');if(!liveVision)stopCamera();preview.style.display='none';video.style.display='block';});
  look.addEventListener('click',lookNow);
  visionBtn.addEventListener('click',()=>setLive(!liveVision));

  // Vision-aware fetch: attach the selected photo/current frame to the next user request
  // and switch only that request to Groq's vision-capable Qwen model.
  const baseFetch=w.fetch.bind(w);
  w.fetch=async function(url,options={}){
    try{
      const target=typeof url==='string'?url:(url&&url.url)||'';
      if(target.includes('api.groq.com/openai/v1/chat/completions')&&options&&typeof options.body==='string'){
        const p=JSON.parse(options.body);
        if(Array.isArray(p.messages)&&(pendingImage|| (liveVision&&currentFrame))){
          const image=pendingImage || currentFrame;
          let idx=-1;
          for(let i=p.messages.length-1;i>=0;i--){if(p.messages[i].role==='user'){idx=i;break;}}
          if(idx>=0){
            const msg=p.messages[idx];
            const text=typeof msg.content==='string'?msg.content:String(msg.content?.find?.(x=>x.type==='text')?.text||'');
            msg.content=[{type:'text',text:text||'Please analyze the image.'},{type:'image_url',image_url:{url:image}}];
            p.model='qwen/qwen3.6-27b';
            p.max_completion_tokens=Math.min(Number(p.max_completion_tokens||600),700);
            options={...options,body:JSON.stringify(p)};
            pendingImage=null;
          }
        }
      }
    }catch(_){}
    return baseFetch(url,options);
  };

  function wakeTranscript(text){
    const t=String(text||'').trim(); if(!t)return;
    if(Date.now()<wakeCooldownUntil)return;
    const m=t.match(/\be\s*\.?\s*v\s*\.?\b/i);
    if(m){
      const after=t.slice((m.index||0)+m[0].length).replace(/^[,.:;\-\s]+/,'').trim();
      wakeArmedUntil=Date.now()+5000;
      wakeCooldownUntil=Date.now()+1200;
      if(after){
        submitText(after);
        wakeCooldownUntil=Date.now()+3500;
      }else{
        status.textContent='WAKE WORD HEARD // LISTENING';
      }
      return;
    }
    if(Date.now()<wakeArmedUntil){
      wakeArmedUntil=0; wakeCooldownUntil=Date.now()+3500; submitText(t);
    }
  }

  function buildWake(){
    const SR=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!SR){say('Wake-word listening is not available in this browser. The tap-to-speak mic still works.');wakeEnabled=false;updateUi();return;}
    if(wakeRec)try{wakeRec.abort()}catch(_){}
    wakeRec=new SR(); wakeRec.lang='en-US'; wakeRec.continuous=true; wakeRec.interimResults=true;
    wakeRec.onresult=e=>{for(let i=e.resultIndex||0;i<e.results.length;i++){const txt=e.results[i][0]?.transcript||'';if(txt)wakeTranscript(txt);}};
    wakeRec.onerror=e=>{
      if(!wakeEnabled)return;
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){say('Wake-word listening needs microphone permission.');wakeEnabled=false;store('wake',false);updateUi();return;}
      setTimeout(()=>{if(wakeEnabled)startWake()},700);
    };
    wakeRec.onend=()=>{if(wakeEnabled)setTimeout(()=>startWake(),500)};
  }
  function startWake(){
    if(!wakeEnabled||wakeStarting)return; wakeStarting=true;
    try{if(!wakeRec)buildWake();wakeRec.start();status.textContent='WAKE E.V. ON // LISTENING';}catch(_){}finally{setTimeout(()=>wakeStarting=false,400)}
  }
  function stopWake(){try{if(wakeRec)wakeRec.stop()}catch(_){}status.textContent=liveVision?'VISION ON // CAMERA AVAILABLE':'STANDBY';}
  wakeBtn.addEventListener('click',()=>{
    wakeEnabled=!wakeEnabled;store('wake',wakeEnabled);updateUi();
    if(wakeEnabled){buildWake();startWake();say('Wake word is on. Say “E.V.” and then your command.');}
    else {stopWake();say('Wake word is off. The microphone will not listen in the background.');}
  });

  // If Vision is restored from the previous session, require a fresh permission gesture.
  liveVision=false; store('live',false); updateUi();
  if(wakeEnabled){wakeEnabled=false;store('wake',false);updateUi();}
  window.EVVision={setLive,look:lookNow,setPhoto:setPending,stop:()=>{setLive(false);wakeEnabled=false;store('wake',false);stopWake();}};
})();
