/* E.V. UI Restore v7
   Restores the original composer and controls after the hands-free layer
   accidentally replaced them with a second text box.
*/
(function(){
  'use strict';

  function restore(){
    // v6 injected these style blocks to hide the real UI.
    document.getElementById('ev-v6-clean-ui')?.remove();
    document.getElementById('ev-v6-text-ui')?.remove();

    // Remove the duplicate v6 text composer if it was already created.
    document.getElementById('ev-v6-text-wrap')?.remove();

    // Restore the real controls/composer.
    const style=document.createElement('style');
    style.id='ev-ui-restore-v7-style';
    style.textContent=`
      .controls-row{display:flex!important;visibility:visible!important;opacity:1!important}
      .controls-row button,#voiceBtn,#resetBtn{display:flex!important;visibility:visible!important;opacity:1!important}
      .tabs{display:flex!important;visibility:visible!important;opacity:1!important}
      .tab{display:block!important;visibility:visible!important;opacity:1!important}
      #voiceSelect{visibility:visible!important}
      form#composer{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:30!important}
      #attachBtn,#micBtn,button#send{display:block!important;visibility:visible!important;opacity:1!important}
      #ev-v6-text-wrap{display:none!important}
    `;
    document.head.appendChild(style);

    // If a prior run left a duplicate custom input behind, remove it too.
    document.querySelectorAll('input#ev-v6-text-input').forEach(el=>el.closest('#ev-v6-text-wrap')?.remove());

    const form=document.getElementById('composer');
    const input=document.getElementById('input');
    if(form && input){
      input.placeholder='Talk to E.V. or type a message…';
      // Keep Enter-to-send without creating another composer.
      if(!input.dataset.evUiRestore){
        input.dataset.evUiRestore='1';
        input.addEventListener('keydown',e=>{
          if(e.key==='Enter' && !e.shiftKey){
            e.preventDefault();
            if(typeof form.requestSubmit==='function') form.requestSubmit();
            else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
          }
        });
      }
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',restore,{once:true});
  else restore();
  setTimeout(restore,1200);
})();
