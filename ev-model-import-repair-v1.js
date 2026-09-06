(function(){
  const frame=document.getElementById('evDashboard');if(!frame)return;
  function patch(){try{const w=frame.contentWindow,d=frame.contentDocument;if(!w||!d||w.__evModelImportRepairV1)return;w.__evModelImportRepairV1=true;if(!w.customElements?.get('model-viewer')){const s=d.createElement('script');s.type='module';s.src='https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';d.head.appendChild(s)}}catch(e){console.warn('model import repair failed',e)}}
  frame.addEventListener('load',patch);setTimeout(patch,500);setTimeout(patch,1800);
})();
