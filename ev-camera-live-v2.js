(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');if(!frame)return;
  function patch(){try{const w=frame.contentWindow;if(!w||w.__evCameraLiveV2)return;w.__evCameraLiveV2=true;const vision=w.EVVision;if(!vision?.openCamera)return;
    const originalOpen=vision.openCamera;
    vision.openCamera=async function(){
      const ok=await originalOpen();if(!ok)return false;
      try{
        const win=w.document.querySelector('.floatWindow');
        const manual=win?.querySelector('.evDescribe');if(manual)manual.style.display='none';
        const note=win?.querySelector('.mini');if(note)note.textContent='E.V. watches the live camera view and speaks brief updates on her own. She does not identify real people.';
      }catch(_){}
      if(w.__evCameraLiveTimer)clearInterval(w.__evCameraLiveTimer);
      w.__evCameraLiveTimer=setInterval(()=>{try{if(w.EVVision?.describeCamera)w.EVVision.describeCamera(true)}catch(_){}},15000);
      return true;
    };
    w.EVVision.openCamera=vision.openCamera;
  }catch(e){console.warn('camera live patch failed',e)}}
  frame.addEventListener('load',patch);setTimeout(patch,500);setTimeout(patch,1500);setTimeout(patch,3000);
})();
