(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');if(!frame)return;
  let facing='environment';
  function patch(){
    try{
      const w=frame.contentWindow;
      if(!w||w.__evCameraLiveV3)return;
      w.__evCameraLiveV3=true;
      const md=w.navigator?.mediaDevices;
      if(md?.getUserMedia&&!md.__evFacingPatch){
        const originalGUM=md.getUserMedia.bind(md);
        md.getUserMedia=function(constraints){
          if(constraints?.video){
            const c=typeof constraints.video==='object'?{...constraints.video}:{};
            c.facingMode={ideal:facing};
            c.width={ideal:1920,max:1920};
            c.height={ideal:1080,max:1080};
            c.frameRate={ideal:30,max:30};
            constraints={...constraints,video:c};
          }
          return originalGUM(constraints);
        };
        md.__evFacingPatch=true;
      }
      const vision=w.EVVision;
      if(!vision?.openCamera)return;
      const originalOpen=vision.openCamera;
      const originalClose=vision.closeCamera;
      vision.openCamera=async function(){
        const ok=await originalOpen();if(!ok)return false;
        try{
          const win=w.document.querySelector('.floatWindow');
          if(!win)return true;
          const manual=win.querySelector('.evDescribe');
          if(manual){
            const row=manual.parentElement;
            if(row)row.style.display='none';
          }
          const note=win.querySelector('.mini');
          if(note)note.textContent='E.V. is watching the live camera and analyzing what is visible automatically. Use FLIP CAMERA to switch views.';
          const video=win.querySelector('.evCameraVideo');
          if(video){
            video.setAttribute('playsinline','');
            video.style.maxHeight='58dvh';
          }
          const bar=w.document.createElement('div');
          bar.style.cssText='display:flex;gap:7px;margin:8px 0;position:sticky;top:0;z-index:6';
          bar.innerHTML='<button class="btn evFlipCamera" style="flex:1">FLIP CAMERA</button><button class="btn evCameraOff" style="flex:1">TURN OFF</button>';
          const stage=win.querySelector('.videoStage');
          if(stage)stage.insertAdjacentElement('afterend',bar);else win.querySelector('.winBody')?.prepend(bar);
          bar.querySelector('.evCameraOff').onclick=()=>originalClose();
          bar.querySelector('.evFlipCamera').onclick=async()=>{
            facing=facing==='environment'?'user':'environment';
            try{await originalClose()}catch(_){}
            setTimeout(()=>vision.openCamera(),150);
          };
        }catch(e){console.warn('camera UI enhancement failed',e)}
        if(w.__evCameraLiveTimer)clearInterval(w.__evCameraLiveTimer);
        w.__evCameraLiveTimer=setInterval(()=>{
          try{if(w.EVVision?.describeCamera)w.EVVision.describeCamera(true)}catch(_){}
        },9000);
        return true;
      };
      w.EVVision.openCamera=vision.openCamera;
    }catch(e){console.warn('camera live patch failed',e)}
  }
  frame.addEventListener('load',patch);setTimeout(patch,500);setTimeout(patch,1500);setTimeout(patch,3000);
})();
